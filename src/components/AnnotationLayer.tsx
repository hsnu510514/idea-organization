import React, { useRef, useState } from 'react';
import { ActiveTool, AnnotationData } from '../domain/types';

export interface AnnotationLayerProps {
  target: 'card' | 'board';
  cardId?: string;
  annotations: AnnotationData[];
  activeTool: ActiveTool;
  activeInkColor: string;
  activeStrokeWidth?: number;
  selectedAnnotationId?: string | null;
  zoom?: number;
  panX?: number;
  panY?: number;
  onAddAnnotation: (annotation: AnnotationData) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onMoveAnnotation: (annotationId: string, x: number, y: number) => void;
  onResizeAnnotation: (annotationId: string, w: number, h: number) => void;
  onDeleteAnnotation: (annotationId: string) => void;
}

const DRAWING_TOOLS: ReadonlySet<ActiveTool> = new Set([
  'freehand',
  'circle',
  'rectangle',
  'underline',
  'arrow',
]);

let annSeq = 1;
function createAnnotationId(): string {
  annSeq += 1;
  return `ann-${Date.now()}-${annSeq}`;
}

export function buildSketchyShapePath(ann: AnnotationData): string {
  const { kind, x, y, w, h, points } = ann;

  if (kind === 'freehand') {
    if (!points || points.length === 0) {
      return `M ${x} ${y} L ${x + w} ${y + h}`;
    }
    if (points.length === 1) {
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.5} ${p.y + 0.5}`;
    }
    return points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
      .join(' ');
  }

  if (kind === 'circle') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = Math.max(1, h / 2);
    const ox = rx * 0.06;
    const oy = ry * 0.06;
    return [
      `M ${(cx - rx).toFixed(2)} ${cy.toFixed(2)}`,
      `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx + rx).toFixed(2)} ${cy.toFixed(2)}`,
      `A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(cx - rx + ox).toFixed(2)} ${(cy - oy).toFixed(2)}`,
    ].join(' ');
  }

  if (kind === 'rectangle') {
    const jx = Math.min(1.5, w * 0.03);
    const jy = Math.min(1.5, h * 0.03);
    return [
      `M ${(x - jx).toFixed(2)} ${(y + jy).toFixed(2)}`,
      `L ${(x + w + jx).toFixed(2)} ${(y - jy).toFixed(2)}`,
      `L ${(x + w - jx).toFixed(2)} ${(y + h + jy).toFixed(2)}`,
      `L ${(x + jx).toFixed(2)} ${(y + h - jy).toFixed(2)}`,
      `Z`,
    ].join(' ');
  }

  if (kind === 'underline') {
    const baselineY = y + h * 0.75;
    const midX = x + w / 2;
    const bowY = baselineY + Math.max(1, h * 0.2);
    return `M ${x.toFixed(2)} ${baselineY.toFixed(2)} Q ${midX.toFixed(2)} ${bowY.toFixed(2)} ${(x + w).toFixed(2)} ${baselineY.toFixed(2)}`;
  }

  if (kind === 'arrow') {
    const x1 = x;
    const y1 = y + h * 0.8;
    const x2 = x + w;
    const y2 = y + h * 0.2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(3, Math.min(14, Math.hypot(w, h) * 0.22));
    const leftX = x2 - headLen * Math.cos(angle - Math.PI / 6);
    const leftY = y2 - headLen * Math.sin(angle - Math.PI / 6);
    const rightX = x2 - headLen * Math.cos(angle + Math.PI / 6);
    const rightY = y2 - headLen * Math.sin(angle + Math.PI / 6);
    return [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `M ${leftX.toFixed(2)} ${leftY.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${rightX.toFixed(2)} ${rightY.toFixed(2)}`,
    ].join(' ');
  }

  return '';
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  target,
  cardId,
  annotations,
  activeTool,
  activeInkColor,
  activeStrokeWidth = 2,
  selectedAnnotationId,
  zoom = 1,
  panX = 0,
  panY = 0,
  onAddAnnotation,
  onSelectAnnotation,
  onMoveAnnotation,
  onResizeAnnotation,
  onDeleteAnnotation,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const [draft, setDraft] = useState<{
    kind: AnnotationData['kind'];
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    points: Array<{ x: number; y: number }>;
  } | null>(null);

  const [moveDrag, setMoveDrag] = useState<{
    annotationId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [resizeDrag, setResizeDrag] = useState<{
    annotationId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const getEventClientCoords = (e: React.PointerEvent | React.MouseEvent) => {
    const native = e.nativeEvent as unknown as Record<string, number | undefined>;
    const clientX =
      typeof e.clientX === 'number' && !Number.isNaN(e.clientX)
        ? e.clientX
        : native?.clientX ?? native?.pageX ?? 0;
    const clientY =
      typeof e.clientY === 'number' && !Number.isNaN(e.clientY)
        ? e.clientY
        : native?.clientY ?? native?.pageY ?? 0;
    return { clientX, clientY };
  };

  /**
   * Convert client coordinates to either:
   * - Card normalized percentages (`0..100`) when `target === 'card'`
   * - Board plane coordinates when `target === 'board'`
   */
  const clientToLocal = (clientX: number, clientY: number): { x: number; y: number } => {
    if (target === 'card') {
      const cardEl = svgRef.current?.closest('[data-card-root]') as HTMLElement | null;
      const rect = cardEl?.getBoundingClientRect() ?? svgRef.current?.getBoundingClientRect();
      const width = rect && rect.width > 0 ? rect.width : 250;
      const height = rect && rect.height > 0 ? rect.height : 250;
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const pctX = ((clientX - left) / width) * 100;
      const pctY = ((clientY - top) / height) * 100;
      return {
        x: Math.max(0, Math.min(100, Number(pctX.toFixed(2)))),
        y: Math.max(0, Math.min(100, Number(pctY.toFixed(2)))),
      };
    }

    const viewportEl = svgRef.current?.closest('[data-testid="board-viewport"]') as HTMLElement | null;
    const rect = viewportEl?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return {
      x: Number(((clientX - left - panX) / zoom).toFixed(2)),
      y: Number(((clientY - top - panY) / zoom).toFixed(2)),
    };
  };

  const isDrawingMode = DRAWING_TOOLS.has(activeTool);

  const handleLayerPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return;

    if (!isDrawingMode) return;

    if (target === 'board') {
      const elTarget = e.target as HTMLElement;
      if (elTarget.closest('[data-card-root]')) {
        return;
      }
    }

    e.stopPropagation();
    const { clientX, clientY } = getEventClientCoords(e);
    const pt = clientToLocal(clientX, clientY);
    const kind = activeTool as AnnotationData['kind'];

    setDraft({
      kind,
      startX: pt.x,
      startY: pt.y,
      currX: pt.x,
      currY: pt.y,
      points: [pt],
    });
  };

  const handleLayerPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draft && !moveDrag && !resizeDrag) return;
    e.stopPropagation();
    const { clientX, clientY } = getEventClientCoords(e);
    const pt = clientToLocal(clientX, clientY);

    if (draft) {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              currX: pt.x,
              currY: pt.y,
              points:
                prev.kind === 'freehand' ? [...prev.points, pt] : prev.points,
            }
          : null
      );
      return;
    }

    if (moveDrag) {
      const dx = pt.x - moveDrag.startX;
      const dy = pt.y - moveDrag.startY;
      onMoveAnnotation(
        moveDrag.annotationId,
        moveDrag.origX + dx,
        moveDrag.origY + dy
      );
      return;
    }

    if (resizeDrag) {
      const dw = pt.x - resizeDrag.startX;
      const dh = pt.y - resizeDrag.startY;
      onResizeAnnotation(
        resizeDrag.annotationId,
        Math.max(4, resizeDrag.origW + dw),
        Math.max(4, resizeDrag.origH + dh)
      );
    }
  };

  const handleLayerPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draft && !moveDrag && !resizeDrag) return;
    e.stopPropagation();

    if (draft) {
      let x = Math.min(draft.startX, draft.currX);
      let y = Math.min(draft.startY, draft.currY);
      let w = Math.abs(draft.currX - draft.startX);
      let h = Math.abs(draft.currY - draft.startY);

      if (draft.kind === 'freehand' && draft.points.length > 0) {
        const xs = draft.points.map((p) => p.x);
        const ys = draft.points.map((p) => p.y);
        x = Math.min(...xs);
        y = Math.min(...ys);
        w = Math.max(2, Math.max(...xs) - x);
        h = Math.max(2, Math.max(...ys) - y);
      } else {
        const minDefault = target === 'card' ? 8 : 24;
        if (w < 1 && h < 1) {
          w = minDefault;
          h = draft.kind === 'underline' ? Math.max(2, minDefault * 0.25) : minDefault;
        } else {
          w = Math.max(2, w);
          h = Math.max(2, h);
        }
      }

      const newAnnotation: AnnotationData = {
        id: createAnnotationId(),
        target,
        kind: draft.kind,
        color: activeInkColor,
        strokeWidth: activeStrokeWidth,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        w: Number(w.toFixed(2)),
        h: Number(h.toFixed(2)),
        ...(draft.kind === 'freehand' ? { points: draft.points } : {}),
      };

      onAddAnnotation(newAnnotation);
      setDraft(null);
    }

    setMoveDrag(null);
    setResizeDrag(null);
  };

  const draftPreviewAnnotation: AnnotationData | null = draft
    ? (() => {
        if (draft.kind === 'freehand') {
          const xs = draft.points.map((p) => p.x);
          const ys = draft.points.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          return {
            id: 'draft',
            target,
            kind: 'freehand',
            color: activeInkColor,
            strokeWidth: activeStrokeWidth,
            x: minX,
            y: minY,
            w: Math.max(2, Math.max(...xs) - minX),
            h: Math.max(2, Math.max(...ys) - minY),
            points: draft.points,
          };
        }
        return {
          id: 'draft',
          target,
          kind: draft.kind,
          color: activeInkColor,
          strokeWidth: activeStrokeWidth,
          x: Math.min(draft.startX, draft.currX),
          y: Math.min(draft.startY, draft.currY),
          w: Math.max(2, Math.abs(draft.currX - draft.startX)),
          h: Math.max(2, Math.abs(draft.currY - draft.startY)),
        };
      })()
    : null;

  const testId =
    target === 'card' && cardId
      ? `card-annotation-layer-${cardId}`
      : 'board-annotation-layer';

  const layerInteractive =
    isDrawingMode ||
    activeTool === 'eraser' ||
    Boolean(draft || moveDrag || resizeDrag);

  return (
    <svg
      ref={svgRef}
      data-testid={testId}
      className={`annotation-svg-layer annotation-layer-${target} ${
        isDrawingMode ? 'is-drawing-surface' : ''
      }`}
      viewBox={target === 'card' ? '0 0 100 100' : undefined}
      preserveAspectRatio={target === 'card' ? 'none' : undefined}
      width={target === 'board' ? 4000 : '100%'}
      height={target === 'board' ? 3000 : '100%'}
      style={{
        pointerEvents: layerInteractive ? 'auto' : 'none',
      }}
      onPointerDown={handleLayerPointerDown}
      onPointerMove={handleLayerPointerMove}
      onPointerUp={handleLayerPointerUp}
    >
      {annotations.map((ann) => {
        const isSelected = selectedAnnotationId === ann.id;
        const d = buildSketchyShapePath(ann);
        const handleSize = target === 'card' ? 4.5 : 10;

        return (
          <g
            key={ann.id}
            data-testid={`annotation-item-${ann.id}`}
            data-annotation-id={ann.id}
            data-annotation-kind={ann.kind}
            data-annotation-target={ann.target}
            data-annotation-x={ann.x}
            data-annotation-y={ann.y}
            data-annotation-w={ann.w}
            data-annotation-h={ann.h}
            className={`annotation-group ${isSelected ? 'is-selected' : ''}`}
            style={{ pointerEvents: 'auto', cursor: activeTool === 'eraser' ? 'pointer' : 'move' }}
            onPointerDown={(e) => {
              if (e.button === 2) return;
              e.stopPropagation();

              if (activeTool === 'eraser') {
                onDeleteAnnotation(ann.id);
                return;
              }

              if (activeTool === 'select') {
                onSelectAnnotation(ann.id);
                const { clientX, clientY } = getEventClientCoords(e);
                const pt = clientToLocal(clientX, clientY);
                setMoveDrag({
                  annotationId: ann.id,
                  startX: pt.x,
                  startY: pt.y,
                  origX: ann.x,
                  origY: ann.y,
                });
              }
            }}
          >
            {/* Transparent hit area for easy clicking */}
            <rect
              x={ann.x}
              y={ann.y}
              width={Math.max(2, ann.w)}
              height={Math.max(2, ann.h)}
              fill="transparent"
            />

            {/* Hand-sketched SVG stroke */}
            <path
              d={d}
              fill="none"
              stroke={ann.color}
              strokeWidth={ann.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect={target === 'card' ? 'non-scaling-stroke' : undefined}
            />

            {/* Selection bounding box and resize handle */}
            {isSelected && (
              <>
                <rect
                  x={ann.x}
                  y={ann.y}
                  width={Math.max(2, ann.w)}
                  height={Math.max(2, ann.h)}
                  fill="none"
                  stroke="#C89D46"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  vectorEffect={target === 'card' ? 'non-scaling-stroke' : undefined}
                />
                <rect
                  data-testid={`annotation-resize-handle-${ann.id}`}
                  className="annotation-resize-handle"
                  x={ann.x + ann.w - handleSize / 2}
                  y={ann.y + ann.h - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  fill="#C89D46"
                  stroke="#1E1A17"
                  strokeWidth={0.8}
                  style={{ cursor: 'nwse-resize', pointerEvents: 'auto' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const { clientX, clientY } = getEventClientCoords(e);
                    const pt = clientToLocal(clientX, clientY);
                    setResizeDrag({
                      annotationId: ann.id,
                      startX: pt.x,
                      startY: pt.y,
                      origW: ann.w,
                      origH: ann.h,
                    });
                  }}
                />
              </>
            )}
          </g>
        );
      })}

      {draftPreviewAnnotation && (
        <path
          d={buildSketchyShapePath(draftPreviewAnnotation)}
          fill="none"
          stroke={draftPreviewAnnotation.color}
          strokeWidth={draftPreviewAnnotation.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 2"
          vectorEffect={target === 'card' ? 'non-scaling-stroke' : undefined}
        />
      )}
    </svg>
  );
};
