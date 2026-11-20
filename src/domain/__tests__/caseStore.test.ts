import { describe, expect, it } from 'vitest';
import {
  generateHumanSkew,
  createInitialCaseState,
  caseReducer,
  caseActions,
  getOutOfBoundsCards,
  getPinBoardCoords,
  findNearestPinOnCard,
} from '../caseStore';
import { drawCroppedPageToCanvas } from '../../components/PdfPageCanvas';
import { createDefaultWorkspaceAdapter } from '../../storage/localDiskWorkspaceAdapter';

describe('caseStore — human skew generation & card spawning', () => {
  it('generateHumanSkew produces angles strictly between -5.5 and +5.5 excluding |skew| < 1.2', () => {
    for (let i = 0; i <= 100; i++) {
      const rng = () => i / 100;
      const skew = generateHumanSkew(rng);
      expect(skew).toBeGreaterThanOrEqual(-5.5);
      expect(skew).toBeLessThanOrEqual(5.5);
      expect(Math.abs(skew)).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('spawns Sticky Note, A4 Document, Index Card, and Newspaper Clipping with human skew and default pin', () => {
    let state = createInitialCaseState({ cards: [], strings: [] });
    state = caseReducer(state, caseActions.spawnCard({ kind: 'sticky', x: 120, y: 140 }));
    expect(state.cards).toHaveLength(1);
    const sticky = state.cards[0];
    expect(sticky.kind).toBe('sticky');
    expect(sticky.paperColor).toBe('yellow');
    expect(sticky.x).toBe(120);
    expect(sticky.y).toBe(140);
    expect(Math.abs(sticky.skew)).toBeGreaterThanOrEqual(1.2);
    expect(Math.abs(sticky.skew)).toBeLessThanOrEqual(5.5);
    expect(sticky.pins).toHaveLength(1);

    state = caseReducer(state, caseActions.spawnCard({ kind: 'a4' }));
    state = caseReducer(state, caseActions.spawnCard({ kind: 'index-card' }));
    state = caseReducer(state, caseActions.spawnCard({ kind: 'newspaper' }));
    expect(state.cards.map((c) => c.kind)).toEqual([
      'sticky',
      'a4',
      'index-card',
      'newspaper',
    ]);
  });

  it('supports single-card straighten (0°), custom manual rotation angle, and bulk Align All (0°)', () => {
    let state = createInitialCaseState({ cards: [], strings: [] });
    state = caseReducer(
      state,
      caseActions.spawnCard({ id: 'c1', kind: 'sticky', skew: -4.2 })
    );
    state = caseReducer(
      state,
      caseActions.spawnCard({ id: 'c2', kind: 'a4', skew: 3.7 })
    );

    // Straighten single card
    state = caseReducer(state, caseActions.straightenCard('c1'));
    expect(state.cards.find((c) => c.id === 'c1')?.skew).toBe(0);
    expect(state.cards.find((c) => c.id === 'c2')?.skew).toBe(3.7);

    // Custom manual rotation angle
    state = caseReducer(state, caseActions.setCardSkew('c1', -12.5));
    expect(state.cards.find((c) => c.id === 'c1')?.skew).toBe(-12.5);

    // Bulk Align All (0°)
    state = caseReducer(state, caseActions.alignAllCards());
    expect(state.cards.every((c) => c.skew === 0)).toBe(true);
  });

  it('switches between Infinite and Bounded modes without clamping coordinates, detects out-of-bounds Cards, and auto-fits frame', () => {
    let state = createInitialCaseState({
      mode: 'infinite',
      frameWidth: 1000,
      frameHeight: 600,
      cards: [],
      strings: [],
    });
    state = caseReducer(
      state,
      caseActions.spawnCard({
        id: 'far-card',
        kind: 'newspaper',
        x: 1350,
        y: 720,
        width: 260,
        height: 220,
      })
    );

    // Switch to Bounded Mode: coordinates must be untouched
    state = caseReducer(state, caseActions.setMode('bounded'));
    const farCard = state.cards.find((c) => c.id === 'far-card')!;
    expect(farCard.x).toBe(1350);
    expect(farCard.y).toBe(720);

    // Out-of-bounds detection
    const oob = getOutOfBoundsCards(state);
    expect(oob.map((c) => c.id)).toEqual(['far-card']);

    // Expand frame to fit all Cards without mutating existing Card coordinates
    state = caseReducer(state, caseActions.autoFitFrame());
    expect(state.frameWidth).toBeGreaterThanOrEqual(1350 + 260);
    expect(state.frameHeight).toBeGreaterThanOrEqual(720 + 220);
    expect(getOutOfBoundsCards(state)).toHaveLength(0);

    // Even when a Card has negative coordinates, AUTO_FIT_FRAME must NOT mutate Card (x, y)
    state = caseReducer(
      state,
      caseActions.spawnCard({
        id: 'neg-card',
        kind: 'sticky',
        x: -140,
        y: -95,
        width: 210,
        height: 190,
      })
    );
    state = caseReducer(state, caseActions.autoFitFrame());
    const negCardAfterFit = state.cards.find((c) => c.id === 'neg-card')!;
    const farCardAfterFit = state.cards.find((c) => c.id === 'far-card')!;
    expect(negCardAfterFit.x).toBe(-140);
    expect(negCardAfterFit.y).toBe(-95);
    expect(farCardAfterFit.x).toBe(1350);
    expect(farCardAfterFit.y).toBe(720);
  });

  it('clamps zoom strictly between 0.35x and 2.2x and supports moving and resizing cards', () => {
    let state = createInitialCaseState({ cards: [], strings: [] });
    state = caseReducer(state, caseActions.setZoom(0.1));
    expect(state.zoom).toBe(0.35);
    state = caseReducer(state, caseActions.setZoom(3.5));
    expect(state.zoom).toBe(2.2);
    state = caseReducer(state, caseActions.setZoom(1.4));
    expect(state.zoom).toBe(1.4);

    state = caseReducer(
      state,
      caseActions.spawnCard({ id: 'c1', kind: 'index-card', x: 100, y: 100, width: 250, height: 180 })
    );
    state = caseReducer(state, caseActions.moveCard('c1', 240, 310));
    expect(state.cards[0].x).toBe(240);
    expect(state.cards[0].y).toBe(310);

    state = caseReducer(state, caseActions.resizeCard('c1', 340, 260));
    expect(state.cards[0].width).toBe(340);
    expect(state.cards[0].height).toBe(260);
  });

  it('adds extra Pins in selectable colors (red, brass, blue, black), clamps Pin coordinates to 4%..96%, and computes rotation-aware Pin board coordinates and nearest Pin snapping', () => {
    let state = createInitialCaseState({ cards: [], strings: [] });
    state = caseReducer(
      state,
      caseActions.spawnCard({
        id: 'card-a',
        kind: 'a4',
        x: 100,
        y: 200,
        width: 200,
        height: 100,
        skew: 0,
      })
    );

    // Default pin is present
    expect(state.cards[0].pins).toHaveLength(1);

    // Add extra pins with explicit selectable colors
    state = caseReducer(state, caseActions.addPin('card-a', { color: 'blue' }));
    state = caseReducer(state, caseActions.addPin('card-a', { color: 'black' }));
    state = caseReducer(state, caseActions.addPin('card-a', { color: 'red' }));
    state = caseReducer(state, caseActions.addPin('card-a', { color: 'brass' }));

    const pinColors = state.cards[0].pins.slice(1).map((p) => p.color);
    expect(pinColors).toEqual(['blue', 'black', 'red', 'brass']);

    // Move pin and verify clamping to 4%..96%
    const firstPinId = state.cards[0].pins[0].id;
    state = caseReducer(state, caseActions.movePin('card-a', firstPinId, -15, 112));
    expect(state.cards[0].pins[0].rx).toBe(4);
    expect(state.cards[0].pins[0].ry).toBe(96);

    // Rotation-aware getPinBoardCoords:
    // Card center is (100 + 100, 200 + 50) = (200, 250).
    // Place pin at rx=100, ry=50 (right edge middle: localX = +100, localY = 0)
    state = caseReducer(state, caseActions.movePin('card-a', firstPinId, 96, 50));
    state = caseReducer(state, caseActions.setCardSkew('card-a', 90));
    const rotatedCard = state.cards[0];
    const rotatedPin = rotatedCard.pins[0];
    // localX = (96/100)*200 - 100 = 92, localY = 0. Rotated +90 deg: x = 200 - 0 = 200, y = 250 + 92 = 342
    const coords = getPinBoardCoords(rotatedCard, rotatedPin);
    expect(coords.x).toBeCloseTo(200, 1);
    expect(coords.y).toBeCloseTo(342, 1);

    // Nearest pin on card calculation
    const targetCard = {
      ...rotatedCard,
      skew: 0,
      pins: [
        { id: 'pin-left', rx: 10, ry: 50, color: 'red' as const }, // (120, 250)
        { id: 'pin-right', rx: 90, ry: 50, color: 'blue' as const }, // (280, 250)
      ],
    };
    expect(findNearestPinOnCard(targetCard, { x: 135, y: 245 })?.id).toBe('pin-left');
    expect(findNearestPinOnCard(targetCard, { x: 265, y: 255 })?.id).toBe('pin-right');
  });

  it('adds, selects, moves, resizes, and deletes Card-bound and Board-bound Annotations', () => {
    let state = createInitialCaseState({
      cards: [],
      strings: [],
      boardAnnotations: [],
    });
    state = caseReducer(
      state,
      caseActions.spawnCard({ id: 'card-1', kind: 'a4', x: 200, y: 100, width: 300, height: 350 })
    );

    // Add Card-bound Annotation (normalized 0..100 percentages)
    state = caseReducer(
      state,
      caseActions.addAnnotation({
        cardId: 'card-1',
        annotation: {
          id: 'ann-card-1',
          target: 'card',
          kind: 'circle',
          color: '#A11D21',
          strokeWidth: 2,
          x: 15,
          y: 25,
          w: 40,
          h: 20,
        },
      })
    );
    expect(state.cards[0].annotations).toHaveLength(1);
    expect(state.cards[0].annotations[0]).toMatchObject({
      id: 'ann-card-1',
      target: 'card',
      x: 15,
      y: 25,
      w: 40,
      h: 20,
    });

    // Add Board-bound Annotation
    state = caseReducer(
      state,
      caseActions.addAnnotation({
        annotation: {
          id: 'ann-board-1',
          target: 'board',
          kind: 'freehand',
          color: '#235789',
          strokeWidth: 3,
          x: 500,
          y: 300,
          w: 120,
          h: 80,
          points: [
            { x: 500, y: 300 },
            { x: 560, y: 340 },
            { x: 620, y: 380 },
          ],
        },
      })
    );
    expect(state.boardAnnotations).toHaveLength(1);
    expect(state.boardAnnotations[0].id).toBe('ann-board-1');

    // Select Annotation
    state = caseReducer(state, caseActions.selectAnnotation('ann-card-1'));
    expect(state.selectedAnnotationId).toBe('ann-card-1');

    // Move Card-bound Annotation
    state = caseReducer(
      state,
      caseActions.moveAnnotation({
        annotationId: 'ann-card-1',
        cardId: 'card-1',
        x: 22,
        y: 34,
      })
    );
    expect(state.cards[0].annotations[0].x).toBe(22);
    expect(state.cards[0].annotations[0].y).toBe(34);

    // Move Board-bound freehand Annotation (shifts bounding box and points)
    state = caseReducer(
      state,
      caseActions.moveAnnotation({
        annotationId: 'ann-board-1',
        x: 520,
        y: 310,
      })
    );
    expect(state.boardAnnotations[0].x).toBe(520);
    expect(state.boardAnnotations[0].y).toBe(310);
    expect(state.boardAnnotations[0].points?.[0]).toEqual({ x: 520, y: 310 });

    // Resize Card-bound Annotation
    state = caseReducer(
      state,
      caseActions.resizeAnnotation({
        annotationId: 'ann-card-1',
        cardId: 'card-1',
        w: 55,
        h: 28,
      })
    );
    expect(state.cards[0].annotations[0].w).toBe(55);
    expect(state.cards[0].annotations[0].h).toBe(28);

    // Delete Card-bound Annotation
    state = caseReducer(
      state,
      caseActions.deleteAnnotation({ annotationId: 'ann-card-1', cardId: 'card-1' })
    );
    expect(state.cards[0].annotations).toHaveLength(0);
    expect(state.selectedAnnotationId).toBeNull();

    // Delete Board-bound Annotation
    state = caseReducer(
      state,
      caseActions.deleteAnnotation({ annotationId: 'ann-board-1' })
    );
    expect(state.boardAnnotations).toHaveLength(0);
  });

  it('registers deduplicated Assets, flips PDF Stack pages within configured pdfPageRange, pulls a single page into a linked Card, and snips a region into a linked Clipping Card', () => {
    let state = createInitialCaseState({
      cards: [],
      strings: [],
      assets: [],
      activeYarnColor: '#A11D21',
    });

    const pdfAsset = {
      id: 'asset-harbor-manifest-pdf',
      filename: 'harbor-manifest.pdf',
      mimeType: 'application/pdf' as const,
      relativePath: 'assets/harbor-manifest.pdf',
      pageCount: 5,
    };

    // Deduplicated asset registration
    state = caseReducer(state, caseActions.registerAsset(pdfAsset));
    state = caseReducer(state, caseActions.registerAsset(pdfAsset));
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0]).toEqual(pdfAsset);

    // Spawn a PDF Stack with custom page range 2..4
    state = caseReducer(
      state,
      caseActions.spawnCard({
        id: 'pdf-stack-1',
        kind: 'pdf-stack',
        title: 'harbor-manifest.pdf',
        assetId: pdfAsset.id,
        pdfPageRange: { start: 2, end: 4 },
        currentPageIndex: 0,
        x: 200,
        y: 120,
      })
    );

    const stack0 = state.cards.find((c) => c.id === 'pdf-stack-1')!;
    expect(stack0.pdfPageRange).toEqual({ start: 2, end: 4 });
    expect(stack0.currentPageIndex).toBe(0);

    // Flip prev at start stays at index 0 (page 2)
    state = caseReducer(state, caseActions.flipPdfPage('pdf-stack-1', 'prev'));
    expect(state.cards.find((c) => c.id === 'pdf-stack-1')?.currentPageIndex).toBe(0);

    // Flip next advances through range (0 -> 1 -> 2) and clamps at max (index 2 = page 4)
    state = caseReducer(state, caseActions.flipPdfPage('pdf-stack-1', 'next'));
    expect(state.cards.find((c) => c.id === 'pdf-stack-1')?.currentPageIndex).toBe(1);
    state = caseReducer(state, caseActions.flipPdfPage('pdf-stack-1', 'next'));
    expect(state.cards.find((c) => c.id === 'pdf-stack-1')?.currentPageIndex).toBe(2);
    state = caseReducer(state, caseActions.flipPdfPage('pdf-stack-1', 'next'));
    expect(state.cards.find((c) => c.id === 'pdf-stack-1')?.currentPageIndex).toBe(2);

    // Flip prev back to index 1 (which corresponds to page 3)
    state = caseReducer(state, caseActions.flipPdfPage('pdf-stack-1', 'prev'));
    expect(state.cards.find((c) => c.id === 'pdf-stack-1')?.currentPageIndex).toBe(1);

    // Pull Page extracts the currently viewed PDF page (page 3) into a linked standalone Card beside the stack
    state = caseReducer(
      state,
      caseActions.pullPdfPage({
        stackCardId: 'pdf-stack-1',
        newCardId: 'pulled-page-3',
      })
    );
    expect(state.cards).toHaveLength(2);
    const originalStack = state.cards.find((c) => c.id === 'pdf-stack-1')!;
    const pulledCard = state.cards.find((c) => c.id === 'pulled-page-3')!;
    expect(originalStack.pdfPageRange).toEqual({ start: 2, end: 4 });
    expect(originalStack.currentPageIndex).toBe(1);
    expect(pulledCard.assetId).toBe(pdfAsset.id);
    expect(pulledCard.sourcePageNumber).toBe(3);
    expect(pulledCard.x).toBeGreaterThan(originalStack.x);

    // Automatically connected by a yarn String
    expect(state.strings).toHaveLength(1);
    expect(state.strings[0]).toMatchObject({
      fromCardId: 'pdf-stack-1',
      toCardId: 'pulled-page-3',
      color: '#A11D21',
    });

    // Snip Region spawns a Clipping Card for the active page with normalized cropRect and yarn String
    state = caseReducer(
      state,
      caseActions.snipPdfRegion({
        stackCardId: 'pdf-stack-1',
        newCardId: 'snip-clip-1',
        cropRect: { x: 0.15, y: 0.25, w: 0.5, h: 0.35 },
      })
    );
    expect(state.cards).toHaveLength(3);
    const clipCard = state.cards.find((c) => c.id === 'snip-clip-1')!;
    expect(clipCard.kind).toBe('clipping');
    expect(clipCard.assetId).toBe(pdfAsset.id);
    expect(clipCard.sourcePageNumber).toBe(3);
    expect(clipCard.cropRect).toEqual({ x: 0.15, y: 0.25, w: 0.5, h: 0.35 });
    expect(state.strings).toHaveLength(2);
    expect(state.strings[1]).toMatchObject({
      fromCardId: 'pdf-stack-1',
      toCardId: 'snip-clip-1',
    });
  });

  it('stashes and restores Cards while preserving attached Strings in state, filters Cards by search query and CardKind, counts remembered Strings, and focuses/pans to an on-board Card', () => {
    let state = createInitialCaseState({
      panX: 0,
      panY: 0,
      zoom: 1,
      cards: [
        {
          id: 'c-hub',
          kind: 'a4',
          title: 'Central Suspect Dossier',
          richContent: 'Victor Vance harbor movements',
          plainText: 'Victor Vance harbor movements',
          x: 400,
          y: 200,
          width: 300,
          height: 300,
          skew: 0,
          zIndex: 1,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-hub', rx: 50, ry: 10, color: 'brass' }],
          annotations: [],
        },
        {
          id: 'c-1',
          kind: 'sticky',
          title: 'Alibi Note',
          richContent: 'Seen at Gate B',
          plainText: 'Seen at Gate B',
          x: 100,
          y: 100,
          width: 200,
          height: 180,
          skew: 0,
          zIndex: 2,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-1', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
        {
          id: 'c-2',
          kind: 'newspaper',
          title: 'Harbor Chronicle',
          richContent: 'Strike enters third week at Pier 14',
          plainText: 'Strike enters third week at Pier 14',
          x: 800,
          y: 120,
          width: 260,
          height: 220,
          skew: 0,
          zIndex: 3,
          stashed: false,
          paperColor: 'aged',
          defaultFontStyle: 'serif',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-2', rx: 50, ry: 10, color: 'black' }],
          annotations: [],
        },
        {
          id: 'c-3',
          kind: 'index-card',
          title: 'Diner Witness Clara',
          richContent: 'Manila envelope left on counter',
          plainText: 'Manila envelope left on counter',
          x: 150,
          y: 450,
          width: 250,
          height: 180,
          skew: 0,
          zIndex: 4,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'md',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-3', rx: 50, ry: 10, color: 'blue' }],
          annotations: [],
        },
      ],
      strings: [
        {
          id: 's-1',
          fromCardId: 'c-hub',
          fromPinId: 'p-hub',
          toCardId: 'c-1',
          toPinId: 'p-1',
          color: '#A11D21',
          label: 'Link 1',
        },
        {
          id: 's-2',
          fromCardId: 'c-hub',
          fromPinId: 'p-hub',
          toCardId: 'c-2',
          toPinId: 'p-2',
          color: '#D49A2A',
          label: 'Link 2',
        },
        {
          id: 's-3',
          fromCardId: 'c-3',
          fromPinId: 'p-3',
          toCardId: 'c-hub',
          toPinId: 'p-hub',
          color: '#235789',
          label: 'Link 3',
        },
      ],
    });

    // Stash c-hub which has 3 connected Strings
    state = caseReducer(state, caseActions.stashCard('c-hub'));
    const stashedHub = state.cards.find((c) => c.id === 'c-hub')!;
    expect(stashedHub.stashed).toBe(true);
    // All 3 StringData records remain intact in state.strings
    expect(state.strings).toHaveLength(3);

    // Restore c-hub -> stashed = false, zIndex promoted above max (4 -> 5), selectedCardId = 'c-hub'
    state = caseReducer(state, caseActions.restoreCard('c-hub'));
    const restoredHub = state.cards.find((c) => c.id === 'c-hub')!;
    expect(restoredHub.stashed).toBe(false);
    expect(restoredHub.zIndex).toBe(5);
    expect(state.selectedCardId).toBe('c-hub');

    // Focus and pan to c-2 (x=800, y=120, w=260, h=220 -> center=(930, 230)) in a 1200x800 viewport
    state = caseReducer(
      state,
      caseActions.focusCard({
        cardId: 'c-2',
        viewportWidth: 1200,
        viewportHeight: 800,
      })
    );
    expect(state.selectedCardId).toBe('c-2');
    expect(state.cards.find((c) => c.id === 'c-2')?.zIndex).toBe(6);
    expect(state.panX).toBe(Math.round(1200 / 2 - 930 * 1));
    expect(state.panY).toBe(Math.round(800 / 2 - 230 * 1));

    // Rename Case title
    state = caseReducer(
      state,
      caseActions.setCaseTitle('CASE #510 — SOUTH DOCK CONSPIRACY')
    );
    expect(state.caseTitle).toBe('CASE #510 — SOUTH DOCK CONSPIRACY');
  });

  it('crops a rendered PDF page canvas to a normalized cropRect via drawCroppedPageToCanvas and falls back cleanly in createDefaultWorkspaceAdapter when /api/workspace is offline', async () => {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 400;
    sourceCanvas.height = 600;
    const targetCanvas = document.createElement('canvas');
    let drawImageArgs: number[] = [];
    targetCanvas.getContext = (() => ({
      clearRect: () => {},
      drawImage: (_img: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => {
        drawImageArgs = [sx, sy, sw, sh, dx, dy, dw, dh];
      },
    })) as unknown as typeof targetCanvas.getContext;

    drawCroppedPageToCanvas(sourceCanvas, targetCanvas, {
      x: 0.25,
      y: 0.2,
      w: 0.5,
      h: 0.4,
    });

    expect(targetCanvas.width).toBe(200);
    expect(targetCanvas.height).toBe(240);
    expect(drawImageArgs).toEqual([100, 120, 200, 240, 0, 0, 200, 240]);

    // Verify createDefaultWorkspaceAdapter falls back seamlessly to in-memory storage when fetch fails
    const hybridAdapter = createDefaultWorkspaceAdapter({
      fetchImpl: async () => {
        throw new Error('Network offline');
      },
    });
    const testCase = createInitialCaseState({
      caseSlug: 'case-offline-fallback',
      caseTitle: 'OFFLINE FALLBACK CASE',
    });
    await hybridAdapter.saveCase(testCase.caseSlug, testCase);
    const loaded = await hybridAdapter.loadCase('case-offline-fallback');
    expect(loaded?.caseTitle).toBe('OFFLINE FALLBACK CASE');
  });
});
