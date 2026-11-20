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
