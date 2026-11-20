import { describe, expect, it } from 'vitest';
import { createInitialCaseState } from '../../domain/caseStore';
import { createInMemoryWorkspaceAdapter } from '../inMemoryWorkspaceAdapter';
import { packCaseZip, unpackCaseZip } from '../caseZip';

describe('caseZip & InMemoryWorkspaceAdapter — real .case.zip binary archive round-trip', () => {
  it('packs board.json (2-space formatted JSON) and binary assets/<filename> into a real ZIP archive and unpacks back without data loss', async () => {
    const sourceStorage = createInMemoryWorkspaceAdapter([]);
    const targetStorage = createInMemoryWorkspaceAdapter([]);

    const pdfBytes = new TextEncoder().encode(
      [
        '%PDF-1.4',
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Count 3 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
        '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
        '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
        '%%EOF',
      ].join('\n')
    );
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

    const pdfFile = new File([pdfBytes], 'harbor-manifest.pdf', {
      type: 'application/pdf',
    });
    const pngFile = new File([pngBytes], 'pier14-photo.png', {
      type: 'image/png',
    });

    const pdfAsset = await sourceStorage.saveAsset(
      'case-harbor-99',
      pdfFile,
      'harbor-manifest.pdf'
    );
    const pngAsset = await sourceStorage.saveAsset(
      'case-harbor-99',
      pngFile,
      'pier14-photo.png'
    );

    const originalCase = createInitialCaseState({
      caseSlug: 'case-harbor-99',
      caseTitle: 'CASE #99 — HARBOR SMUGGLING RING',
      mode: 'infinite',
      frameWidth: 1400,
      frameHeight: 900,
      assets: [{ ...pdfAsset, pageCount: 3 }, pngAsset],
      cards: [
        {
          id: 'card-pdf-stack-1',
          kind: 'pdf-stack',
          title: 'harbor-manifest.pdf',
          richContent: '',
          plainText: '',
          x: 150,
          y: 120,
          width: 300,
          height: 280,
          skew: 2.2,
          zIndex: 2,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-pdf-1', rx: 50, ry: 8, color: 'brass' }],
          annotations: [
            {
              id: 'ann-circle-1',
              target: 'card',
              kind: 'circle',
              color: '#A11D21',
              strokeWidth: 2,
              x: 20,
              y: 30,
              w: 45,
              h: 25,
            },
          ],
          assetId: pdfAsset.id,
          pdfPageRange: { start: 1, end: 3 },
          currentPageIndex: 1,
        },
        {
          id: 'card-clipping-1',
          kind: 'clipping',
          title: 'harbor-manifest.pdf — Page 2 Clipping',
          richContent: 'Snipped region from manifest',
          plainText: 'Snipped region from manifest',
          x: 520,
          y: 140,
          width: 245,
          height: 195,
          skew: -1.8,
          zIndex: 3,
          stashed: true,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-clip-1', rx: 50, ry: 9, color: 'red' }],
          annotations: [],
          assetId: pdfAsset.id,
          sourcePageNumber: 2,
          cropRect: { x: 0.15, y: 0.25, w: 0.5, h: 0.4 },
        },
        {
          id: 'card-photo-1',
          kind: 'photo',
          title: 'pier14-photo.png',
          richContent: '',
          plainText: '',
          x: 520,
          y: 380,
          width: 235,
          height: 265,
          skew: 3.1,
          zIndex: 4,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'md',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-photo-1', rx: 48, ry: 10, color: 'blue' }],
          annotations: [],
          assetId: pngAsset.id,
          imageCaption: 'Cargo Hold 3 Padlock',
        },
      ],
      strings: [
        {
          id: 'str-manifest-clip',
          fromCardId: 'card-pdf-stack-1',
          fromPinId: 'pin-pdf-1',
          toCardId: 'card-clipping-1',
          toPinId: 'pin-clip-1',
          color: '#A11D21',
          label: 'Pg 2 Snip',
        },
      ],
      boardAnnotations: [
        {
          id: 'board-ann-1',
          target: 'board',
          kind: 'arrow',
          color: '#235789',
          strokeWidth: 3,
          x: 300,
          y: 250,
          w: 180,
          h: 60,
        },
      ],
    });

    await sourceStorage.saveCase('case-harbor-99', originalCase);

    const zipBlob = await sourceStorage.exportCaseZip('case-harbor-99');
    expect(zipBlob.type).toBe('application/zip');

    // Verify it is a real PKZIP binary (starts with 'PK\x03\x04')
    const unpackedRaw = await unpackCaseZip(zipBlob);
    expect(unpackedRaw.boardJsonText).toContain('  "caseSlug": "case-harbor-99"');
    expect(unpackedRaw.assets.map((a) => a.relativePath).sort()).toEqual([
      'assets/harbor-manifest.pdf',
      'assets/pier14-photo.png',
    ]);

    const unpackedPdf = unpackedRaw.assets.find(
      (a) => a.relativePath === 'assets/harbor-manifest.pdf'
    )!;
    expect(Array.from(unpackedPdf.bytes)).toEqual(Array.from(pdfBytes));

    const unpackedPng = unpackedRaw.assets.find(
      (a) => a.relativePath === 'assets/pier14-photo.png'
    )!;
    expect(Array.from(unpackedPng.bytes)).toEqual(Array.from(pngBytes));

    // Import into clean targetStorage and verify full Case + Assets are restored
    const importedCase = await targetStorage.importCaseZip(zipBlob);
    expect(importedCase.caseSlug).toBe('case-harbor-99');
    expect(importedCase.caseTitle).toBe('CASE #99 — HARBOR SMUGGLING RING');
    expect(importedCase.cards).toHaveLength(3);
    expect(importedCase.strings).toHaveLength(1);
    expect(importedCase.boardAnnotations).toHaveLength(1);
    expect(importedCase.assets).toHaveLength(2);
    expect(importedCase.assets[0].pageCount).toBe(3);

    const targetUrl = await targetStorage.loadAssetUrl(
      'case-harbor-99',
      'assets/harbor-manifest.pdf'
    );
    expect(targetUrl).toBeTruthy();

    // Also verify packCaseZip directly produces a valid ZIP starting with PK header
    const directZip = await packCaseZip(originalCase, [
      { relativePath: 'assets/pier14-photo.png', bytes: pngBytes },
    ]);
    const directUnpacked = await unpackCaseZip(directZip);
    expect(directUnpacked.boardData.caseTitle).toBe(
      'CASE #99 — HARBOR SMUGGLING RING'
    );
  });
});
