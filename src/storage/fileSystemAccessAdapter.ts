import {
  AssetRecord,
  CaseState,
  CaseSummary,
  WorkspaceStorageAdapter,
} from '../domain/types';
import { createInitialCaseState } from '../domain/caseStore';
import {
  formatBoardJson,
  inferAssetMimeType,
  packCaseZip,
  readBlobAsBytes,
  unpackCaseZip,
} from './caseZip';
import { cachePdfBinary } from '../components/PdfPageCanvas';

export interface WritableFileStreamLike {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableFileStreamLike>;
}

export interface DirectoryHandleLike {
  kind: 'directory';
  name: string;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<DirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileHandleLike>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<[string, DirectoryHandleLike | FileHandleLike]>;
}

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === 'function'
  );
}

export async function promptAndMountWorkspaceDirectory(): Promise<WorkspaceStorageAdapter> {
  const win = window as unknown as {
    showDirectoryPicker?: (options?: {
      mode?: 'read' | 'readwrite';
    }) => Promise<DirectoryHandleLike>;
  };
  if (typeof win.showDirectoryPicker !== 'function') {
    throw new Error('File System Access API (showDirectoryPicker) is not supported');
  }
  const rootHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
  return createFileSystemAccessAdapter(rootHandle);
}

export function createFileSystemAccessAdapter(
  rootHandle: DirectoryHandleLike
): WorkspaceStorageAdapter {
  const assetUrlCache = new Map<string, string>();

  return {
    async listCases(): Promise<CaseSummary[]> {
      const summaries: CaseSummary[] = [];
      for await (const [entryName, handle] of rootHandle.entries()) {
        if (handle.kind !== 'directory') continue;
        try {
          const dirHandle = handle as DirectoryHandleLike;
          const boardFileHandle = await dirHandle.getFileHandle('board.json');
          const file = await boardFileHandle.getFile();
          const bytes = await readBlobAsBytes(file);
          const raw = new TextDecoder().decode(bytes);
          const parsed = JSON.parse(raw) as Partial<CaseState>;
          summaries.push({
            caseSlug: parsed.caseSlug || entryName,
            caseTitle: parsed.caseTitle || entryName,
          });
        } catch {
          // Ignore subdirectories that don't contain a valid board.json
        }
      }
      return summaries;
    },

    async loadCase(caseSlug: string): Promise<CaseState | null> {
      try {
        const caseDir = await rootHandle.getDirectoryHandle(caseSlug);
        const boardFileHandle = await caseDir.getFileHandle('board.json');
        const file = await boardFileHandle.getFile();
        const bytes = await readBlobAsBytes(file);
        const raw = new TextDecoder().decode(bytes);
        return JSON.parse(raw) as CaseState;
      } catch {
        return null;
      }
    },

    async saveCase(caseSlug: string, boardData: CaseState): Promise<void> {
      const caseDir = await rootHandle.getDirectoryHandle(caseSlug, {
        create: true,
      });
      await caseDir.getDirectoryHandle('assets', { create: true });
      const boardFileHandle = await caseDir.getFileHandle('board.json', {
        create: true,
      });
      const writable = await boardFileHandle.createWritable();
      await writable.write(
        formatBoardJson({
          ...boardData,
          caseSlug,
        })
      );
      await writable.close();
    },

    async deleteCase(caseSlug: string): Promise<void> {
      try {
        await rootHandle.removeEntry(caseSlug, { recursive: true });
      } catch {
        // Ignore if directory does not exist
      }
    },

    async saveAsset(
      caseSlug: string,
      file: File | Blob,
      filename?: string
    ): Promise<AssetRecord> {
      const name =
        filename ?? (file instanceof File ? file.name : `asset-${Date.now()}`);
      const cleanName = name.replace(/^assets\//, '');
      const relativePath = `assets/${cleanName}`;
      const caseDir = await rootHandle.getDirectoryHandle(caseSlug, {
        create: true,
      });
      const assetsDir = await caseDir.getDirectoryHandle('assets', {
        create: true,
      });
      const assetHandle = await assetsDir.getFileHandle(cleanName, {
        create: true,
      });
      const bytes = await readBlobAsBytes(file);
      const writable = await assetHandle.createWritable();
      await writable.write(bytes);
      await writable.close();

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
          : `blob:fsa/${caseSlug}/${relativePath}`;
      assetUrlCache.set(`${caseSlug}:${relativePath}`, url);
      if (mimeType === 'application/pdf') {
        cachePdfBinary(record.id, bytes);
        cachePdfBinary(url, bytes);
      }
      return record;
    },

    async loadAssetUrl(caseSlug: string, relativePath: string): Promise<string> {
      const cleanName = relativePath.replace(/^assets\//, '');
      const normalized = `assets/${cleanName}`;
      const cacheKey = `${caseSlug}:${normalized}`;
      const cached = assetUrlCache.get(cacheKey);
      if (cached) return cached;

      try {
        const caseDir = await rootHandle.getDirectoryHandle(caseSlug);
        const assetsDir = await caseDir.getDirectoryHandle('assets');
        const fileHandle = await assetsDir.getFileHandle(cleanName);
        const file = await fileHandle.getFile();
        const bytes = await readBlobAsBytes(file);
        const mimeType = inferAssetMimeType(cleanName);
        const blob = new Blob([bytes], { type: mimeType });
        const url =
          typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(blob)
            : `blob:fsa/${caseSlug}/${normalized}`;
        assetUrlCache.set(cacheKey, url);
        if (mimeType === 'application/pdf') {
          cachePdfBinary(url, bytes);
        }
        return url;
      } catch {
        return normalized;
      }
    },

    async exportCaseZip(caseSlug: string): Promise<Blob> {
      const boardData =
        (await this.loadCase(caseSlug)) ?? createInitialCaseState({ caseSlug });
      const assets: Array<{ relativePath: string; bytes: Uint8Array }> = [];

      try {
        const caseDir = await rootHandle.getDirectoryHandle(caseSlug);
        const assetsDir = await caseDir.getDirectoryHandle('assets');
        for await (const [fileName, handle] of assetsDir.entries()) {
          if (handle.kind !== 'file') continue;
          const file = await (handle as FileHandleLike).getFile();
          const bytes = await readBlobAsBytes(file);
          assets.push({
            relativePath: `assets/${fileName}`,
            bytes,
          });
        }
      } catch {
        // No assets directory
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
