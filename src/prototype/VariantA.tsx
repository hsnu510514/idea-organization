// PROTOTYPE Variant A: "Bottom Wooden Pencil Tray + Right Manila File Drawer"
// Layout:
// - Auto-tucking wooden pencil tray at the bottom edge of the desk (spawns Cards, chooses yarn/marker tools, bulk straighten, mode toggle).
// - Vertical Manila File Tab on the right edge that slides out the Case Drawer.
// - Selected Cards display an inline Paper Formatting Ribbon right above the Card.

import React, { useState } from 'react';
import { BoardState, CardData, CardKind, FontStyle, PaperColor } from './types';
import { BoardSurface } from './BoardSurface';
import {
  StickyNote,
  FileText,
  Newspaper,
  Image,
  Layers,
  CreditCard,
  Compass,
  Circle,
  Underline,
  MousePointer,
  FolderOpen,
  Search,
  Pin,
  Maximize2,
  Infinity as InfinityIcon,
  RotateCcw,
} from 'lucide-react';

export interface VariantProps {
  state: BoardState;
  setState: React.Dispatch<React.SetStateAction<BoardState>>;
  onSpawnCard: (kind: CardKind, x?: number, y?: number) => void;
  onTearOutPdfPage: (card: CardData) => void;
  onSnipPdfRegion: (card: CardData) => void;
  onStashCard: (cardId: string) => void;
  onRestoreCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onStraightenCard: (cardId: string) => void;
  onBulkStraighten: () => void;
  onAddPinToCard: (cardId: string) => void;
  onRemoveString: (stringId: string) => void;
  onUpdateCardStyle: (
    cardId: string,
    patch: Partial<Pick<CardData, 'paperColor' | 'fontStyle' | 'fontSize' | 'textColor' | 'highlightColor'>>
  ) => void;
  onClearCardAnnotations: (cardId: string) => void;
}

export const VariantA: React.FC<VariantProps> = (props) => {
  const {
    state,
    setState,
    onSpawnCard,
    onStashCard,
    onRestoreCard,
    onBulkStraighten,
    onUpdateCardStyle,
    onClearCardAnnotations,
  } = props;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trayPinned, setTrayPinned] = useState(true);

  const stashedCards = state.cards.filter((c) => c.stashed);
  const filteredCards = state.cards.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Floating paper ribbon above the currently selected Card
  const renderCardChrome = (card: CardData, isSelected: boolean) => {
    if (!isSelected) return null;
    const colors: PaperColor[] = ['yellow', 'cream', 'white', 'aged', 'pink', 'mint'];
    const fonts: FontStyle[] = ['typewriter', 'handwriting', 'serif', 'sans'];

    return (
      <div
        className="va-card-ribbon"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="va-ribbon-group">
          {colors.map((col) => (
            <button
              key={col}
              type="button"
              className={`paper-swatch swatch-${col} ${
                card.paperColor === col ? 'active' : ''
              }`}
              title={`Paper: ${col}`}
              onClick={() => onUpdateCardStyle(card.id, { paperColor: col })}
            />
          ))}
        </div>

        <span className="va-divider" />

        <div className="va-ribbon-group">
          {fonts.map((f) => (
            <button
              key={f}
              type="button"
              className={`va-font-btn ${card.fontStyle === f ? 'active' : ''}`}
              onClick={() => onUpdateCardStyle(card.id, { fontStyle: f })}
            >
              {f === 'typewriter'
                ? 'Type'
                : f === 'handwriting'
                ? 'Hand'
                : f === 'serif'
                ? 'Serif'
                : 'Sans'}
            </button>
          ))}
        </div>

        <span className="va-divider" />

        <div className="va-ribbon-group">
          {(['sm', 'md', 'lg'] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              className={`va-font-btn ${card.fontSize === sz ? 'active' : ''}`}
              onClick={() => onUpdateCardStyle(card.id, { fontSize: sz })}
            >
              {sz.toUpperCase()}
            </button>
          ))}
        </div>

        {card.annotations.length > 0 && (
          <>
            <span className="va-divider" />
            <button
              type="button"
              className="va-font-btn"
              title="Clear marker annotations on this Card"
              onClick={() => onClearCardAnnotations(card.id)}
            >
              <RotateCcw size={12} /> Ink
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="variant-shell variant-a">
      <BoardSurface {...props} renderCardChrome={renderCardChrome} />

      {/* Right-Edge Manila File Tab + Slide-out Case Drawer */}
      <aside className={`va-manila-drawer ${drawerOpen ? 'is-open' : ''}`}>
        <button
          type="button"
          className="va-manila-tab"
          onClick={() => setDrawerOpen(!drawerOpen)}
          title="Toggle Manila Case Drawer"
        >
          <FolderOpen size={15} />
          <span>CASE DRAWER ({stashedCards.length})</span>
        </button>

        <div className="va-drawer-paper">
          <header className="va-drawer-header">
            <h3>CASE FILE #409 — EVIDENCE DRAWER</h3>
            <p>
              Stash Cards off the Board without losing their yarn String connections.
            </p>
            <div className="va-search-box">
              <Search size={14} />
              <input
                type="search"
                placeholder="Search all Cards & Clippings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </header>

          <section className="va-drawer-section">
            <h4>STASHED IN FOLDER ({stashedCards.length})</h4>
            {stashedCards.length === 0 ? (
              <p className="va-empty-hint">
                No stashed Cards. Click the archive icon on any Card to tuck it away here.
              </p>
            ) : (
              <ul className="va-card-list">
                {stashedCards.map((c) => {
                  const rememberedStrings = state.strings.filter(
                    (s) => s.fromCardId === c.id || s.toCardId === c.id
                  ).length;
                  return (
                    <li key={c.id} className="va-drawer-item stashed">
                      <div>
                        <span className="item-kind">{c.kind}</span>
                        <strong>{c.title}</strong>
                        {rememberedStrings > 0 && (
                          <small className="remembered-badge">
                            {rememberedStrings} String(s) remembered
                          </small>
                        )}
                      </div>
                      <button
                        type="button"
                        className="va-pin-back-btn"
                        onClick={() => onRestoreCard(c.id)}
                      >
                        <Pin size={13} /> Pin to Board
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="va-drawer-section">
            <h4>ALL CASE ITEMS ({filteredCards.length})</h4>
            <ul className="va-card-list">
              {filteredCards.map((c) => (
                <li
                  key={c.id}
                  className={`va-drawer-item ${
                    state.selectedCardId === c.id ? 'selected' : ''
                  }`}
                >
                  <div
                    className="clickable-meta"
                    onClick={() => {
                      if (!c.stashed) {
                        setState((prev) => ({
                          ...prev,
                          selectedCardId: c.id,
                          panX: Math.round(window.innerWidth / 2 - (c.x + c.width / 2) * prev.zoom),
                          panY: Math.round(window.innerHeight / 2 - (c.y + c.height / 2) * prev.zoom),
                        }));
                      }
                    }}
                  >
                    <span className="item-kind">{c.kind}</span>
                    <strong>{c.title}</strong>
                  </div>
                  {c.stashed ? (
                    <button
                      type="button"
                      className="va-pin-back-btn"
                      onClick={() => onRestoreCard(c.id)}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="va-stash-btn"
                      onClick={() => onStashCard(c.id)}
                    >
                      Stash
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>

      {/* Bottom Wooden Pencil Tray (tucks down when unpinned unless hovered) */}
      <div className={`va-wooden-tray-wrap ${trayPinned ? 'is-pinned' : 'auto-hide'}`}>
        <div className="va-wooden-tray">
          {/* Section 1: Spawn Detective Kit Cards */}
          <div className="tray-well">
            <span className="tray-label">Add Evidence</span>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() => onSpawnCard('sticky')}
              title="Add skewed Sticky Note"
            >
              <StickyNote size={15} />
              <span>Sticky</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() => onSpawnCard('a4')}
              title="Add A4 Typed Document"
            >
              <FileText size={15} />
              <span>A4 Sheet</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() => onSpawnCard('index-card')}
              title="Add Lined Index Card"
            >
              <CreditCard size={15} />
              <span>Index Card</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() => onSpawnCard('newspaper')}
              title="Add Newspaper Clipping"
            >
              <Newspaper size={15} />
              <span>Clipping</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() => onSpawnCard('photo')}
              title="Add Resizable Polaroid Photo"
            >
              <Image size={15} />
              <span>Photo</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
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
              onClick={() => setState((p) => ({ ...p, activeTool: 'select' }))}
              title="Move Cards & Drag Pins to connect Strings"
            >
              <MousePointer size={15} />
              <span>Hand</span>
            </button>
            <button
              type="button"
              className={`tray-tool-btn ${state.activeTool === 'circle' ? 'active' : ''}`}
              onClick={() => setState((p) => ({ ...p, activeTool: 'circle' }))}
              title="Click on any Card to draw a hand-sketched marker circle"
            >
              <Circle size={15} />
              <span>Circle</span>
            </button>
            <button
              type="button"
              className={`tray-tool-btn ${state.activeTool === 'underline' ? 'active' : ''}`}
              onClick={() => setState((p) => ({ ...p, activeTool: 'underline' }))}
              title="Click on any Card to underline evidence"
            >
              <Underline size={15} />
              <span>Underline</span>
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
                  onClick={() =>
                    setState((p) => ({ ...p, activeYarnColor: y.hex }))
                  }
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
              onClick={onBulkStraighten}
              title="Straighten all skewed Cards to 0° with one click"
            >
              <Compass size={15} />
              <span>Align All (0°)</span>
            </button>
            <button
              type="button"
              className="tray-tool-btn"
              onClick={() =>
                setState((p) => ({
                  ...p,
                  mode: p.mode === 'bounded' ? 'infinite' : 'bounded',
                }))
              }
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
    </div>
  );
};
