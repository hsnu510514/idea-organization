import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('WorkspaceApp — Ticket 2 Dual-Zone Pins, Snap-to-Card Strings & Hover-Peek / Click-to-Front integration seam', () => {
  it('starts every Card with a default Pin, allows adding extra Pins in selectable colors (red, brass, blue, black), and repositions a Pin via its outer brass collar ring without modifier keys while updating attached Strings in real time', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      panX: 0,
      panY: 0,
      zoom: 1,
      cards: [
        {
          id: 'card-a',
          kind: 'a4',
          title: 'Forensics Report',
          richContent: 'Alkaloid trace',
          plainText: 'Alkaloid trace',
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          skew: 0,
          zIndex: 1,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-a1', rx: 50, ry: 10, color: 'brass' }],
          annotations: [],
        },
        {
          id: 'card-b',
          kind: 'sticky',
          title: 'Pier 14 Note',
          richContent: 'Check dock',
          plainText: 'Check dock',
          x: 500,
          y: 100,
          width: 200,
          height: 200,
          skew: 0,
          zIndex: 2,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-b1', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
      ],
      strings: [
        {
          id: 'str-ab',
          fromCardId: 'card-a',
          fromPinId: 'pin-a1',
          toCardId: 'card-b',
          toPinId: 'pin-b1',
          color: '#A11D21',
          label: 'Initial clue link',
        },
      ],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const cardA = screen.getByTestId('board-card-card-a');
    expect(within(cardA).getAllByTestId(/^pin-root-/)).toHaveLength(1);

    // Add extra pins in selectable colors: red, brass, blue, black
    fireEvent.click(within(cardA).getByRole('button', { name: /Add blue Pin/i }));
    fireEvent.click(within(cardA).getByRole('button', { name: /Add black Pin/i }));
    fireEvent.click(within(cardA).getByRole('button', { name: /Add red Pin/i }));
    fireEvent.click(within(cardA).getByRole('button', { name: /Add brass Pin/i }));

    const allPinsOnA = within(cardA).getAllByTestId(/^pin-root-/);
    expect(allPinsOnA).toHaveLength(5);
    expect(allPinsOnA[1].className).toContain('pin-blue');
    expect(allPinsOnA[2].className).toContain('pin-black');
    expect(allPinsOnA[3].className).toContain('pin-red');
    expect(allPinsOnA[4].className).toContain('pin-brass');

    // Verify initial String path starts at pin-a1 (x = 100 + 0.5*300 = 250, y = 100 + 0.1*200 = 120)
    const stringPath = screen.getByTestId('yarn-string-path-str-ab');
    expect(stringPath.getAttribute('d')).toContain('M 250.0 120.0');

    // Drag pin-a1's outer brass collar ring ([data-pin-collar]) WITHOUT Shift or any modifier key
    const collarA1 = within(cardA).getByTestId('pin-collar-pin-a1');
    expect(collarA1).toHaveAttribute('data-pin-collar', 'pin-a1');

    const viewport = screen.getByTestId('board-viewport');
    fireEvent.pointerDown(collarA1, { clientX: 250, clientY: 120, button: 0, shiftKey: false });
    // Move to board (340, 260) -> rx = (340-100)/300*100 = 80%, ry = (260-100)/200*100 = 80%
    fireEvent.pointerMove(viewport, { clientX: 340, clientY: 260, shiftKey: false });
    fireEvent.pointerUp(viewport);

    const pinA1El = within(cardA).getByTestId('pin-root-pin-a1');
    expect(pinA1El).toHaveStyle({ left: '80%', top: '80%' });

    // Attached String updates in real time to new Pin coordinates (340.0, 260.0)
    expect(stringPath.getAttribute('d')).toContain('M 340.0 260.0');

    // Drag collar past Card edge to verify 4%..96% clamping
    fireEvent.pointerDown(collarA1, { clientX: 340, clientY: 260, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 10, clientY: 500 });
    fireEvent.pointerUp(viewport);
    expect(pinA1El).toHaveStyle({ left: '4%', top: '96%' });
  });

  it('pulls a live catenary draft String from a Pin dome in the active yarn spool color, snaps to the nearest Pin when dropped onto another Card body (or a specific Pin), ignores self-loops, and supports editing tape labels and cutting Strings', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      panX: 0,
      panY: 0,
      zoom: 1,
      activeYarnColor: '#A11D21',
      cards: [
        {
          id: 'card-source',
          kind: 'sticky',
          title: 'Source Clue',
          richContent: 'Origin note',
          plainText: 'Origin note',
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          skew: 0,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-src', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
        {
          id: 'card-target',
          kind: 'a4',
          title: 'Target Report',
          richContent: 'Destination document',
          plainText: 'Destination document',
          x: 500,
          y: 100,
          width: 300,
          height: 200,
          skew: 0,
          zIndex: 2,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [
            { id: 'pin-near-left', rx: 10, ry: 50, color: 'brass' }, // board (530, 200)
            { id: 'pin-far-right', rx: 90, ry: 50, color: 'blue' }, // board (770, 200)
          ],
          annotations: [],
        },
      ],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Select Ochre Yarn (#D49A2A) in WoodenPencilTray
    fireEvent.click(screen.getByRole('button', { name: /Ochre Yarn/i }));

    const sourceCard = screen.getByTestId('board-card-card-source');
    const targetCard = screen.getByTestId('board-card-card-target');
    const viewport = screen.getByTestId('board-viewport');

    const srcDome = within(sourceCard).getByTestId('pin-dome-pin-src');
    expect(srcDome).toHaveAttribute('data-pin-dome', 'pin-src');

    // 1. Self-loop check: drag from pin-src and release on sourceCard body -> must NOT create a String
    fireEvent.pointerDown(srcDome, { clientX: 200, clientY: 120, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 220, clientY: 180 });
    // Draft catenary path is visible while dragging
    const draftPath = screen.getByTestId('yarn-draft-path');
    expect(draftPath).toHaveAttribute('stroke', '#D49A2A');
    fireEvent.pointerUp(sourceCard, { clientX: 220, clientY: 180 });
    expect(screen.queryAllByTestId(/^yarn-string-path-/)).toHaveLength(0);

    // 2. Snap-to-Card drop: drag from pin-src and drop onto targetCard body near its right edge (750, 210)
    // Euclidean distance to pin-far-right (770, 200) is ~22.4px vs pin-near-left (530, 200) ~220.2px
    fireEvent.pointerDown(srcDome, { clientX: 200, clientY: 120, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 750, clientY: 210 });
    fireEvent.pointerUp(targetCard, { clientX: 750, clientY: 210 });

    const createdPaths = screen.getAllByTestId(/^yarn-string-path-/);
    expect(createdPaths).toHaveLength(1);
    const createdPath = createdPaths[0];
    expect(createdPath).toHaveAttribute('stroke', '#D49A2A');
    // Connected from pin-src (200.0, 120.0) to pin-far-right (770.0, 200.0)
    expect(createdPath.getAttribute('d')).toContain('M 200.0 120.0');
    expect(createdPath.getAttribute('d')).toContain('770.0 200.0');

    // 3. Edit the masking-tape tag label at the midpoint
    const tagInput = screen.getByLabelText(/String label/i) as HTMLInputElement;
    expect(tagInput.value).toBe('New link');
    fireEvent.change(tagInput, { target: { value: 'Smuggled ledger link' } });
    expect(tagInput.value).toBe('Smuggled ledger link');

    // 4. Cut / delete the String
    const cutBtn = screen.getByRole('button', { name: /Cut String/i });
    fireEvent.click(cutBtn);
    expect(screen.queryAllByTestId(/^yarn-string-path-/)).toHaveLength(0);
  });

  it('implements Hover-Peek vs. Click-to-Front: hovering an overlapped Card keeps zIndex unchanged, applies is-hovered-peek, highlights connected Strings and neighbor Cards, and dims unconnected Cards; clicking promotes zIndex to the front', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      panX: 0,
      panY: 0,
      zoom: 1,
      cards: [
        {
          id: 'card-bottom',
          kind: 'a4',
          title: 'Buried Lab Report',
          richContent: 'Buried clue',
          plainText: 'Buried clue',
          x: 150,
          y: 120,
          width: 280,
          height: 300,
          skew: -2.0,
          zIndex: 2,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-bot', rx: 50, ry: 10, color: 'brass' }],
          annotations: [],
        },
        {
          id: 'card-linked',
          kind: 'sticky',
          title: 'Connected Witness Note',
          richContent: 'Linked clue',
          plainText: 'Linked clue',
          x: 520,
          y: 140,
          width: 210,
          height: 190,
          skew: 3.1,
          zIndex: 5,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-link', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
        {
          id: 'card-unconnected',
          kind: 'newspaper',
          title: 'Unrelated Gazette Clipping',
          richContent: 'Overlapping top card',
          plainText: 'Overlapping top card',
          x: 180,
          y: 150,
          width: 260,
          height: 230,
          skew: 1.5,
          zIndex: 9,
          stashed: false,
          paperColor: 'aged',
          defaultFontStyle: 'serif',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-unconn', rx: 50, ry: 10, color: 'black' }],
          annotations: [],
        },
      ],
      strings: [
        {
          id: 'str-connected',
          fromCardId: 'card-bottom',
          fromPinId: 'p-bot',
          toCardId: 'card-linked',
          toPinId: 'p-link',
          color: '#A11D21',
          label: 'Suspect timeline',
        },
        {
          id: 'str-other',
          fromCardId: 'card-linked',
          fromPinId: 'p-link',
          toCardId: 'card-unconnected',
          toPinId: 'p-unconn',
          color: '#235789',
          label: 'Other link',
        },
      ],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const bottomCard = screen.getByTestId('board-card-card-bottom');
    const linkedCard = screen.getByTestId('board-card-card-linked');
    const unconnectedCard = screen.getByTestId('board-card-card-unconnected');
    const connectedStringGroup = screen.getByTestId('yarn-string-group-str-connected');
    const otherStringGroup = screen.getByTestId('yarn-string-group-str-other');

    expect(bottomCard).toHaveStyle({ zIndex: 2 });
    expect(linkedCard).toHaveStyle({ zIndex: 5 });
    expect(unconnectedCard).toHaveStyle({ zIndex: 9 });

    // Hover the overlapped bottom Card
    fireEvent.pointerEnter(bottomCard);

    // 1. zIndex of all Cards remains strictly unchanged during Hover-Peek
    expect(bottomCard).toHaveStyle({ zIndex: 2 });
    expect(linkedCard).toHaveStyle({ zIndex: 5 });
    expect(unconnectedCard).toHaveStyle({ zIndex: 9 });

    // 2. Hovered Card has elevated highlight class is-hovered-peek
    expect(bottomCard.className).toContain('is-hovered-peek');

    // 3. Connected String and directly linked neighbor Card are highlighted
    expect(connectedStringGroup.getAttribute('class') ?? '').toContain('yarn-highlighted');
    expect(otherStringGroup.getAttribute('class') ?? '').not.toContain('yarn-highlighted');
    expect(linkedCard.className).toContain('is-connected-neighbor');
    expect(linkedCard.className).not.toContain('is-dimmed-unconnected');

    // 4. Unconnected Card is dimmed
    expect(unconnectedCard.className).toContain('is-dimmed-unconnected');

    // Pointer leave clears Hover-Peek state
    fireEvent.pointerLeave(bottomCard);
    expect(bottomCard.className).not.toContain('is-hovered-peek');
    expect(unconnectedCard.className).not.toContain('is-dimmed-unconnected');

    // Click-to-Front: clicking the buried Card promotes its zIndex above the highest Card (9 -> 10)
    fireEvent.pointerDown(bottomCard, { button: 0 });
    expect(bottomCard).toHaveStyle({ zIndex: 10 });
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

describe('WorkspaceApp — Ticket 4 Photo Prints, Real PDF Stacks (pdfjs-dist), Page Range Import, Pull Page & Region Snipping integration seam', () => {
  it('uploads an image file (PNG/JPEG/WebP/GIF) via WoodenPencilTray, saves a deduplicated AssetRecord, and pins a resizable Polaroid / Photo Print Card with an editable handwritten-style caption', async () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [],
      strings: [],
      assets: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const imageInput = screen.getByTestId('photo-upload-input') as HTMLInputElement;
    expect(imageInput).toHaveAttribute('type', 'file');
    expect(imageInput.accept).toContain('image/');

    const pngFile = new File(['fake-png-binary'], 'crime-scene-pier14.png', {
      type: 'image/png',
    });

    fireEvent.change(imageInput, { target: { files: [pngFile] } });

    // Wait for async storage.saveAsset and card spawn
    const photoCard = await screen.findByTestId(/^board-card-/);
    expect(photoCard).toHaveAttribute('data-card-kind', 'photo');

    // Displays Polaroid photo image and editable handwritten caption
    const imgEl = within(photoCard).getByRole('img');
    expect(imgEl).toHaveAttribute('alt', 'crime-scene-pier14.png');

    const captionInput = within(photoCard).getByLabelText(/Photo caption/i) as HTMLInputElement;
    expect(captionInput.value).toBe('crime-scene-pier14.png');

    fireEvent.change(captionInput, {
      target: { value: 'Broken padlock found near Cargo Hold 3' },
    });
    expect(captionInput.value).toBe('Broken padlock found near Cargo Hold 3');

    // Resizable via corner resize handle
    const cardId = photoCard.getAttribute('data-card-root')!;
    const resizeHandle = within(photoCard).getByTestId(`card-resize-handle-${cardId}`);
    const viewport = screen.getByTestId('board-viewport');
    fireEvent.pointerDown(resizeHandle, { clientX: 300, clientY: 300, button: 0 });
    fireEvent.pointerMove(viewport, { clientX: 360, clientY: 350 });
    fireEvent.pointerUp(viewport);

    expect(photoCard).toHaveStyle({ width: '295px', height: '315px' });

    // Uploading the exact same image again deduplicates the AssetRecord in Case state
    fireEvent.change(imageInput, { target: { files: [pngFile] } });
    await waitFor(() => {
      expect(screen.getAllByTestId(/^board-card-/)).toHaveLength(2);
    });
    const savedCase = await storage.loadCase(initialCase.caseSlug);
    expect(savedCase?.assets).toHaveLength(1);
    expect(savedCase?.assets[0].filename).toBe('crime-scene-pier14.png');
    expect(savedCase?.cards).toHaveLength(2);
    expect(savedCase?.cards[0].assetId).toBe(savedCase?.assets[0].id);
    expect(savedCase?.cards[1].assetId).toBe(savedCase?.assets[0].id);
  });

  it('uploads a PDF file, stores a deduplicated PDF AssetRecord with inspected pageCount, opens the PDF Import Sheet to select All Pages or a custom Page Range (start..end), renders in-place PDF canvas with stacked-paper underlays, and flips pages within the selected range', async () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [],
      strings: [],
      assets: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const pdfInput = screen.getByTestId('pdf-upload-input') as HTMLInputElement;
    expect(pdfInput).toHaveAttribute('type', 'file');
    expect(pdfInput.accept).toContain('application/pdf');

    // Synthetic 5-page PDF binary with 5 /Type /Page objects
    const syntheticFivePagePdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 5 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '6 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '7 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '%%EOF',
    ].join('\n');

    const pdfFile = new File([syntheticFivePagePdf], 'harbor-manifest.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(pdfInput, { target: { files: [pdfFile] } });

    // PDF Import Sheet dialog opens showing filename and 5 total pages
    const importSheet = await screen.findByTestId('pdf-import-sheet');
    expect(within(importSheet).getByText(/harbor-manifest\.pdf/i)).toBeInTheDocument();
    expect(within(importSheet).getByText(/5 pages detected/i)).toBeInTheDocument();

    // Switch from "All Pages" to "Page Range" and choose pages 2 to 4
    const rangeRadio = within(importSheet).getByLabelText(/Custom Page Range/i);
    fireEvent.click(rangeRadio);

    const startInput = within(importSheet).getByLabelText(/Start Page/i) as HTMLInputElement;
    const endInput = within(importSheet).getByLabelText(/End Page/i) as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2' } });
    fireEvent.change(endInput, { target: { value: '4' } });

    // Confirm pinning the PDF Stack Card
    const pinStackBtn = within(importSheet).getByRole('button', {
      name: /Pin PDF Stack/i,
    });
    fireEvent.click(pinStackBtn);

    // Import Sheet closes and PDF Stack Card is pinned on the Board
    expect(screen.queryByTestId('pdf-import-sheet')).not.toBeInTheDocument();

    const pdfStackCard = await screen.findByTestId(/^board-card-/);
    expect(pdfStackCard).toHaveAttribute('data-card-kind', 'pdf-stack');

    // Physical stacked-paper sheet underlays are rendered
    expect(pdfStackCard.querySelectorAll('.pdf-sheet-underlay').length).toBeGreaterThanOrEqual(2);

    // Real in-place <canvas> surface is rendered inside the PDF Stack Card for page 2
    const canvasEl = within(pdfStackCard).getByTestId(/pdf-page-canvas/) as HTMLCanvasElement;
    expect(canvasEl.tagName).toBe('CANVAS');
    expect(canvasEl).toHaveAttribute('data-rendered-page', '2');

    // Pager displays current page within configured range: Pg 2 (1 / 3)
    expect(within(pdfStackCard).getByTestId('pdf-pager-readout').textContent).toContain(
      'Pg 2'
    );
    expect(within(pdfStackCard).getByTestId('pdf-pager-readout').textContent).toContain(
      '1 / 3'
    );

    // Flip Next -> Page 3 (2 / 3) -> Page 4 (3 / 3) -> clamped at Page 4
    const nextBtn = within(pdfStackCard).getByRole('button', {
      name: /Next PDF page/i,
    });
    const prevBtn = within(pdfStackCard).getByRole('button', {
      name: /Previous PDF page/i,
    });

    fireEvent.click(nextBtn);
    expect(canvasEl).toHaveAttribute('data-rendered-page', '3');
    expect(within(pdfStackCard).getByTestId('pdf-pager-readout').textContent).toContain(
      'Pg 3'
    );

    fireEvent.click(nextBtn);
    expect(canvasEl).toHaveAttribute('data-rendered-page', '4');
    expect(within(pdfStackCard).getByTestId('pdf-pager-readout').textContent).toContain(
      'Pg 4'
    );

    fireEvent.click(nextBtn);
    expect(canvasEl).toHaveAttribute('data-rendered-page', '4');

    // Flip Prev -> back to Page 3
    fireEvent.click(prevBtn);
    expect(canvasEl).toHaveAttribute('data-rendered-page', '3');
  });

  it('supports non-destructive 1-click Pull Page, interactive drag-rectangle Snip Region Clipping creation, and deduplicated PDF Asset sharing across multiple derived Cards', async () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [],
      strings: [],
      assets: [],
      activeYarnColor: '#A11D21',
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    const pdfInput = screen.getByTestId('pdf-upload-input') as HTMLInputElement;
    const syntheticFourPagePdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 4 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '6 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '%%EOF',
    ].join('\n');

    const pdfFile = new File([syntheticFourPagePdf], 'coroner-ledger.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(pdfInput, { target: { files: [pdfFile] } });

    const importSheet = await screen.findByTestId('pdf-import-sheet');
    expect(within(importSheet).getByText(/4 pages detected/i)).toBeInTheDocument();

    // Pin all 4 pages
    fireEvent.click(
      within(importSheet).getByRole('button', { name: /Pin PDF Stack/i })
    );

    const pdfStackEl = await screen.findByTestId(/^board-card-/);
    const stackCardId = pdfStackEl.getAttribute('data-card-root')!;

    // Flip to Page 2
    fireEvent.click(
      within(pdfStackEl).getByRole('button', { name: /Next PDF page/i })
    );
    expect(
      within(pdfStackEl).getByTestId(`pdf-page-canvas-${stackCardId}`)
    ).toHaveAttribute('data-rendered-page', '2');

    // 1. Click "Pull Page" -> creates a standalone single-page Card for Page 2 linked by a yarn String
    fireEvent.click(
      within(pdfStackEl).getByRole('button', { name: /Pull Page/i })
    );

    const cardsAfterPull = screen.getAllByTestId(/^board-card-/);
    expect(cardsAfterPull).toHaveLength(2);
    expect(screen.getAllByTestId(/^yarn-string-path-/)).toHaveLength(1);

    const pulledCardEl = cardsAfterPull.find(
      (el) => el.getAttribute('data-card-root') !== stackCardId
    )!;
    const pulledCardId = pulledCardEl.getAttribute('data-card-root')!;
    const pulledCanvas = within(pulledCardEl).getByTestId(
      `pdf-page-canvas-${pulledCardId}`
    );
    expect(pulledCanvas).toHaveAttribute('data-rendered-page', '2');

    // Original PDF Stack remains intact on Page 2
    expect(
      within(pdfStackEl).getByTestId(`pdf-page-canvas-${stackCardId}`)
    ).toHaveAttribute('data-rendered-page', '2');

    // 2. Click "Snip Region" -> activates interactive drag-rectangle crop overlay ([data-pdf-crop-overlay])
    fireEvent.click(
      within(pdfStackEl).getByRole('button', { name: /Snip Region/i })
    );

    const cropOverlay = within(pdfStackEl).getByTestId(
      `pdf-crop-overlay-${stackCardId}`
    );
    expect(cropOverlay).toHaveAttribute('data-pdf-crop-overlay', stackCardId);

    // Mock bounding rect on crop overlay (200x150 at left:100, top:100) for deterministic normalized cropRect math
    cropOverlay.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        right: 300,
        bottom: 250,
        x: 100,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    // Drag selection rectangle from (140, 130) -> (0.2, 0.2) to (240, 220) -> (0.7, 0.8) => w=0.5, h=0.6
    fireEvent.pointerDown(cropOverlay, {
      clientX: 140,
      clientY: 130,
      button: 0,
    });
    fireEvent.pointerMove(cropOverlay, {
      clientX: 240,
      clientY: 220,
    });
    expect(
      within(cropOverlay).getByTestId('pdf-crop-selection-box')
    ).toBeInTheDocument();

    fireEvent.pointerUp(cropOverlay, {
      clientX: 240,
      clientY: 220,
    });

    // Crop overlay closes and a new Clipping Card is spawned and linked by a second yarn String
    expect(
      within(pdfStackEl).queryByTestId(`pdf-crop-overlay-${stackCardId}`)
    ).not.toBeInTheDocument();

    const cardsAfterSnip = screen.getAllByTestId(/^board-card-/);
    expect(cardsAfterSnip).toHaveLength(3);
    expect(screen.getAllByTestId(/^yarn-string-path-/)).toHaveLength(2);

    // Verify all 3 Cards (PDF Stack, Pulled Page, Snipped Clipping) share a single deduplicated PDF AssetRecord
    const savedCase = await storage.loadCase(initialCase.caseSlug);
    expect(savedCase?.assets).toHaveLength(1);
    const sharedAssetId = savedCase!.assets[0].id;
    expect(savedCase?.assets[0].pageCount).toBe(4);

    for (const card of savedCase!.cards) {
      expect(card.assetId).toBe(sharedAssetId);
    }

    const snippedCardData = savedCase!.cards.find(
      (c) => c.id !== stackCardId && c.id !== pulledCardId
    )!;
    expect(snippedCardData.kind).toBe('clipping');
    expect(snippedCardData.sourcePageNumber).toBe(2);
    expect(snippedCardData.cropRect).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.5,
      h: 0.6,
    });
  });
});

describe('WorkspaceApp — Ticket 5 Right Manila Case Drawer, Search/Filter & Stash/Restore with Remembered Strings integration seam', () => {
  it('toggles the Right-Edge Manila File Tab showing CASE DRAWER (<count>), filters stashed and on-board Cards by live search query and CardKind filter pills, and pans/focuses the Board when clicking an on-board Card in All Case Items', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      panX: 0,
      panY: 0,
      zoom: 1,
      cards: [
        {
          id: 'card-a4-1',
          kind: 'a4',
          title: 'Autopsy Forensics Summary',
          richContent: 'Trace alkaloid residue detected on brass teacup rim.',
          plainText: 'Trace alkaloid residue detected on brass teacup rim.',
          x: 400,
          y: 200,
          width: 300,
          height: 360,
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
        {
          id: 'card-sticky-2',
          kind: 'sticky',
          title: 'Gate B Padlock Key',
          richContent: 'Night guard claims duplicate brass key existed.',
          plainText: 'Night guard claims duplicate brass key existed.',
          x: 800,
          y: 300,
          width: 210,
          height: 190,
          skew: -2.5,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p2', rx: 50, ry: 9, color: 'red' }],
          annotations: [],
        },
        {
          id: 'card-news-stashed',
          kind: 'newspaper',
          title: 'Harbor Chronicle Strike Notice',
          richContent: 'Unmanifested night shipments continued at Pier 14.',
          plainText: 'Unmanifested night shipments continued at Pier 14.',
          x: 150,
          y: 120,
          width: 260,
          height: 230,
          skew: 3.0,
          zIndex: 3,
          stashed: true,
          paperColor: 'aged',
          defaultFontStyle: 'serif',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p3', rx: 50, ry: 9, color: 'black' }],
          annotations: [],
        },
      ],
      strings: [],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Right-Edge Manila File Tab displays stashed Card count: CASE DRAWER (1)
    const manilaTab = screen.getByRole('button', {
      name: /CASE DRAWER \(1\)/i,
    });
    const drawerAside = screen.getByTestId('case-drawer');
    expect(drawerAside.className).not.toContain('is-open');

    // Slide open the Case Drawer
    fireEvent.click(manilaTab);
    expect(drawerAside.className).toContain('is-open');

    const stashedSection = within(drawerAside).getByTestId('case-drawer-stashed-section');
    const allItemsSection = within(drawerAside).getByTestId('case-drawer-all-items-section');

    // Initially 1 stashed Card in Stashed in Folder, and 3 total Cards in All Case Items
    expect(within(stashedSection).getByText('Harbor Chronicle Strike Notice')).toBeInTheDocument();
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(3);

    // Filter by CardKind pill 'sticky' -> only Gate B Padlock Key matches
    fireEvent.click(
      within(drawerAside).getByRole('button', { name: /Filter kind sticky/i })
    );
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(1);
    expect(within(allItemsSection).getByText('Gate B Padlock Key')).toBeInTheDocument();
    expect(
      within(stashedSection).queryByText('Harbor Chronicle Strike Notice')
    ).not.toBeInTheDocument();

    // Filter by CardKind pill 'newspaper' -> stashed newspaper card matches
    fireEvent.click(
      within(drawerAside).getByRole('button', { name: /Filter kind newspaper/i })
    );
    expect(within(stashedSection).getByText('Harbor Chronicle Strike Notice')).toBeInTheDocument();
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(1);

    // Reset kind filter to 'all'
    fireEvent.click(
      within(drawerAside).getByRole('button', { name: /Filter kind all/i })
    );
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(3);

    // Live search by plainText substring "alkaloid residue"
    const searchInput = within(drawerAside).getByPlaceholderText(
      /Search all Cards/i
    );
    fireEvent.change(searchInput, { target: { value: 'alkaloid residue' } });
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(1);
    expect(
      within(allItemsSection).getByText('Autopsy Forensics Summary')
    ).toBeInTheDocument();

    // Clear search query
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(within(allItemsSection).getAllByTestId(/^drawer-all-item-/)).toHaveLength(3);

    // Click on-board Card 'Gate B Padlock Key' (x=800, y=300, w=210, h=190 -> center=(905, 395)) in All Case Items
    const stickyAllItem = within(allItemsSection).getByTestId(
      'drawer-all-item-card-sticky-2'
    );
    fireEvent.click(within(stickyAllItem).getByTestId('drawer-focus-card-card-sticky-2'));

    // Card is selected, promoted to top zIndex (3 -> 4), and Board pan centers on it
    const boardCardSticky = screen.getByTestId('board-card-card-sticky-2');
    expect(boardCardSticky.className).toContain('is-selected');
    expect(boardCardSticky).toHaveStyle({ zIndex: 4 });

    const expectedPanX = Math.round(window.innerWidth / 2 - 905);
    const expectedPanY = Math.round(window.innerHeight / 2 - 395);
    const boardPlane = screen.getByTestId('board-plane');
    expect(boardPlane.style.transform).toContain(
      `translate3d(${expectedPanX}px, ${expectedPanY}px, 0)`
    );
  });

  it('stashes a Card with 3 connected Strings (hiding the Card and its 3 Strings on the Board while preserving StringData in state and showing "3 String(s) remembered"), and restores all 3 Strings when clicking Pin to Board', () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [
        {
          id: 'card-hub',
          kind: 'a4',
          title: 'Suspect Victor Vance',
          richContent: 'Central investigation target',
          plainText: 'Central investigation target',
          x: 400,
          y: 200,
          width: 300,
          height: 320,
          skew: 0,
          zIndex: 2,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-hub', rx: 50, ry: 10, color: 'brass' }],
          annotations: [],
        },
        {
          id: 'card-n1',
          kind: 'sticky',
          title: 'Clue 1: Teacup',
          richContent: 'Brass teacup',
          plainText: 'Brass teacup',
          x: 100,
          y: 100,
          width: 200,
          height: 180,
          skew: 0,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-1', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
        {
          id: 'card-n2',
          kind: 'index-card',
          title: 'Clue 2: Pocket Watch',
          richContent: 'Stopped at 02:20 AM',
          plainText: 'Stopped at 02:20 AM',
          x: 780,
          y: 100,
          width: 250,
          height: 180,
          skew: 0,
          zIndex: 3,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'md',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-2', rx: 50, ry: 10, color: 'blue' }],
          annotations: [],
        },
        {
          id: 'card-n3',
          kind: 'newspaper',
          title: 'Clue 3: Tidal Silt',
          richContent: 'Pier 14 mud sample',
          plainText: 'Pier 14 mud sample',
          x: 780,
          y: 380,
          width: 250,
          height: 220,
          skew: 0,
          zIndex: 4,
          stashed: false,
          paperColor: 'aged',
          defaultFontStyle: 'serif',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-3', rx: 50, ry: 10, color: 'black' }],
          annotations: [],
        },
      ],
      strings: [
        {
          id: 'str-1',
          fromCardId: 'card-hub',
          fromPinId: 'p-hub',
          toCardId: 'card-n1',
          toPinId: 'p-1',
          color: '#A11D21',
          label: 'Teacup link',
        },
        {
          id: 'str-2',
          fromCardId: 'card-hub',
          fromPinId: 'p-hub',
          toCardId: 'card-n2',
          toPinId: 'p-2',
          color: '#D49A2A',
          label: 'Watch link',
        },
        {
          id: 'str-3',
          fromCardId: 'card-n3',
          fromPinId: 'p-3',
          toCardId: 'card-hub',
          toPinId: 'p-hub',
          color: '#235789',
          label: 'Silt link',
        },
      ],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Initially all 4 Cards and all 3 Strings are rendered on the Board
    expect(screen.getAllByTestId(/^board-card-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/^yarn-string-path-/)).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: /CASE DRAWER \(0\)/i })
    ).toBeInTheDocument();

    // Click Stash on card-hub on the Board
    const hubCardEl = screen.getByTestId('board-card-card-hub');
    const stashBtnOnCard = within(hubCardEl).getByRole('button', {
      name: /Stash Card in Case Drawer/i,
    });
    fireEvent.click(stashBtnOnCard);

    // card-hub and its 3 connected Strings immediately hide from the Board
    expect(screen.queryByTestId('board-card-card-hub')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^board-card-/)).toHaveLength(3);
    expect(screen.queryAllByTestId(/^yarn-string-path-/)).toHaveLength(0);

    // Manila File Tab updates to CASE DRAWER (1)
    const manilaTab = screen.getByRole('button', { name: /CASE DRAWER \(1\)/i });
    fireEvent.click(manilaTab);

    const drawerAside = screen.getByTestId('case-drawer');
    const stashedSection = within(drawerAside).getByTestId(
      'case-drawer-stashed-section'
    );

    // Stashed in Folder section shows Suspect Victor Vance with "3 String(s) remembered"
    expect(
      within(stashedSection).getByText('Suspect Victor Vance')
    ).toBeInTheDocument();
    expect(
      within(stashedSection).getByText(/3 String\(s\) remembered/i)
    ).toBeInTheDocument();

    // Click "Pin to Board" to restore the Card
    const pinToBoardBtn = within(stashedSection).getByRole('button', {
      name: /Pin to Board/i,
    });
    fireEvent.click(pinToBoardBtn);

    // Card is back on the Board at top zIndex (4 -> 5), and all 3 Strings immediately reappear
    const restoredHubEl = screen.getByTestId('board-card-card-hub');
    expect(restoredHubEl).toBeInTheDocument();
    expect(restoredHubEl).toHaveStyle({ zIndex: 5 });
    expect(screen.getAllByTestId(/^yarn-string-path-/)).toHaveLength(3);
    expect(
      screen.getByRole('button', { name: /CASE DRAWER \(0\)/i })
    ).toBeInTheDocument();

    // Also verify stashing directly from the Case Drawer's All Case Items list
    const allItemsSection = within(drawerAside).getByTestId(
      'case-drawer-all-items-section'
    );
    const n1AllItem = within(allItemsSection).getByTestId(
      'drawer-all-item-card-n1'
    );
    fireEvent.click(within(n1AllItem).getByRole('button', { name: /Stash/i }));

    // card-n1 is stashed, so only 2 Strings remain visible on the Board (str-2 and str-3)
    expect(screen.queryByTestId('board-card-card-n1')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^yarn-string-path-/)).toHaveLength(2);
    expect(
      within(stashedSection).getByText(/1 String\(s\) remembered/i)
    ).toBeInTheDocument();
  });

  it('lists deduplicated PDF and image AssetRecords in the Uploaded Assets shelf and spawns a second PDF Stack (and additional Photo Print) from an existing Asset without re-uploading', async () => {
    const storage = createInMemoryWorkspaceAdapter();
    const initialCase = createInitialCaseState({
      cards: [],
      strings: [],
      assets: [
        {
          id: 'asset-pdf-1',
          filename: 'harbor-manifest.pdf',
          mimeType: 'application/pdf',
          relativePath: 'assets/harbor-manifest.pdf',
          pageCount: 6,
        },
        {
          id: 'asset-img-1',
          filename: 'pier14-crime-scene.png',
          mimeType: 'image/png',
          relativePath: 'assets/pier14-crime-scene.png',
        },
      ],
    });

    render(<WorkspaceApp storage={storage} initialCase={initialCase} />);

    // Open Case Drawer
    fireEvent.click(screen.getByRole('button', { name: /CASE DRAWER \(0\)/i }));

    const drawerAside = screen.getByTestId('case-drawer');
    const assetsSection = within(drawerAside).getByTestId(
      'case-drawer-assets-section'
    );

    expect(
      within(assetsSection).getByText('harbor-manifest.pdf')
    ).toBeInTheDocument();
    expect(
      within(assetsSection).getByText('pier14-crime-scene.png')
    ).toBeInTheDocument();

    // 1. Click "Spawn Photo Print" on the existing image Asset -> pins a Photo Print Card on the Board
    const imgAssetRow = within(assetsSection).getByTestId(
      'drawer-asset-item-asset-img-1'
    );
    fireEvent.click(
      within(imgAssetRow).getByRole('button', { name: /Pin Photo Print/i })
    );

    expect(screen.getAllByTestId(/^board-card-/)).toHaveLength(1);
    expect(screen.getAllByTestId(/^board-card-/)[0]).toHaveAttribute(
      'data-card-kind',
      'photo'
    );

    // 2. Click "Pin PDF Stack" on the existing PDF Asset -> opens PDF Import Sheet for that Asset (or pins a PDF Stack), allowing a second PDF Stack to be created without re-uploading
    const pdfAssetRow = within(assetsSection).getByTestId(
      'drawer-asset-item-asset-pdf-1'
    );
    fireEvent.click(
      within(pdfAssetRow).getByRole('button', { name: /Pin PDF Stack/i })
    );

    const importSheet = await screen.findByTestId('pdf-import-sheet');
    expect(
      within(importSheet).getByText(/harbor-manifest\.pdf/i)
    ).toBeInTheDocument();
    expect(
      within(importSheet).getByText(/6 pages detected/i)
    ).toBeInTheDocument();

    // Confirm pinning first PDF Stack from the shelf
    fireEvent.click(
      within(importSheet).getByRole('button', { name: /Pin PDF Stack/i })
    );

    // Spawn a second PDF Stack from the exact same Uploaded Assets shelf item
    fireEvent.click(
      within(pdfAssetRow).getByRole('button', { name: /Pin PDF Stack/i })
    );
    const secondImportSheet = await screen.findByTestId('pdf-import-sheet');
    fireEvent.click(
      within(secondImportSheet).getByRole('button', { name: /Pin PDF Stack/i })
    );

    const allBoardCards = screen.getAllByTestId(/^board-card-/);
    const pdfStackCards = allBoardCards.filter(
      (el) => el.getAttribute('data-card-kind') === 'pdf-stack'
    );
    expect(pdfStackCards).toHaveLength(2);

    const savedCase = await storage.loadCase(initialCase.caseSlug);
    expect(savedCase?.assets).toHaveLength(2);
    const savedPdfStacks = savedCase!.cards.filter(
      (c) => c.kind === 'pdf-stack'
    );
    expect(savedPdfStacks).toHaveLength(2);
    expect(savedPdfStacks[0].assetId).toBe('asset-pdf-1');
    expect(savedPdfStacks[1].assetId).toBe('asset-pdf-1');
  });
});

describe('WorkspaceApp — Ticket 6 Multi-Case Hybrid Workspace Storage (board.json + assets/) & .case.zip Import/Export integration seam', () => {
  it('creates, switches between, renames, and deletes Cases with confirmation via the Detective Case Switcher while auto-saving each Case cleanly', async () => {
    const caseA = createInitialCaseState({
      caseSlug: 'case-409-pier-14',
      caseTitle: 'CASE #409 — PIER 14 HARBOR INVESTIGATION',
      cards: [
        {
          id: 'card-pier-clue',
          kind: 'sticky',
          title: 'Pier 14 Padlock Key',
          richContent: 'Duplicate brass key found.',
          plainText: 'Duplicate brass key found.',
          x: 150,
          y: 120,
          width: 210,
          height: 190,
          skew: -2.0,
          zIndex: 1,
          stashed: false,
          paperColor: 'yellow',
          defaultFontStyle: 'handwriting',
          defaultFontSize: 'lg',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-a1', rx: 50, ry: 10, color: 'red' }],
          annotations: [],
        },
      ],
      strings: [],
    });

    const caseB = createInitialCaseState({
      caseSlug: 'case-512-clocktower',
      caseTitle: 'CASE #512 — CLOCKTOWER HEIST',
      cards: [
        {
          id: 'card-clock-clue',
          kind: 'a4',
          title: 'Clocktower Gear Blueprint',
          richContent: 'Missing escapement wheel.',
          plainText: 'Missing escapement wheel.',
          x: 240,
          y: 160,
          width: 300,
          height: 340,
          skew: 1.5,
          zIndex: 1,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'p-b1', rx: 50, ry: 8, color: 'brass' }],
          annotations: [],
        },
      ],
      strings: [],
    });

    const storage = createInMemoryWorkspaceAdapter([caseA, caseB]);

    render(<WorkspaceApp storage={storage} initialCase={caseA} />);

    // Initially Case A is active and its Card is rendered
    expect(screen.getByTestId('board-card-card-pier-clue')).toBeInTheDocument();
    expect(
      screen.queryByTestId('board-card-card-clock-clue')
    ).not.toBeInTheDocument();

    const switcherBar = screen.getByTestId('case-switcher-bar');
    const caseSelect = within(switcherBar).getByLabelText(
      /Switch active Case/i
    ) as HTMLSelectElement;

    await waitFor(() => {
      expect(caseSelect.options.length).toBe(2);
    });

    // 1. Switch to existing Case B
    fireEvent.change(caseSelect, { target: { value: 'case-512-clocktower' } });

    await waitFor(() => {
      expect(
        screen.getByTestId('board-card-card-clock-clue')
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId('board-card-card-pier-clue')
    ).not.toBeInTheDocument();

    // 2. Rename Case B via the Case Title input
    const titleInput = within(switcherBar).getByLabelText(
      /Active Case title/i
    ) as HTMLInputElement;
    expect(titleInput.value).toBe('CASE #512 — CLOCKTOWER HEIST');

    fireEvent.change(titleInput, {
      target: { value: 'CASE #512 — MIDNIGHT BELL HEIST' },
    });

    await waitFor(async () => {
      const savedB = await storage.loadCase('case-512-clocktower');
      expect(savedB?.caseTitle).toBe('CASE #512 — MIDNIGHT BELL HEIST');
    });

    // 3. Create a New Case (+ New Case)
    fireEvent.click(
      within(switcherBar).getByRole('button', { name: /New Case/i })
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('board-card-card-clock-clue')
      ).not.toBeInTheDocument();
    });
    expect(screen.queryAllByTestId(/^board-card-/)).toHaveLength(0);

    const allCasesAfterCreate = await storage.listCases();
    expect(allCasesAfterCreate).toHaveLength(3);

    // Spawn a Sticky Note in the new Case
    fireEvent.click(screen.getByRole('button', { name: /Sticky Note/i }));
    expect(screen.getAllByTestId(/^board-card-/)).toHaveLength(1);

    // 4. Delete the newly created Case with confirmation
    fireEvent.click(
      within(switcherBar).getByRole('button', { name: /Delete Case/i })
    );
    const confirmDeleteBtn = within(switcherBar).getByRole('button', {
      name: /Confirm Delete Case/i,
    });
    fireEvent.click(confirmDeleteBtn);

    // Falls back to remaining Case and storage now has 2 Cases
    await waitFor(async () => {
      const remaining = await storage.listCases();
      expect(remaining).toHaveLength(2);
    });
  });

  it('exports a full Case (board.json + deduplicated PDF/image assets/) to a .case.zip archive and imports a .case.zip archive via the Detective Case Switcher UI restoring all Cards, PDF Stacks, Clippings, Pins, Strings, and Annotations', async () => {
    const sourceStorage = createInMemoryWorkspaceAdapter([]);

    const syntheticPdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 4 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '6 0 obj << /Type /Page /Parent 2 0 R >> endobj',
      '%%EOF',
    ].join('\n');

    const pdfFile = new File([syntheticPdf], 'dock-ledger.pdf', {
      type: 'application/pdf',
    });
    const pdfAsset = await sourceStorage.saveAsset(
      'case-888-ledger',
      pdfFile,
      'dock-ledger.pdf'
    );

    const richCase = createInitialCaseState({
      caseSlug: 'case-888-ledger',
      caseTitle: 'CASE #888 — SMUGGLER LEDGER',
      assets: [{ ...pdfAsset, pageCount: 4 }],
      cards: [
        {
          id: 'card-stack-888',
          kind: 'pdf-stack',
          title: 'dock-ledger.pdf',
          richContent: '',
          plainText: '',
          x: 160,
          y: 120,
          width: 290,
          height: 260,
          skew: 2.0,
          zIndex: 2,
          stashed: false,
          paperColor: 'white',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-s1', rx: 50, ry: 9, color: 'brass' }],
          annotations: [
            {
              id: 'ann-s1',
              target: 'card',
              kind: 'circle',
              color: '#A11D21',
              strokeWidth: 2,
              x: 20,
              y: 25,
              w: 40,
              h: 30,
            },
          ],
          assetId: pdfAsset.id,
          pdfPageRange: { start: 1, end: 4 },
          currentPageIndex: 1,
        },
        {
          id: 'card-clip-888',
          kind: 'clipping',
          title: 'dock-ledger.pdf — Page 2 Clipping',
          richContent: 'Cropped manifest row',
          plainText: 'Cropped manifest row',
          x: 520,
          y: 140,
          width: 245,
          height: 195,
          skew: -1.5,
          zIndex: 3,
          stashed: false,
          paperColor: 'cream',
          defaultFontStyle: 'typewriter',
          defaultFontSize: 'sm',
          defaultTextColor: '#1E1A17',
          pins: [{ id: 'pin-c1', rx: 50, ry: 9, color: 'red' }],
          annotations: [],
          assetId: pdfAsset.id,
          sourcePageNumber: 2,
          cropRect: { x: 0.1, y: 0.2, w: 0.6, h: 0.4 },
        },
      ],
      strings: [
        {
          id: 'str-888',
          fromCardId: 'card-stack-888',
          fromPinId: 'pin-s1',
          toCardId: 'card-clip-888',
          toPinId: 'pin-c1',
          color: '#A11D21',
          label: 'Pg 2 Snip',
        },
      ],
    });

    await sourceStorage.saveCase('case-888-ledger', richCase);
    const zipBlob = await sourceStorage.exportCaseZip('case-888-ledger');
    const zipFile = new File([zipBlob], 'case-888-ledger.case.zip', {
      type: 'application/zip',
    });

    // Now render a clean WorkspaceApp with an empty default Case and import the .case.zip via UI
    const destStorage = createInMemoryWorkspaceAdapter([
      createInitialCaseState({
        caseSlug: 'case-000-empty',
        caseTitle: 'EMPTY DESK',
        cards: [],
        strings: [],
      }),
    ]);

    render(
      <WorkspaceApp
        storage={destStorage}
        initialCase={createInitialCaseState({
          caseSlug: 'case-000-empty',
          caseTitle: 'EMPTY DESK',
          cards: [],
          strings: [],
        })}
      />
    );

    expect(screen.queryAllByTestId(/^board-card-/)).toHaveLength(0);

    const switcherBar = screen.getByTestId('case-switcher-bar');

    // Trigger Export .case.zip button on current case to verify export UI action works
    fireEvent.click(
      within(switcherBar).getByRole('button', { name: /Export \.case\.zip/i })
    );

    // Import case-888-ledger.case.zip via the file input
    const importInput = within(switcherBar).getByTestId(
      'case-zip-import-input'
    ) as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [zipFile] } });

    // Imported Case becomes active on the Board with its PDF Stack, Clipping, String, and Annotation intact
    await waitFor(() => {
      expect(
        screen.getByTestId('board-card-card-stack-888')
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('board-card-card-clip-888')).toBeInTheDocument();
    expect(screen.getByTestId('yarn-string-path-str-888')).toBeInTheDocument();
    expect(
      screen.getByTestId('annotation-item-ann-s1')
    ).toBeInTheDocument();

    const titleInput = within(switcherBar).getByLabelText(
      /Active Case title/i
    ) as HTMLInputElement;
    expect(titleInput.value).toBe('CASE #888 — SMUGGLER LEDGER');
  });

  it('shows the "Mount Local Workspace Folder" button when window.showDirectoryPicker is available and mounts a File System Access directory handle cleanly', async () => {
    const win = window as unknown as {
      showDirectoryPicker?: () => Promise<unknown>;
    };

    const files = new Map<string, Uint8Array>();
    const makeDir = (dirName: string) => ({
      kind: 'directory' as const,
      name: dirName,
      async getDirectoryHandle(sub: string) {
        return makeDir(sub);
      },
      async getFileHandle(fileName: string) {
        return {
          kind: 'file' as const,
          name: fileName,
          async getFile() {
            return new File([files.get(fileName) ?? new Uint8Array()], fileName);
          },
          async createWritable() {
            return {
              async write(data: string | Uint8Array) {
                files.set(
                  fileName,
                  typeof data === 'string'
                    ? new TextEncoder().encode(data)
                    : data
                );
              },
              async close() {},
            };
          },
        };
      },
      async removeEntry() {},
      async *entries() {},
    });

    win.showDirectoryPicker = async () => makeDir('mounted-folder');

    try {
      const storage = createInMemoryWorkspaceAdapter();
      render(<WorkspaceApp storage={storage} />);

      const mountBtn = screen.getByRole('button', {
        name: /Mount Local Workspace Folder/i,
      });
      expect(mountBtn).toBeInTheDocument();

      fireEvent.click(mountBtn);

      await waitFor(() => {
        expect(files.has('board.json')).toBe(true);
      });
    } finally {
      delete win.showDirectoryPicker;
    }
  });
});
