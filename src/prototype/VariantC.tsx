// PROTOTYPE Variant C: "Zero-Chrome Immersion + Corner Case Dossier + Radial Stamp"
// Layout:
// - 99% pure unobstructed Corkboard without permanent top/bottom bars.
// - Top-left Manila Dossier Corner Clip that unfolds into the Case Drawer & Board Mode controls on demand.
// - Right-clicking anywhere on the Board (or clicking the bottom-right Brass Wax Seal Stamp) opens a Radial Detective Dial at that exact spot to spawn Cards or switch Marker/Yarn tools.
// - Selected Cards unfold a side margin paper slip attached to their right edge for typography & paper tint.

import React, { useState } from 'react';
import { CardData, CardKind, FontStyle, PaperColor } from './types';
import { VariantProps } from './VariantA';
import { BoardSurface } from './BoardSurface';
import {
  Folder,
  Plus,
  Compass,
  Circle,
  Underline,
  MousePointer,
  Pin,
  X,
} from 'lucide-react';

export const VariantC: React.FC<VariantProps> = (props) => {
  const {
    state,
    setState,
    onSpawnCard,
    onRestoreCard,
    onBulkStraighten,
    onUpdateCardStyle,
  } = props;

  const [dossierOpen, setDossierOpen] = useState(false);
  const [radialMenu, setRadialMenu] = useState<{
    screenX: number;
    screenY: number;
    boardX?: number;
    boardY?: number;
  } | null>(null);

  const stashedCards = state.cards.filter((c) => c.stashed);

  const renderCardChrome = (card: CardData, isSelected: boolean) => {
    if (!isSelected) return null;
    return (
      <div
        className="vc-side-margin-slip"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vc-slip-title">PAPER & INK</div>
        <div className="vc-slip-swatches">
          {(
            ['yellow', 'cream', 'white', 'aged', 'pink', 'mint'] as PaperColor[]
          ).map((col) => (
            <button
              key={col}
              type="button"
              className={`paper-swatch swatch-${col} ${
                card.paperColor === col ? 'active' : ''
              }`}
              onClick={() => onUpdateCardStyle(card.id, { paperColor: col })}
            />
          ))}
        </div>
        <div className="vc-slip-fonts">
          {(['typewriter', 'handwriting', 'serif', 'sans'] as FontStyle[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                className={card.fontStyle === f ? 'active' : ''}
                onClick={() => onUpdateCardStyle(card.id, { fontStyle: f })}
              >
                {f.slice(0, 4)}
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="variant-shell variant-c">
      <BoardSurface
        {...props}
        renderCardChrome={renderCardChrome}
        onBoardContextMenu={(e, boardX, boardY) => {
          setRadialMenu({
            screenX: e.clientX,
            screenY: e.clientY,
            boardX,
            boardY,
          });
        }}
      />

      {/* Top-Left Corner Manila Dossier Clip */}
      <div className={`vc-corner-dossier ${dossierOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="vc-dossier-clip-btn"
          onClick={() => setDossierOpen(!dossierOpen)}
        >
          <Folder size={15} />
          <span>DOSSIER #409</span>
          {stashedCards.length > 0 && (
            <span className="vc-stash-count">{stashedCards.length}</span>
          )}
        </button>

        {dossierOpen && (
          <div className="vc-dossier-sheet">
            <div className="vc-dossier-top">
              <strong>CASE CONTROLS & STASH</strong>
              <button type="button" onClick={() => setDossierOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="vc-dossier-controls">
              <button
                type="button"
                onClick={() =>
                  setState((p) => ({
                    ...p,
                    mode: p.mode === 'bounded' ? 'infinite' : 'bounded',
                  }))
                }
              >
                Surface: {state.mode === 'bounded' ? 'Bounded Frame' : 'Infinite'}
              </button>
              <button type="button" onClick={onBulkStraighten}>
                <Compass size={13} /> Straighten All (0°)
              </button>
            </div>

            <div className="vc-dossier-tools">
              <span>Active Pen / Hand:</span>
              <div className="vc-tool-pills">
                <button
                  type="button"
                  className={state.activeTool === 'select' ? 'active' : ''}
                  onClick={() => setState((p) => ({ ...p, activeTool: 'select' }))}
                >
                  <MousePointer size={12} /> Hand
                </button>
                <button
                  type="button"
                  className={state.activeTool === 'circle' ? 'active' : ''}
                  onClick={() => setState((p) => ({ ...p, activeTool: 'circle' }))}
                >
                  <Circle size={12} /> Circle
                </button>
                <button
                  type="button"
                  className={state.activeTool === 'underline' ? 'active' : ''}
                  onClick={() =>
                    setState((p) => ({ ...p, activeTool: 'underline' }))
                  }
                >
                  <Underline size={12} /> Line
                </button>
              </div>
            </div>

            <div className="vc-dossier-stash">
              <h4>STASHED EVIDENCE ({stashedCards.length})</h4>
              {stashedCards.length === 0 ? (
                <p className="vc-muted">
                  All Evidence Cards are currently pinned to the Board.
                </p>
              ) : (
                stashedCards.map((c) => (
                  <div key={c.id} className="vc-stash-row">
                    <div>
                      <small>{c.kind}</small>
                      <strong>{c.title}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestoreCard(c.id)}
                    >
                      <Pin size={12} /> Pin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subtle hint pill in top-right */}
      <div className="vc-hint-pill">
        Right-click anywhere on the Board (or click the Brass Stamp) to pin new Cards
      </div>

      {/* Bottom-Right Brass Wax Seal Stamp Button */}
      <button
        type="button"
        className="vc-brass-stamp-fab"
        title="Open Detective Radial Dial (or Right-Click anywhere on Board)"
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setRadialMenu(
            radialMenu
              ? null
              : {
                  screenX: rect.left - 90,
                  screenY: rect.top - 90,
                }
          );
        }}
      >
        <Plus size={22} />
        <span>PIN</span>
      </button>

      {/* Radial Detective Dial Popup */}
      {radialMenu && (
        <div
          className="vc-radial-backdrop"
          onClick={() => setRadialMenu(null)}
        >
          <div
            className="vc-radial-wheel"
            style={{
              left: Math.max(140, Math.min(window.innerWidth - 160, radialMenu.screenX)),
              top: Math.max(140, Math.min(window.innerHeight - 160, radialMenu.screenY)),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="vc-radial-center"
              onClick={() => setRadialMenu(null)}
            >
              ×
            </button>
            {(
              [
                { kind: 'sticky', label: 'Sticky Note', angle: -90 },
                { kind: 'a4', label: 'A4 Sheet', angle: -30 },
                { kind: 'index-card', label: 'Index Card', angle: 30 },
                { kind: 'newspaper', label: 'Clipping', angle: 90 },
                { kind: 'photo', label: 'Polaroid', angle: 150 },
                { kind: 'pdf-stack', label: 'PDF Stack', angle: 210 },
              ] as Array<{ kind: CardKind; label: string; angle: number }>
            ).map((item) => {
              const rad = (item.angle * Math.PI) / 180;
              const r = 92;
              const tx = Math.cos(rad) * r;
              const ty = Math.sin(rad) * r;
              return (
                <button
                  key={item.kind}
                  type="button"
                  className="vc-radial-spoke"
                  style={{
                    transform: `translate(${tx}px, ${ty}px)`,
                  }}
                  onClick={() => {
                    onSpawnCard(item.kind, radialMenu.boardX, radialMenu.boardY);
                    setRadialMenu(null);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
