import React, { useState } from 'react';
import {
  AssetRecord,
  CardData,
  CardKind,
  CaseState,
} from '../domain/types';
import {
  FolderOpen,
  Search,
  Pin,
  Archive,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

export type KindFilterOption = 'all' | CardKind;

export const KIND_FILTER_PILLS: Array<{ value: KindFilterOption; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sticky', label: 'Sticky' },
  { value: 'a4', label: 'A4' },
  { value: 'index-card', label: 'Index Card' },
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'photo', label: 'Photo' },
  { value: 'pdf-stack', label: 'PDF Stack' },
  { value: 'clipping', label: 'Clipping' },
];

export interface CaseDrawerProps {
  state: CaseState;
  onStashCard: (cardId: string) => void;
  onRestoreCard: (cardId: string) => void;
  onFocusCard: (cardId: string) => void;
  onSpawnPhotoFromAsset: (asset: AssetRecord) => void;
  onPinPdfStackFromAsset: (asset: AssetRecord) => void;
}

export function matchesCardFilter(
  card: CardData,
  searchQuery: string,
  kindFilter: KindFilterOption
): boolean {
  if (kindFilter !== 'all' && card.kind !== kindFilter) {
    return false;
  }
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    card.title.toLowerCase().includes(q) ||
    card.plainText.toLowerCase().includes(q) ||
    card.kind.toLowerCase().includes(q) ||
    (card.imageCaption ?? '').toLowerCase().includes(q)
  );
}

export function matchesAssetFilter(
  asset: AssetRecord,
  searchQuery: string,
  kindFilter: KindFilterOption
): boolean {
  const isPdf = asset.mimeType === 'application/pdf';
  if (kindFilter !== 'all') {
    if (kindFilter === 'photo') {
      if (isPdf) return false;
    } else if (kindFilter === 'pdf-stack' || kindFilter === 'clipping') {
      if (!isPdf) return false;
    } else {
      return false;
    }
  }
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    asset.filename.toLowerCase().includes(q) ||
    asset.mimeType.toLowerCase().includes(q)
  );
}

export const CaseDrawer: React.FC<CaseDrawerProps> = ({
  state,
  onStashCard,
  onRestoreCard,
  onFocusCard,
  onSpawnPhotoFromAsset,
  onPinPdfStackFromAsset,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilterOption>('all');

  const allStashedCards = state.cards.filter((c) => c.stashed);
  const filteredStashedCards = allStashedCards.filter((c) =>
    matchesCardFilter(c, searchQuery, kindFilter)
  );
  const filteredAllCards = state.cards.filter((c) =>
    matchesCardFilter(c, searchQuery, kindFilter)
  );
  const filteredAssets = state.assets.filter((a) =>
    matchesAssetFilter(a, searchQuery, kindFilter)
  );

  return (
    <aside
      data-testid="case-drawer"
      aria-label="Manila Case Drawer"
      className={`va-manila-drawer ${drawerOpen ? 'is-open' : ''}`}
    >
      <button
        type="button"
        data-testid="case-drawer-tab"
        className="va-manila-tab"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((prev) => !prev)}
        title="Toggle Manila Case Drawer"
      >
        <FolderOpen size={15} />
        <span>CASE DRAWER ({allStashedCards.length})</span>
      </button>

      <div className="va-drawer-paper">
        <header className="va-drawer-header">
          <h3>{state.caseTitle} — CASE DRAWER</h3>
          <p>
            Stash Cards off the Board without losing their yarn String connections.
          </p>
          <div className="va-search-box">
            <Search size={14} />
            <input
              type="search"
              aria-label="Search all Cards & Clippings"
              placeholder="Search all Cards & Clippings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="va-kind-filter-pills"
            role="group"
            aria-label="Filter Cards by kind"
          >
            {KIND_FILTER_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                aria-label={`Filter kind ${pill.value}`}
                aria-pressed={kindFilter === pill.value}
                className={`va-kind-pill ${
                  kindFilter === pill.value ? 'active' : ''
                }`}
                onClick={() => setKindFilter(pill.value)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </header>

        {/* Stashed in Folder Section */}
        <section
          data-testid="case-drawer-stashed-section"
          className="va-drawer-section"
        >
          <h4>STASHED IN FOLDER ({filteredStashedCards.length})</h4>
          {filteredStashedCards.length === 0 ? (
            <p className="va-empty-hint">
              No stashed Cards match. Click the archive icon on any Card to tuck it away here.
            </p>
          ) : (
            <ul className="va-card-list">
              {filteredStashedCards.map((c) => {
                const rememberedStrings = state.strings.filter(
                  (s) => s.fromCardId === c.id || s.toCardId === c.id
                ).length;
                return (
                  <li
                    key={c.id}
                    data-testid={`drawer-stashed-item-${c.id}`}
                    className="va-drawer-item stashed"
                  >
                    <div>
                      <span className="item-kind">{c.kind}</span>
                      <strong>{c.title}</strong>
                      {rememberedStrings > 0 && (
                        <small
                          data-testid={`remembered-strings-badge-${c.id}`}
                          className="remembered-badge"
                        >
                          {rememberedStrings} String(s) remembered
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      className="va-pin-back-btn"
                      onClick={() => onRestoreCard(c.id)}
                    >
                      <Pin size={13} /> Pin to Board
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Uploaded Assets Shelf */}
        <section
          data-testid="case-drawer-assets-section"
          className="va-drawer-section"
        >
          <h4>UPLOADED ASSETS ({filteredAssets.length})</h4>
          {filteredAssets.length === 0 ? (
            <p className="va-empty-hint">
              No uploaded PDF or image Assets in this Case yet.
            </p>
          ) : (
            <ul className="va-card-list">
              {filteredAssets.map((asset) => {
                const isPdf = asset.mimeType === 'application/pdf';
                return (
                  <li
                    key={asset.id}
                    data-testid={`drawer-asset-item-${asset.id}`}
                    className="va-drawer-item asset-item"
                  >
                    <div>
                      <span className="item-kind">
                        {isPdf
                          ? `PDF${asset.pageCount ? ` • ${asset.pageCount} PG` : ''}`
                          : 'IMAGE'}
                      </span>
                      <strong>{asset.filename}</strong>
                    </div>
                    {isPdf ? (
                      <button
                        type="button"
                        className="va-pin-back-btn"
                        aria-label={`Pin PDF Stack from ${asset.filename}`}
                        onClick={() => onPinPdfStackFromAsset(asset)}
                      >
                        <FileText size={12} /> Pin PDF Stack
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="va-pin-back-btn"
                        aria-label={`Pin Photo Print from ${asset.filename}`}
                        onClick={() => onSpawnPhotoFromAsset(asset)}
                      >
                        <ImageIcon size={12} /> Pin Photo Print
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* All Case Items Index */}
        <section
          data-testid="case-drawer-all-items-section"
          className="va-drawer-section"
        >
          <h4>ALL CASE ITEMS ({filteredAllCards.length})</h4>
          {filteredAllCards.length === 0 ? (
            <p className="va-empty-hint">No Cards match your current search or filter.</p>
          ) : (
            <ul className="va-card-list">
              {filteredAllCards.map((c) => (
                <li
                  key={c.id}
                  data-testid={`drawer-all-item-${c.id}`}
                  className={`va-drawer-item ${
                    state.selectedCardId === c.id ? 'selected' : ''
                  }`}
                >
                  <div
                    data-testid={`drawer-focus-card-${c.id}`}
                    className="clickable-meta"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!c.stashed) {
                        onFocusCard(c.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !c.stashed) {
                        e.preventDefault();
                        onFocusCard(c.id);
                      }
                    }}
                  >
                    <span className="item-kind">{c.kind}</span>
                    <strong>{c.title}</strong>
                  </div>
                  {c.stashed ? (
                    <button
                      type="button"
                      className="va-pin-back-btn"
                      onClick={() => onRestoreCard(c.id)}
                    >
                      <Pin size={12} /> Pin to Board
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="va-stash-btn"
                      onClick={() => onStashCard(c.id)}
                    >
                      <Archive size={12} /> Stash
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
};
