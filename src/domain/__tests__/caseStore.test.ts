import { describe, expect, it } from 'vitest';
import {
  generateHumanSkew,
  createInitialCaseState,
  caseReducer,
  caseActions,
  getOutOfBoundsCards,
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
});
