import React, { useRef, useState } from 'react';
import {
  ActiveTool,
  CardKind,
  CaseState,
  YarnColor,
} from '../domain/types';
import {
  StickyNote,
  FileText,
  Newspaper,
  Image,
  Layers,
  CreditCard,
  Compass,
  Circle,
  Square,
  Underline,
  ArrowUpRight,
  PenTool,
  Eraser,
  MousePointer,
  Maximize2,
  Infinity as InfinityIcon,
} from 'lucide-react';

export interface WoodenPencilTrayProps {
  state: CaseState;
  onSpawnCard: (kind: CardKind) => void;
  onUploadPhoto?: (file: File) => void;
  onUploadPdf?: (file: File) => void;
  onSetActiveTool: (tool: ActiveTool) => void;
  onSetYarnColor: (color: YarnColor) => void;
  onSetInkColor?: (color: string) => void;
  onAlignAll: () => void;
  onToggleMode: () => void;
  onSetFrameDimensions?: (width: number, height: number) => void;
}

export const WoodenPencilTray: React.FC<WoodenPencilTrayProps> = ({
  state,
  onSpawnCard,
  onUploadPhoto,
  onUploadPdf,
  onSetActiveTool,
  onSetYarnColor,
  onSetInkColor,
  onAlignAll,
  onToggleMode,
  onSetFrameDimensions,
}) => {
  const [trayPinned, setTrayPinned] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      data-testid="wooden-pencil-tray-wrap"
      className={`va-wooden-tray-wrap ${trayPinned ? 'is-pinned' : 'auto-hide'}`}
    >
      <input
        ref={photoInputRef}
        data-testid="photo-upload-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/*"
        className="visually-hidden"
        aria-label="Upload Photo Print"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadPhoto) {
            onUploadPhoto(file);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInputRef}
        data-testid="pdf-upload-input"
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        aria-label="Upload PDF Stack"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadPdf) {
            onUploadPdf(file);
          }
          e.target.value = '';
        }}
      />
      <div className="va-wooden-tray">
        {/* Section 1: Spawn Detective Kit Cards */}
        <div className="tray-well">
          <span className="tray-label">Add Evidence</span>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn Sticky Note"
            onClick={() => onSpawnCard('sticky')}
            title="Add skewed Sticky Note"
          >
            <StickyNote size={15} />
            <span>Sticky Note</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn A4 Document"
            onClick={() => onSpawnCard('a4')}
            title="Add A4 Typed Document"
          >
            <FileText size={15} />
            <span>A4 Document</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn Index Card"
            onClick={() => onSpawnCard('index-card')}
            title="Add Lined Index Card"
          >
            <CreditCard size={15} />
            <span>Index Card</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn Newspaper Clipping"
            onClick={() => onSpawnCard('newspaper')}
            title="Add Newspaper Clipping"
          >
            <Newspaper size={15} />
            <span>Newspaper Clipping</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn Photo Print"
            onClick={() => {
              if (onUploadPhoto && photoInputRef.current) {
                photoInputRef.current.click();
              } else {
                onSpawnCard('photo');
              }
            }}
            title="Add Resizable Polaroid Photo"
          >
            <Image size={15} />
            <span>Photo</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn PDF Stack"
            onClick={() => {
              if (onUploadPdf && pdfInputRef.current) {
                pdfInputRef.current.click();
              } else {
                onSpawnCard('pdf-stack');
              }
            }}
            title="Add Multi-Page PDF Stack"
          >
            <Layers size={15} />
            <span>PDF Stack</span>
          </button>
        </div>

        {/* Section 2: Marker & Yarn Tools */}
        <div className="tray-well">
          <span className="tray-label">Desk Tools</span>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('select')}
            title="Move Cards & Drag Pins to connect Strings"
          >
            <MousePointer size={15} />
            <span>Hand</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'freehand' ? 'active' : ''}`}
            aria-label="Freehand Pen"
            onClick={() => onSetActiveTool('freehand')}
            title="Draw freehand ink stroke"
          >
            <PenTool size={15} />
            <span>Pen</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'circle' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('circle')}
            title="Draw hand-sketched marker circle"
          >
            <Circle size={15} />
            <span>Circle</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('rectangle')}
            title="Draw hand-sketched marker rectangle"
          >
            <Square size={15} />
            <span>Rectangle</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'underline' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('underline')}
            title="Underline evidence"
          >
            <Underline size={15} />
            <span>Underline</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'arrow' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('arrow')}
            title="Draw hand-sketched arrow"
          >
            <ArrowUpRight size={15} />
            <span>Arrow</span>
          </button>
          <button
            type="button"
            className={`tray-tool-btn ${state.activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onSetActiveTool('eraser')}
            title="Erase hand-drawn Annotations"
          >
            <Eraser size={15} />
            <span>Eraser</span>
          </button>

          {/* Yarn spool color selector */}
          <div className="yarn-spools" title="Active Yarn Spool Color">
            {(
              [
                { hex: '#A11D21', name: 'Crimson Yarn' },
                { hex: '#D49A2A', name: 'Ochre Yarn' },
                { hex: '#235789', name: 'Navy Yarn' },
                { hex: '#1E242B', name: 'Charcoal Yarn' },
              ] as const
            ).map((y) => (
              <button
                key={y.hex}
                type="button"
                className={`yarn-spool-dot ${
                  state.activeYarnColor === y.hex ? 'active' : ''
                }`}
                style={{ backgroundColor: y.hex }}
                title={y.name}
                aria-label={y.name}
                onClick={() => onSetYarnColor(y.hex)}
              />
            ))}
          </div>

          {/* Marker ink color selector */}
          {onSetInkColor && (
            <div
              className="tray-ink-colors"
              role="group"
              aria-label="Marker ink color picker"
              title="Active Marker Ink Color"
            >
              {(
                [
                  { hex: '#A11D21', name: 'Marker Ink #A11D21' },
                  { hex: '#1E1A17', name: 'Marker Ink #1E1A17' },
                  { hex: '#235789', name: 'Marker Ink #235789' },
                  { hex: '#2B6E46', name: 'Marker Ink #2B6E46' },
                  { hex: '#5C3A21', name: 'Marker Ink #5C3A21' },
                ] as const
              ).map((ink) => (
                <button
                  key={ink.hex}
                  type="button"
                  className={`ink-color-dot ${
                    state.activeInkColor === ink.hex ? 'active' : ''
                  }`}
                  style={{ backgroundColor: ink.hex }}
                  title={ink.name}
                  aria-label={ink.name}
                  onClick={() => onSetInkColor(ink.hex)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Board Mode & Alignment */}
        <div className="tray-well">
          <span className="tray-label">Board & Skew</span>
          <button
            type="button"
            className="tray-tool-btn"
            onClick={onAlignAll}
            title="Straighten all skewed Cards to 0° with one click"
          >
            <Compass size={15} />
            <span>Align All (0°)</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            onClick={onToggleMode}
            title="Switch live between Bounded Wooden Frame and Infinite Corkboard"
          >
            {state.mode === 'bounded' ? (
              <>
                <Maximize2 size={15} />
                <span>Bounded</span>
              </>
            ) : (
              <>
                <InfinityIcon size={15} />
                <span>Infinite</span>
              </>
            )}
          </button>
          {state.mode === 'bounded' && onSetFrameDimensions && (
            <div
              className="tray-frame-size-controls"
              role="group"
              aria-label="Bounded frame dimensions"
            >
              <label>
                <span className="visually-hidden">Frame width</span>
                <input
                  type="number"
                  aria-label="Frame width"
                  className="tray-frame-dim-input"
                  min={480}
                  step={20}
                  value={state.frameWidth}
                  onChange={(e) =>
                    onSetFrameDimensions(
                      Number(e.target.value) || state.frameWidth,
                      state.frameHeight
                    )
                  }
                />
              </label>
              <span>×</span>
              <label>
                <span className="visually-hidden">Frame height</span>
                <input
                  type="number"
                  aria-label="Frame height"
                  className="tray-frame-dim-input"
                  min={360}
                  step={20}
                  value={state.frameHeight}
                  onChange={(e) =>
                    onSetFrameDimensions(
                      state.frameWidth,
                      Number(e.target.value) || state.frameHeight
                    )
                  }
                />
              </label>
            </div>
          )}
          <button
            type="button"
            className={`tray-lock-btn ${trayPinned ? 'locked' : ''}`}
            onClick={() => setTrayPinned(!trayPinned)}
            title="Toggle auto-hide pencil tray"
          >
            {trayPinned ? 'Auto-Hide: Off' : 'Auto-Hide: On'}
          </button>
        </div>
      </div>
    </div>
  );
};
