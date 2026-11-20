import { strFromU8, strToU8, unzipSync, zipSync, Zippable } from 'fflate';
import { AssetRecord, CaseState, WorkspaceStorageAdapter } from '../domain/types';

export interface CaseZipAssetEntry {
  relativePath: string;
  filename: string;
  mimeType: AssetRecord['mimeType'];
  bytes: Uint8Array;
}

export interface UnpackedCaseZip {
  boardData: CaseState;
  boardJsonText: string;
  assets: CaseZipAssetEntry[];
}

export async function readBlobAsBytes(file: File | Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        resolve(new Uint8Array());
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsArrayBuffer(file);
  });
}

export function inferAssetMimeType(filename: string): AssetRecord['mimeType'] {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'application/pdf';
}

export function formatBoardJson(boardData: CaseState): string {
  return `${JSON.stringify(boardData, null, 2)}\n`;
}

/**
 * Packs a Case (`board.json` formatted with 2 spaces + all binary files in `assets/<filename>`)
 * into a standard `.case.zip` Blob.
 */
export async function packCaseZip(
  boardData: CaseState,
  assets: Array<{ relativePath: string; bytes: Uint8Array }>
): Promise<Blob> {
  const boardJsonText = formatBoardJson(boardData);
  const files: Zippable = {
    'board.json': strToU8(boardJsonText),
  };

  for (const asset of assets) {
    const cleanPath = asset.relativePath.replace(/^\/+/, '');
    const normalizedPath = cleanPath.startsWith('assets/')
      ? cleanPath
      : `assets/${cleanPath}`;
    files[normalizedPath] = asset.bytes;
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

/**
 * Unpacks a `.case.zip` archive (or plain JSON fallback) into `boardData` (`board.json`)
 * and all binary `assets/<filename>` entries.
 */
export async function unpackCaseZip(zipFile: File | Blob): Promise<UnpackedCaseZip> {
  const rawBytes = await readBlobAsBytes(zipFile);

  // Check for PKZIP signature (0x50 0x4b)
  const isZip =
    rawBytes.byteLength >= 4 && rawBytes[0] === 0x50 && rawBytes[1] === 0x4b;

  if (!isZip) {
    const boardJsonText = strFromU8(rawBytes);
    const boardData = JSON.parse(boardJsonText) as CaseState;
    return {
      boardData,
      boardJsonText,
      assets: [],
    };
  }

  const entries = unzipSync(rawBytes);

  // Locate board.json (either at root `board.json` or `<case-slug>/board.json`)
  const boardEntryKey = Object.keys(entries).find(
    (k) => k === 'board.json' || k.endsWith('/board.json')
  );

  if (!boardEntryKey) {
    throw new Error('Invalid .case.zip archive: missing board.json');
  }

  const boardJsonText = strFromU8(entries[boardEntryKey]);
  const boardData = JSON.parse(boardJsonText) as CaseState;

  const assets: CaseZipAssetEntry[] = [];
  for (const [entryPath, bytes] of Object.entries(entries)) {
    if (entryPath === boardEntryKey || entryPath.endsWith('/')) continue;
    const assetsIndex = entryPath.indexOf('assets/');
    if (assetsIndex === -1) continue;
    const relativePath = entryPath.slice(assetsIndex);
    const filename = relativePath.replace(/^assets\//, '');
    if (!filename) continue;

    const declaredRecord = boardData.assets?.find(
      (a) => a.relativePath === relativePath || a.filename === filename
    );

    assets.push({
      relativePath,
      filename,
      mimeType: declaredRecord?.mimeType ?? inferAssetMimeType(filename),
      bytes,
    });
  }

  return {
    boardData,
    boardJsonText,
    assets,
  };
}

/**
 * Unpacks a `.case.zip` archive and persists its binary assets and `board.json` into a target `WorkspaceStorageAdapter`.
 */
export async function importCaseZipIntoAdapter(
  adapter: Pick<WorkspaceStorageAdapter, 'saveAsset' | 'saveCase'>,
  zipFile: File | Blob
): Promise<CaseState> {
  const unpacked = await unpackCaseZip(zipFile);
  const boardData = structuredClone(unpacked.boardData);

  for (const entry of unpacked.assets) {
    const blob = new Blob([entry.bytes], { type: entry.mimeType });
    await adapter.saveAsset(boardData.caseSlug, blob, entry.filename);
  }

  await adapter.saveCase(boardData.caseSlug, boardData);
  return structuredClone(boardData);
}
