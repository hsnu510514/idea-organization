import React, { useEffect, useRef } from 'react';
import { PdfClipRect } from '../domain/types';

// Cache raw PDF bytes or text in-memory by asset URL or assetId so pdfjs-dist and JSDOM fallback can render
const pdfBinaryCache = new Map<string, Uint8Array>();

export function cachePdfBinary(key: string, data: Uint8Array): void {
  pdfBinaryCache.set(key, data);
}

async function readBlobBytes(file: File | Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  }
  return new Promise<Uint8Array>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        resolve(new Uint8Array());
      }
    };
    reader.onerror = () => resolve(new Uint8Array());
    reader.readAsArrayBuffer(file);
  });
}

function countPagesFromPdfBytes(bytes: Uint8Array): number {
  try {
    const text = new TextDecoder('latin1').decode(bytes);
    const pageMatches = text.match(/\/Type\s*\/Page\b(?!s)/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }
    const countMatch = text.match(/\/Count\s+(\d+)/);
    if (countMatch) {
      const parsed = Number(countMatch[1]);
      if (parsed > 0) return parsed;
    }
  } catch {
    // Fallback
  }
  return 1;
}

/**
 * Inspects a PDF file/blob for its total page count using pdfjs-dist when available,
 * with a deterministic %PDF `/Type /Page` parser fallback for synthetic PDFs or JSDOM.
 */
export async function inspectPdfPageCount(
  file: File | Blob,
  cacheKey?: string
): Promise<number> {
  const bytes = await readBlobBytes(file);
  if (cacheKey) {
    pdfBinaryCache.set(cacheKey, bytes);
  }

  const fallbackCount = countPagesFromPdfBytes(bytes);

  const isJsdom =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

  if (!isJsdom && bytes.byteLength > 0) {
    try {
      const pdfjs = await import('pdfjs-dist');
      const loadingTask = pdfjs.getDocument({
        data: bytes.slice(),
      });
      const doc = await loadingTask.promise;
      const numPages = doc.numPages;
      void doc.cleanup();
      if (numPages > 0) return numPages;
    } catch {
      // Fall back to regex inspection
    }
  }

  return Math.max(1, fallbackCount);
}

export interface PdfPageCanvasProps {
  assetId?: string;
  assetUrl?: string;
  title: string;
  pageNumber: number;
  cropRect?: PdfClipRect;
  width?: number;
  height?: number;
  testId?: string;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({
  assetId,
  assetUrl,
  title,
  pageNumber,
  cropRect,
  width = 240,
  height = 180,
  testId = 'pdf-page-canvas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isJsdom =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

    const renderFallback2D = () => {
      if (isJsdom) return;
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FAF6EC';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1E1A17';
        ctx.font = '12px monospace';
        const cropLabel = cropRect
          ? ` [crop ${(cropRect.x * 100).toFixed(0)}%,${(cropRect.y * 100).toFixed(0)}%]`
          : '';
        ctx.fillText(`${title} — Pg ${pageNumber}${cropLabel}`, 10, 24);
      } catch {
        // Ignore in headless environments without 2D context
      }
    };

    const renderWithPdfJs = async () => {
      const cached =
        (assetId && pdfBinaryCache.get(assetId)) ||
        (assetUrl && pdfBinaryCache.get(assetUrl));

      if (isJsdom || (!cached && !assetUrl)) {
        renderFallback2D();
        return;
      }

      try {
        const pdfjs = await import('pdfjs-dist');
        const src = cached ? { data: cached.slice() } : { url: assetUrl! };
        const loadingTask = pdfjs.getDocument(src);
        const pdfDoc = await loadingTask.promise;
        if (cancelled) {
          void pdfDoc.cleanup();
          return;
        }
        const safePage = Math.max(1, Math.min(pdfDoc.numPages, pageNumber));
        const page = await pdfDoc.getPage(safePage);
        if (cancelled) {
          void pdfDoc.cleanup();
          return;
        }
        const viewport = page.getViewport({ scale: 1.15 });
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvasContext: ctx,
            canvas,
            viewport,
          }).promise;
        } else {
          renderFallback2D();
        }
        void pdfDoc.cleanup();
      } catch {
        if (!cancelled) {
          renderFallback2D();
        }
      }
    };

    void renderWithPdfJs();

    return () => {
      cancelled = true;
    };
  }, [assetId, assetUrl, title, pageNumber, cropRect]);

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      data-rendered-page={pageNumber}
      data-asset-id={assetId ?? ''}
      data-crop-rect={
        cropRect
          ? `${cropRect.x},${cropRect.y},${cropRect.w},${cropRect.h}`
          : undefined
      }
      className="pdf-page-canvas"
      width={width}
      height={height}
    />
  );
};
