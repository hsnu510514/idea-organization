import React, { useState } from 'react';
import { AssetRecord } from '../domain/types';

export interface PdfImportSheetProps {
  asset: AssetRecord;
  onConfirm: (range: { start: number; end: number }) => void;
  onCancel: () => void;
}

export const PdfImportSheet: React.FC<PdfImportSheetProps> = ({
  asset,
  onConfirm,
  onCancel,
}) => {
  const totalPages = Math.max(1, asset.pageCount ?? 1);
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(totalPages);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeMode === 'all') {
      onConfirm({ start: 1, end: totalPages });
      return;
    }
    const clampedStart = Math.max(1, Math.min(totalPages, startPage || 1));
    const clampedEnd = Math.max(
      clampedStart,
      Math.min(totalPages, endPage || totalPages)
    );
    onConfirm({ start: clampedStart, end: clampedEnd });
  };

  return (
    <div
      data-testid="pdf-import-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`Import PDF ${asset.filename}`}
      className="pdf-import-sheet-backdrop"
    >
      <form className="pdf-import-sheet-card" onSubmit={handleConfirm}>
        <header className="pdf-import-header">
          <span className="pdf-import-stamp">EVIDENCE INTAKE</span>
          <h3>{asset.filename}</h3>
          <p className="pdf-import-meta">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'} detected
          </p>
        </header>

        <fieldset className="pdf-import-fieldset">
          <legend>Select Pages to Pin as PDF Stack</legend>
          <label className="pdf-import-radio-row">
            <input
              type="radio"
              name="pdf-range-mode"
              checked={rangeMode === 'all'}
              onChange={() => setRangeMode('all')}
            />
            <span>All Pages (1–{totalPages})</span>
          </label>

          <label className="pdf-import-radio-row">
            <input
              type="radio"
              name="pdf-range-mode"
              checked={rangeMode === 'custom'}
              onChange={() => setRangeMode('custom')}
            />
            <span>Custom Page Range</span>
          </label>

          <div className="pdf-import-range-inputs">
            <label>
              <span>Start Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                aria-label="Start Page"
                value={startPage}
                onChange={(e) => {
                  setRangeMode('custom');
                  setStartPage(Number(e.target.value));
                }}
              />
            </label>
            <label>
              <span>End Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                aria-label="End Page"
                value={endPage}
                onChange={(e) => {
                  setRangeMode('custom');
                  setEndPage(Number(e.target.value));
                }}
              />
            </label>
          </div>
        </fieldset>

        <footer className="pdf-import-actions">
          <button
            type="button"
            className="pdf-import-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="pdf-import-confirm-btn">
            Pin PDF Stack
          </button>
        </footer>
      </form>
    </div>
  );
};
