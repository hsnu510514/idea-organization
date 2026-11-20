import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createInitialCaseState } from '../../domain/caseStore';
import { createNodeDiskWorkspaceService } from '../viteWorkspacePlugin';
import { createLocalDiskWorkspaceAdapter } from '../localDiskWorkspaceAdapter';

describe('Vite Local Disk Middleware & LocalDiskWorkspaceAdapter — ./workspace/<case-slug>/board.json + assets/', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'murder-board-workspace-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('writes formatted 2-space board.json and deduplicated binary assets/<filename> directly to disk, lists/loads/deletes Cases, and round-trips through HTTP client adapter + .case.zip', async () => {
    const diskService = createNodeDiskWorkspaceService(tempRoot);

    const case1 = createInitialCaseState({
      caseSlug: 'case-101-harbor',
      caseTitle: 'CASE #101 — HARBOR SILT',
    });
    const case2 = createInitialCaseState({
      caseSlug: 'case-202-foundry',
      caseTitle: 'CASE #202 — OLD FOUNDRY FIRE',
    });

    await diskService.saveCase(case1.caseSlug, case1);
    await diskService.saveCase(case2.caseSlug, case2);

    // Verify `<tempRoot>/case-101-harbor/board.json` exists on disk and is formatted with 2-space indentation
    const boardJsonPath = path.join(tempRoot, 'case-101-harbor', 'board.json');
    const rawBoardJson = await fs.readFile(boardJsonPath, 'utf-8');
    expect(rawBoardJson).toContain('{\n  "caseSlug": "case-101-harbor",\n  "caseTitle": "CASE #101 — HARBOR SILT"');

    // Save binary PDF asset to disk
    const pdfBytes = new TextEncoder().encode('%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n%%EOF');
    const assetRecord = await diskService.saveAssetBytes(
      'case-101-harbor',
      'forensics-ledger.pdf',
      pdfBytes,
      'application/pdf'
    );
    expect(assetRecord.relativePath).toBe('assets/forensics-ledger.pdf');

    const assetDiskPath = path.join(
      tempRoot,
      'case-101-harbor',
      'assets',
      'forensics-ledger.pdf'
    );
    const savedBytes = await fs.readFile(assetDiskPath);
    expect(Array.from(savedBytes)).toEqual(Array.from(pdfBytes));

    // List cases from disk
    const summaries = await diskService.listCases();
    expect(summaries.map((s) => s.caseSlug).sort()).toEqual([
      'case-101-harbor',
      'case-202-foundry',
    ]);

    // Test LocalDiskWorkspaceAdapter talking to the middleware handler via custom fetch
    const clientAdapter = createLocalDiskWorkspaceAdapter({
      baseUrl: '/api/workspace',
      fetchImpl: (input, init) => diskService.handleFetchRequest(String(input), init),
    });

    const clientList = await clientAdapter.listCases();
    expect(clientList).toHaveLength(2);

    const loadedCase1 = await clientAdapter.loadCase('case-101-harbor');
    expect(loadedCase1?.caseTitle).toBe('CASE #101 — HARBOR SILT');

    // Upload image asset via client adapter
    const imgFile = new File([new Uint8Array([1, 2, 3, 4])], 'dock-gate.png', {
      type: 'image/png',
    });
    const savedImgRecord = await clientAdapter.saveAsset(
      'case-101-harbor',
      imgFile,
      'dock-gate.png'
    );
    expect(savedImgRecord.relativePath).toBe('assets/dock-gate.png');

    // Update case with both assets via clientAdapter.saveCase
    const updatedCase1 = {
      ...loadedCase1!,
      assets: [assetRecord, savedImgRecord],
    };
    await clientAdapter.saveCase('case-101-harbor', updatedCase1);

    // Export .case.zip via clientAdapter and import into a second clean disk directory
    const exportedZip = await clientAdapter.exportCaseZip('case-101-harbor');
    expect(exportedZip.size).toBeGreaterThan(0);

    // Delete case-101-harbor via clientAdapter
    await clientAdapter.deleteCase('case-101-harbor');
    expect(await clientAdapter.loadCase('case-101-harbor')).toBeNull();

    // Re-import from exportedZip via clientAdapter
    const reimported = await clientAdapter.importCaseZip(exportedZip);
    expect(reimported.caseSlug).toBe('case-101-harbor');
    expect(reimported.assets).toHaveLength(2);

    // Verify both binary assets were restored back to disk
    const restoredPdf = await fs.readFile(assetDiskPath);
    expect(Array.from(restoredPdf)).toEqual(Array.from(pdfBytes));
  });
});
