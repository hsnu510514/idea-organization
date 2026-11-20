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

export function createInMemoryWorkspaceAdapter(
  initialCases?: CaseState[]
): WorkspaceStorageAdapter {
  const cases = new Map<string, CaseState>();
  const assets = new Map<
    string,
    { record: AssetRecord; url: string; bytes: Uint8Array }
  >();

  const seed = initialCases ?? [createInitialCaseState()];
  for (const c of seed) {
    cases.set(c.caseSlug, structuredClone(c));
  }

  return {
    peekCases(): CaseSummary[] {
      return Array.from(cases.values()).map((c) => ({
        caseSlug: c.caseSlug,
        caseTitle: c.caseTitle,
      }));
    },

    async listCases(): Promise<CaseSummary[]> {
      return Array.from(cases.values()).map((c) => ({
        caseSlug: c.caseSlug,
        caseTitle: c.caseTitle,
      }));
    },

    async loadCase(caseSlug: string): Promise<CaseState | null> {
      const found = cases.get(caseSlug);
      return found ? structuredClone(found) : null;
    },

    async saveCase(caseSlug: string, boardData: CaseState): Promise<void> {
      cases.set(caseSlug, structuredClone({ ...boardData, caseSlug }));
    },

    async deleteCase(caseSlug: string): Promise<void> {
      cases.delete(caseSlug);
      for (const key of Array.from(assets.keys())) {
        if (key.startsWith(`${caseSlug}:`)) {
          assets.delete(key);
        }
      }
    },

    async saveAsset(
      caseSlug: string,
      file: File | Blob,
      filename?: string
    ): Promise<AssetRecord> {
      const name =
        filename ?? (file instanceof File ? file.name : `asset-${Date.now()}`);
      const relativePath = name.startsWith('assets/') ? name : `assets/${name}`;
      const cleanName = relativePath.replace(/^assets\//, '');
      const key = `${caseSlug}:${relativePath}`;
      const existing = assets.get(key);
      if (existing) {
        return existing.record;
      }
      const bytes = await readBlobAsBytes(file);
      const mimeType = (file.type ||
        inferAssetMimeType(cleanName)) as AssetRecord['mimeType'];
      const record: AssetRecord = {
        id: `asset-${cleanName.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        filename: cleanName,
        mimeType,
        relativePath,
      };
      const blob = new Blob([bytes], { type: mimeType });
      const url =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(blob)
          : `blob:inmemory/${caseSlug}/${relativePath}`;
      if (mimeType === 'application/pdf') {
        cachePdfBinary(record.id, bytes);
        cachePdfBinary(url, bytes);
      }
      assets.set(key, { record, url, bytes });
      return record;
    },

    async loadAssetUrl(caseSlug: string, relativePath: string): Promise<string> {
      const normalized = relativePath.startsWith('assets/')
        ? relativePath
        : `assets/${relativePath}`;
      const key = `${caseSlug}:${normalized}`;
      return assets.get(key)?.url ?? normalized;
    },

    async exportCaseZip(caseSlug: string): Promise<Blob> {
      const found = cases.get(caseSlug) ?? createInitialCaseState({ caseSlug });
      const caseAssets: Array<{ relativePath: string; bytes: Uint8Array }> = [];
      for (const [key, value] of assets.entries()) {
        if (key.startsWith(`${caseSlug}:`)) {
          caseAssets.push({
            relativePath: value.record.relativePath,
            bytes: value.bytes,
          });
        }
      }
      return packCaseZip(found, caseAssets);
    },

    async importCaseZip(zipFile: File | Blob): Promise<CaseState> {
      const unpacked = await unpackCaseZip(zipFile);
      const boardData = structuredClone(unpacked.boardData);

      for (const entry of unpacked.assets) {
        const blob = new Blob([entry.bytes], { type: entry.mimeType });
        await this.saveAsset(boardData.caseSlug, blob, entry.filename);
      }

      cases.set(boardData.caseSlug, structuredClone(boardData));
      return structuredClone(boardData);
    },
  };
}

export const inMemoryWorkspaceAdapter = createInMemoryWorkspaceAdapter();
