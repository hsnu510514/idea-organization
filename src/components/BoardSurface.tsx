import React, { useEffect, useRef, useState } from 'react';
import {
  CardData,
  CaseState,
  StringData,
} from '../domain/types';
import {
  buildCatenaryPath,
  CaseAction,
  caseActions,
  findNearestPinOnCard,
  getOutOfBoundsCards,
  getPinBoardCoords,
  getPointerClientCoords,
} from '../domain/caseStore';
import {
  Compass,
  Plus,
  Archive,
  Trash2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  FileOutput,
  Scissors,
} from 'lucide-react';
import { FloatingPaperRibbon } from './FloatingPaperRibbon';
import {
  applyFormatToSelection,
  RichTextEditor,
  RichTextStylePatch,
  SelectionRange,
} from './RichTextEditor';
import { AnnotationLayer } from './AnnotationLayer';
import { PdfPageCanvas } from './PdfPageCanvas';

export interface BoardSurfaceProps {
  state: CaseState;
  dispatch: React.Dispatch<CaseAction>;
  assetUrls?: Record<string, string>;
  renderCardChrome?: (card: CardData, isSelected: boolean) => React.ReactNode;
}

export const BoardSurface: React.FC<BoardSurfaceProps> = ({
  state,
  dispatch,
  assetUrls = {},
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

  const [frameResizeDrag, setFrameResizeDrag] = useState<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [textSelections, setTextSelections] = useState<
    Record<string, SelectionRange | null>
  >({});
  const [snipOverlayCardId, setSnipOverlayCardId] = useState<string | null>(
    null
  );
  const [snipDrag, setSnipDrag] = useState<{
    cardId: string;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.selectedAnnotationId) return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch(
          caseActions.deleteAnnotation({
            annotationId: state.selectedAnnotationId,
          })
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedAnnotationId, dispatch]);

  const getEventCoords = getPointerClientCoords;

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
    if (
      target.closest('[data-card-root]') ||
      target.closest('[data-string-tag]') ||
      target.closest('[data-testid="bounded-frame-resize-handle"]')
    ) {
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
        const cx = card.x + card.width / 2;
        const cy = card.y + card.height / 2;
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const rad = (-card.skew * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        const rx = ((localX + card.width / 2) / card.width) * 100;
        const ry = ((localY + card.height / 2) / card.height) * 100;
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
      return;
    }

    if (frameResizeDrag) {
      const dx = (clientX - frameResizeDrag.startX) / state.zoom;
      const dy = (clientY - frameResizeDrag.startY) / state.zoom;
      dispatch(
        caseActions.setFrameDimensions(
          frameResizeDrag.origW + dx,
          frameResizeDrag.origH + dy
        )
      );
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
    setFrameResizeDrag(null);
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
    // Ignore self-loops to the same Card or same Pin
    if (stringDraft.fromCardId === targetCardId) {
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
      label: 'New string',
    };
    dispatch(caseActions.addString(newStr));
    setStringDraft(null);
  };

  const handleApplyTextFormat = (card: CardData, patch: RichTextStylePatch) => {
    const activeRange = textSelections[card.id];
    if (activeRange && activeRange.start !== activeRange.end) {
      const formatted = applyFormatToSelection(
        card.richContent,
        card.plainText,
        activeRange,
        patch
      );
      dispatch(
        caseActions.updateCard(card.id, {
          richContent: formatted.richContent,
          plainText: formatted.plainText,
        })
      );
      return;
    }

    // No text highlighted: update Card default styles
    const cardPatch: Partial<CardData> = {};
    if (patch.fontStyle) cardPatch.defaultFontStyle = patch.fontStyle;
    if (patch.fontSize) cardPatch.defaultFontSize = patch.fontSize;
    if (patch.color) cardPatch.defaultTextColor = patch.color;
    if (Object.keys(cardPatch).length > 0) {
      dispatch(caseActions.updateCard(card.id, cardPatch));
    }
  };

  const defaultRenderCardChrome = (card: CardData, isSelected: boolean) => {
    if (!isSelected) return null;
    const activeRange = textSelections[card.id];
    const hasTextSelection = Boolean(
      activeRange && activeRange.start !== activeRange.end
    );

    return (
      <FloatingPaperRibbon
        card={card}
        activeTool={state.activeTool}
        activeInkColor={state.activeInkColor}
        activeStrokeWidth={state.activeStrokeWidth ?? 2}
        hasTextSelection={hasTextSelection}
        onChangePaperColor={(col) =>
          dispatch(caseActions.updateCard(card.id, { paperColor: col }))
        }
        onApplyTextFormat={(patch) => handleApplyTextFormat(card, patch)}
        onSetActiveTool={(tool) => dispatch(caseActions.setActiveTool(tool))}
        onSetInkColor={(color) => dispatch(caseActions.setInkColor(color))}
        onSetStrokeWidth={(width) => dispatch(caseActions.setStrokeWidth(width))}
      />
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
            <>
              <div className="frame-brass-plate">
                <span>{state.caseTitle}</span>
                <span className="plate-dim">
                  {state.frameWidth} × {state.frameHeight}px
                </span>
              </div>
              <div
                data-testid="bounded-frame-resize-handle"
                className="bounded-frame-resize-corner"
                title="Drag to resize Bounded Wooden Frame"
                aria-label="Resize Bounded Wooden Frame"
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const { clientX, clientY } = getEventCoords(e);
                  setFrameResizeDrag({
                    startX: clientX,
                    startY: clientY,
                    origW: state.frameWidth,
                    origH: state.frameHeight,
                  });
                }}
              />
            </>
          )}
        </div>

        {/* Cards Layer */}
        {visibleCards.map((card) => {
          const isSelected = state.selectedCardId === card.id;
          const isHovered = state.hoveredCardId === card.id;
          const isConnectedNeighbor =
            Boolean(state.hoveredCardId) &&
            !isHovered &&
            connectedCardIds.has(card.id);
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
                isConnectedNeighbor ? 'is-connected-neighbor' : ''
              } ${isDimmed ? 'is-dimmed-unconnected' : ''}`}
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
              onPointerUp={(e) => {
                if (stringDraft) {
                  e.stopPropagation();
                  const { clientX, clientY } = getEventCoords(e);
                  const hasCoords = clientX !== 0 || clientY !== 0;
                  const dropPt = hasCoords
                    ? clientToBoard(clientX, clientY)
                    : { x: stringDraft.currX, y: stringDraft.currY };
                  const nearestPin = findNearestPinOnCard(card, dropPt);
                  if (nearestPin) {
                    completeStringConnection(card.id, nearestPin.id);
                  } else {
                    setStringDraft(null);
                  }
                }
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

              {/* Movable Dual-Zone Thumbtack Pins on the Card */}
              {card.pins.map((pin) => (
                <div
                  key={pin.id}
                  data-testid={`pin-root-${pin.id}`}
                  data-pin-id={pin.id}
                  className={`thumbtack-pin pin-${pin.color}`}
                  style={{ left: `${pin.rx}%`, top: `${pin.ry}%` }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (stringDraft) {
                      completeStringConnection(card.id, pin.id);
                    }
                  }}
                >
                  {/* Outer Brass Collar Ring — Drag to reposition Pin across Card without modifier keys */}
                  <button
                    type="button"
                    data-testid={`pin-collar-${pin.id}`}
                    data-pin-collar={pin.id}
                    className="pin-collar-ring"
                    aria-label={`Move ${pin.color} Pin on ${card.title}`}
                    title="Drag outer brass collar to reposition Pin across Card"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setPinMove({ cardId: card.id, pinId: pin.id });
                    }}
                  />
                  {/* Inner Pin Head Dome — Drag to pull yarn String */}
                  <button
                    type="button"
                    data-testid={`pin-dome-${pin.id}`}
                    data-pin-dome={pin.id}
                    className="pin-head"
                    aria-label={`Pull yarn String from ${pin.color} Pin on ${card.title}`}
                    title="Drag inner Pin dome to pull yarn String"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
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
                  />
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
                {card.kind === 'photo' ? (
                  <div className="polaroid-frame">
                    <img
                      src={
                        (card.assetId && assetUrls[card.assetId]) ||
                        card.assetId ||
                        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                      }
                      alt={card.title}
                      draggable={false}
                    />
                    <input
                      className="polaroid-caption-input"
                      aria-label={`Photo caption for ${card.title}`}
                      value={card.imageCaption ?? card.title}
                      onChange={(e) =>
                        dispatch(
                          caseActions.updateCard(card.id, {
                            imageCaption: e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                ) : card.kind === 'pdf-stack' ? (
                  (() => {
                    const startPage = card.pdfPageRange?.start ?? 1;
                    const endPage = Math.max(
                      startPage,
                      card.pdfPageRange?.end ?? 1
                    );
                    const totalInRange = endPage - startPage + 1;
                    const currIdx = Math.max(
                      0,
                      Math.min(totalInRange - 1, card.currentPageIndex ?? 0)
                    );
                    const activePageNumber = startPage + currIdx;
                    const isSnipping = snipOverlayCardId === card.id;

                    return (
                      <>
                        <input
                          className="card-title-input"
                          aria-label={`${card.title} title`}
                          value={card.title}
                          onChange={(e) =>
                            dispatch(
                              caseActions.updateCard(card.id, {
                                title: e.target.value,
                              })
                            )
                          }
                        />
                        <div className="pdf-stack-viewer">
                          <div className="pdf-canvas-stage">
                            <PdfPageCanvas
                              assetId={card.assetId}
                              assetUrl={
                                card.assetId ? assetUrls[card.assetId] : undefined
                              }
                              title={card.title}
                              pageNumber={activePageNumber}
                              width={Math.max(180, card.width - 28)}
                              height={Math.max(120, card.height - 96)}
                              testId={`pdf-page-canvas-${card.id}`}
                            />
                            {isSnipping && (
                              <div
                                data-testid={`pdf-crop-overlay-${card.id}`}
                                data-pdf-crop-overlay={card.id}
                                className="pdf-crop-overlay"
                                onPointerDown={(e) => {
                                  if (e.button !== 0) return;
                                  e.stopPropagation();
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const { clientX, clientY } = getEventCoords(e);
                                  const w = rect.width || 200;
                                  const h = rect.height || 150;
                                  const nx = Math.max(
                                    0,
                                    Math.min(1, (clientX - rect.left) / w)
                                  );
                                  const ny = Math.max(
                                    0,
                                    Math.min(1, (clientY - rect.top) / h)
                                  );
                                  setSnipDrag({
                                    cardId: card.id,
                                    startX: nx,
                                    startY: ny,
                                    currX: nx,
                                    currY: ny,
                                  });
                                }}
                                onPointerMove={(e) => {
                                  if (!snipDrag || snipDrag.cardId !== card.id) {
                                    return;
                                  }
                                  e.stopPropagation();
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const { clientX, clientY } = getEventCoords(e);
                                  const w = rect.width || 200;
                                  const h = rect.height || 150;
                                  const nx = Math.max(
                                    0,
                                    Math.min(1, (clientX - rect.left) / w)
                                  );
                                  const ny = Math.max(
                                    0,
                                    Math.min(1, (clientY - rect.top) / h)
                                  );
                                  setSnipDrag({
                                    ...snipDrag,
                                    currX: nx,
                                    currY: ny,
                                  });
                                }}
                                onPointerUp={(e) => {
                                  if (!snipDrag || snipDrag.cardId !== card.id) {
                                    return;
                                  }
                                  e.stopPropagation();
                                  const rect = (
                                    e.currentTarget as HTMLElement
                                  ).getBoundingClientRect();
                                  const { clientX, clientY } = getEventCoords(e);
                                  const w = rect.width || 200;
                                  const h = rect.height || 150;
                                  const hasClient = clientX !== 0 || clientY !== 0;
                                  const endX = hasClient
                                    ? Math.max(
                                        0,
                                        Math.min(1, (clientX - rect.left) / w)
                                      )
                                    : snipDrag.currX;
                                  const endY = hasClient
                                    ? Math.max(
                                        0,
                                        Math.min(1, (clientY - rect.top) / h)
                                      )
                                    : snipDrag.currY;

                                  const x = Math.min(snipDrag.startX, endX);
                                  const y = Math.min(snipDrag.startY, endY);
                                  const rw = Math.max(
                                    0.05,
                                    Math.abs(endX - snipDrag.startX)
                                  );
                                  const rh = Math.max(
                                    0.05,
                                    Math.abs(endY - snipDrag.startY)
                                  );

                                  dispatch(
                                    caseActions.snipPdfRegion({
                                      stackCardId: card.id,
                                      cropRect: {
                                        x: Number(x.toFixed(3)),
                                        y: Number(y.toFixed(3)),
                                        w: Number(Math.min(1 - x, rw).toFixed(3)),
                                        h: Number(Math.min(1 - y, rh).toFixed(3)),
                                      },
                                    })
                                  );
                                  setSnipDrag(null);
                                  setSnipOverlayCardId(null);
                                }}
                              >
                                <span className="pdf-crop-hint">
                                  Drag rectangle to snip region
                                </span>
                                {snipDrag && snipDrag.cardId === card.id && (
                                  <div
                                    data-testid="pdf-crop-selection-box"
                                    className="pdf-crop-selection-box"
                                    style={{
                                      left: `${
                                        Math.min(
                                          snipDrag.startX,
                                          snipDrag.currX
                                        ) * 100
                                      }%`,
                                      top: `${
                                        Math.min(
                                          snipDrag.startY,
                                          snipDrag.currY
                                        ) * 100
                                      }%`,
                                      width: `${
                                        Math.abs(
                                          snipDrag.currX - snipDrag.startX
                                        ) * 100
                                      }%`,
                                      height: `${
                                        Math.abs(
                                          snipDrag.currY - snipDrag.startY
                                        ) * 100
                                      }%`,
                                    }}
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          <div
                            className="pdf-stack-controls"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="pdf-pager">
                              <button
                                type="button"
                                aria-label="Previous PDF page"
                                title="Previous PDF page"
                                onClick={() =>
                                  dispatch(
                                    caseActions.flipPdfPage(card.id, 'prev')
                                  )
                                }
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <span data-testid="pdf-pager-readout">
                                Pg {activePageNumber} ({currIdx + 1} /{' '}
                                {totalInRange})
                              </span>
                              <button
                                type="button"
                                aria-label="Next PDF page"
                                title="Next PDF page"
                                onClick={() =>
                                  dispatch(
                                    caseActions.flipPdfPage(card.id, 'next')
                                  )
                                }
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                            <div className="pdf-extract-actions">
                              <button
                                type="button"
                                className="pdf-action-btn"
                                aria-label="Pull Page"
                                title="Pull current page out as its own Card on the Board"
                                onClick={() =>
                                  dispatch(
                                    caseActions.pullPdfPage({
                                      stackCardId: card.id,
                                    })
                                  )
                                }
                              >
                                <FileOutput size={13} />
                                <span>Pull Page</span>
                              </button>
                              <button
                                type="button"
                                className={`pdf-action-btn ${
                                  isSnipping ? 'active' : ''
                                }`}
                                aria-label="Snip Region"
                                title="Snip/Crop a region of this PDF page into a Clipping Card"
                                onClick={() =>
                                  setSnipOverlayCardId(
                                    isSnipping ? null : card.id
                                  )
                                }
                              >
                                <Scissors size={13} />
                                <span>Snip Region</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <>
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

                    {card.kind === 'clipping' &&
                      card.assetId &&
                      card.sourcePageNumber !== undefined && (
                        <div
                          data-testid={`clipping-pdf-preview-${card.id}`}
                          data-source-page={card.sourcePageNumber}
                          data-asset-id={card.assetId}
                          data-crop-rect={
                            card.cropRect
                              ? `${card.cropRect.x},${card.cropRect.y},${card.cropRect.w},${card.cropRect.h}`
                              : undefined
                          }
                          className="clipping-pdf-preview"
                        >
                          <PdfPageCanvas
                            assetId={card.assetId}
                            assetUrl={assetUrls[card.assetId]}
                            title={card.title}
                            pageNumber={card.sourcePageNumber}
                            cropRect={card.cropRect}
                            width={Math.max(160, card.width - 28)}
                            height={Math.max(80, Math.round(card.height * 0.48))}
                            testId={`pdf-page-canvas-${card.id}`}
                          />
                        </div>
                      )}

                    <RichTextEditor
                      card={card}
                      onChangeText={(plainText, richContent) =>
                        dispatch(
                          caseActions.updateCard(card.id, {
                            plainText,
                            richContent,
                          })
                        )
                      }
                      onSelectionChange={(range) =>
                        setTextSelections((prev) => ({
                          ...prev,
                          [card.id]: range,
                        }))
                      }
                    />
                  </>
                )}
              </div>

              {/* Card-Bound Hand-Drawn Annotations Layer (Normalized 0..100 percentages) */}
              <AnnotationLayer
                target="card"
                cardId={card.id}
                cardSkew={card.skew}
                cardWidth={card.width}
                cardHeight={card.height}
                zoom={state.zoom}
                annotations={card.annotations}
                activeTool={state.activeTool}
                activeInkColor={state.activeInkColor}
                activeStrokeWidth={state.activeStrokeWidth ?? 2}
                selectedAnnotationId={state.selectedAnnotationId}
                onAddAnnotation={(annotation) =>
                  dispatch(
                    caseActions.addAnnotation({
                      cardId: card.id,
                      annotation,
                    })
                  )
                }
                onSelectAnnotation={(annotationId) =>
                  dispatch(caseActions.selectAnnotation(annotationId))
                }
                onMoveAnnotation={(annotationId, x, y) =>
                  dispatch(
                    caseActions.moveAnnotation({
                      annotationId,
                      cardId: card.id,
                      x,
                      y,
                    })
                  )
                }
                onResizeAnnotation={(annotationId, w, h) =>
                  dispatch(
                    caseActions.resizeAnnotation({
                      annotationId,
                      cardId: card.id,
                      w,
                      h,
                    })
                  )
                }
                onDeleteAnnotation={(annotationId) =>
                  dispatch(
                    caseActions.deleteAnnotation({
                      annotationId,
                      cardId: card.id,
                    })
                  )
                }
              />

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
                <div className="pin-color-swatches" role="group" aria-label="Add colored Pin">
                  {(['red', 'brass', 'blue', 'black'] as const).map((pinColor) => (
                    <button
                      key={pinColor}
                      type="button"
                      className={`pin-color-swatch pin-swatch-${pinColor}`}
                      aria-label={`Add ${pinColor} Pin`}
                      title={`Add ${pinColor} Pin`}
                      onClick={() =>
                        dispatch(caseActions.addPin(card.id, { color: pinColor }))
                      }
                    />
                  ))}
                </div>
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
              <g
                key={str.id}
                data-testid={`yarn-string-group-${str.id}`}
                className={isHighlighted ? 'yarn-highlighted' : ''}
              >
                <path
                  data-testid={`yarn-string-path-${str.id}`}
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
                {str.label !== undefined && (
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
                        aria-label={`String label ${str.id}`}
                        value={str.label ?? ''}
                        onChange={(e) =>
                          dispatch(
                            caseActions.updateString(str.id, e.target.value)
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label="Cut String"
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
              data-testid="yarn-draft-path"
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

        {/* Board-Bound Hand-Drawn Annotations Layer */}
        <AnnotationLayer
          target="board"
          annotations={state.boardAnnotations}
          activeTool={state.activeTool}
          activeInkColor={state.activeInkColor}
          activeStrokeWidth={state.activeStrokeWidth ?? 2}
          selectedAnnotationId={state.selectedAnnotationId}
          zoom={state.zoom}
          panX={state.panX}
          panY={state.panY}
          onAddAnnotation={(annotation) =>
            dispatch(caseActions.addAnnotation({ annotation }))
          }
          onSelectAnnotation={(annotationId) =>
            dispatch(caseActions.selectAnnotation(annotationId))
          }
          onMoveAnnotation={(annotationId, x, y) =>
            dispatch(caseActions.moveAnnotation({ annotationId, x, y }))
          }
          onResizeAnnotation={(annotationId, w, h) =>
            dispatch(caseActions.resizeAnnotation({ annotationId, w, h }))
          }
          onDeleteAnnotation={(annotationId) =>
            dispatch(caseActions.deleteAnnotation({ annotationId }))
          }
        />
      </div>
    </div>
  );
};
