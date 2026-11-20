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
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AssetRecord {
  id: string;
  filename: string;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  /** Relative path inside the Case directory, e.g. "assets/harbor-manifest.pdf" */
  relativePath: string;
  pageCount?: number;
}

export interface PinData {
  id: string;
  /** Relative percentage coordinates on the Card (0..100) */
  rx: number;
  ry: number;
  color: 'red' | 'brass' | 'black' | 'blue';
}

export interface AnnotationData {
  id: string;
  target: 'card' | 'board';
  kind: 'freehand' | 'circle' | 'rectangle' | 'underline' | 'arrow';
  color: string;
  strokeWidth: number;
  /** Bounding box in Card-relative percentages (0..100) or Board coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Normalized stroke points for freehand paths */
  points?: Array<{ x: number; y: number }>;
}

export interface PdfClipRect {
  /** Normalized coordinates (0..1) relative to the rendered PDF page dimensions */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardData {
  id: string;
  kind: CardKind;
  title: string;
  /** Sanitized rich-text HTML or structured inline spans for per-selection formatting */
  richContent: string;
  plainText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  skew: number; // degrees
  zIndex: number;
  stashed: boolean;
  paperColor: PaperColor;
  defaultFontStyle: FontStyle;
  defaultFontSize: FontSize;
  defaultTextColor: string;
  pins: PinData[];
  annotations: AnnotationData[];
  // Asset references
  assetId?: string;
  imageCaption?: string;
  /** For PDF Stack: 1-based inclusive page numbers selected on creation */
  pdfPageRange?: { start: number; end: number };
  currentPageIndex?: number;
  /** For Clipping extracted from a PDF Stack page */
  sourcePageNumber?: number;
  cropRect?: PdfClipRect;
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

export type ActiveTool =
  | 'select'
  | 'freehand'
  | 'circle'
  | 'rectangle'
  | 'underline'
  | 'arrow'
  | 'eraser';

export type YarnColor = '#A11D21' | '#D49A2A' | '#1E242B' | '#235789';

export interface CaseState {
  caseSlug: string;
  caseTitle: string;
  mode: 'bounded' | 'infinite';
  frameWidth: number;
  frameHeight: number;
  panX: number;
  panY: number;
  zoom: number;
  cards: CardData[];
  strings: StringData[];
  assets: AssetRecord[];
  boardAnnotations: AnnotationData[];
  selectedCardId: string | null;
  selectedAnnotationId?: string | null;
  hoveredCardId: string | null;
  activeTool: ActiveTool;
  activeYarnColor: YarnColor;
  activeInkColor: string;
  activeStrokeWidth?: number;
}

export interface CaseSummary {
  caseSlug: string;
  caseTitle: string;
  updatedAt?: string;
}

export interface WorkspaceStorageAdapter {
  listCases(): Promise<CaseSummary[]>;
  /** Optional synchronous snapshot of known Case summaries for initial UI rendering */
  peekCases?(): CaseSummary[];
  loadCase(caseSlug: string): Promise<CaseState | null>;
  saveCase(caseSlug: string, boardData: CaseState): Promise<void>;
  deleteCase(caseSlug: string): Promise<void>;
  saveAsset(caseSlug: string, file: File | Blob, filename?: string): Promise<AssetRecord>;
  loadAssetUrl(caseSlug: string, relativePath: string): Promise<string>;
  exportCaseZip(caseSlug: string): Promise<Blob>;
  importCaseZip(zipFile: File | Blob): Promise<CaseState>;
}
