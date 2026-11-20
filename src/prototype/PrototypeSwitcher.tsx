// PROTOTYPE: Shared floating bottom switcher bar as specified in UI.md.
// Updates `?variant=` URL search param and supports Left/Right arrow keys when not focused in an input.

import React, { useEffect } from 'react';

export interface VariantMeta {
  key: 'A' | 'B' | 'C';
  name: string;
  tagline: string;
}

export const PROTOTYPE_VARIANTS: VariantMeta[] = [
  {
    key: 'A',
    name: 'Bottom Wooden Pencil Tray + Right Manila File Drawer',
    tagline: 'Auto-tucking bottom desk tray, right-edge manila folder tab, floating paper ribbon on card',
  },
  {
    key: 'B',
    name: 'Top Brass Evidence Rail + Bottom Slide-Up Evidence Box',
    tagline: 'Lamp-lit brass top rail, bottom cardboard evidence drawer, stamped right inspector plate',
  },
  {
    key: 'C',
    name: 'Zero-Chrome Immersion + Corner Case Dossier + Radial Stamp',
    tagline: '99% bare board, top-left dossier clip, right-click or corner stamp dial to spawn & annotate',
  },
];

interface PrototypeSwitcherProps {
  current: 'A' | 'B' | 'C';
  onSelect: (next: 'A' | 'B' | 'C') => void;
  cardCountOnBoard: number;
  stashedCount: number;
  stringCount: number;
  mode: 'bounded' | 'infinite';
}

export const PrototypeSwitcher: React.FC<PrototypeSwitcherProps> = ({
  current,
  onSelect,
  cardCountOnBoard,
  stashedCount,
  stringCount,
  mode,
}) => {
  // Hidden in production builds per UI.md
  if (import.meta.env.PROD) return null;

  const idx = PROTOTYPE_VARIANTS.findIndex((v) => v.key === current);
  const currentMeta = PROTOTYPE_VARIANTS[idx] ?? PROTOTYPE_VARIANTS[0];

  const cycle = (dir: -1 | 1) => {
    const nextIdx =
      (idx + dir + PROTOTYPE_VARIANTS.length) % PROTOTYPE_VARIANTS.length;
    onSelect(PROTOTYPE_VARIANTS[nextIdx].key);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cycle(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        cycle(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="prototype-switcher-bar" role="region" aria-label="Prototype Variant Switcher">
      <button
        type="button"
        className="proto-arrow-btn"
        onClick={() => cycle(-1)}
        title="Previous variant (←)"
      >
        ←
      </button>

      <div className="proto-variant-info">
        <div className="proto-variant-title">
          <span className="proto-badge">PROTOTYPE</span>
          <strong>
            {currentMeta.key} ({currentMeta.name})
          </strong>
        </div>
        <div className="proto-state-readout">
          <span>Mode: {mode}</span>
          <span>•</span>
          <span>Pinned: {cardCountOnBoard} Cards</span>
          <span>•</span>
          <span>Stashed: {stashedCount}</span>
          <span>•</span>
          <span>Strings: {stringCount}</span>
        </div>
      </div>

      <button
        type="button"
        className="proto-arrow-btn"
        onClick={() => cycle(1)}
        title="Next variant (→)"
      >
        →
      </button>
    </div>
  );
};
