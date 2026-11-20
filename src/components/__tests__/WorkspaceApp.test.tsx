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
