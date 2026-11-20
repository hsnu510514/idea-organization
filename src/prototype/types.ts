// PROTOTYPE: Shared domain types & initial Case state for comparing UI variants A, B, and C.

export type CardKind =
  | 'sticky'
  | 'a4'
  | 'index-card'
  | 'newspaper'
  | 'photo'
  | 'pdf-stack'
  | 'clipping';

export type PaperColor = 'yellow' | 'pink' | 'mint' | 'cream' | 'aged' | 'white';

export type FontStyle = 'typewriter' | 'handwriting' | 'serif' | 'sans';

export interface PinData {
  id: string;
  /** Relative percentage position on card (0-100) */
  rx: number;
  ry: number;
  color: 'red' | 'brass' | 'black' | 'blue';
}

export interface AnnotationShape {
  id: string;
  kind: 'circle' | 'underline' | 'freehand';
  color: string;
  /** Relative percentage coordinates on the card */
  x: number;
  y: number;
  w: number;
  h: number;
  points?: Array<{ x: number; y: number }>;
}

export interface CardData {
  id: string;
  kind: CardKind;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  skew: number; // degrees (-7 to +7)
  zIndex: number;
  stashed: boolean; // True when stored inside Case Drawer off the Board
  paperColor: PaperColor;
  fontStyle: FontStyle;
  fontSize: 'sm' | 'md' | 'lg';
  textColor: string;
  highlightColor?: string;
  pins: PinData[];
  annotations: AnnotationShape[];
  // Media specific
  imageUrl?: string;
  imageCaption?: string;
  pdfPages?: string[];
  currentPage?: number;
  sourcePdfTitle?: string;
}

export interface StringData {
  id: string;
  fromCardId: string;
  fromPinId: string;
  toCardId: string;
  toPinId: string;
  color: '#A11D21' | '#D49A2A' | '#1E242B' | '#235789';
  label?: string;
}

export interface BoardState {
  caseTitle: string;
  mode: 'bounded' | 'infinite';
  frameWidth: number;
  frameHeight: number;
  panX: number;
  panY: number;
  zoom: number;
  cards: CardData[];
  strings: StringData[];
  selectedCardId: string | null;
  hoveredCardId: string | null;
  activeTool: 'select' | 'string' | 'circle' | 'underline' | 'pen';
  activeYarnColor: '#A11D21' | '#D49A2A' | '#1E242B' | '#235789';
  activeInkColor: string;
}

export const INITIAL_CARDS: CardData[] = [
  {
    id: 'card-harbor-photo',
    kind: 'photo',
    title: 'Pier 14 Surveillance',
    content: '02:14 AM — Gray sedan parked near drydock gate B.',
    x: 110,
    y: 95,
    width: 240,
    height: 270,
    skew: -4.2,
    zIndex: 2,
    stashed: false,
    paperColor: 'white',
    fontStyle: 'handwriting',
    fontSize: 'md',
    textColor: '#1E1A17',
    pins: [{ id: 'pin-1', rx: 50, ry: 8, color: 'red' }],
    annotations: [
      { id: 'ann-1', kind: 'circle', color: '#A11D21', x: 54, y: 36, w: 34, h: 26 },
    ],
    imageUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    imageCaption: 'Pier 14 North Gate • Oct 19, 02:14',
  },
  {
    id: 'card-coroner-a4',
    kind: 'a4',
    title: 'AUTOPSY & FORENSICS SUMMARY — CASE #409',
    content:
      'SUBJECT: Victor Vance (46)\nTIME OF DISCOVERY: 05:40 AM, Cargo Hold 3.\n\n1. Trace alkaloid residue detected on brass teacup rim.\n2. Pocket watch stopped at 02:20 AM due to impact.\n3. Mud on cuff matches tidal silt from Pier 14.',
    x: 420,
    y: 75,
    width: 310,
    height: 360,
    skew: 1.8,
    zIndex: 3,
    stashed: false,
    paperColor: 'cream',
    fontStyle: 'typewriter',
    fontSize: 'sm',
    textColor: '#1E1A17',
    highlightColor: 'rgba(212, 154, 42, 0.25)',
    pins: [
      { id: 'pin-2', rx: 50, ry: 6, color: 'brass' },
      { id: 'pin-2b', rx: 14, ry: 68, color: 'red' },
    ],
    annotations: [
      { id: 'ann-2', kind: 'underline', color: '#A11D21', x: 12, y: 66, w: 75, h: 6 },
    ],
  },
  {
    id: 'card-alibi-sticky',
    kind: 'sticky',
    title: 'Check Harbor Master Log!',
    content:
      'Night guard claims gate B padlock was never cut — someone had a duplicate brass key.',
    x: 335,
    y: 280,
    width: 210,
    height: 195,
    skew: -5.5,
    zIndex: 6,
    stashed: false,
    paperColor: 'yellow',
    fontStyle: 'handwriting',
    fontSize: 'lg',
    textColor: '#2A1E17',
    pins: [{ id: 'pin-3', rx: 48, ry: 10, color: 'red' }],
    annotations: [],
  },
  {
    id: 'card-newspaper',
    kind: 'newspaper',
    title: 'THE HARBOR CHRONICLE',
    content:
      'DOCKWORKERS STRIKE ENTERING THIRD WEEK AT PIER 14\n\nUnion treasurer Elias Thorne warned Tuesday that unmanifested night shipments continued despite the blockade.',
    x: 790,
    y: 90,
    width: 265,
    height: 245,
    skew: 3.4,
    zIndex: 4,
    stashed: false,
    paperColor: 'aged',
    fontStyle: 'serif',
    fontSize: 'sm',
    textColor: '#1D1916',
    pins: [{ id: 'pin-4', rx: 52, ry: 9, color: 'black' }],
    annotations: [
      { id: 'ann-3', kind: 'circle', color: '#A11D21', x: 18, y: 55, w: 48, h: 22 },
    ],
  },
  {
    id: 'card-pdf-manifest',
    kind: 'pdf-stack',
    title: 'Port_Authority_Manifest_Oct19.pdf',
    content: '',
    x: 750,
    y: 355,
    width: 295,
    height: 270,
    skew: -2.1,
    zIndex: 5,
    stashed: false,
    paperColor: 'white',
    fontStyle: 'typewriter',
    fontSize: 'sm',
    textColor: '#1E1A17',
    pins: [{ id: 'pin-5', rx: 50, ry: 7, color: 'brass' }],
    annotations: [],
    currentPage: 0,
    pdfPages: [
      'PAGE 1 / 3 — INBOUND VESSEL LOG\nVessel: MV Northern Star\nBerth: Pier 14, Slip B\nCleared by: Deputy Inspector E. Thorne\nTimestamp: 01:45 AM',
      'PAGE 2 / 3 — CARGO BILL OF LADING\nCrate #88-A: Industrial Solvents (Declared)\nWeight discrepancy: +42 kg above standard drum tare.\nSigned: V. Vance (Disputed)',
      'PAGE 3 / 3 — GATE TRANSPONDER PING\n02:11 AM — Plate 7K9-441 enters Gate B\n02:29 AM — Plate 7K9-441 exits Gate B at high speed.',
    ],
  },
  {
    id: 'card-index-witness',
    kind: 'index-card',
    title: 'WITNESS: Clara Bell (Diner Cook)',
    content:
      'Saw E. Thorne arguing with Vance at the all-night pier diner at 11:30 PM. Thorne left a manila envelope on the counter.',
    x: 105,
    y: 395,
    width: 260,
    height: 185,
    skew: 2.9,
    zIndex: 4,
    stashed: false,
    paperColor: 'white',
    fontStyle: 'handwriting',
    fontSize: 'md',
    textColor: '#1D2939',
    pins: [{ id: 'pin-6', rx: 50, ry: 10, color: 'blue' }],
    annotations: [],
  },
  {
    id: 'card-stashed-phone',
    kind: 'index-card',
    title: 'Payphone Toll Record #881',
    content: '3-minute call placed from Pier 14 booth to Thorne residence at 02:23 AM.',
    x: 480,
    y: 260,
    width: 250,
    height: 175,
    skew: -3.2,
    zIndex: 7,
    stashed: true,
    paperColor: 'mint',
    fontStyle: 'typewriter',
    fontSize: 'sm',
    textColor: '#1E1A17',
    pins: [{ id: 'pin-7', rx: 50, ry: 10, color: 'red' }],
    annotations: [],
  },
];

export const INITIAL_STRINGS: StringData[] = [
  {
    id: 'str-1',
    fromCardId: 'card-harbor-photo',
    fromPinId: 'pin-1',
    toCardId: 'card-coroner-a4',
    toPinId: 'pin-2b',
    color: '#A11D21',
    label: 'Same tidal silt',
  },
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
    id: 'str-3',
    fromCardId: 'card-newspaper',
    fromPinId: 'pin-4',
    toCardId: 'card-pdf-manifest',
    toPinId: 'pin-5',
    color: '#D49A2A',
    label: 'E. Thorne signature',
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
  {
    id: 'str-5',
    fromCardId: 'card-stashed-phone',
    fromPinId: 'pin-7',
    toCardId: 'card-alibi-sticky',
    toPinId: 'pin-3',
    color: '#A11D21',
    label: 'Call right after 02:20',
  },
];
