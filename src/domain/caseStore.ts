import {
  ActiveTool,
  AnnotationData,
  AssetRecord,
  CardData,
  CardKind,
  CaseState,
  FontStyle,
  PaperColor,
  PinData,
  StringData,
  YarnColor,
} from './types';

export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 2.2;

let idCounter = 1;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Generates a natural human-like skew angle between -5.5° and +5.5°,
 * excluding near-zero angles (|skew| < 1.2°).
 */
export function generateHumanSkew(rng: () => number = Math.random): number {
  const raw = Number((rng() * 11 - 5.5).toFixed(1));
  if (Math.abs(raw) < 1.2) {
    return raw < 0 ? -2.4 : 2.4;
  }
  return Math.max(-5.5, Math.min(5.5, raw));
}

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(zoom.toFixed(2))));
}

/**
 * Compute absolute board coordinates of a Pin taking card skew (rotation around center) into account.
 */
export function getPinBoardCoords(card: CardData, pin: PinData): { x: number; y: number } {
  const cx = card.x + card.width / 2;
  const cy = card.y + card.height / 2;
  const localX = (pin.rx / 100) * card.width - card.width / 2;
  const localY = (pin.ry / 100) * card.height - card.height / 2;
  const rad = (card.skew * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + localX * cos - localY * sin,
    y: cy + localX * sin + localY * cos,
  };
}

/**
 * Find the nearest Pin on a target Card to a given point in Board coordinates (Euclidean distance).
 */
export function findNearestPinOnCard(
  card: CardData,
  boardPt: { x: number; y: number }
): PinData | null {
  if (!card.pins || card.pins.length === 0) return null;
  let nearest = card.pins[0];
  let bestDist = Infinity;
  for (const pin of card.pins) {
    const coords = getPinBoardCoords(card, pin);
    const dist = Math.hypot(coords.x - boardPt.x, coords.y - boardPt.y);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = pin;
    }
  }
  return nearest;
}

/**
 * Build a quadratic catenary-like sagging SVG path between two points.
 */
export function buildCatenaryPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): {
  d: string;
  midX: number;
  midY: number;
} {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(85, Math.max(18, dist * 0.16));
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2 + sag * 0.5;
  const ctrlX = (x1 + x2) / 2;
  const ctrlY = (y1 + y2) / 2 + sag;
  return {
    d: `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    midX,
    midY,
  };
}

/**
 * Returns all un-stashed Cards that lie outside [0, 0, frameWidth, frameHeight] when in Bounded Mode.
 */
export function getOutOfBoundsCards(state: CaseState): CardData[] {
  if (state.mode !== 'bounded') return [];
  return state.cards.filter(
    (c) =>
      !c.stashed &&
      (c.x < 0 ||
        c.y < 0 ||
        c.x + c.width > state.frameWidth ||
        c.y + c.height > state.frameHeight)
  );
}

export const INITIAL_CARDS: CardData[] = [
  {
    id: 'card-coroner-a4',
    kind: 'a4',
    title: 'AUTOPSY & FORENSICS SUMMARY — CASE #409',
    richContent:
      'SUBJECT: Victor Vance (46)\nTIME OF DISCOVERY: 05:40 AM, Cargo Hold 3.\n\n1. Trace alkaloid residue detected on brass teacup rim.\n2. Pocket watch stopped at 02:20 AM due to impact.\n3. Mud on cuff matches tidal silt from Pier 14.',
    plainText:
      'SUBJECT: Victor Vance (46)\nTIME OF DISCOVERY: 05:40 AM, Cargo Hold 3.\n\n1. Trace alkaloid residue detected on brass teacup rim.\n2. Pocket watch stopped at 02:20 AM due to impact.\n3. Mud on cuff matches tidal silt from Pier 14.',
    x: 420,
    y: 75,
    width: 310,
    height: 360,
    skew: 1.8,
    zIndex: 3,
    stashed: false,
    paperColor: 'cream',
    defaultFontStyle: 'typewriter',
    defaultFontSize: 'sm',
    defaultTextColor: '#1E1A17',
    pins: [
      { id: 'pin-2', rx: 50, ry: 6, color: 'brass' },
      { id: 'pin-2b', rx: 14, ry: 68, color: 'red' },
    ],
    annotations: [
      {
        id: 'ann-2',
        target: 'card',
        kind: 'underline',
        color: '#A11D21',
        strokeWidth: 2,
        x: 12,
        y: 66,
        w: 75,
        h: 6,
      },
    ],
  },
  {
    id: 'card-alibi-sticky',
    kind: 'sticky',
    title: 'Check Harbor Master Log!',
    richContent:
      'Night guard claims gate B padlock was never cut — someone had a duplicate brass key.',
    plainText:
      'Night guard claims gate B padlock was never cut — someone had a duplicate brass key.',
    x: 140,
    y: 120,
    width: 210,
    height: 195,
    skew: -4.5,
    zIndex: 6,
    stashed: false,
    paperColor: 'yellow',
    defaultFontStyle: 'handwriting',
    defaultFontSize: 'lg',
    defaultTextColor: '#2A1E17',
    pins: [{ id: 'pin-3', rx: 48, ry: 10, color: 'red' }],
    annotations: [],
  },
  {
    id: 'card-newspaper',
    kind: 'newspaper',
    title: 'THE HARBOR CHRONICLE',
    richContent:
      'DOCKWORKERS STRIKE ENTERING THIRD WEEK AT PIER 14\n\nUnion treasurer Elias Thorne warned Tuesday that unmanifested night shipments continued despite the blockade.',
    plainText:
      'DOCKWORKERS STRIKE ENTERING THIRD WEEK AT PIER 14\n\nUnion treasurer Elias Thorne warned Tuesday that unmanifested night shipments continued despite the blockade.',
    x: 780,
    y: 90,
    width: 265,
    height: 245,
    skew: 3.4,
    zIndex: 4,
    stashed: false,
    paperColor: 'aged',
    defaultFontStyle: 'serif',
    defaultFontSize: 'sm',
    defaultTextColor: '#1D1916',
    pins: [{ id: 'pin-4', rx: 52, ry: 9, color: 'black' }],
    annotations: [
      {
        id: 'ann-3',
        target: 'card',
        kind: 'circle',
        color: '#A11D21',
        strokeWidth: 2,
        x: 18,
        y: 55,
        w: 48,
        h: 22,
      },
    ],
  },
  {
    id: 'card-index-witness',
    kind: 'index-card',
    title: 'WITNESS: Clara Bell (Diner Cook)',
    richContent:
      'Saw E. Thorne arguing with Vance at the all-night pier diner at 11:30 PM. Thorne left a manila envelope on the counter.',
    plainText:
      'Saw E. Thorne arguing with Vance at the all-night pier diner at 11:30 PM. Thorne left a manila envelope on the counter.',
    x: 110,
    y: 380,
    width: 260,
    height: 185,
    skew: 2.9,
    zIndex: 4,
    stashed: false,
    paperColor: 'white',
    defaultFontStyle: 'handwriting',
    defaultFontSize: 'md',
    defaultTextColor: '#1D2939',
    pins: [{ id: 'pin-6', rx: 50, ry: 10, color: 'blue' }],
    annotations: [],
  },
];

export const INITIAL_STRINGS: StringData[] = [
  {
    id: 'str-2',
    fromCardId: 'card-coroner-a4',
    fromPinId: 'pin-2',
    toCardId: 'card-alibi-sticky',
    toPinId: 'pin-3',
    color: '#A11D21',
    label: '02:20 AM window',
  },
  {
    id: 'str-4',
    fromCardId: 'card-index-witness',
    fromPinId: 'pin-6',
    toCardId: 'card-newspaper',
    toPinId: 'pin-4',
    color: '#235789',
    label: '11:30 PM meeting',
  },
];

export function createInitialCaseState(overrides?: Partial<CaseState>): CaseState {
  return {
    caseSlug: 'case-409-pier-14',
    caseTitle: 'CASE #409 — PIER 14 HARBOR INVESTIGATION',
    mode: 'bounded',
    frameWidth: 1140,
    frameHeight: 680,
    panX: 60,
    panY: 48,
    zoom: 1,
    cards: INITIAL_CARDS,
    strings: INITIAL_STRINGS,
    assets: [],
    boardAnnotations: [],
    selectedCardId: null,
    hoveredCardId: null,
    activeTool: 'select',
    activeYarnColor: '#A11D21',
    activeInkColor: '#A11D21',
    ...overrides,
  };
}

interface CardPreset {
  title: string;
  plainText: string;
  width: number;
  height: number;
  paperColor: PaperColor;
  defaultFontStyle: FontStyle;
  defaultFontSize: 'sm' | 'md' | 'lg';
  defaultTextColor: string;
  pinColor: PinData['color'];
}

const CARD_PRESETS: Record<CardKind, CardPreset> = {
  sticky: {
    title: 'Field Note',
    plainText: 'Double-check dock camera blind spot near warehouse 3.',
    width: 210,
    height: 190,
    paperColor: 'yellow',
    defaultFontStyle: 'handwriting',
    defaultFontSize: 'lg',
    defaultTextColor: '#2A1E17',
    pinColor: 'red',
  },
  a4: {
    title: 'SUPPLEMENTAL REPORT — LAB #19',
    plainText:
      'Ballistics & fiber analysis confirms wool fibers on the padlock match a standard merchant marine peacoat.',
    width: 295,
    height: 340,
    paperColor: 'cream',
    defaultFontStyle: 'typewriter',
    defaultFontSize: 'sm',
    defaultTextColor: '#1E1A17',
    pinColor: 'brass',
  },
  'index-card': {
    title: 'INTERVIEW: Night Watchman',
    plainText: 'Heard engine backfire at 02:27 AM heading toward Lower Bridge.',
    width: 255,
    height: 180,
    paperColor: 'white',
    defaultFontStyle: 'handwriting',
    defaultFontSize: 'md',
    defaultTextColor: '#1D2939',
    pinColor: 'blue',
  },
  newspaper: {
    title: 'DAILY GAZETTE CLIPPING',
    plainText: 'HARBOR AUTHORITY ANNOUNCES EMERGENCY AUDIT OF SLIP B LEASES.',
    width: 255,
    height: 225,
    paperColor: 'aged',
    defaultFontStyle: 'serif',
    defaultFontSize: 'sm',
    defaultTextColor: '#1D1916',
    pinColor: 'black',
  },
  photo: {
    title: 'Evidence Photograph',
    plainText: '',
    width: 235,
    height: 265,
    paperColor: 'white',
    defaultFontStyle: 'handwriting',
    defaultFontSize: 'md',
    defaultTextColor: '#1E1A17',
    pinColor: 'red',
  },
  'pdf-stack': {
    title: 'Case_Document.pdf',
    plainText: '',
    width: 290,
    height: 260,
    paperColor: 'white',
    defaultFontStyle: 'typewriter',
    defaultFontSize: 'sm',
    defaultTextColor: '#1E1A17',
    pinColor: 'brass',
  },
  clipping: {
    title: 'PDF Excerpt Clipping',
    plainText: 'Cropped excerpt from PDF page.',
    width: 240,
    height: 165,
    paperColor: 'cream',
    defaultFontStyle: 'typewriter',
    defaultFontSize: 'sm',
    defaultTextColor: '#1E1A17',
    pinColor: 'red',
  },
};

export interface SpawnCardOptions {
  id?: string;
  kind: CardKind;
  title?: string;
  plainText?: string;
  richContent?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  skew?: number;
  paperColor?: PaperColor;
  defaultFontStyle?: FontStyle;
  defaultFontSize?: 'sm' | 'md' | 'lg';
  defaultTextColor?: string;
  assetId?: string;
  imageCaption?: string;
  pdfPageRange?: { start: number; end: number };
  currentPageIndex?: number;
  sourcePageNumber?: number;
  cropRect?: CardData['cropRect'];
}

export type CaseAction =
  | { type: 'LOAD_CASE'; payload: CaseState }
  | { type: 'SET_MODE'; payload: 'bounded' | 'infinite' }
  | { type: 'TOGGLE_MODE' }
  | { type: 'SET_PAN'; payload: { panX: number; panY: number } }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_FRAME_DIMENSIONS'; payload: { frameWidth: number; frameHeight: number } }
  | { type: 'AUTO_FIT_FRAME' }
  | { type: 'SPAWN_CARD'; payload: SpawnCardOptions }
  | { type: 'MOVE_CARD'; payload: { cardId: string; x: number; y: number } }
  | { type: 'RESIZE_CARD'; payload: { cardId: string; width: number; height: number } }
  | { type: 'SET_CARD_SKEW'; payload: { cardId: string; skew: number } }
  | { type: 'STRAIGHTEN_CARD'; payload: { cardId: string } }
  | { type: 'ALIGN_ALL_CARDS' }
  | { type: 'UPDATE_CARD'; payload: { cardId: string; patch: Partial<CardData> } }
  | { type: 'SELECT_CARD'; payload: string | null }
  | { type: 'HOVER_CARD'; payload: string | null }
  | { type: 'BRING_TO_FRONT'; payload: string }
  | { type: 'STASH_CARD'; payload: string }
  | { type: 'RESTORE_CARD'; payload: string }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'SET_ACTIVE_TOOL'; payload: ActiveTool }
  | { type: 'SET_YARN_COLOR'; payload: YarnColor }
  | { type: 'SET_INK_COLOR'; payload: string }
  | { type: 'ADD_PIN'; payload: { cardId: string; pin?: Partial<PinData> } }
  | { type: 'MOVE_PIN'; payload: { cardId: string; pinId: string; rx: number; ry: number } }
  | { type: 'ADD_STRING'; payload: StringData }
  | { type: 'UPDATE_STRING'; payload: { stringId: string; label: string } }
  | { type: 'REMOVE_STRING'; payload: string }
  | { type: 'ADD_ASSET'; payload: AssetRecord };

export const caseActions = {
  loadCase: (payload: CaseState): CaseAction => ({ type: 'LOAD_CASE', payload }),
  setMode: (mode: 'bounded' | 'infinite'): CaseAction => ({
    type: 'SET_MODE',
    payload: mode,
  }),
  toggleMode: (): CaseAction => ({ type: 'TOGGLE_MODE' }),
  setPan: (panX: number, panY: number): CaseAction => ({
    type: 'SET_PAN',
    payload: { panX, panY },
  }),
  setZoom: (zoom: number): CaseAction => ({ type: 'SET_ZOOM', payload: zoom }),
  setFrameDimensions: (frameWidth: number, frameHeight: number): CaseAction => ({
    type: 'SET_FRAME_DIMENSIONS',
    payload: { frameWidth, frameHeight },
  }),
  autoFitFrame: (): CaseAction => ({ type: 'AUTO_FIT_FRAME' }),
  spawnCard: (payload: SpawnCardOptions): CaseAction => ({
    type: 'SPAWN_CARD',
    payload,
  }),
  moveCard: (cardId: string, x: number, y: number): CaseAction => ({
    type: 'MOVE_CARD',
    payload: { cardId, x, y },
  }),
  resizeCard: (cardId: string, width: number, height: number): CaseAction => ({
    type: 'RESIZE_CARD',
    payload: { cardId, width, height },
  }),
  setCardSkew: (cardId: string, skew: number): CaseAction => ({
    type: 'SET_CARD_SKEW',
    payload: { cardId, skew },
  }),
  straightenCard: (cardId: string): CaseAction => ({
    type: 'STRAIGHTEN_CARD',
    payload: { cardId },
  }),
  alignAllCards: (): CaseAction => ({ type: 'ALIGN_ALL_CARDS' }),
  updateCard: (cardId: string, patch: Partial<CardData>): CaseAction => ({
    type: 'UPDATE_CARD',
    payload: { cardId, patch },
  }),
  selectCard: (cardId: string | null): CaseAction => ({
    type: 'SELECT_CARD',
    payload: cardId,
  }),
  hoverCard: (cardId: string | null): CaseAction => ({
    type: 'HOVER_CARD',
    payload: cardId,
  }),
  bringToFront: (cardId: string): CaseAction => ({
    type: 'BRING_TO_FRONT',
    payload: cardId,
  }),
  stashCard: (cardId: string): CaseAction => ({
    type: 'STASH_CARD',
    payload: cardId,
  }),
  restoreCard: (cardId: string): CaseAction => ({
    type: 'RESTORE_CARD',
    payload: cardId,
  }),
  deleteCard: (cardId: string): CaseAction => ({
    type: 'DELETE_CARD',
    payload: cardId,
  }),
  setActiveTool: (tool: ActiveTool): CaseAction => ({
    type: 'SET_ACTIVE_TOOL',
    payload: tool,
  }),
  setYarnColor: (color: YarnColor): CaseAction => ({
    type: 'SET_YARN_COLOR',
    payload: color,
  }),
  setInkColor: (color: string): CaseAction => ({
    type: 'SET_INK_COLOR',
    payload: color,
  }),
  addPin: (cardId: string, pin?: Partial<PinData>): CaseAction => ({
    type: 'ADD_PIN',
    payload: { cardId, pin },
  }),
  movePin: (cardId: string, pinId: string, rx: number, ry: number): CaseAction => ({
    type: 'MOVE_PIN',
    payload: { cardId, pinId, rx, ry },
  }),
  addString: (string: StringData): CaseAction => ({
    type: 'ADD_STRING',
    payload: string,
  }),
  updateString: (stringId: string, label: string): CaseAction => ({
    type: 'UPDATE_STRING',
    payload: { stringId, label },
  }),
  removeString: (stringId: string): CaseAction => ({
    type: 'REMOVE_STRING',
    payload: stringId,
  }),
  addAsset: (asset: AssetRecord): CaseAction => ({
    type: 'ADD_ASSET',
    payload: asset,
  }),
};

export function caseReducer(state: CaseState, action: CaseAction): CaseState {
  switch (action.type) {
    case 'LOAD_CASE':
      return { ...action.payload };

    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
      };

    case 'TOGGLE_MODE':
      return {
        ...state,
        mode: state.mode === 'bounded' ? 'infinite' : 'bounded',
      };

    case 'SET_PAN':
      return {
        ...state,
        panX: action.payload.panX,
        panY: action.payload.panY,
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: clampZoom(action.payload),
      };

    case 'SET_FRAME_DIMENSIONS':
      return {
        ...state,
        frameWidth: Math.max(480, Math.round(action.payload.frameWidth)),
        frameHeight: Math.max(360, Math.round(action.payload.frameHeight)),
      };

    case 'AUTO_FIT_FRAME': {
      const visibleCards = state.cards.filter((c) => !c.stashed);
      if (visibleCards.length === 0) return state;
      const padding = 80;
      const minX = Math.min(0, ...visibleCards.map((c) => c.x));
      const minY = Math.min(0, ...visibleCards.map((c) => c.y));
      const shiftX = minX < 0 ? -minX + padding : 0;
      const shiftY = minY < 0 ? -minY + padding : 0;

      const shiftedCards =
        shiftX !== 0 || shiftY !== 0
          ? state.cards.map((c) =>
              c.stashed ? c : { ...c, x: c.x + shiftX, y: c.y + shiftY }
            )
          : state.cards;

      const updatedVisible = shiftedCards.filter((c) => !c.stashed);
      const maxX = Math.max(...updatedVisible.map((c) => c.x + c.width)) + padding;
      const maxY = Math.max(...updatedVisible.map((c) => c.y + c.height)) + padding;

      return {
        ...state,
        cards: shiftedCards,
        frameWidth: Math.max(state.frameWidth, 960, Math.round(maxX)),
        frameHeight: Math.max(state.frameHeight, 640, Math.round(maxY)),
      };
    }

    case 'SPAWN_CARD': {
      const opts = action.payload;
      const preset = CARD_PRESETS[opts.kind];
      const id = opts.id ?? nextId('card');
      const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
      const offsetIndex = state.cards.length;
      const defaultX = 200 + ((offsetIndex * 45) % 360);
      const defaultY = 120 + ((offsetIndex * 35) % 240);
      const plainText = opts.plainText ?? preset.plainText;
      const richContent = opts.richContent ?? plainText;

      const newCard: CardData = {
        id,
        kind: opts.kind,
        title: opts.title ?? preset.title,
        plainText,
        richContent,
        x: opts.x ?? defaultX,
        y: opts.y ?? defaultY,
        width: opts.width ?? preset.width,
        height: opts.height ?? preset.height,
        skew: opts.skew !== undefined ? opts.skew : generateHumanSkew(),
        zIndex: maxZ + 1,
        stashed: false,
        paperColor: opts.paperColor ?? preset.paperColor,
        defaultFontStyle: opts.defaultFontStyle ?? preset.defaultFontStyle,
        defaultFontSize: opts.defaultFontSize ?? preset.defaultFontSize,
        defaultTextColor: opts.defaultTextColor ?? preset.defaultTextColor,
        pins: [{ id: nextId('pin'), rx: 50, ry: 9, color: preset.pinColor }],
        annotations: [],
        assetId: opts.assetId,
        imageCaption: opts.imageCaption,
        pdfPageRange: opts.pdfPageRange,
        currentPageIndex: opts.currentPageIndex,
        sourcePageNumber: opts.sourcePageNumber,
        cropRect: opts.cropRect,
      };

      return {
        ...state,
        selectedCardId: id,
        cards: [...state.cards, newCard],
      };
    }

    case 'MOVE_CARD':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId
            ? { ...c, x: Math.round(action.payload.x), y: Math.round(action.payload.y) }
            : c
        ),
      };

    case 'RESIZE_CARD':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId
            ? {
                ...c,
                width: Math.max(150, Math.round(action.payload.width)),
                height: Math.max(120, Math.round(action.payload.height)),
              }
            : c
        ),
      };

    case 'SET_CARD_SKEW':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId
            ? { ...c, skew: Number(action.payload.skew.toFixed(1)) }
            : c
        ),
      };

    case 'STRAIGHTEN_CARD':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId ? { ...c, skew: 0 } : c
        ),
      };

    case 'ALIGN_ALL_CARDS':
      return {
        ...state,
        cards: state.cards.map((c) => ({ ...c, skew: 0 })),
      };

    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId ? { ...c, ...action.payload.patch } : c
        ),
      };

    case 'SELECT_CARD':
      return {
        ...state,
        selectedCardId: action.payload,
      };

    case 'HOVER_CARD':
      return {
        ...state,
        hoveredCardId: action.payload,
      };

    case 'BRING_TO_FRONT': {
      const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
      return {
        ...state,
        selectedCardId: action.payload,
        cards: state.cards.map((c) =>
          c.id === action.payload ? { ...c, zIndex: maxZ + 1 } : c
        ),
      };
    }

    case 'STASH_CARD':
      return {
        ...state,
        selectedCardId:
          state.selectedCardId === action.payload ? null : state.selectedCardId,
        cards: state.cards.map((c) =>
          c.id === action.payload ? { ...c, stashed: true } : c
        ),
      };

    case 'RESTORE_CARD': {
      const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
      return {
        ...state,
        selectedCardId: action.payload,
        cards: state.cards.map((c) =>
          c.id === action.payload ? { ...c, stashed: false, zIndex: maxZ + 1 } : c
        ),
      };
    }

    case 'DELETE_CARD':
      return {
        ...state,
        selectedCardId:
          state.selectedCardId === action.payload ? null : state.selectedCardId,
        cards: state.cards.filter((c) => c.id !== action.payload),
        strings: state.strings.filter(
          (s) => s.fromCardId !== action.payload && s.toCardId !== action.payload
        ),
      };

    case 'SET_ACTIVE_TOOL':
      return {
        ...state,
        activeTool: action.payload,
      };

    case 'SET_YARN_COLOR':
      return {
        ...state,
        activeYarnColor: action.payload,
      };

    case 'SET_INK_COLOR':
      return {
        ...state,
        activeInkColor: action.payload,
      };

    case 'ADD_PIN': {
      const colors: Array<PinData['color']> = ['red', 'brass', 'blue', 'black'];
      return {
        ...state,
        cards: state.cards.map((c) => {
          if (c.id !== action.payload.cardId) return c;
          const nextIdx = c.pins.length;
          const partial = action.payload.pin;
          const newPin: PinData = {
            id: partial?.id ?? nextId('pin'),
            rx:
              partial?.rx !== undefined
                ? Math.max(4, Math.min(96, partial.rx))
                : Math.min(88, 22 + ((nextIdx * 23) % 65)),
            ry:
              partial?.ry !== undefined
                ? Math.max(4, Math.min(96, partial.ry))
                : nextIdx % 2 === 1
                ? 85
                : 12,
            color: partial?.color ?? colors[nextIdx % colors.length],
          };
          return {
            ...c,
            pins: [...c.pins, newPin],
          };
        }),
      };
    }

    case 'MOVE_PIN': {
      const rx = Math.max(4, Math.min(96, action.payload.rx));
      const ry = Math.max(4, Math.min(96, action.payload.ry));
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.cardId
            ? {
                ...c,
                pins: c.pins.map((p) =>
                  p.id === action.payload.pinId ? { ...p, rx, ry } : p
                ),
              }
            : c
        ),
      };
    }

    case 'ADD_STRING':
      return {
        ...state,
        strings: [...state.strings, action.payload],
      };

    case 'UPDATE_STRING':
      return {
        ...state,
        strings: state.strings.map((s) =>
          s.id === action.payload.stringId
            ? { ...s, label: action.payload.label }
            : s
        ),
      };

    case 'REMOVE_STRING':
      return {
        ...state,
        strings: state.strings.filter((s) => s.id !== action.payload),
      };

    case 'ADD_ASSET':
      return {
        ...state,
        assets: [...state.assets, action.payload],
      };

    default:
      return state;
  }
}
