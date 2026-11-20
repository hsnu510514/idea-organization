import React, { useRef, useState } from 'react';
import {
  CardData,
  CaseState,
  FontStyle,
  PaperColor,
  StringData,
} from '../domain/types';
import {
  buildCatenaryPath,
  CaseAction,
  caseActions,
  getOutOfBoundsCards,
  getPinBoardCoords,
} from '../domain/caseStore';
import {
  Compass,
  Plus,
  Archive,
  Trash2,
  RotateCw,
} from 'lucide-react';

export interface BoardSurfaceProps {
  state: CaseState;
  dispatch: React.Dispatch<CaseAction>;
  renderCardChrome?: (card: CardData, isSelected: boolean) => React.ReactNode;
}

export const BoardSurface: React.FC<BoardSurfaceProps> = ({
  state,
  dispatch,
  renderCardChrome,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);

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

  const [rotateDrag, setRotateDrag] = useState<{
    cardId: string;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const getEventCoords = (e: React.PointerEvent | React.MouseEvent) => {
    const native = e.nativeEvent as unknown as Record<string, number | undefined>;
    const cx =
      typeof e.clientX === 'number' && !Number.isNaN(e.clientX)
        ? e.clientX
        : native?.clientX ?? native?.pageX ?? 0;
    const cy =
      typeof e.clientY === 'number' && !Number.isNaN(e.clientY)
        ? e.clientY
        : native?.clientY ?? native?.pageY ?? 0;
    return { clientX: cx, clientY: cy };
  };

  const clientToBoard = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return {
      x: (clientX - left - state.panX) / state.zoom,
      y: (clientY - top - state.panY) / state.zoom,
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

  const visibleStrings = state.strings.filter(
    (s) => visibleCardMap.has(s.fromCardId) && visibleCardMap.has(s.toCardId)
  );

  const outOfBoundsCards = getOutOfBoundsCards(state);
  const hasOutOfBoundsCards = outOfBoundsCards.length > 0;

  const handleViewportPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-root]') || target.closest('[data-string-tag]')) {
      return;
    }
    const { clientX, clientY } = getEventCoords(e);
    dispatch(caseActions.selectCard(null));
    setPanDrag({
      startX: clientX,
      startY: clientY,
      origPanX: state.panX,
      origPanY: state.panY,
    });
    if (typeof (e.currentTarget as HTMLElement).setPointerCapture === 'function') {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore in synthetic test events
      }
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    const { clientX, clientY } = getEventCoords(e);
    const pt = clientToBoard(clientX, clientY);

    if (panDrag) {
      const dx = clientX - panDrag.startX;
      const dy = clientY - panDrag.startY;
      dispatch(caseActions.setPan(panDrag.origPanX + dx, panDrag.origPanY + dy));
      return;
    }

    if (cardDrag) {
      dispatch(
        caseActions.moveCard(
          cardDrag.cardId,
          pt.x - cardDrag.offsetX,
          pt.y - cardDrag.offsetY
        )
      );
      return;
    }

    if (pinMove) {
      const card = state.cards.find((c) => c.id === pinMove.cardId);
      if (card) {
        const rx = ((pt.x - card.x) / card.width) * 100;
        const ry = ((pt.y - card.y) / card.height) * 100;
        dispatch(caseActions.movePin(card.id, pinMove.pinId, rx, ry));
      }
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
      const dx = (clientX - resizeDrag.startX) / state.zoom;
      const dy = (clientY - resizeDrag.startY) / state.zoom;
      dispatch(
        caseActions.resizeCard(
          resizeDrag.cardId,
          resizeDrag.origW + dx,
          resizeDrag.origH + dy
        )
      );
      return;
    }

    if (rotateDrag) {
      const angleRad = Math.atan2(
        pt.y - rotateDrag.centerY,
        pt.x - rotateDrag.centerX
      );
      const angleDeg = (angleRad * 180) / Math.PI + 90;
      const clampedAngle = Math.max(-45, Math.min(45, angleDeg));
      dispatch(caseActions.setCardSkew(rotateDrag.cardId, clampedAngle));
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
    setRotateDrag(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      dispatch(caseActions.setZoom(state.zoom * factor));
    } else {
      dispatch(
        caseActions.setPan(state.panX - e.deltaX, state.panY - e.deltaY)
      );
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
    dispatch(caseActions.addString(newStr));
    setStringDraft(null);
  };

  const defaultRenderCardChrome = (card: CardData, isSelected: boolean) => {
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
              aria-label={`Paper color ${col}`}
              onClick={() =>
                dispatch(caseActions.updateCard(card.id, { paperColor: col }))
              }
            />
          ))}
        </div>

        <span className="va-divider" />

        <div className="va-ribbon-group">
          {fonts.map((f) => (
            <button
              key={f}
              type="button"
              className={`va-font-btn ${card.defaultFontStyle === f ? 'active' : ''}`}
              onClick={() =>
                dispatch(caseActions.updateCard(card.id, { defaultFontStyle: f }))
              }
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
              className={`va-font-btn ${card.defaultFontSize === sz ? 'active' : ''}`}
              onClick={() =>
                dispatch(caseActions.updateCard(card.id, { defaultFontSize: sz }))
              }
            >
              {sz.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const cardChromeRenderer = renderCardChrome ?? defaultRenderCardChrome;

  return (
    <div
      ref={viewportRef}
      data-testid="board-viewport"
      className={`board-viewport ${
        state.mode === 'infinite' ? 'mode-infinite' : 'mode-bounded'
      }`}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onWheel={handleWheel}
    >
      <div
        role="status"
        className="visually-hidden"
        aria-live="polite"
      >
        {liveAnnouncement}
      </div>

      {/* Out-of-bounds helper banner when in Bounded Mode */}
      {hasOutOfBoundsCards && (
        <div className="out-of-bounds-banner" role="region" aria-label="Out of bounds notice">
          <span>Some Cards sit outside the current wooden frame boundary.</span>
          <button
            type="button"
            onClick={() => dispatch(caseActions.autoFitFrame())}
          >
            Expand frame to fit all Cards
          </button>
        </div>
      )}

      {/* Panned & Zoomed World Plane */}
      <div
        data-testid="board-plane"
        className="board-plane"
        style={{
          transform: `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.zoom})`,
        }}
      >
        {/* Bounded Wooden Corkboard Frame OR Infinite Cork Backdrop */}
        <div
          data-testid="cork-surface"
          className={`cork-surface ${
            state.mode === 'bounded' ? 'framed-cork' : 'infinite-cork'
          }`}
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
              data-testid={`board-card-${card.id}`}
              data-card-root={card.id}
              data-card-kind={card.kind}
              data-card-skew={card.skew}
              className={`board-card kind-${card.kind} paper-${card.paperColor} font-${card.defaultFontStyle} size-${card.defaultFontSize} ${
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
                color: card.defaultTextColor,
              }}
              onPointerEnter={() => dispatch(caseActions.hoverCard(card.id))}
              onPointerLeave={() => {
                if (state.hoveredCardId === card.id) {
                  dispatch(caseActions.hoverCard(null));
                }
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                dispatch(caseActions.bringToFront(card.id));
              }}
            >
              {/* Accessible Drag Handle Bar at top of Card */}
              <button
                type="button"
                className={`card-drag-handle ${
                  cardDrag?.cardId === card.id ? 'dragging' : ''
                }`}
                style={{
                  cursor: cardDrag?.cardId === card.id ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
                aria-label={`Drag ${card.title}. Use arrow keys to move.`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  dispatch(caseActions.bringToFront(card.id));
                  const { clientX, clientY } = getEventCoords(e);
                  const pt = clientToBoard(clientX, clientY);
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
                    const nextX = card.x + dx;
                    const nextY = card.y + dy;
                    dispatch(caseActions.moveCard(card.id, nextX, nextY));
                    setLiveAnnouncement(
                      `${card.title} moved to ${nextX}, ${nextY}`
                    );
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
                  title="Drag to tie yarn String • Shift+drag to move Pin on Card"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      setPinMove({ cardId: card.id, pinId: pin.id });
                    } else {
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

              {/* Card Content Body */}
              <div className="card-inner-body">
                <input
                  className="card-title-input"
                  aria-label={`${card.title} title`}
                  value={card.title}
                  onChange={(e) =>
                    dispatch(
                      caseActions.updateCard(card.id, { title: e.target.value })
                    )
                  }
                />

                <textarea
                  className="card-body-textarea"
                  aria-label={`${card.title} content`}
                  value={card.plainText}
                  onChange={(e) =>
                    dispatch(
                      caseActions.updateCard(card.id, {
                        plainText: e.target.value,
                        richContent: e.target.value,
                      })
                    )
                  }
                />
              </div>

              {/* Quick Corner Straighten Badge + Manual Rotation + Actions */}
              <div
                className="card-quick-actions"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="card-quick-btn"
                  aria-label="Straighten Card (0°)"
                  title={`Straighten Card (currently ${card.skew.toFixed(1)}°)`}
                  onClick={() => dispatch(caseActions.straightenCard(card.id))}
                >
                  <Compass size={13} />
                  <span>0°</span>
                </button>

                <label
                  className="card-quick-btn card-rotate-control"
                  title="Tilt Card to custom angle"
                >
                  <RotateCw
                    size={12}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setRotateDrag({
                        cardId: card.id,
                        centerX: card.x + card.width / 2,
                        centerY: card.y + card.height / 2,
                      });
                    }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    min="-45"
                    max="45"
                    aria-label={`Rotate Card ${card.title}`}
                    className="card-rotate-input"
                    value={card.skew}
                    onChange={(e) =>
                      dispatch(
                        caseActions.setCardSkew(
                          card.id,
                          Number(e.target.value) || 0
                        )
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  className="card-quick-btn"
                  title="Add extra Pin to Card"
                  onClick={() => dispatch(caseActions.addPin(card.id))}
                >
                  <Plus size={13} />
                  <span>Pin</span>
                </button>
                <button
                  type="button"
                  className="card-quick-btn"
                  title="Stash Card in Case Drawer (Strings are remembered)"
                  onClick={() => dispatch(caseActions.stashCard(card.id))}
                >
                  <Archive size={13} />
                </button>
                <button
                  type="button"
                  className="card-quick-btn danger"
                  title="Remove Card"
                  onClick={() => dispatch(caseActions.deleteCard(card.id))}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Floating Card Chrome */}
              {cardChromeRenderer(card, isSelected)}

              {/* Bottom-Right Resize Handle */}
              <div
                data-testid={`card-resize-handle-${card.id}`}
                className="card-resize-corner"
                title="Drag to resize Card"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const { clientX, clientY } = getEventCoords(e);
                  setResizeDrag({
                    cardId: card.id,
                    startX: clientX,
                    startY: clientY,
                    origW: card.width,
                    origH: card.height,
                  });
                }}
              />
            </div>
          );
        })}

        {/* Yarn Strings SVG Overlay Layer */}
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
                <path
                  d={d}
                  fill="none"
                  stroke={str.color}
                  strokeWidth={isHighlighted ? 4.2 : 3.2}
                  strokeLinecap="round"
                  filter="url(#yarn-shadow)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                  strokeDasharray="3 5"
                  strokeLinecap="round"
                />
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
                        onChange={(e) =>
                          dispatch(
                            caseActions.updateString(str.id, e.target.value)
                          )
                        }
                      />
                      <button
                        type="button"
                        title="Cut String"
                        onClick={() => dispatch(caseActions.removeString(str.id))}
                      >
                        ×
                      </button>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

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
