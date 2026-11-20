// PROTOTYPE: Three variants of the Murder Board workspace, switchable via `?variant=A|B|C`, on the main `/` route.

import React, { useEffect, useState } from 'react';
import {
  BoardState,
  CardData,
  CardKind,
  INITIAL_CARDS,
  INITIAL_STRINGS,
} from './prototype/types';
import { VariantA, VariantProps } from './prototype/VariantA';
import { VariantB } from './prototype/VariantB';
import { VariantC } from './prototype/VariantC';
import { PrototypeSwitcher } from './prototype/PrototypeSwitcher';

function randomSkew(): number {
  const angle = (Math.random() * 11 - 5.5).toFixed(1);
  const num = Number(angle);
  return Math.abs(num) < 1.2 ? 2.4 : num;
}

export const App: React.FC = () => {
  const getInitialVariant = (): 'A' | 'B' | 'C' => {
    const param = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
    if (param === 'B' || param === 'C') return param;
    return 'A';
  };

  const [variant, setVariant] = useState<'A' | 'B' | 'C'>(getInitialVariant);

  useEffect(() => {
    const onPopState = () => setVariant(getInitialVariant());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const selectVariant = (next: 'A' | 'B' | 'C') => {
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState({}, '', url.toString());
    setVariant(next);
  };

  const [state, setState] = useState<BoardState>({
    caseTitle: 'CASE #409 — PIER 14 HARBOR INVESTIGATION',
    mode: 'bounded',
    frameWidth: 1140,
    frameHeight: 680,
    panX: 60,
    panY: 48,
    zoom: 1,
    cards: INITIAL_CARDS,
    strings: INITIAL_STRINGS,
    selectedCardId: 'card-coroner-a4',
    hoveredCardId: null,
    activeTool: 'select',
    activeYarnColor: '#A11D21',
    activeInkColor: '#A11D21',
  });

  const handleSpawnCard = (kind: CardKind, customX?: number, customY?: number) => {
    const id = `card-${Date.now()}`;
    const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
    const x =
      customX !== undefined
        ? Math.round(customX - 110)
        : Math.round(260 + (Math.random() * 240 - 120));
    const y =
      customY !== undefined
        ? Math.round(customY - 90)
        : Math.round(180 + (Math.random() * 160 - 80));

    const presets: Record<CardKind, Partial<CardData>> = {
      sticky: {
        title: 'Field Note',
        content: 'Double-check dock camera blind spot near warehouse 3.',
        width: 210,
        height: 190,
        paperColor: 'yellow',
        fontStyle: 'handwriting',
        fontSize: 'lg',
      },
      a4: {
        title: 'SUPPLEMENTAL REPORT — LAB #19',
        content:
          ' Ballistics & fiber analysis confirms wool fibers on the padlock match a standard merchant marine peacoat.',
        width: 295,
        height: 340,
        paperColor: 'cream',
        fontStyle: 'typewriter',
        fontSize: 'sm',
      },
      'index-card': {
        title: 'INTERVIEW: Night Watchman',
        content: 'Heard engine backfire at 02:27 AM heading toward Lower Bridge.',
        width: 255,
        height: 180,
        paperColor: 'white',
        fontStyle: 'handwriting',
        fontSize: 'md',
      },
      newspaper: {
        title: 'DAILY GAZETTE CLIPPING',
        content: 'HARBOR AUTHORITY ANNOUNCES EMERGENCY AUDIT OF SLIP B LEASES.',
        width: 255,
        height: 225,
        paperColor: 'aged',
        fontStyle: 'serif',
        fontSize: 'sm',
      },
      photo: {
        title: 'Evidence Photograph',
        content: '',
        width: 235,
        height: 265,
        paperColor: 'white',
        fontStyle: 'handwriting',
        fontSize: 'md',
        imageUrl:
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        imageCaption: 'Cargo Hold #3 Brass Lock • 05:50 AM',
      },
      'pdf-stack': {
        title: 'Phone_Subpoena_Records.pdf',
        content: '',
        width: 290,
        height: 260,
        paperColor: 'white',
        fontStyle: 'typewriter',
        fontSize: 'sm',
        currentPage: 0,
        pdfPages: [
          'PAGE 1 / 2 — SUBPOENA TELECOM LOG\nLine:Pier-14-Payphone\n02:23 AM -> (555) 019-2831 (Duration: 184s)',
          'PAGE 2 / 2 — SUBSCRIBER LOOKUP\n(555) 019-2831 registered to E. Thorne, 42 Maritime Way.',
        ],
      },
      clipping: {
        title: 'PDF Excerpt Clipping',
        content: 'Cropped excerpt from PDF page.',
        width: 240,
        height: 165,
        paperColor: 'cream',
        fontStyle: 'typewriter',
        fontSize: 'sm',
      },
    };

    const preset = presets[kind];
    const newCard: CardData = {
      id,
      kind,
      title: preset.title ?? 'New Evidence',
      content: preset.content ?? '',
      x,
      y,
      width: preset.width ?? 240,
      height: preset.height ?? 200,
      skew: randomSkew(),
      zIndex: maxZ + 1,
      stashed: false,
      paperColor: preset.paperColor ?? 'cream',
      fontStyle: preset.fontStyle ?? 'typewriter',
      fontSize: preset.fontSize ?? 'md',
      textColor: '#1E1A17',
      pins: [{ id: `pin-${Date.now()}`, rx: 50, ry: 9, color: 'red' }],
      annotations: [],
      imageUrl: preset.imageUrl,
      imageCaption: preset.imageCaption,
      pdfPages: preset.pdfPages,
      currentPage: preset.currentPage,
    };

    setState((prev) => ({
      ...prev,
      selectedCardId: id,
      cards: [...prev.cards, newCard],
    }));
  };

  const handleTearOutPdfPage = (pdfCard: CardData) => {
    const pageIdx = pdfCard.currentPage ?? 0;
    const pageText = pdfCard.pdfPages?.[pageIdx] ?? '';
    const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
    const newId = `card-page-${Date.now()}`;
    const newPinId = `pin-${Date.now()}`;

    const tornCard: CardData = {
      id: newId,
      kind: 'a4',
      title: `${pdfCard.title} — Page ${pageIdx + 1}`,
      content: pageText,
      x: pdfCard.x + pdfCard.width + 28,
      y: pdfCard.y + 15,
      width: 270,
      height: 240,
      skew: randomSkew(),
      zIndex: maxZ + 1,
      stashed: false,
      paperColor: 'white',
      fontStyle: 'typewriter',
      fontSize: 'sm',
      textColor: '#1E1A17',
      pins: [{ id: newPinId, rx: 50, ry: 9, color: 'brass' }],
      annotations: [],
      sourcePdfTitle: pdfCard.title,
    };

    setState((prev) => ({
      ...prev,
      selectedCardId: newId,
      cards: [...prev.cards, tornCard],
      strings: [
        ...prev.strings,
        {
          id: `str-${Date.now()}`,
          fromCardId: pdfCard.id,
          fromPinId: pdfCard.pins[0].id,
          toCardId: newId,
          toPinId: newPinId,
          color: '#D49A2A',
          label: `Pulled Pg ${pageIdx + 1}`,
        },
      ],
    }));
  };

  const handleSnipPdfRegion = (pdfCard: CardData) => {
    const pageIdx = pdfCard.currentPage ?? 0;
    const pageText = pdfCard.pdfPages?.[pageIdx] ?? '';
    const lines = pageText.split('\n').filter(Boolean);
    const snippet = lines.slice(1).join('\n') || pageText;
    const maxZ = state.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
    const newId = `card-snip-${Date.now()}`;
    const newPinId = `pin-${Date.now()}`;

    const snipCard: CardData = {
      id: newId,
      kind: 'clipping',
      title: `SNIPPET // ${pdfCard.title} (Pg ${pageIdx + 1})`,
      content: `✂ "${snippet}"`,
      x: pdfCard.x - 40,
      y: pdfCard.y + pdfCard.height + 24,
      width: 260,
      height: 165,
      skew: randomSkew(),
      zIndex: maxZ + 1,
      stashed: false,
      paperColor: 'cream',
      fontStyle: 'typewriter',
      fontSize: 'sm',
      textColor: '#1E1A17',
      highlightColor: 'rgba(212, 154, 42, 0.3)',
      pins: [{ id: newPinId, rx: 50, ry: 11, color: 'red' }],
      annotations: [
        { id: `ann-${Date.now()}`, kind: 'circle', color: '#A11D21', x: 10, y: 40, w: 80, h: 42 },
      ],
      sourcePdfTitle: pdfCard.title,
    };

    setState((prev) => ({
      ...prev,
      selectedCardId: newId,
      cards: [...prev.cards, snipCard],
      strings: [
        ...prev.strings,
        {
          id: `str-${Date.now()}`,
          fromCardId: pdfCard.id,
          fromPinId: pdfCard.pins[0].id,
          toCardId: newId,
          toPinId: newPinId,
          color: '#A11D21',
          label: 'Snipped excerpt',
        },
      ],
    }));
  };

  const handleStashCard = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCardId: prev.selectedCardId === cardId ? null : prev.selectedCardId,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, stashed: true } : c)),
    }));
  };

  const handleRestoreCard = (cardId: string) => {
    setState((prev) => {
      const maxZ = prev.cards.reduce((m, c) => Math.max(m, c.zIndex), 1);
      return {
        ...prev,
        selectedCardId: cardId,
        cards: prev.cards.map((c) =>
          c.id === cardId ? { ...c, stashed: false, zIndex: maxZ + 1 } : c
        ),
      };
    });
  };

  const handleDeleteCard = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      selectedCardId: prev.selectedCardId === cardId ? null : prev.selectedCardId,
      cards: prev.cards.filter((c) => c.id !== cardId),
      strings: prev.strings.filter(
        (s) => s.fromCardId !== cardId && s.toCardId !== cardId
      ),
    }));
  };

  const handleStraightenCard = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, skew: 0 } : c)),
    }));
  };

  const handleBulkStraighten = () => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => ({ ...c, skew: 0 })),
    }));
  };

  const handleAddPinToCard = (cardId: string) => {
    const colors: Array<'red' | 'brass' | 'black' | 'blue'> = [
      'red',
      'brass',
      'blue',
      'black',
    ];
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => {
        if (c.id !== cardId) return c;
        const nextIdx = c.pins.length;
        const rx = Math.min(88, 22 + ((nextIdx * 23) % 65));
        const ry = nextIdx % 2 === 1 ? 85 : 12;
        return {
          ...c,
          pins: [
            ...c.pins,
            {
              id: `pin-${Date.now()}`,
              rx,
              ry,
              color: colors[nextIdx % colors.length],
            },
          ],
        };
      }),
    }));
  };

  const handleRemoveString = (stringId: string) => {
    setState((prev) => ({
      ...prev,
      strings: prev.strings.filter((s) => s.id !== stringId),
    }));
  };

  const handleUpdateCardStyle: VariantProps['onUpdateCardStyle'] = (
    cardId,
    patch
  ) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }));
  };

  const handleClearCardAnnotations = (cardId: string) => {
    setState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === cardId ? { ...c, annotations: [] } : c
      ),
    }));
  };

  const sharedProps: VariantProps = {
    state,
    setState,
    onSpawnCard: handleSpawnCard,
    onTearOutPdfPage: handleTearOutPdfPage,
    onSnipPdfRegion: handleSnipPdfRegion,
    onStashCard: handleStashCard,
    onRestoreCard: handleRestoreCard,
    onDeleteCard: handleDeleteCard,
    onStraightenCard: handleStraightenCard,
    onBulkStraighten: handleBulkStraighten,
    onAddPinToCard: handleAddPinToCard,
    onRemoveString: handleRemoveString,
    onUpdateCardStyle: handleUpdateCardStyle,
    onClearCardAnnotations: handleClearCardAnnotations,
  };

  const pinnedCount = state.cards.filter((c) => !c.stashed).length;
  const stashedCount = state.cards.filter((c) => c.stashed).length;

  return (
    <>
      {variant === 'A' && <VariantA {...sharedProps} />}
      {variant === 'B' && <VariantB {...sharedProps} />}
      {variant === 'C' && <VariantC {...sharedProps} />}

      <PrototypeSwitcher
        current={variant}
        onSelect={selectVariant}
        cardCountOnBoard={pinnedCount}
        stashedCount={stashedCount}
        stringCount={state.strings.length}
        mode={state.mode}
      />
    </>
  );
};
