import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createInMemoryWorkspaceAdapter } from '../../storage/inMemoryWorkspaceAdapter';
import { createInitialCaseState } from '../../domain/caseStore';
import { WorkspaceApp } from '../WorkspaceApp';

describe('WorkspaceApp — Ticket 1 Core Board & Bottom Wooden Pencil Tray integration seam', () => {
  it('renders Bounded Mode with engraved brass Case plate and live-switches to Infinite Mode via Bottom Wooden Pencil Tray', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      caseTitle: 'CASE #409 — PIER 14 HARBOR INVESTIGATION',
      mode: 'bounded',
      frameWidth: 1140,
      frameHeight: 680,
      cards: [],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Engraved brass plate displays case title and frame dimensions
    expect(
      screen.getByText('CASE #409 — PIER 14 HARBOR INVESTIGATION')
    ).toBeInTheDocument();
    expect(screen.getByText('1140 × 680px')).toBeInTheDocument();

    // Switch live to Infinite Mode from Bottom Wooden Pencil Tray
    const modeBtn = screen.getByRole('button', { name: /Bounded/i });
    fireEvent.click(modeBtn);

    expect(screen.getByRole('button', { name: /Infinite/i })).toBeInTheDocument();
    expect(
      screen.queryByText('1140 × 680px')
    ).not.toBeInTheDocument();
  });

  it('preserves Card coordinates when switching Infinite -> Bounded Mode and offers 1-click "Expand frame to fit all Cards" when out of bounds', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      mode: 'infinite',
      frameWidth: 1000,
      frameHeight: 600,
      cards: [
        {
          id: 'oob-card',
          kind: 'a4',
          title: 'Far East Warehouse Manifest',
          richContent: 'Out of bounds note',
          plainText: 'Out of bounds note',
          x: 1320,
          y: 710,
          width: 300,
          height: 320,
          skew: 2.5,
          zIndex: 1,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 8, color: 'brass' }],
          annotations: [],
        },
      ],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Switch from Infinite to Bounded Mode
    fireEvent.click(screen.getByRole('button', { name: /Infinite/i }));

    // Card position is preserved without clamping
    const cardEl = screen.getByTestId('board-card-oob-card');
    expect(cardEl).toHaveStyle({ left: '1320px', top: '710px' });

    // Out-of-bounds banner appears with 1-click action
    const expandBtn = screen.getByRole('button', {
      name: /Expand frame to fit all Cards/i,
    });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);

    // Banner disappears once frame expands to encompass all pinned Cards
    expect(
      screen.queryByRole('button', { name: /Expand frame to fit all Cards/i })
    ).not.toBeInTheDocument();
  });

  it('spawns Sticky Note, A4 Document, Index Card, and Newspaper Clipping from the Bottom Wooden Pencil Tray with human skew and supports individual 0° Straighten, manual rotation, and bulk Align All (0°)', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Spawn all 4 core physical stationery Cards from the tray
    fireEvent.click(screen.getByRole('button', { name: /Sticky Note/i }));
    fireEvent.click(screen.getByRole('button', { name: /A4 Document/i }));
    fireEvent.click(screen.getByRole('button', { name: /Index Card/i }));
    fireEvent.click(screen.getByRole('button', { name: /Newspaper Clipping/i }));

    const cards = screen.getAllByTestId(/^board-card-/);
    expect(cards).toHaveLength(4);

    // Every newly created Card lands with a non-zero human skew between -5.5 and +5.5
    for (const card of cards) {
      const skewAttr = Number(card.getAttribute('data-card-skew'));
      expect(Math.abs(skewAttr)).toBeGreaterThanOrEqual(1.2);
      expect(Math.abs(skewAttr)).toBeLessThanOrEqual(5.5);
    }

    // Individual 1-click 0° Straighten on the first Card
    const firstCard = cards[0];
    const straightenBtn = within(firstCard).getByRole('button', {
      name: /Straighten Card/i,
    });
    fireEvent.click(straightenBtn);
    expect(Number(firstCard.getAttribute('data-card-skew'))).toBe(0);

    // Manual rotation handle/control to tilt a Card to a custom angle
    const rotateHandle = within(firstCard).getByLabelText(/Rotate Card/i);
    fireEvent.change(rotateHandle, { target: { value: '4.5' } });
    expect(Number(firstCard.getAttribute('data-card-skew'))).toBe(4.5);

    // Bulk Align All (0°) in Bottom Wooden Pencil Tray straightens every Card on the Board
    fireEvent.click(screen.getByRole('button', { name: /Align All \(0°\)/i }));
    for (const card of screen.getAllByTestId(/^board-card-/)) {
      expect(Number(card.getAttribute('data-card-skew'))).toBe(0);
    }
  });

  it('provides an accessible top button drag handle with required styles, keyboard Arrow-key movement (15px / 30px Shift) with polite aria-live announcements, corner resize handle, and tray auto-hide toggle', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-test-1',
          kind: 'sticky',
          title: 'Harbor Gate Note',
          richContent: 'Check brass key',
          plainText: 'Check brass key',
          x: 200,
          y: 150,
          width: 210,
          height: 190,
          skew: -3.2,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 9, color: 'red' }],
          annotations: [],
        },
      ],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const cardEl = screen.getByTestId('board-card-card-test-1');
    const dragHandle = within(cardEl).getByRole('button', {
      name: /Drag Harbor Gate Note/i,
    });
    expect(dragHandle.tagName).toBe('BUTTON');
    expect(dragHandle).toHaveAttribute('type', 'button');

    // Keyboard ArrowRight moves +15px
    fireEvent.keyDown(dragHandle, { key: 'ArrowRight' });
    expect(cardEl).toHaveStyle({ left: '215px', top: '150px' });

    // Shift + ArrowDown moves +30px
    fireEvent.keyDown(dragHandle, { key: 'ArrowDown', shiftKey: true });
    expect(cardEl).toHaveStyle({ left: '215px', top: '180px' });

    // Polite aria-live announcement updated
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion.textContent).toMatch(/Harbor Gate Note moved/i);

    // Bottom-right corner resize handle resizes Card
    const resizeHandle = within(cardEl).getByTestId('card-resize-handle-card-test-1');
    fireEvent.pointerDown(resizeHandle, { clientX: 400, clientY: 350, button: 0 });
    const viewport = screen.getByTestId('board-viewport');
    fireEvent.pointerMove(viewport, { clientX: 450, clientY: 390 });
    fireEvent.pointerUp(viewport);
    expect(cardEl).toHaveStyle({ width: '260px', height: '230px' });

    // Auto-hide toggle on the Bottom Wooden Pencil Tray
    const autoHideBtn = screen.getByRole('button', { name: /Auto-Hide/i });
    const trayWrap = screen.getByTestId('wooden-pencil-tray-wrap');
    expect(trayWrap.className).toContain('is-pinned');
    fireEvent.click(autoHideBtn);
    expect(trayWrap.className).toContain('auto-hide');

    // Pointer drag on card drag handle moves Card smoothly
    fireEvent.pointerDown(dragHandle, { clientX: 250, clientY: 200, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 300, clientY: 240 });
    fireEvent.pointerUp(viewport);
    expect(cardEl).toHaveStyle({ left: '265px', top: '220px' });

    // Board 2D pan and zoom (clamped 0.35x to 2.2x)
    const boardPlane = screen.getByTestId('board-plane');
    fireEvent.pointerDown(viewport, { clientX: 500, clientY: 400, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 540, clientY: 430 });
    fireEvent.pointerUp(viewport);
    expect(boardPlane.style.transform).toContain('translate3d(100px, 78px, 0)');

    // Ctrl + Wheel zooms and clamps between 0.35x and 2.2x
    for (let i = 0; i < 30; i++) {
      fireEvent.wheel(viewport, { deltaY: -100, ctrlKey: true });
    }
    expect(boardPlane.style.transform).toContain('scale(2.2)');

    for (let i = 0; i < 40; i++) {
      fireEvent.wheel(viewport, { deltaY: 100, ctrlKey: true });
    }
    expect(boardPlane.style.transform).toContain('scale(0.35)');
  });
});

describe('WorkspaceApp — Ticket 3 Floating Paper Ribbon, Per-Selection Rich Text & Annotations integration seam', () => {
  it('displays the inline Floating Paper Formatting Ribbon on the selected Card and switches paper color swatches (yellow, pink, mint, cream, aged, white) and default typography when no text range is selected', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-ribbon-1',
          kind: 'sticky',
          title: 'Suspect Alibi',
          richContent: 'Seen leaving Pier 14 at 02:10 AM.',
          plainText: 'Seen leaving Pier 14 at 02:10 AM.',
          x: 200,
          y: 140,
          width: 240,
          height: 200,
          skew: -2.5,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'md',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 9, color: 'red' }],
          annotations: [],
        },
      ],
      strings: [],
      selectedCardId: null,
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Before selecting the Card, no Floating Paper Formatting Ribbon is shown
    expect(
      screen.queryByTestId('floating-paper-ribbon-card-ribbon-1')
    ).not.toBeInTheDocument();

    const cardEl = screen.getByTestId('board-card-card-ribbon-1');
    fireEvent.pointerDown(cardEl, { button: 0 });

    // Ribbon appears on the selected Card
    const ribbon = screen.getByTestId('floating-paper-ribbon-card-ribbon-1');
    expect(ribbon).toBeInTheDocument();

    // Switch through all 6 paper swatches: yellow, pink, mint, cream, aged, white
    for (const color of ['pink', 'mint', 'cream', 'aged', 'white', 'yellow'] as const) {
      fireEvent.click(within(ribbon).getByRole('button', { name: new RegExp(`Paper color ${color}`, 'i') }));
      expect(cardEl.className).toContain(`paper-${color}`);
    }

    // With no text highlighted, picking a font family, size (including XL), and ink color updates Card defaults
    fireEvent.click(within(ribbon).getByRole('button', { name: /Font family Special Elite/i }));
    expect(cardEl.className).toContain('font-typewriter');

    fireEvent.click(within(ribbon).getByRole('button', { name: /Font size XL/i }));
    expect(cardEl.className).toContain('size-xl');

    fireEvent.click(within(ribbon).getByRole('button', { name: /Ink color #A11D21/i }));
    expect(cardEl).toHaveStyle({ color: '#A11D21' });
  });

  it('formats only the highlighted text range in RichTextEditor with font family, font size, ink color, marker highlight background, and bold/italic/underline/strikethrough', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-rich-1',
          kind: 'a4',
          title: 'Lab Forensics Report',
          richContent: 'Trace alkaloid residue detected on brass teacup rim.',
          plainText: 'Trace alkaloid residue detected on brass teacup rim.',
          x: 220,
          y: 120,
          width: 320,
          height: 340,
          skew: 1.5,
          zIndex: 2,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 8, color: 'brass' }],
          annotations: [],
        },
      ],
      strings: [],
      selectedCardId: 'card-rich-1',
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const cardEl = screen.getByTestId('board-card-card-rich-1');
    const ribbon = screen.getByTestId('floating-paper-ribbon-card-rich-1');
    const textarea = within(cardEl).getByLabelText('Lab Forensics Report content') as HTMLTextAreaElement;

    // Select substring "alkaloid residue" (indices 6..22)
    textarea.focus();
    textarea.setSelectionRange(6, 22);
    fireEvent.select(textarea);

    // Apply font family Caveat (handwriting), size LG, ink color #A11D21, highlight #F3DF7D, Bold, Italic, Underline, Strikethrough
    fireEvent.click(within(ribbon).getByRole('button', { name: /Font family Caveat/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /Font size LG/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /Ink color #A11D21/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /Highlight color #F3DF7D/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /^Bold$/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /^Italic$/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /^Underline$/i }));
    fireEvent.click(within(ribbon).getByRole('button', { name: /^Strikethrough$/i }));

    // Card's defaultFontStyle remains 'typewriter' because formatting applied only to selection
    expect(cardEl.className).toContain('font-typewriter');

    // Rich text rendered view displays the formatted span for "alkaloid residue" while surrounding text stays unformatted
    const richDisplay = within(cardEl).getByTestId('rich-text-display-card-rich-1');
    expect(richDisplay.textContent).toBe('Trace alkaloid residue detected on brass teacup rim.');

    const formattedSpan = within(richDisplay).getByText('alkaloid residue');
    expect(formattedSpan).toHaveAttribute('data-font-style', 'handwriting');
    expect(formattedSpan).toHaveAttribute('data-font-size', 'lg');
    expect(formattedSpan).toHaveStyle({
      color: '#A11D21',
      backgroundColor: '#F3DF7D',
      fontWeight: '700',
      fontStyle: 'italic',
    });
    expect(formattedSpan.getAttribute('data-underline')).toBe('true');
    expect(formattedSpan.getAttribute('data-strikethrough')).toBe('true');
  });

  it('draws Card-bound Freehand Pen and sketchy Hand-Drawn Shape Annotations (circle, rectangle, underline, arrow) in normalized Card percentage coordinates (0..100) that move and rotate with the Card, plus Board-bound Annotations on empty cork', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-ann-1',
          kind: 'a4',
          title: 'Pier 14 Cargo Manifest',
          richContent: 'Crate #88 unloaded at 01:45 AM.',
          plainText: 'Crate #88 unloaded at 01:45 AM.',
          x: 200,
          y: 100,
          width: 300,
          height: 300,
          skew: 3.5,
          zIndex: 1,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 8, color: 'brass' }],
          annotations: [],
        },
      ],
      strings: [],
      boardAnnotations: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const cardEl = screen.getByTestId('board-card-card-ann-1');

    // Mock bounding client rect for Card and Viewport so percentage math is exact
    cardEl.getBoundingClientRect = () =>
      ({
        left: 260,
        top: 148,
        width: 300,
        height: 300,
        right: 560,
        bottom: 448,
        x: 260,
        y: 148,
        toJSON: () => ({}),
      }) as DOMRect;

    // 1. Select Freehand Pen from Bottom Wooden Pencil Tray and draw a stroke on the Card
    fireEvent.click(screen.getByRole('button', { name: /Freehand Pen/i }));

    const cardAnnotationSurface = within(cardEl).getByTestId(
      'card-annotation-layer-card-ann-1'
    );
    fireEvent.pointerDown(cardAnnotationSurface, {
      clientX: 290, // (290 - 260)/300 = 10%
      clientY: 208, // (208 - 148)/300 = 20%
      button: 0,
    });
    fireEvent.pointerMove(cardAnnotationSurface, {
      clientX: 350, // 30%
      clientY: 238, // 30%
    });
    fireEvent.pointerMove(cardAnnotationSurface, {
      clientX: 410, // 50%
      clientY: 268, // 40%
    });
    fireEvent.pointerUp(cardAnnotationSurface);

    // Verify freehand Annotation is rendered inside the Card's SVG layer with normalized 0..100 coords
    const cardAnnItems = within(cardEl).getAllByTestId(/^annotation-item-/);
    expect(cardAnnItems).toHaveLength(1);
    expect(cardAnnItems[0]).toHaveAttribute('data-annotation-kind', 'freehand');
    expect(cardAnnItems[0]).toHaveAttribute('data-annotation-target', 'card');
    expect(Number(cardAnnItems[0].getAttribute('data-annotation-x'))).toBeCloseTo(10, 0);
    expect(Number(cardAnnItems[0].getAttribute('data-annotation-y'))).toBeCloseTo(20, 0);
    expect(Number(cardAnnItems[0].getAttribute('data-annotation-w'))).toBeCloseTo(40, 0);
    expect(Number(cardAnnItems[0].getAttribute('data-annotation-h'))).toBeCloseTo(20, 0);

    // 2. Select Rectangle from Bottom Wooden Pencil Tray and drag-size a sketchy rectangle on the Card
    fireEvent.click(screen.getByRole('button', { name: /^Rectangle$/i }));
    fireEvent.pointerDown(cardAnnotationSurface, {
      clientX: 320, // 20%
      clientY: 298, // 50%
      button: 0,
    });
    fireEvent.pointerMove(cardAnnotationSurface, {
      clientX: 470, // 70% -> w = 50%
      clientY: 388, // 80% -> h = 30%
    });
    fireEvent.pointerUp(cardAnnotationSurface);

    const afterRectItems = within(cardEl).getAllByTestId(/^annotation-item-/);
    expect(afterRectItems).toHaveLength(2);
    expect(afterRectItems[1]).toHaveAttribute('data-annotation-kind', 'rectangle');
    expect(Number(afterRectItems[1].getAttribute('data-annotation-x'))).toBeCloseTo(20, 0);
    expect(Number(afterRectItems[1].getAttribute('data-annotation-y'))).toBeCloseTo(50, 0);
    expect(Number(afterRectItems[1].getAttribute('data-annotation-w'))).toBeCloseTo(50, 0);
    expect(Number(afterRectItems[1].getAttribute('data-annotation-h'))).toBeCloseTo(30, 0);

    // 3. Move and rotate the Card — Card-bound Annotations remain inside the Card DOM & keep their normalized 0..100 coordinates
    const dragHandle = within(cardEl).getByRole('button', {
      name: /Drag Pier 14 Cargo Manifest/i,
    });
    fireEvent.keyDown(dragHandle, { key: 'ArrowRight', shiftKey: true });
    const rotateInput = within(cardEl).getByLabelText(/Rotate Card Pier 14 Cargo Manifest/i);
    fireEvent.change(rotateInput, { target: { value: '-8.5' } });

    expect(cardEl).toHaveStyle({ left: '230px', top: '100px' });
    expect(Number(cardEl.getAttribute('data-card-skew'))).toBe(-8.5);
    const movedCardAnns = within(cardEl).getAllByTestId(/^annotation-item-/);
    expect(movedCardAnns).toHaveLength(2);
    expect(Number(movedCardAnns[1].getAttribute('data-annotation-x'))).toBeCloseTo(20, 0);
    expect(Number(movedCardAnns[1].getAttribute('data-annotation-y'))).toBeCloseTo(50, 0);

    // 4. Select Arrow tool and draw a Board-bound Annotation on the Board surface outside Cards
    fireEvent.click(screen.getByRole('button', { name: /^Arrow$/i }));
    const boardAnnotationLayer = screen.getByTestId('board-annotation-layer');
    fireEvent.pointerDown(boardAnnotationLayer, {
      clientX: 700,
      clientY: 250,
      button: 0,
    });
    fireEvent.pointerMove(boardAnnotationLayer, {
      clientX: 860,
      clientY: 340,
    });
    fireEvent.pointerUp(boardAnnotationLayer);

    const boardAnns = within(boardAnnotationLayer).getAllByTestId(/^annotation-item-/);
    expect(boardAnns).toHaveLength(1);
    expect(boardAnns[0]).toHaveAttribute('data-annotation-kind', 'arrow');
    expect(boardAnns[0]).toHaveAttribute('data-annotation-target', 'board');
  });

  it('selects, moves, resizes, and erases existing Annotations via Select/Hand mode, Delete key, and the Eraser tool', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-manip-1',
          kind: 'index-card',
          title: 'Suspect Vehicle Plate',
          richContent: 'Black sedan spotted near Slip B.',
          plainText: 'Black sedan spotted near Slip B.',
          x: 150,
          y: 120,
          width: 250,
          height: 200,
          skew: 0,
          zIndex: 1,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'md',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p1', rx: 50, ry: 10, color: 'blue' }],
          annotations: [
            {
              id: 'ann-edit-1',
              target: 'card',
              kind: 'circle',
              color: '#A11D21',
              strokeWidth: 2,
              x: 20,
              y: 30,
              w: 40,
              h: 25,
            },
            {
              id: 'ann-erase-2',
              target: 'card',
              kind: 'underline',
              color: '#235789',
              strokeWidth: 3,
              x: 15,
              y: 70,
              w: 60,
              h: 8,
            },
          ],
        },
      ],
      strings: [],
      activeTool: 'select',
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const cardEl = screen.getByTestId('board-card-card-manip-1');
    cardEl.getBoundingClientRect = () =>
      ({
        left: 210,
        top: 168,
        width: 250,
        height: 200,
        right: 460,
        bottom: 368,
        x: 210,
        y: 168,
        toJSON: () => ({}),
      }) as DOMRect;

    const circleAnn = within(cardEl).getByTestId('annotation-item-ann-edit-1');

    // Click and drag in Select/Hand mode to select and move the Annotation (+10% x, +15% y -> +25px, +30px)
    fireEvent.pointerDown(circleAnn, { clientX: 260, clientY: 228, button: 0 });
    const cardAnnLayer = within(cardEl).getByTestId('card-annotation-layer-card-manip-1');
    fireEvent.pointerMove(cardAnnLayer, { clientX: 285, clientY: 258 });
    fireEvent.pointerUp(cardAnnLayer);

    expect(Number(circleAnn.getAttribute('data-annotation-x'))).toBeCloseTo(30, 0);
    expect(Number(circleAnn.getAttribute('data-annotation-y'))).toBeCloseTo(45, 0);

    // Drag the selected Annotation's resize handle to resize bounding box (+20% w, +10% h -> +50px, +20px)
    const resizeHandle = within(cardEl).getByTestId('annotation-resize-handle-ann-edit-1');
    fireEvent.pointerDown(resizeHandle, { clientX: 360, clientY: 278, button: 0 });
    fireEvent.pointerMove(cardAnnLayer, { clientX: 410, clientY: 298 });
    fireEvent.pointerUp(cardAnnLayer);

    expect(Number(circleAnn.getAttribute('data-annotation-w'))).toBeCloseTo(60, 0);
    expect(Number(circleAnn.getAttribute('data-annotation-h'))).toBeCloseTo(35, 0);

    // Press Delete key while `ann-edit-1` is selected to delete it
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(
      within(cardEl).queryByTestId('annotation-item-ann-edit-1')
    ).not.toBeInTheDocument();

    // Switch to Eraser tool in Bottom Wooden Pencil Tray and click `ann-erase-2` to erase it
    fireEvent.click(screen.getByRole('button', { name: /Eraser/i }));
    const underlineAnn = within(cardEl).getByTestId('annotation-item-ann-erase-2');
    fireEvent.pointerDown(underlineAnn, { button: 0 });

    expect(
      within(cardEl).queryByTestId('annotation-item-ann-erase-2')
    ).not.toBeInTheDocument();
  });
});
