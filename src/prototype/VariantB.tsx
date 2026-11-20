// PROTOTYPE Variant B: "Top Brass Evidence Rail + Bottom Slide-Up Evidence Box"
// Layout:
// - Narrow top brass rail (under a banker's lamp glow) with spring-clip buttons to drop new Cards onto the Board, plus mode & bulk-align switches.
// - Bottom slide-up cardboard Evidence Box drawer showing horizontal physical card previews of stashed & pinned Cards.
// - Right-side Stamped Evidence Tag Inspector panel that appears when a Card is selected.

import React, { useState } from 'react';
import { CardKind, FontStyle, PaperColor } from './types';
import { VariantProps } from './VariantA';
import { BoardSurface } from './BoardSurface';
import {
  Archive,
  Compass,
  Circle,
  Underline,
  MousePointer,
  ChevronUp,
  ChevronDown,
  Pin,
  Plus,
  RotateCcw,
} from 'lucide-react';

export const VariantB: React.FC<VariantProps> = (props) => {
  const {
    state,
    setState,
    onSpawnCard,
    onStashCard,
    onRestoreCard,
    onStraightenCard,
    onBulkStraighten,
    onUpdateCardStyle,
    onClearCardAnnotations,
  } = props;

  const [boxOpen, setBoxOpen] = useState(false);
  const [boxFilter, setBoxFilter] = useState<'stashed' | 'all'>('stashed');

  const selectedCard = state.cards.find((c) => c.id === state.selectedCardId) ?? null;
  const stashedCards = state.cards.filter((c) => c.stashed);
  const displayedDrawerCards =
    boxFilter === 'stashed' ? stashedCards : state.cards;

  const cardKinds: Array<{ kind: CardKind; label: string }> = [
    { kind: 'sticky', label: '+ Sticky' },
    { kind: 'a4', label: '+ A4 Report' },
    { kind: 'index-card', label: '+ Index Card' },
    { kind: 'newspaper', label: '+ Press Clip' },
    { kind: 'photo', label: '+ Polaroid' },
    { kind: 'pdf-stack', label: '+ PDF Stack' },
  ];

  return (
    <div className="variant-shell variant-b">
      {/* Top Brass Evidence Rail */}
      <header className="vb-brass-rail">
        <div className="vb-rail-brand">
          <span className="brass-rivet" />
          <strong>CASE #409 // HARBOR HOMICIDE</strong>
        </div>

        {/* Spring clips to spawn new Cards */}
        <div className="vb-clip-bar">
          {cardKinds.map((item) => (
            <button
              key={item.kind}
              type="button"
              className="vb-brass-clip-btn"
              onClick={() => onSpawnCard(item.kind)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right rail controls: Marker tools, Board Mode, Bulk Align */}
        <div className="vb-rail-controls">
          <div className="vb-tool-segment">
            <button
              type="button"
              className={state.activeTool === 'select' ? 'active' : ''}
              onClick={() => setState((p) => ({ ...p, activeTool: 'select' }))}
              title="Select & Move"
            >
              <MousePointer size={13} />
            </button>
            <button
              type="button"
              className={state.activeTool === 'circle' ? 'active' : ''}
              onClick={() => setState((p) => ({ ...p, activeTool: 'circle' }))}
              title="Marker Circle tool"
            >
              <Circle size={13} />
            </button>
            <button
              type="button"
              className={state.activeTool === 'underline' ? 'active' : ''}
              onClick={() => setState((p) => ({ ...p, activeTool: 'underline' }))}
              title="Marker Underline tool"
            >
              <Underline size={13} />
            </button>
          </div>

          <button
            type="button"
            className="vb-rail-action"
            onClick={onBulkStraighten}
            title="Straighten all Cards to 0°"
          >
            <Compass size={13} />
            <span>Straighten All</span>
          </button>

          <button
            type="button"
            className="vb-rail-action"
            onClick={() =>
              setState((p) => ({
                ...p,
                mode: p.mode === 'bounded' ? 'infinite' : 'bounded',
              }))
            }
          >
            {state.mode === 'bounded' ? 'Frame: Bounded' : 'Frame: Infinite'}
          </button>
        </div>
      </header>

      {/* Main Corkboard Surface */}
      <BoardSurface {...props} />

      {/* Right Stamped Evidence Inspector Tag (when a Card is focused) */}
      {selectedCard && !selectedCard.stashed && (
        <aside className="vb-evidence-tag-inspector">
          <div className="vb-tag-hole" />
          <div className="vb-tag-header">
            <span className="vb-stamp">EVIDENCE TAG</span>
            <strong>{selectedCard.kind.toUpperCase()}</strong>
          </div>

          <div className="vb-tag-field">
            <label>Paper Stock & Tint</label>
            <div className="vb-swatches">
              {(
                ['yellow', 'cream', 'white', 'aged', 'pink', 'mint'] as PaperColor[]
              ).map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`paper-swatch swatch-${col} ${
                    selectedCard.paperColor === col ? 'active' : ''
                  }`}
                  onClick={() =>
                    onUpdateCardStyle(selectedCard.id, { paperColor: col })
                  }
                />
              ))}
            </div>
          </div>

          <div className="vb-tag-field">
            <label>Typography</label>
            <div className="vb-btn-grid">
              {(['typewriter', 'handwriting', 'serif', 'sans'] as FontStyle[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    className={selectedCard.fontStyle === f ? 'active' : ''}
                    onClick={() =>
                      onUpdateCardStyle(selectedCard.id, { fontStyle: f })
                    }
                  >
                    {f}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="vb-tag-field">
            <label>Text Size & Skew ({selectedCard.skew.toFixed(1)}°)</label>
            <div className="vb-row-split">
              {(['sm', 'md', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={selectedCard.fontSize === sz ? 'active' : ''}
                  onClick={() =>
                    onUpdateCardStyle(selectedCard.id, { fontSize: sz })
                  }
                >
                  {sz.toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                className="vb-straighten-btn"
                onClick={() => onStraightenCard(selectedCard.id)}
              >
                Align 0°
              </button>
            </div>
          </div>

          <div className="vb-tag-field">
            <label>Yarn Spool Color</label>
            <div className="vb-swatches">
              {(
                ['#A11D21', '#D49A2A', '#235789', '#1E242B'] as const
              ).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`yarn-spool-dot ${
                    state.activeYarnColor === hex ? 'active' : ''
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() =>
                    setState((p) => ({ ...p, activeYarnColor: hex }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="vb-tag-footer">
            {selectedCard.annotations.length > 0 && (
              <button
                type="button"
                onClick={() => onClearCardAnnotations(selectedCard.id)}
              >
                <RotateCcw size={12} /> Clear Ink
              </button>
            )}
            <button
              type="button"
              onClick={() => onStashCard(selectedCard.id)}
            >
              <Archive size={12} /> Move to Box
            </button>
          </div>
        </aside>
      )}

      {/* Bottom Slide-Up Cardboard Evidence Box */}
      <section className={`vb-evidence-box ${boxOpen ? 'is-open' : ''}`}>
        <div className="vb-box-lid-bar">
          <button
            type="button"
            className="vb-box-toggle"
            onClick={() => setBoxOpen(!boxOpen)}
          >
            <Archive size={15} />
            <span>
              ARCHIVE EVIDENCE BOX ({stashedCards.length} Stashed /{' '}
              {state.cards.length} Total)
            </span>
            {boxOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>

          {boxOpen && (
            <div className="vb-box-tabs">
              <button
                type="button"
                className={boxFilter === 'stashed' ? 'active' : ''}
                onClick={() => setBoxFilter('stashed')}
              >
                Stashed Off-Board ({stashedCards.length})
              </button>
              <button
                type="button"
                className={boxFilter === 'all' ? 'active' : ''}
                onClick={() => setBoxFilter('all')}
              >
                All Case Cards ({state.cards.length})
              </button>
            </div>
          )}
        </div>

        {boxOpen && (
          <div className="vb-box-tray">
            {displayedDrawerCards.length === 0 ? (
              <div className="vb-empty-box">
                No Cards currently stashed in the Evidence Box.
              </div>
            ) : (
              displayedDrawerCards.map((c) => {
                const stringCount = state.strings.filter(
                  (s) => s.fromCardId === c.id || s.toCardId === c.id
                ).length;
                return (
                  <div
                    key={c.id}
                    className={`vb-mini-folder paper-${c.paperColor}`}
                  >
                    <div className="vb-mini-top">
                      <span className="vb-mini-kind">{c.kind}</span>
                      {stringCount > 0 && (
                        <span className="vb-mini-links">
                          {stringCount} String(s)
                        </span>
                      )}
                    </div>
                    <strong>{c.title}</strong>
                    <p>{c.content.slice(0, 70)}...</p>
                    <div className="vb-mini-actions">
                      {c.stashed ? (
                        <button
                          type="button"
                          className="vb-restore-btn"
                          onClick={() => onRestoreCard(c.id)}
                        >
                          <Pin size={12} /> Pin Back to Board
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStashCard(c.id)}
                        >
                          Stash in Box
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
};
