import React from 'react';
import {
  ActiveTool,
  CardData,
  FontSize,
  FontStyle,
  PaperColor,
} from '../domain/types';
import { RichTextStylePatch } from './RichTextEditor';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  PenTool,
  Circle,
  Square,
  ArrowUpRight,
  Eraser,
} from 'lucide-react';

export interface FloatingPaperRibbonProps {
  card: CardData;
  activeTool: ActiveTool;
  activeInkColor: string;
  activeStrokeWidth?: number;
  hasTextSelection: boolean;
  onChangePaperColor: (color: PaperColor) => void;
  onApplyTextFormat: (patch: RichTextStylePatch) => void;
  onSetActiveTool: (tool: ActiveTool) => void;
  onSetInkColor: (color: string) => void;
  onSetStrokeWidth?: (width: number) => void;
}

const PAPER_SWATCHES: PaperColor[] = [
  'yellow',
  'pink',
  'mint',
  'cream',
  'aged',
  'white',
];

const FONT_OPTIONS: Array<{
  style: FontStyle;
  shortLabel: string;
  familyName: string;
}> = [
  { style: 'typewriter', shortLabel: 'Type', familyName: 'Special Elite' },
  { style: 'handwriting', shortLabel: 'Hand', familyName: 'Caveat' },
  { style: 'serif', shortLabel: 'Serif', familyName: 'Cormorant Garamond' },
  { style: 'sans', shortLabel: 'Sans', familyName: 'Work Sans' },
];

const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];

const INK_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#1E1A17', label: '#1E1A17' },
  { hex: '#A11D21', label: '#A11D21' },
  { hex: '#235789', label: '#235789' },
  { hex: '#2B6E46', label: '#2B6E46' },
];

const HIGHLIGHT_COLORS: Array<{ hex: string; label: string }> = [
  { hex: '#F3DF7D', label: '#F3DF7D' },
  { hex: '#F2C6C2', label: '#F2C6C2' },
  { hex: '#CBE6D4', label: '#CBE6D4' },
];

export const FloatingPaperRibbon: React.FC<FloatingPaperRibbonProps> = ({
  card,
  activeTool,
  activeInkColor,
  activeStrokeWidth = 2,
  onChangePaperColor,
  onApplyTextFormat,
  onSetActiveTool,
  onSetInkColor,
  onSetStrokeWidth,
}) => {
  return (
    <div
      data-testid={`floating-paper-ribbon-${card.id}`}
      className="va-card-ribbon"
      role="toolbar"
      aria-label={`Formatting ribbon for ${card.title}`}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Paper Material / Color Swatches */}
      <div className="va-ribbon-group" aria-label="Paper color swatches">
        {PAPER_SWATCHES.map((col) => (
          <button
            key={col}
            type="button"
            className={`paper-swatch swatch-${col} ${
              card.paperColor === col ? 'active' : ''
            }`}
            title={`Paper: ${col}`}
            aria-label={`Paper color ${col}`}
            onClick={() => onChangePaperColor(col)}
          />
        ))}
      </div>

      <span className="va-divider" />

      {/* 2. Font Families */}
      <div className="va-ribbon-group" aria-label="Font family controls">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.style}
            type="button"
            className={`va-font-btn ${
              card.defaultFontStyle === f.style ? 'active' : ''
            }`}
            title={`Font: ${f.familyName}`}
            aria-label={`Font family ${f.familyName}`}
            onClick={() => onApplyTextFormat({ fontStyle: f.style })}
          >
            {f.shortLabel}
          </button>
        ))}
      </div>

      <span className="va-divider" />

      {/* 3. Font Sizes (sm, md, lg, xl) */}
      <div className="va-ribbon-group" aria-label="Font size controls">
        {FONT_SIZES.map((sz) => (
          <button
            key={sz}
            type="button"
            className={`va-font-btn ${
              card.defaultFontSize === sz ? 'active' : ''
            }`}
            aria-label={`Font size ${sz.toUpperCase()}`}
            onClick={() => onApplyTextFormat({ fontSize: sz })}
          >
            {sz.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="va-divider" />

      {/* 4. Text Styling (Bold, Italic, Underline, Strikethrough) */}
      <div className="va-ribbon-group" aria-label="Inline text decoration">
        <button
          type="button"
          className="va-font-btn"
          aria-label="Bold"
          title="Bold"
          onClick={() => onApplyTextFormat({ bold: true })}
        >
          <Bold size={12} />
        </button>
        <button
          type="button"
          className="va-font-btn"
          aria-label="Italic"
          title="Italic"
          onClick={() => onApplyTextFormat({ italic: true })}
        >
          <Italic size={12} />
        </button>
        <button
          type="button"
          className="va-font-btn"
          aria-label="Underline"
          title="Underline text"
          onClick={() => onApplyTextFormat({ underline: true })}
        >
          <UnderlineIcon size={12} />
        </button>
        <button
          type="button"
          className="va-font-btn"
          aria-label="Strikethrough"
          title="Strikethrough"
          onClick={() => onApplyTextFormat({ strikethrough: true })}
        >
          <Strikethrough size={12} />
        </button>
      </div>

      <span className="va-divider" />

      {/* 5. Ink Color & Marker Highlight Background Color */}
      <div className="va-ribbon-group" aria-label="Ink and highlight colors">
        {INK_COLORS.map((ink) => (
          <button
            key={ink.hex}
            type="button"
            className={`ink-color-dot ${
              card.defaultTextColor === ink.hex || activeInkColor === ink.hex
                ? 'active'
                : ''
            }`}
            style={{ backgroundColor: ink.hex }}
            aria-label={`Ink color ${ink.label}`}
            title={`Ink color ${ink.label}`}
            onClick={() => {
              onSetInkColor(ink.hex);
              onApplyTextFormat({ color: ink.hex });
            }}
          />
        ))}
        {HIGHLIGHT_COLORS.map((hl) => (
          <button
            key={hl.hex}
            type="button"
            className="highlight-color-dot"
            style={{ backgroundColor: hl.hex }}
            aria-label={`Highlight color ${hl.label}`}
            title={`Marker highlight ${hl.label}`}
            onClick={() => onApplyTextFormat({ highlight: hl.hex })}
          />
        ))}
      </div>

      <span className="va-divider" />

      {/* 6. Card Annotation Quick Tools */}
      <div className="va-ribbon-group" aria-label="Annotation tools">
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'freehand' ? 'active' : ''}`}
          aria-label="Ribbon tool Freehand Pen"
          title="Freehand Pen"
          onClick={() =>
            onSetActiveTool(activeTool === 'freehand' ? 'select' : 'freehand')
          }
        >
          <PenTool size={12} />
        </button>
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'circle' ? 'active' : ''}`}
          aria-label="Ribbon tool Circle"
          title="Hand-Drawn Circle / Oval"
          onClick={() =>
            onSetActiveTool(activeTool === 'circle' ? 'select' : 'circle')
          }
        >
          <Circle size={12} />
        </button>
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
          aria-label="Ribbon tool Rectangle"
          title="Hand-Drawn Rectangle"
          onClick={() =>
            onSetActiveTool(activeTool === 'rectangle' ? 'select' : 'rectangle')
          }
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'underline' ? 'active' : ''}`}
          aria-label="Ribbon tool Underline"
          title="Hand-Drawn Underline"
          onClick={() =>
            onSetActiveTool(activeTool === 'underline' ? 'select' : 'underline')
          }
        >
          <UnderlineIcon size={12} />
        </button>
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'arrow' ? 'active' : ''}`}
          aria-label="Ribbon tool Arrow"
          title="Hand-Drawn Arrow"
          onClick={() =>
            onSetActiveTool(activeTool === 'arrow' ? 'select' : 'arrow')
          }
        >
          <ArrowUpRight size={12} />
        </button>
        <button
          type="button"
          className={`va-font-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          aria-label="Ribbon tool Eraser"
          title="Annotation Eraser"
          onClick={() =>
            onSetActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')
          }
        >
          <Eraser size={12} />
        </button>
        {onSetStrokeWidth && (
          <select
            aria-label="Stroke width"
            className="va-stroke-select"
            value={activeStrokeWidth}
            onChange={(e) => onSetStrokeWidth(Number(e.target.value))}
          >
            <option value={2}>2px</option>
            <option value={3}>3px</option>
            <option value={5}>5px</option>
          </select>
        )}
      </div>
    </div>
  );
};
