import React, { useState } from 'react';
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
  onSetActiveTool: (tool: ActiveTool) => void;
  onSetYarnColor: (color: YarnColor) => void;
  onAlignAll: () => void;
  onToggleMode: () => void;
}

export const WoodenPencilTray: React.FC<WoodenPencilTrayProps> = ({
  state,
  onSpawnCard,
  onSetActiveTool,
  onSetYarnColor,
  onAlignAll,
  onToggleMode,
}) => {
  const [trayPinned, setTrayPinned] = useState(true);

  return (
    <div
      data-testid="wooden-pencil-tray-wrap"
      className={`va-wooden-tray-wrap ${trayPinned ? 'is-pinned' : 'auto-hide'}`}
    >
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
            onClick={() => onSpawnCard('photo')}
            title="Add Resizable Polaroid Photo"
          >
            <Image size={15} />
            <span>Photo</span>
          </button>
          <button
            type="button"
            className="tray-tool-btn"
            aria-label="Spawn PDF Stack"
            onClick={() => onSpawnCard('pdf-stack')}
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
