// PROTOTYPE: Shared interactive Corkboard surface used by Variants A, B, and C.
// Supports Bounded Frame vs Infinite Mode, movable Pins, sagging yarn Strings,
// Hover-peek / Click-to-front, PDF Stack page-flip + Clipping extraction, image resize, and hand-drawn Annotations.

import React, { useRef, useState } from 'react';
import {
  BoardState,
  CardData,
  PinData,
  StringData,
} from './types';
import {
  Compass,
  Scissors,
  FileOutput,
  ChevronLeft,
  ChevronRight,
  Plus,
  Archive,
  Trash2,
} from 'lucide-react';

interface BoardSurfaceProps {
  state: BoardState;
  setState: React.Dispatch<React.SetStateAction<BoardState>>;
  onTearOutPdfPage: (card: CardData) => void;
  onSnipPdfRegion: (card: CardData) => void;
  onStashCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onStraightenCard: (cardId: string) => void;
  onAddPinToCard: (cardId: string) => void;
  onRemoveString: (stringId: string) => void;
  /** Optional variant-specific inline card action renderer */
  renderCardChrome?: (card: CardData, isSelected: boolean) => React.ReactNode;
  onBoardContextMenu?: (e: React.MouseEvent, boardX: number, boardY: number) => void;
}

/** Compute absolute board coordinates of a Pin taking card skew (rotation around center) into account */
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

/** Build a quadratic catenary-like sagging SVG path between two points */
export function buildCatenaryPath(x1: number, y1: number, x2: number, y2: number): {
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

export const BoardSurface: React.FC<BoardSurfaceProps> = ({
  state,
  setState,
  onTearOutPdfPage,
  onSnipPdfRegion,
  onStashCard,
  onDeleteCard,
  onStraightenCard,
  onAddPinToCard,
  onRemoveString,
  renderCardChrome,
  onBoardContextMenu,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);

  // Active interaction states
  const [panDrag, setPanDrag] = useState<{
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);

  const [cardDrag, setCardDrag] = useState<{
    cardId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [pinMove, setPinMove] = useState<{
    cardId: string;
    pinId: string;
  } | null>(null);

  const [stringDraft, setStringDraft] = useState<{
    fromCardId: string;
    fromPinId: string;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  const [resizeDrag, setResizeDrag] = useState<{
    cardId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const clientToBoard = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - state.panX) / state.zoom,
      y: (clientY - rect.top - state.panY) / state.zoom,
    };
  };

  // Connected cards for Hover-Peek highlighting
  const activeFocusId = state.hoveredCardId || state.selectedCardId;
  const connectedCardIds = new Set<string>();
  if (activeFocusId) {
    connectedCardIds.add(activeFocusId);
    state.strings.forEach((s) => {
      if (s.fromCardId === activeFocusId) connectedCardIds.add(s.toCardId);
      if (s.toCardId === activeFocusId) connectedCardIds.add(s.fromCardId);
    });
  }

  const visibleCards = state.cards.filter((c) => !c.stashed);
  const visibleCardMap = new Map(visibleCards.map((c) => [c.id, c]));

  // Only show strings where BOTH endpoints are currently on the Board (stashed cards remember strings automatically!)
  const visibleStrings = state.strings.filter(
    (s) => visibleCardMap.has(s.fromCardId) && visibleCardMap.has(s.toCardId)
  );

  const bringToFront = (cardId: string) => {
    setState((prev) => {
      const maxZ = prev.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
      return {
        ...prev,
        selectedCardId: cardId,
        cards: prev.cards.map((c) =>
          c.id === cardId ? { ...c, zIndex: maxZ + 1 } : c
        ),
      };
    });
  };

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-root]') || target.closest('[data-string-tag]')) {
      return;
    }
    setState((prev) => ({ ...prev, selectedCardId: null }));
    setPanDrag({
      startX: e.clientX,
      startY: e.clientY,
      origPanX: state.panX,
      origPanY: state.panY,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    const pt = clientToBoard(e.clientX, e.clientY);

    if (panDrag) {
      const dx = e.clientX - panDrag.startX;
      const dy = e.clientY - panDrag.startY;
      setState((prev) => ({
        ...prev,
        panX: panDrag.origPanX + dx,
        panY: panDrag.origPanY + dy,
      }));
      return;
    }

    if (cardDrag) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === cardDrag.cardId
            ? {
                ...c,
                x: Math.round(pt.x - cardDrag.offsetX),
                y: Math.round(pt.y - cardDrag.offsetY),
              }
            : c
        ),
      }));
      return;
    }

    if (pinMove) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => {
          if (c.id !== pinMove.cardId) return c;
          const rx = Math.max(6, Math.min(94, ((pt.x - c.x) / c.width) * 100));
          const ry = Math.max(5, Math.min(92, ((pt.y - c.y) / c.height) * 100));
          return {
            ...c,
            pins: c.pins.map((p) =>
              p.id === pinMove.pinId ? { ...p, rx, ry } : p
            ),
          };
        }),
      }));
      return;
    }

    if (stringDraft) {
      setStringDraft({
        ...stringDraft,
        currX: pt.x,
        currY: pt.y,
      });
      return;
    }

    if (resizeDrag) {
      const dx = (e.clientX - resizeDrag.startX) / state.zoom;
      const dy = (e.clientY - resizeDrag.startY) / state.zoom;
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === resizeDrag.cardId
            ? {
                ...c,
                width: Math.max(170, Math.round(resizeDrag.origW + dx)),
                height: Math.max(140, Math.round(resizeDrag.origH + dy)),
              }
            : c
        ),
      }));
    }
  };

  const handleViewportPointerUp = () => {
    if (cardDrag) {
      const movedCard = state.cards.find((c) => c.id === cardDrag.cardId);
      if (movedCard) {
        setLiveAnnouncement(`${movedCard.title} moved on board`);
      }
    }
    setPanDrag(null);
    setCardDrag(null);
    setPinMove(null);
    setStringDraft(null);
    setResizeDrag(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      setState((prev) => ({
        ...prev,
        zoom: Math.max(0.45, Math.min(1.85, Number((prev.zoom * factor).toFixed(2)))),
      }));
    } else {
      setState((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX,
        panY: prev.panY - e.deltaY,
      }));
    }
  };

  const handleCardSurfaceClick = (e: React.MouseEvent, card: CardData) => {
    if (state.activeTool === 'circle' || state.activeTool === 'underline') {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      const relY = ((e.clientY - rect.top) / rect.height) * 100;
      const newAnn =
        state.activeTool === 'circle'
          ? {
              id: `ann-${Date.now()}`,
              kind: 'circle' as const,
              color: state.activeInkColor,
              x: Math.max(5, Math.min(72, relX - 18)),
              y: Math.max(8, Math.min(75, relY - 12)),
              w: 36,
              h: 24,
            }
          : {
              id: `ann-${Date.now()}`,
              kind: 'underline' as const,
              color: state.activeInkColor,
              x: Math.max(5, Math.min(45, relX - 20)),
              y: Math.max(10, Math.min(90, relY)),
              w: 55,
              h: 6,
            };

      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === card.id
            ? { ...c, annotations: [...c.annotations, newAnn] }
            : c
        ),
      }));
    }
  };

  const completeStringConnection = (targetCardId: string, targetPinId: string) => {
    if (!stringDraft) return;
    if (
      stringDraft.fromCardId === targetCardId &&
      stringDraft.fromPinId === targetPinId
    ) {
      setStringDraft(null);
      return;
    }
    const newStr: StringData = {
      id: `str-${Date.now()}`,
      fromCardId: stringDraft.fromCardId,
      fromPinId: stringDraft.fromPinId,
      toCardId: targetCardId,
      toPinId: targetPinId,
      color: state.activeYarnColor,
      label: 'New link',
    };
    setState((prev) => ({
      ...prev,
      strings: [...prev.strings, newStr],
    }));
    setStringDraft(null);
  };

  const autoFitBoundedFrame = () => {
    if (visibleCards.length === 0) return;
    const maxX = Math.max(...visibleCards.map((c) => c.x + c.width)) + 100;
    const maxY = Math.max(...visibleCards.map((c) => c.y + c.height)) + 100;
    setState((prev) => ({
      ...prev,
      frameWidth: Math.max(960, maxX),
      frameHeight: Math.max(640, maxY),
    }));
  };

  // Detect if any card sits outside Bounded Frame
  const hasOutOfBoundsCards =
    state.mode === 'bounded' &&
    visibleCards.some(
      (c) =>
        c.x < 0 ||
        c.y < 0 ||
        c.x + c.width > state.frameWidth ||
        c.y + c.height > state.frameHeight
    );

  return (
    <div
      ref={viewportRef}
      className={`board-viewport ${state.mode === 'infinite' ? 'mode-infinite' : 'mode-bounded'}`}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        if (onBoardContextMenu) {
          e.preventDefault();
          const pt = clientToBoard(e.clientX, e.clientY);
          onBoardContextMenu(e, pt.x, pt.y);
        }
      }}
    >
      <div className="visually-hidden" aria-live="polite">
        {liveAnnouncement}
      </div>

      {/* Out-of-bounds helper banner when in Bounded Mode */}
      {hasOutOfBoundsCards && (
        <div className="out-of-bounds-banner">
          <span>Some Cards sit outside the current wooden frame boundary.</span>
          <button type="button" onClick={autoFitBoundedFrame}>
            Expand frame to fit all Cards
          </button>
        </div>
      )}

      {/* Panned & Zoomed World Plane */}
      <div
        className="board-plane"
        style={{
          transform: `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`,
        }}
      >
        {/* Bounded Wooden Corkboard Frame OR Infinite Cork Backdrop */}
        <div
          className={`cork-surface ${state.mode === 'bounded' ? 'framed-cork' : 'infinite-cork'}`}
          style={
            state.mode === 'bounded'
              ? { width: state.frameWidth, height: state.frameHeight }
              : { width: 3200, height: 2200, left: -800, top: -600 }
          }
        >
          {state.mode === 'bounded' && (
            <div className="frame-brass-plate">
              <span>{state.caseTitle}</span>
              <span className="plate-dim">
                {state.frameWidth} × {state.frameHeight}px
              </span>
            </div>
          )}
        </div>

        {/* Cards Layer */}
        {visibleCards.map((card) => {
          const isSelected = state.selectedCardId === card.id;
          const isHovered = state.hoveredCardId === card.id;
          const isDimmed =
            Boolean(state.hoveredCardId) && !connectedCardIds.has(card.id);

          return (
            <div
              key={card.id}
              data-card-root={card.id}
              className={`board-card kind-${card.kind} paper-${card.paperColor} font-${card.fontStyle} size-${card.fontSize} ${
                isSelected ? 'is-selected' : ''
              } ${isHovered ? 'is-hovered-peek' : ''} ${
                isDimmed ? 'is-dimmed-unconnected' : ''
              }`}
              style={{
                left: card.x,
                top: card.y,
                width: card.width,
                height: card.height,
                zIndex: card.zIndex,
                transform: `rotate(${card.skew}deg)`,
                color: card.textColor,
              }}
              onPointerEnter={() =>
                setState((prev) => ({ ...prev, hoveredCardId: card.id }))
              }
              onPointerLeave={() =>
                setState((prev) =>
                  prev.hoveredCardId === card.id
                    ? { ...prev, hoveredCardId: null }
                    : prev
                )
              }
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                bringToFront(card.id);
              }}
              onClick={(e) => handleCardSurfaceClick(e, card)}
            >
              {/* Accessible Drag Handle Bar at top of Card */}
              <button
                type="button"
                className={`card-drag-handle ${
                  cardDrag?.cardId === card.id ? 'dragging' : ''
                }`}
                aria-label={`Drag ${card.title}. Use arrow keys to move.`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  bringToFront(card.id);
                  const pt = clientToBoard(e.clientX, e.clientY);
                  setCardDrag({
                    cardId: card.id,
                    offsetX: pt.x - card.x,
                    offsetY: pt.y - card.y,
                  });
                }}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 30 : 15;
                  let dx = 0;
                  let dy = 0;
                  if (e.key === 'ArrowLeft') dx = -step;
                  else if (e.key === 'ArrowRight') dx = step;
                  else if (e.key === 'ArrowUp') dy = -step;
                  else if (e.key === 'ArrowDown') dy = step;
                  if (dx !== 0 || dy !== 0) {
                    e.preventDefault();
                    setState((prev) => ({
                      ...prev,
                      cards: prev.cards.map((c) =>
                        c.id === card.id
                          ? { ...c, x: c.x + dx, y: c.y + dy }
                          : c
                      ),
                    }));
                    setLiveAnnouncement(`${card.title} moved`);
                  }
                }}
              >
                <span className="card-kind-pill">{card.kind.replace('-', ' ')}</span>
                <span className="drag-grip-dots">⋮⋮</span>
              </button>

              {/* Movable Thumbtack Pins on the Card */}
              {card.pins.map((pin) => (
                <div
                  key={pin.id}
                  className={`thumbtack-pin pin-${pin.color}`}
                  style={{ left: `${pin.rx}%`, top: `${pin.ry}%` }}
                  title={
                    state.activeTool === 'string'
                      ? 'Drag to another Pin to tie yarn String (Shift+drag to reposition Pin)'
                      : 'Drag to tie yarn String • Shift+drag to move Pin on Card'
                  }
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      // Reposition Pin on the Card surface
                      setPinMove({ cardId: card.id, pinId: pin.id });
                    } else {
                      // Start pulling a yarn String from this Pin
                      const coords = getPinBoardCoords(card, pin);
                      setStringDraft({
                        fromCardId: card.id,
                        fromPinId: pin.id,
                        startX: coords.x,
                        startY: coords.y,
                        currX: coords.x,
                        currY: coords.y,
                      });
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (stringDraft) {
                      completeStringConnection(card.id, pin.id);
                    }
                  }}
                >
                  <span className="pin-head" />
                  <span className="pin-needle-shadow" />
                </div>
              ))}

              {/* Stacked paper sheets edge effect for PDF Stacks */}
              {card.kind === 'pdf-stack' && (
                <>
                  <div className="pdf-sheet-underlay sheet-1" />
                  <div className="pdf-sheet-underlay sheet-2" />
                </>
              )}

              {/* Card Content Body */}
              <div className="card-inner-body">
                {card.kind === 'photo' && card.imageUrl && (
                  <div className="polaroid-frame">
                    <img src={card.imageUrl} alt={card.title} draggable={false} />
                    <input
                      className="polaroid-caption-input"
                      value={card.imageCaption ?? card.title}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          cards: prev.cards.map((c) =>
                            c.id === card.id
                              ? { ...c, imageCaption: e.target.value }
                              : c
                          ),
                        }))
                      }
                    />
                  </div>
                )}

                {card.kind !== 'photo' && (
                  <input
                    className="card-title-input"
                    value={card.title}
                    style={
                      card.highlightColor
                        ? { backgroundColor: card.highlightColor }
                        : undefined
                    }
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        cards: prev.cards.map((c) =>
                          c.id === card.id ? { ...c, title: e.target.value } : c
                        ),
                      }))
                    }
                  />
                )}

                {card.kind === 'pdf-stack' && card.pdfPages ? (
                  <div className="pdf-stack-viewer">
                    <pre className="pdf-page-text">
                      {card.pdfPages[card.currentPage ?? 0]}
                    </pre>
                    <div className="pdf-stack-controls" onClick={(e) => e.stopPropagation()}>
                      <div className="pdf-pager">
                        <button
                          type="button"
                          title="Previous PDF page"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              cards: prev.cards.map((c) =>
                                c.id === card.id
                                  ? {
                                      ...c,
                                      currentPage: Math.max(
                                        0,
                                        (c.currentPage ?? 0) - 1
                                      ),
                                    }
                                  : c
                              ),
                            }))
                          }
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span>
                          Pg {(card.currentPage ?? 0) + 1} / {card.pdfPages.length}
                        </span>
                        <button
                          type="button"
                          title="Next PDF page"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              cards: prev.cards.map((c) =>
                                c.id === card.id
                                  ? {
                                      ...c,
                                      currentPage: Math.min(
                                        (c.pdfPages?.length ?? 1) - 1,
                                        (c.currentPage ?? 0) + 1
                                      ),
                                    }
                                  : c
                              ),
                            }))
                          }
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="pdf-extract-actions">
                        <button
                          type="button"
                          className="pdf-action-btn"
                          title="Pull current page out as its own Card on the Board"
                          onClick={() => onTearOutPdfPage(card)}
                        >
                          <FileOutput size={13} />
                          <span>Pull Page</span>
                        </button>
                        <button
                          type="button"
                          className="pdf-action-btn"
                          title="Snip/Crop a region of this PDF page into a Clipping Card"
                          onClick={() => onSnipPdfRegion(card)}
                        >
                          <Scissors size={13} />
                          <span>Snip Region</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="card-body-textarea"
                    value={card.content}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        cards: prev.cards.map((c) =>
                          c.id === card.id ? { ...c, content: e.target.value } : c
                        ),
                      }))
                    }
                  />
                )}
              </div>

              {/* Card-Bound Hand-Drawn Annotations (move & rotate with the Card) */}
              <svg
                className="card-annotation-layer"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {card.annotations.map((ann) =>
                  ann.kind === 'circle' ? (
                    <ellipse
                      key={ann.id}
                      cx={ann.x + ann.w / 2}
                      cy={ann.y + ann.h / 2}
                      rx={ann.w / 2}
                      ry={ann.h / 2}
                      fill="none"
                      stroke={ann.color}
                      strokeWidth="1.8"
                      strokeDasharray="120 4"
                      transform={`rotate(-3 ${ann.x + ann.w / 2} ${ann.y + ann.h / 2})`}
                    />
                  ) : (
                    <path
                      key={ann.id}
                      d={`M ${ann.x} ${ann.y} Q ${ann.x + ann.w / 2} ${
                        ann.y - 2.5
                      } ${ann.x + ann.w} ${ann.y + 1}`}
                      fill="none"
                      stroke={ann.color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  )
                )}
              </svg>

              {/* Quick Corner Straighten Badge + Actions when hovered/selected */}
              <div
                className="card-quick-actions"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {card.skew !== 0 && (
                  <button
                    type="button"
                    className="card-quick-btn"
                    title={`Straighten Card (currently ${card.skew.toFixed(1)}°)`}
                    onClick={() => onStraightenCard(card.id)}
                  >
                    <Compass size={13} />
                    <span>0°</span>
                  </button>
                )}
                <button
                  type="button"
                  className="card-quick-btn"
                  title="Add extra Pin to Card"
                  onClick={() => onAddPinToCard(card.id)}
                >
                  <Plus size={13} />
                  <span>Pin</span>
                </button>
                <button
                  type="button"
                  className="card-quick-btn"
                  title="Stash Card in Case Drawer (Strings are remembered)"
                  onClick={() => onStashCard(card.id)}
                >
                  <Archive size={13} />
                </button>
                <button
                  type="button"
                  className="card-quick-btn danger"
                  title="Remove Card"
                  onClick={() => onDeleteCard(card.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Optional Variant-Specific Floating Card Chrome */}
              {renderCardChrome && renderCardChrome(card, isSelected)}

              {/* Bottom-Right Resize Handle */}
              <div
                className="card-resize-corner"
                title="Drag to resize Card"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setResizeDrag({
                    cardId: card.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origW: card.width,
                    origH: card.height,
                  });
                }}
              />
            </div>
          );
        })}

        {/* Yarn Strings SVG Overlay Layer (rendered above Cards from Pin to Pin) */}
        <svg className="yarn-strings-layer" width="4000" height="3000">
          <defs>
            <filter id="yarn-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="2.5" floodOpacity="0.42" />
            </filter>
          </defs>

          {visibleStrings.map((str) => {
            const fromCard = visibleCardMap.get(str.fromCardId);
            const toCard = visibleCardMap.get(str.toCardId);
            if (!fromCard || !toCard) return null;
            const fromPin =
              fromCard.pins.find((p) => p.id === str.fromPinId) ?? fromCard.pins[0];
            const toPin =
              toCard.pins.find((p) => p.id === str.toPinId) ?? toCard.pins[0];
            if (!fromPin || !toPin) return null;

            const p1 = getPinBoardCoords(fromCard, fromPin);
            const p2 = getPinBoardCoords(toCard, toPin);
            const { d, midX, midY } = buildCatenaryPath(p1.x, p1.y, p2.x, p2.y);

            const isHighlighted =
              state.hoveredCardId === str.fromCardId ||
              state.hoveredCardId === str.toCardId;

            return (
              <g key={str.id} className={isHighlighted ? 'yarn-highlighted' : ''}>
                {/* Sagging Yarn fiber stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke={str.color}
                  strokeWidth={isHighlighted ? 4.2 : 3.2}
                  strokeLinecap="round"
                  filter="url(#yarn-shadow)"
                />
                {/* Subtle yarn texture twist */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                />
                {/* Masking Tape Tag on the String */}
                {str.label && (
                  <foreignObject
                    x={midX - 65}
                    y={midY - 14}
                    width={130}
                    height={32}
                  >
                    <div
                      data-string-tag={str.id}
                      className="yarn-tape-tag"
                      title="Click tag to edit label, or × to cut string"
                    >
                      <input
                        value={str.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setState((prev) => ({
                            ...prev,
                            strings: prev.strings.map((s) =>
                              s.id === str.id ? { ...s, label: val } : s
                            ),
                          }));
                        }}
                      />
                      <button
                        type="button"
                        title="Cut String"
                        onClick={() => onRemoveString(str.id)}
                      >
                        ×
                      </button>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Active String being pulled from a Pin */}
          {stringDraft && (
            <path
              d={
                buildCatenaryPath(
                  stringDraft.startX,
                  stringDraft.startY,
                  stringDraft.currX,
                  stringDraft.currY
                ).d
              }
              fill="none"
              stroke={state.activeYarnColor}
              strokeWidth="3.2"
              strokeDasharray="6 4"
              filter="url(#yarn-shadow)"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
