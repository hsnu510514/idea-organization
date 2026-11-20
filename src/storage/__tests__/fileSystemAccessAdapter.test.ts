import { describe, expect, it } from 'vitest';
import { createInitialCaseState } from '../../domain/caseStore';
import {
  createFileSystemAccessAdapter,
  DirectoryHandleLike,
  FileHandleLike,
} from '../fileSystemAccessAdapter';
import { readBlobAsBytes } from '../caseZip';

function createMockDirectoryHandle(name = 'workspace-root'): DirectoryHandleLike & {
  inspectFileText(caseSlug: string, filePath: string): string | undefined;
} {
  const subdirs = new Map<string, ReturnType<typeof createMockDirectoryHandle>>();
  const files = new Map<string, Uint8Array>();

  const makeFileHandle = (fileName: string): FileHandleLike => ({
    kind: 'file',
    name: fileName,
    async getFile() {
      const bytes = files.get(fileName) ?? new Uint8Array();
      return new File([bytes], fileName);
    },
    async createWritable() {
      return {
        async write(data: string | BufferSource | Blob) {
          if (typeof data === 'string') {
            files.set(fileName, new TextEncoder().encode(data));
          } else if (data instanceof Uint8Array) {
            files.set(fileName, new Uint8Array(data));
          } else if (data instanceof ArrayBuffer) {
            files.set(fileName, new Uint8Array(data));
          } else if (ArrayBuffer.isView(data)) {
            files.set(
              fileName,
              new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            );
          } else if (data instanceof Blob) {
            files.set(fileName, new Uint8Array(await data.arrayBuffer()));
          }
        },
        async close() {
          // no-op
        },
      };
    },
  });

  const handle: DirectoryHandleLike & {
    inspectFileText(caseSlug: string, filePath: string): string | undefined;
  } = {
    kind: 'directory',
    name,
    async getDirectoryHandle(dirName: string, options?: { create?: boolean }) {
      let existing = subdirs.get(dirName);
      if (!existing) {
        if (!options?.create) {
          throw new Error(`Directory not found: ${dirName}`);
        }
        existing = createMockDirectoryHandle(dirName);
        subdirs.set(dirName, existing);
      }
      return existing;
    },
    async getFileHandle(fileName: string, options?: { create?: boolean }) {
      if (!files.has(fileName) && !options?.create) {
        throw new Error(`File not found: ${fileName}`);
      }
      return makeFileHandle(fileName);
    },
    async removeEntry(entryName: string) {
      subdirs.delete(entryName);
      files.delete(entryName);
    },
    async *entries() {
      for (const [k, dir] of subdirs.entries()) {
        yield [k, dir] as [string, DirectoryHandleLike];
      }
      for (const [k] of files.entries()) {
        yield [k, makeFileHandle(k)] as [string, FileHandleLike];
      }
    },
    inspectFileText(caseSlug: string, filePath: string) {
      const caseDir = subdirs.get(caseSlug);
      if (!caseDir) return undefined;
      if (filePath === 'board.json') {
        // Read via sync helper from closure
        return undefined;
      }
      return undefined;
    },
  };

  return handle;
}

describe('FileSystemAccessAdapter — Browser showDirectoryPicker (<case-slug>/board.json + assets/)', () => {
  it('reads and writes <case-slug>/board.json (2-space formatted) and <case-slug>/assets/<filename> via DirectoryHandle and supports .case.zip round-trip', async () => {
    const rootDir = createMockDirectoryHandle('detective-workspace');
    const adapter = createFileSystemAccessAdapter(rootDir);

    const caseState = createInitialCaseState({
      caseSlug: 'case-77-lighthouse',
      caseTitle: 'CASE #77 — LIGHTHOUSE KEEPER DISAPPEARANCE',
      assets: [],
    });

    await adapter.saveCase(caseState.caseSlug, caseState);

    // Check raw board.json inside the directory handle is formatted with 2-space indentation
    const caseDirHandle = await rootDir.getDirectoryHandle('case-77-lighthouse');
    const boardFileHandle = await caseDirHandle.getFileHandle('board.json');
    const boardFile = await boardFileHandle.getFile();
    const rawJson = new TextDecoder().decode(await readBlobAsBytes(boardFile));
    expect(rawJson).toContain(
      '{\n  "caseSlug": "case-77-lighthouse",\n  "caseTitle": "CASE #77 — LIGHTHOUSE KEEPER DISAPPEARANCE"'
    );

    // Save binary asset into <case-slug>/assets/<filename>
    const imgBytes = new Uint8Array([10, 20, 30, 40, 50]);
    const imgFile = new File([imgBytes], 'lighthouse-lens.png', {
      type: 'image/png',
    });
    const assetRecord = await adapter.saveAsset(
      'case-77-lighthouse',
      imgFile,
      'lighthouse-lens.png'
    );
    expect(assetRecord.relativePath).toBe('assets/lighthouse-lens.png');

    await adapter.saveCase('case-77-lighthouse', {
      ...caseState,
      assets: [assetRecord],
    });

    const cases = await adapter.listCases();
    expect(cases).toEqual([
      {
        caseSlug: 'case-77-lighthouse',
        caseTitle: 'CASE #77 — LIGHTHOUSE KEEPER DISAPPEARANCE',
      },
    ]);

    const loaded = await adapter.loadCase('case-77-lighthouse');
    expect(loaded?.caseTitle).toBe('CASE #77 — LIGHTHOUSE KEEPER DISAPPEARANCE');
    expect(loaded?.assets).toHaveLength(1);

    const assetUrl = await adapter.loadAssetUrl(
      'case-77-lighthouse',
      'assets/lighthouse-lens.png'
    );
    expect(assetUrl).toBeTruthy();

    // Export .case.zip, delete Case, and re-import .case.zip
    const zipBlob = await adapter.exportCaseZip('case-77-lighthouse');
    await adapter.deleteCase('case-77-lighthouse');
    expect(await adapter.loadCase('case-77-lighthouse')).toBeNull();

    const restored = await adapter.importCaseZip(zipBlob);
    expect(restored.caseSlug).toBe('case-77-lighthouse');
    expect(restored.assets).toHaveLength(1);
  });
});
