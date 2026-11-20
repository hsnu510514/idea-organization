import React, { useRef } from 'react';
import { CardData, FontSize, FontStyle } from '../domain/types';

export interface RichTextStylePatch {
  fontStyle?: FontStyle;
  fontSize?: FontSize;
  color?: string;
  highlight?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface RichTextSegment {
  text: string;
  style?: RichTextStylePatch;
}

export interface SelectionRange {
  start: number;
  end: number;
}

const FONT_FAMILY_CSS: Record<FontStyle, string> = {
  typewriter: "var(--font-typewriter, 'Special Elite', monospace)",
  handwriting: "var(--font-hand, 'Caveat', cursive)",
  serif: "var(--font-serif, 'Cormorant Garamond', serif)",
  sans: "var(--font-sans, 'Work Sans', sans-serif)",
};

const FONT_SIZE_CSS: Record<FontSize, string> = {
  sm: '12.5px',
  md: '15px',
  lg: '19px',
  xl: '23px',
};

/**
 * Parse `card.richContent` into structured segments.
 * Supports JSON-serialized segments, inline HTML `<span data-...>` tags, or plain text fallback.
 */
export function parseRichContent(richContent: string, plainText: string): RichTextSegment[] {
  if (!richContent) {
    return [{ text: plainText || '' }];
  }

  const trimmed = richContent.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as RichTextSegment[];
      if (Array.isArray(parsed) && parsed.every((s) => typeof s.text === 'string')) {
        const joined = parsed.map((s) => s.text).join('');
        if (joined === plainText) {
          return parsed;
        }
      }
    } catch {
      // Fallback to plainText
    }
  }

  return [{ text: plainText }];
}

/**
 * Serialize structured segments into `richContent`.
 */
export function serializeRichSegments(segments: RichTextSegment[]): string {
  const merged = normalizeSegments(segments);
  const hasAnyFormatting = merged.some(
    (s) => s.style && Object.values(s.style).some((v) => v !== undefined && v !== false)
  );
  if (!hasAnyFormatting) {
    return merged.map((s) => s.text).join('');
  }
  return JSON.stringify(merged);
}

function normalizeSegments(segments: RichTextSegment[]): RichTextSegment[] {
  const result: RichTextSegment[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    const cleanStyle = seg.style ? cleanStylePatch(seg.style) : undefined;
    const prev = result[result.length - 1];
    if (prev && stylesEqual(prev.style, cleanStyle)) {
      prev.text += seg.text;
    } else {
      result.push({ text: seg.text, ...(cleanStyle ? { style: cleanStyle } : {}) });
    }
  }
  return result.length > 0 ? result : [{ text: '' }];
}

function cleanStylePatch(style: RichTextStylePatch): RichTextStylePatch | undefined {
  const cleaned: RichTextStylePatch = {};
  if (style.fontStyle) cleaned.fontStyle = style.fontStyle;
  if (style.fontSize) cleaned.fontSize = style.fontSize;
  if (style.color) cleaned.color = style.color;
  if (style.highlight && style.highlight !== 'transparent' && style.highlight !== 'none') {
    cleaned.highlight = style.highlight;
  }
  if (style.bold) cleaned.bold = true;
  if (style.italic) cleaned.italic = true;
  if (style.underline) cleaned.underline = true;
  if (style.strikethrough) cleaned.strikethrough = true;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function stylesEqual(a?: RichTextStylePatch, b?: RichTextStylePatch): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.fontStyle === b.fontStyle &&
    a.fontSize === b.fontSize &&
    a.color === b.color &&
    a.highlight === b.highlight &&
    Boolean(a.bold) === Boolean(b.bold) &&
    Boolean(a.italic) === Boolean(b.italic) &&
    Boolean(a.underline) === Boolean(b.underline) &&
    Boolean(a.strikethrough) === Boolean(b.strikethrough)
  );
}

/**
 * Apply a style patch to a specific character slice `[start, end)` of a Card's rich text.
 * Boolean flags (`bold`, `italic`, `underline`, `strikethrough`) toggle if every character in the selection already has them enabled.
 */
export function applyFormatToSelection(
  richContent: string,
  plainText: string,
  range: SelectionRange,
  patch: RichTextStylePatch
): { richContent: string; plainText: string } {
  const start = Math.max(0, Math.min(plainText.length, Math.min(range.start, range.end)));
  const end = Math.max(0, Math.min(plainText.length, Math.max(range.start, range.end)));
  if (start === end) {
    return { richContent, plainText };
  }

  const segments = parseRichContent(richContent, plainText);

  // Split segments at `start` and `end` boundaries
  const sliced: Array<{ text: string; style?: RichTextStylePatch; inRange: boolean }> = [];
  let cursor = 0;

  for (const seg of segments) {
    const segStart = cursor;
    const segEnd = cursor + seg.text.length;
    cursor = segEnd;

    if (segEnd <= start || segStart >= end) {
      sliced.push({ text: seg.text, style: seg.style, inRange: false });
      continue;
    }

    if (segStart < start) {
      sliced.push({
        text: seg.text.slice(0, start - segStart),
        style: seg.style,
        inRange: false,
      });
    }

    const overlapStart = Math.max(start, segStart) - segStart;
    const overlapEnd = Math.min(end, segEnd) - segStart;
    sliced.push({
      text: seg.text.slice(overlapStart, overlapEnd),
      style: seg.style ? { ...seg.style } : undefined,
      inRange: true,
    });

    if (segEnd > end) {
      sliced.push({
        text: seg.text.slice(end - segStart),
        style: seg.style,
        inRange: false,
      });
    }
  }

  const inRangeSlices = sliced.filter((s) => s.inRange);
  const toggleKeys = ['bold', 'italic', 'underline', 'strikethrough'] as const;

  const effectivePatch: RichTextStylePatch = { ...patch };
  for (const key of toggleKeys) {
    if (patch[key] !== undefined) {
      const allHaveKey =
        inRangeSlices.length > 0 && inRangeSlices.every((s) => Boolean(s.style?.[key]));
      effectivePatch[key] = !allHaveKey;
    }
  }

  const updatedSegments: RichTextSegment[] = sliced.map((s) => {
    if (!s.inRange) {
      return { text: s.text, style: s.style };
    }
    const mergedStyle: RichTextStylePatch = {
      ...(s.style ?? {}),
      ...effectivePatch,
    };
    return { text: s.text, style: cleanStylePatch(mergedStyle) };
  });

  return {
    richContent: serializeRichSegments(updatedSegments),
    plainText,
  };
}

/**
 * Reconciles a plainText edit (`prevPlain` -> `nextPlain`) against existing structured `richContent`
 * so existing formatted spans outside the edited region are preserved and inserted text inherits the adjacent span style.
 */
export function reconcileRichTextEdit(
  prevRichContent: string,
  prevPlainText: string,
  nextPlainText: string
): string {
  if (prevPlainText === nextPlainText) {
    return prevRichContent;
  }

  const prevSegments = parseRichContent(prevRichContent, prevPlainText);
  const hasAnyFormatting = prevSegments.some(
    (s) => s.style && Object.values(s.style).some((v) => v !== undefined && v !== false)
  );
  if (!hasAnyFormatting) {
    return nextPlainText;
  }

  // Find common prefix length
  let prefixLen = 0;
  const minLen = Math.min(prevPlainText.length, nextPlainText.length);
  while (
    prefixLen < minLen &&
    prevPlainText[prefixLen] === nextPlainText[prefixLen]
  ) {
    prefixLen += 1;
  }

  // Find common suffix length after prefix
  let suffixLen = 0;
  while (
    suffixLen < prevPlainText.length - prefixLen &&
    suffixLen < nextPlainText.length - prefixLen &&
    prevPlainText[prevPlainText.length - 1 - suffixLen] ===
      nextPlainText[nextPlainText.length - 1 - suffixLen]
  ) {
    suffixLen += 1;
  }

  const deleteStart = prefixLen;
  const deleteEnd = prevPlainText.length - suffixLen;
  const insertedText = nextPlainText.slice(
    prefixLen,
    nextPlainText.length - suffixLen
  );

  // Build prefix segments [0, deleteStart), inherited style for insertion, and suffix segments [deleteEnd, prevPlainText.length)
  const prefixSegments: RichTextSegment[] = [];
  const suffixSegments: RichTextSegment[] = [];
  let inheritedStyle: RichTextStylePatch | undefined;

  let cursor = 0;
  for (const seg of prevSegments) {
    const segStart = cursor;
    const segEnd = cursor + seg.text.length;
    cursor = segEnd;

    if (segStart < deleteStart) {
      const takeEnd = Math.min(segEnd, deleteStart) - segStart;
      const sliceText = seg.text.slice(0, takeEnd);
      if (sliceText) {
        prefixSegments.push({ text: sliceText, style: seg.style });
      }
      if (segEnd >= deleteStart) {
        inheritedStyle = seg.style;
      }
    }

    if (segEnd > deleteEnd) {
      const takeStart = Math.max(segStart, deleteEnd) - segStart;
      const sliceText = seg.text.slice(takeStart);
      if (sliceText) {
        suffixSegments.push({ text: sliceText, style: seg.style });
      }
      if (inheritedStyle === undefined && segStart <= deleteStart) {
        inheritedStyle = seg.style;
      }
    }
  }

  const nextSegments: RichTextSegment[] = [...prefixSegments];
  if (insertedText) {
    nextSegments.push({
      text: insertedText,
      ...(inheritedStyle ? { style: inheritedStyle } : {}),
    });
  }
  nextSegments.push(...suffixSegments);

  return serializeRichSegments(nextSegments);
}

export interface RichTextEditorProps {
  card: CardData;
  onChangeText: (plainText: string, richContent: string) => void;
  onSelectionChange?: (range: SelectionRange | null) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  card,
  onChangeText,
  onSelectionChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const reportSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) {
      onSelectionChange?.({ start: Math.min(start, end), end: Math.max(start, end) });
    } else {
      onSelectionChange?.(null);
    }
  };

  const segments = parseRichContent(card.richContent, card.plainText);
  const hasRichFormatting = segments.some(
    (s) => s.style && Object.keys(s.style).length > 0
  );

  return (
    <div
      className={`rich-text-editor-wrap ${
        hasRichFormatting ? 'has-rich-formatting' : ''
      }`}
      data-testid={`rich-text-editor-${card.id}`}
    >
      <textarea
        ref={textareaRef}
        className="card-body-textarea"
        aria-label={`${card.title} content`}
        value={card.plainText}
        onSelect={reportSelection}
        onKeyUp={reportSelection}
        onMouseUp={reportSelection}
        onChange={(e) => {
          const nextPlain = e.target.value;
          const nextRich = reconcileRichTextEdit(
            card.richContent,
            card.plainText,
            nextPlain
          );
          onChangeText(nextPlain, nextRich);
        }}
      />

      <div
        data-testid={`rich-text-display-${card.id}`}
        className="rich-text-formatted-layer"
        aria-hidden="true"
      >
        {segments.map((seg, idx) => {
          const st = seg.style;
          if (!st) {
            return <span key={idx}>{seg.text}</span>;
          }
          const decorations: string[] = [];
          if (st.underline) decorations.push('underline');
          if (st.strikethrough) decorations.push('line-through');

          const inlineStyle: React.CSSProperties = {
            ...(st.fontStyle ? { fontFamily: FONT_FAMILY_CSS[st.fontStyle] } : {}),
            ...(st.fontSize ? { fontSize: FONT_SIZE_CSS[st.fontSize] } : {}),
            ...(st.color ? { color: st.color } : {}),
            ...(st.highlight ? { backgroundColor: st.highlight } : {}),
            ...(st.bold ? { fontWeight: 700 } : {}),
            ...(st.italic ? { fontStyle: 'italic' } : {}),
            ...(decorations.length > 0 ? { textDecoration: decorations.join(' ') } : {}),
          };

          return (
            <span
              key={idx}
              className="rich-text-span"
              data-font-style={st.fontStyle}
              data-font-size={st.fontSize}
              data-underline={st.underline ? 'true' : undefined}
              data-strikethrough={st.strikethrough ? 'true' : undefined}
              style={inlineStyle}
            >
              {seg.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
