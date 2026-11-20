import {
  AssetRecord,
  CaseState,
  CaseSummary,
  WorkspaceStorageAdapter,
} from '../domain/types';
import { createInitialCaseState } from '../domain/caseStore';
import {
  importCaseZipIntoAdapter,
  inferAssetMimeType,
  packCaseZip,
  readBlobAsBytes,
} from './caseZip';
import { createInMemoryWorkspaceAdapter } from './inMemoryWorkspaceAdapter';
import { cachePdfBinary } from '../components/PdfPageCanvas';

export interface LocalDiskWorkspaceAdapterOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function createLocalDiskWorkspaceAdapter(
  options?: LocalDiskWorkspaceAdapterOptions
): WorkspaceStorageAdapter {
  const baseUrl = (options?.baseUrl ?? '/api/workspace').replace(/\/+$/, '');
  const fetchFn = options?.fetchImpl ?? ((input, init) => fetch(input, init));

  return {
    async listCases(): Promise<CaseSummary[]> {
      const res = await fetchFn(`${baseUrl}/cases`, { method: 'GET' });
      if (!res.ok) return [];
      return (await res.json()) as CaseSummary[];
    },

    async loadCase(caseSlug: string): Promise<CaseState | null> {
      const res = await fetchFn(
        `${baseUrl}/cases/${encodeURIComponent(caseSlug)}`,
        { method: 'GET' }
      );
      if (!res.ok) return null;
      return (await res.json()) as CaseState;
    },

    async saveCase(caseSlug: string, boardData: CaseState): Promise<void> {
      await fetchFn(`${baseUrl}/cases/${encodeURIComponent(caseSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(boardData, null, 2),
      });
    },

    async deleteCase(caseSlug: string): Promise<void> {
      await fetchFn(`${baseUrl}/cases/${encodeURIComponent(caseSlug)}`, {
        method: 'DELETE',
      });
    },

    async saveAsset(
      caseSlug: string,
      file: File | Blob,
      filename?: string
    ): Promise<AssetRecord> {
      const name =
        filename ?? (file instanceof File ? file.name : `asset-${Date.now()}`);
      const cleanName = name.replace(/^assets\//, '');
      const bytes = await readBlobAsBytes(file);
      const mimeType = (file.type ||
        inferAssetMimeType(cleanName)) as AssetRecord['mimeType'];

      const res = await fetchFn(
        `${baseUrl}/cases/${encodeURIComponent(caseSlug)}/assets/${encodeURIComponent(
          cleanName
        )}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: bytes,
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to save asset ${cleanName} to local disk`);
      }

      const record = (await res.json()) as AssetRecord;
      if (mimeType === 'application/pdf') {
        cachePdfBinary(record.id, bytes);
      }
      return record;
    },

    async loadAssetUrl(caseSlug: string, relativePath: string): Promise<string> {
      const cleanName = relativePath.replace(/^assets\//, '');
      return `${baseUrl}/cases/${encodeURIComponent(
        caseSlug
      )}/assets/${encodeURIComponent(cleanName)}`;
    },

    async exportCaseZip(caseSlug: string): Promise<Blob> {
      const boardData =
        (await this.loadCase(caseSlug)) ?? createInitialCaseState({ caseSlug });
      const assets: Array<{ relativePath: string; bytes: Uint8Array }> = [];

      for (const asset of boardData.assets ?? []) {
        const cleanName = asset.relativePath.replace(/^assets\//, '');
        const res = await fetchFn(
          `${baseUrl}/cases/${encodeURIComponent(
            caseSlug
          )}/assets/${encodeURIComponent(cleanName)}`,
          { method: 'GET' }
        );
        if (res.ok) {
          const buf = await res.arrayBuffer();
          assets.push({
            relativePath: asset.relativePath,
            bytes: new Uint8Array(buf),
          });
        }
      }

      return packCaseZip(boardData, assets);
    },

    async importCaseZip(zipFile: File | Blob): Promise<CaseState> {
      return importCaseZipIntoAdapter(this, zipFile);
    },
  };
}

export interface DefaultWorkspaceAdapterOptions extends LocalDiskWorkspaceAdapterOptions {
  initialCases?: CaseState[];
}

/**
 * Hybrid runtime Workspace adapter that attempts to communicate with the Vite Local Disk Middleware
 * (`/api/workspace/...`) when available, and seamlessly falls back to an in-memory Workspace adapter
 * when offline or running in environments where `/api/workspace` is not mounted.
 */
export function createDefaultWorkspaceAdapter(
  options?: DefaultWorkspaceAdapterOptions
): WorkspaceStorageAdapter {
  const baseUrl = (options?.baseUrl ?? '/api/workspace').replace(/\/+$/, '');
  const fetchFn = options?.fetchImpl ?? ((input, init) => fetch(input, init));
  const diskAdapter = createLocalDiskWorkspaceAdapter({ baseUrl, fetchImpl: fetchFn });
  const memoryAdapter = createInMemoryWorkspaceAdapter(options?.initialCases);

  let mode: 'unknown' | 'disk' | 'memory' = 'unknown';

  async function resolveAdapter(): Promise<WorkspaceStorageAdapter> {
    if (mode === 'disk') return diskAdapter;
    if (mode === 'memory') return memoryAdapter;
    try {
      const res = await fetchFn(`${baseUrl}/cases`, { method: 'GET' });
      const contentType = res.headers?.get?.('content-type') ?? '';
      if (res.ok && (!contentType || contentType.includes('application/json'))) {
        mode = 'disk';
        return diskAdapter;
      }
    } catch {
      // Fallback to in-memory adapter
    }
    mode = 'memory';
    return memoryAdapter;
  }

  return {
    peekCases(): CaseSummary[] {
      return memoryAdapter.peekCases ? memoryAdapter.peekCases() : [];
    },

    async listCases(): Promise<CaseSummary[]> {
      const active = await resolveAdapter();
      return active.listCases();
    },

    async loadCase(caseSlug: string): Promise<CaseState | null> {
      const active = await resolveAdapter();
      return active.loadCase(caseSlug);
    },

    async saveCase(caseSlug: string, boardData: CaseState): Promise<void> {
      await memoryAdapter.saveCase(caseSlug, boardData);
      const active = await resolveAdapter();
      if (active === diskAdapter) {
        await diskAdapter.saveCase(caseSlug, boardData);
      }
    },

    async deleteCase(caseSlug: string): Promise<void> {
      await memoryAdapter.deleteCase(caseSlug);
      const active = await resolveAdapter();
      if (active === diskAdapter) {
        await diskAdapter.deleteCase(caseSlug);
      }
    },

    async saveAsset(
      caseSlug: string,
      file: File | Blob,
      filename?: string
    ): Promise<AssetRecord> {
      const active = await resolveAdapter();
      if (active === diskAdapter) {
        return diskAdapter.saveAsset(caseSlug, file, filename);
      }
      return memoryAdapter.saveAsset(caseSlug, file, filename);
    },

    async loadAssetUrl(caseSlug: string, relativePath: string): Promise<string> {
      const active = await resolveAdapter();
      return active.loadAssetUrl(caseSlug, relativePath);
    },

    async exportCaseZip(caseSlug: string): Promise<Blob> {
      const active = await resolveAdapter();
      return active.exportCaseZip(caseSlug);
    },

    async importCaseZip(zipFile: File | Blob): Promise<CaseState> {
      const active = await resolveAdapter();
      return active.importCaseZip(zipFile);
    },
  };
}

export const defaultWorkspaceAdapter = createDefaultWorkspaceAdapter();
