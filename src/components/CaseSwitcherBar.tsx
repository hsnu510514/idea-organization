import React, { useRef, useState } from 'react';
import { CaseSummary } from '../domain/types';
import {
  Download,
  FolderPlus,
  HardDrive,
  Trash2,
  Upload,
  Briefcase,
} from 'lucide-react';
import { isFileSystemAccessSupported } from '../storage/fileSystemAccessAdapter';

export interface CaseSwitcherBarProps {
  caseSlug: string;
  caseTitle: string;
  cases: CaseSummary[];
  onSwitchCase: (targetSlug: string) => void;
  onCreateNewCase: () => void;
  onRenameCase: (newTitle: string) => void;
  onDeleteCase: (targetSlug: string) => void;
  onExportCaseZip: () => void;
  onImportCaseZip: (file: File) => void;
  onMountLocalFolder?: () => void;
}

export const CaseSwitcherBar: React.FC<CaseSwitcherBarProps> = ({
  caseSlug,
  caseTitle,
  cases,
  onSwitchCase,
  onCreateNewCase,
  onRenameCase,
  onDeleteCase,
  onExportCaseZip,
  onImportCaseZip,
  onMountLocalFolder,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const canMountDirectory =
    typeof onMountLocalFolder === 'function' && isFileSystemAccessSupported();

  const ensuredCases = cases.some((c) => c.caseSlug === caseSlug)
    ? cases
    : [{ caseSlug, caseTitle }, ...cases];

  return (
    <header
      data-testid="case-switcher-bar"
      className="va-case-switcher-bar"
      aria-label="Detective Case Switcher"
    >
      <div className="va-case-switcher-group">
        <span className="va-case-badge">
          <Briefcase size={13} />
          <span>CASE FILE</span>
        </span>
        <select
          aria-label="Switch active Case"
          className="va-case-select"
          value={caseSlug}
          onChange={(e) => {
            setConfirmingDelete(false);
            onSwitchCase(e.target.value);
          }}
        >
          {ensuredCases.map((c) => (
            <option key={c.caseSlug} value={c.caseSlug}>
              {c.caseTitle} ({c.caseSlug})
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label="Active Case title"
          className="va-case-title-input"
          value={caseTitle}
          onChange={(e) => onRenameCase(e.target.value)}
        />
      </div>

      <div className="va-case-switcher-actions">
        <button
          type="button"
          className="va-case-action-btn"
          aria-label="New Case"
          title="Create a new Case in the Workspace"
          onClick={() => {
            setConfirmingDelete(false);
            onCreateNewCase();
          }}
        >
          <FolderPlus size={13} />
          <span>+ New Case</span>
        </button>

        {!confirmingDelete ? (
          <button
            type="button"
            className="va-case-action-btn danger"
            aria-label="Delete Case"
            title="Delete current Case"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={13} />
            <span>Delete Case</span>
          </button>
        ) : (
          <span className="va-case-delete-confirm">
            <button
              type="button"
              className="va-case-action-btn danger-confirm"
              aria-label="Confirm Delete Case"
              onClick={() => {
                setConfirmingDelete(false);
                onDeleteCase(caseSlug);
              }}
            >
              Confirm Delete
            </button>
            <button
              type="button"
              className="va-case-action-btn"
              aria-label="Cancel Delete Case"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
          </span>
        )}

        <span className="va-divider" />

        <button
          type="button"
          className="va-case-action-btn"
          aria-label="Export .case.zip"
          title="Export Case (board.json + assets/) as a self-contained .case.zip archive"
          onClick={onExportCaseZip}
        >
          <Download size={13} />
          <span>Export .case.zip</span>
        </button>

        <button
          type="button"
          className="va-case-action-btn"
          aria-label="Import .case.zip"
          title="Import a .case.zip archive into the Workspace"
          onClick={() => zipInputRef.current?.click()}
        >
          <Upload size={13} />
          <span>Import .case.zip</span>
        </button>
        <input
          ref={zipInputRef}
          data-testid="case-zip-import-input"
          type="file"
          accept=".zip,.case.zip,application/zip"
          className="visually-hidden"
          aria-label="Import .case.zip file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportCaseZip(file);
              e.target.value = '';
            }
          }}
        />

        {canMountDirectory && (
          <button
            type="button"
            className="va-case-action-btn"
            aria-label="Mount Local Workspace Folder"
            title="Mount a local directory on disk using File System Access API"
            onClick={onMountLocalFolder}
          >
            <HardDrive size={13} />
            <span>Mount Local Workspace Folder</span>
          </button>
        )}
      </div>
    </header>
  );
};
