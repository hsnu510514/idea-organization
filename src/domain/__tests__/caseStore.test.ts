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

    // Expand frame to fit all Cards
    state = caseReducer(state, caseActions.autoFitFrame());
    expect(state.frameWidth).toBeGreaterThanOrEqual(1350 + 260);
    expect(state.frameHeight).toBeGreaterThanOrEqual(720 + 220);
    expect(getOutOfBoundsCards(state)).toHaveLength(0);
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
});
