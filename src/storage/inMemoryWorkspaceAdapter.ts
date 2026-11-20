import {
  AssetRecord,
  CaseState,
  CaseSummary,
  WorkspaceStorageAdapter,
} from '../domain/types';
import { createInitialCaseState } from '../domain/caseStore';

export function createInMemoryWorkspaceAdapter(
  initialCases?: CaseState[]
): WorkspaceStorageAdapter {
  const cases = new Map<string, CaseState>();
  const assets = new Map<string, { record: AssetRecord; url: string }>();

  const seed = initialCases ?? [createInitialCaseState()];
  for (const c of seed) {
    cases.set(c.caseSlug, structuredClone(c));
  }

  return {
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
    },

    async saveAsset(
      caseSlug: string,
      file: File | Blob,
      filename?: string
    ): Promise<AssetRecord> {
      const name =
        filename ?? (file instanceof File ? file.name : `asset-${Date.now()}`);
      const relativePath = `assets/${name}`;
      const key = `${caseSlug}:${relativePath}`;
      const existing = assets.get(key);
      if (existing) {
        return existing.record;
      }
      const mimeType = (file.type || 'application/pdf') as AssetRecord['mimeType'];
      const record: AssetRecord = {
        id: `asset-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        filename: name,
        mimeType,
        relativePath,
      };
      const url =
        typeof URL.createObjectURL === 'function'
          ? URL.createObjectURL(file)
          : `blob:inmemory/${caseSlug}/${relativePath}`;
      assets.set(key, { record, url });
      return record;
    },

    async loadAssetUrl(caseSlug: string, relativePath: string): Promise<string> {
      const key = `${caseSlug}:${relativePath}`;
      return assets.get(key)?.url ?? relativePath;
    },

    async exportCaseZip(caseSlug: string): Promise<Blob> {
      const found = cases.get(caseSlug) ?? createInitialCaseState({ caseSlug });
      return new Blob([JSON.stringify(found, null, 2)], {
        type: 'application/json',
      });
    },

    async importCaseZip(zipFile: File | Blob): Promise<CaseState> {
      const text = await zipFile.text();
      const parsed = JSON.parse(text) as CaseState;
      cases.set(parsed.caseSlug, structuredClone(parsed));
      return parsed;
    },
  };
}

export const inMemoryWorkspaceAdapter = createInMemoryWorkspaceAdapter();
