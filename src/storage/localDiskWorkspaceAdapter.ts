import {
  AssetRecord,
  CaseState,
  CaseSummary,
  WorkspaceStorageAdapter,
} from '../domain/types';
import { createInitialCaseState } from '../domain/caseStore';
import {
  inferAssetMimeType,
  packCaseZip,
  readBlobAsBytes,
  unpackCaseZip,
} from './caseZip';
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
      const unpacked = await unpackCaseZip(zipFile);
      const boardData = unpacked.boardData;

      for (const entry of unpacked.assets) {
        const blob = new Blob([entry.bytes], { type: entry.mimeType });
        await this.saveAsset(boardData.caseSlug, blob, entry.filename);
      }

      await this.saveCase(boardData.caseSlug, boardData);
      return boardData;
    },
  };
}
