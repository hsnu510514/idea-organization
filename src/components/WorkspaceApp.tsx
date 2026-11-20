import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  AssetRecord,
  CaseState,
  CaseSummary,
  WorkspaceStorageAdapter,
} from '../domain/types';
import {
  caseActions,
  caseReducer,
  createInitialCaseState,
} from '../domain/caseStore';
import { inMemoryWorkspaceAdapter } from '../storage/inMemoryWorkspaceAdapter';
import { promptAndMountWorkspaceDirectory } from '../storage/fileSystemAccessAdapter';
import { BoardSurface } from './BoardSurface';
import { WoodenPencilTray } from './WoodenPencilTray';
import { PdfImportSheet } from './PdfImportSheet';
import { inspectPdfPageCount } from './PdfPageCanvas';
import { CaseDrawer } from './CaseDrawer';
import { CaseSwitcherBar } from './CaseSwitcherBar';

export interface WorkspaceAppProps {
  storage?: WorkspaceStorageAdapter;
  initialCase?: CaseState;
}

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({
  storage = inMemoryWorkspaceAdapter,
  initialCase,
}) => {
  const [activeStorage, setActiveStorage] =
    useState<WorkspaceStorageAdapter>(storage);

  useEffect(() => {
    setActiveStorage(storage);
  }, [storage]);

  const [state, dispatch] = useReducer(
    caseReducer,
    initialCase ?? createInitialCaseState()
  );

  const [cases, setCases] = useState<CaseSummary[]>(() =>
    storage.peekCases
      ? storage.peekCases()
      : [
          {
            caseSlug: (initialCase ?? createInitialCaseState()).caseSlug,
            caseTitle: (initialCase ?? createInitialCaseState()).caseTitle,
          },
        ]
  );
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [pendingPdfImport, setPendingPdfImport] = useState<AssetRecord | null>(
    null
  );

  const refreshCaseList = useCallback(async () => {
    const list = await activeStorage.listCases();
    setCases((prev) => {
      if (
        prev.length === list.length &&
        prev.every(
          (item, idx) =>
            item.caseSlug === list[idx]?.caseSlug &&
            item.caseTitle === list[idx]?.caseTitle
        )
      ) {
        return prev;
      }
      return list;
    });
  }, [activeStorage]);

  useEffect(() => {
    void activeStorage.saveCase(state.caseSlug, state);
    setCases((prev) => {
      const exists = prev.some((c) => c.caseSlug === state.caseSlug);
      if (!exists) {
        return [
          ...prev,
          { caseSlug: state.caseSlug, caseTitle: state.caseTitle },
        ];
      }
      const current = prev.find((c) => c.caseSlug === state.caseSlug);
      if (current && current.caseTitle === state.caseTitle) {
        return prev;
      }
      return prev.map((c) =>
        c.caseSlug === state.caseSlug
          ? { ...c, caseTitle: state.caseTitle }
          : c
      );
    });
  }, [activeStorage, state]);

  useEffect(() => {
    if (state.assets.length === 0) return;
    let active = true;
    const loadUrls = async () => {
      const entries: Record<string, string> = {};
      for (const asset of state.assets) {
        const url = await activeStorage.loadAssetUrl(
          state.caseSlug,
          asset.relativePath
        );
        entries[asset.id] = url;
      }
      if (active) {
        setAssetUrls((prev) => ({ ...prev, ...entries }));
      }
    };
    void loadUrls();
    return () => {
      active = false;
    };
  }, [activeStorage, state.caseSlug, state.assets]);

  const handleSwitchCase = async (targetSlug: string) => {
    if (targetSlug === state.caseSlug) return;
    await activeStorage.saveCase(state.caseSlug, state);
    const loaded = await activeStorage.loadCase(targetSlug);
    if (loaded) {
      dispatch(caseActions.loadCase(loaded));
      await refreshCaseList();
    }
  };

  const handleCreateNewCase = async () => {
    await activeStorage.saveCase(state.caseSlug, state);
    const existingList = await activeStorage.listCases();
    const nextNumber = existingList.length + 101;
    const uniqueSuffix = Date.now().toString(36).slice(-4);
    const newSlug = `case-${nextNumber}-${uniqueSuffix}`;
    const newCase = createInitialCaseState({
      caseSlug: newSlug,
      caseTitle: `CASE #${nextNumber} — NEW INVESTIGATION`,
      cards: [],
      strings: [],
      assets: [],
      boardAnnotations: [],
    });
    await activeStorage.saveCase(newSlug, newCase);
    dispatch(caseActions.loadCase(newCase));
    await refreshCaseList();
  };

  const handleRenameCase = (newTitle: string) => {
    dispatch(caseActions.setCaseTitle(newTitle));
  };

  const handleDeleteCase = async (targetSlug: string) => {
    await activeStorage.deleteCase(targetSlug);
    const remaining = await activeStorage.listCases();
    const fallbackSummary = remaining.find((c) => c.caseSlug !== targetSlug);
    if (fallbackSummary) {
      const loaded = await activeStorage.loadCase(fallbackSummary.caseSlug);
      if (loaded) {
        dispatch(caseActions.loadCase(loaded));
        setCases(remaining);
        return;
      }
    }
    const freshDefault = createInitialCaseState({
      caseSlug: 'case-101-fresh',
      caseTitle: 'CASE #101 — FRESH INVESTIGATION',
      cards: [],
      strings: [],
      assets: [],
      boardAnnotations: [],
    });
    await activeStorage.saveCase(freshDefault.caseSlug, freshDefault);
    dispatch(caseActions.loadCase(freshDefault));
    await refreshCaseList();
  };

  const handleExportCaseZip = async () => {
    await activeStorage.saveCase(state.caseSlug, state);
    const zipBlob = await activeStorage.exportCaseZip(state.caseSlug);
    if (
      typeof document !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    ) {
      try {
        const url = URL.createObjectURL(zipBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${state.caseSlug}.case.zip`;
        anchor.click();
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      } catch {
        // Ignore in headless test environment
      }
    }
  };

  const handleImportCaseZip = async (zipFile: File) => {
    await activeStorage.saveCase(state.caseSlug, state);
    const importedCase = await activeStorage.importCaseZip(zipFile);
    dispatch(caseActions.loadCase(importedCase));
    await refreshCaseList();
  };

  const handleMountLocalFolder = async () => {
    try {
      const fsaAdapter = await promptAndMountWorkspaceDirectory();
      setActiveStorage(fsaAdapter);
      const list = await fsaAdapter.listCases();
      if (list.length > 0) {
        const firstLoaded = await fsaAdapter.loadCase(list[0].caseSlug);
        if (firstLoaded) {
          dispatch(caseActions.loadCase(firstLoaded));
          setCases(list);
          return;
        }
      }
      await fsaAdapter.saveCase(state.caseSlug, state);
      setCases(await fsaAdapter.listCases());
    } catch {
      // User cancelled directory picker
    }
  };

  const handleUploadPhoto = async (file: File) => {
    const record = await activeStorage.saveAsset(
      state.caseSlug,
      file,
      file.name
    );
    const url = await activeStorage.loadAssetUrl(
      state.caseSlug,
      record.relativePath
    );
    setAssetUrls((prev) => ({ ...prev, [record.id]: url }));
    dispatch(caseActions.registerAsset(record));
    dispatch(
      caseActions.spawnCard({
        kind: 'photo',
        title: file.name,
        assetId: record.id,
        imageCaption: file.name,
      })
    );
  };

  const handleUploadPdf = async (file: File) => {
    const savedRecord = await activeStorage.saveAsset(
      state.caseSlug,
      file,
      file.name
    );
    const pageCount = await inspectPdfPageCount(file, savedRecord.id);
    const recordWithPages: AssetRecord = {
      ...savedRecord,
      pageCount,
    };
    const url = await activeStorage.loadAssetUrl(
      state.caseSlug,
      recordWithPages.relativePath
    );
    setAssetUrls((prev) => ({ ...prev, [recordWithPages.id]: url }));
    dispatch(caseActions.registerAsset(recordWithPages));
    setPendingPdfImport(recordWithPages);
  };

  return (
    <div className="variant-shell variant-a">
      <CaseSwitcherBar
        caseSlug={state.caseSlug}
        caseTitle={state.caseTitle}
        cases={cases}
        onSwitchCase={(slug) => void handleSwitchCase(slug)}
        onCreateNewCase={() => void handleCreateNewCase()}
        onRenameCase={handleRenameCase}
        onDeleteCase={(slug) => void handleDeleteCase(slug)}
        onExportCaseZip={() => void handleExportCaseZip()}
        onImportCaseZip={(file) => void handleImportCaseZip(file)}
        onMountLocalFolder={() => void handleMountLocalFolder()}
      />
      <BoardSurface state={state} dispatch={dispatch} assetUrls={assetUrls} />
      <CaseDrawer
        state={state}
        onStashCard={(cardId) => dispatch(caseActions.stashCard(cardId))}
        onRestoreCard={(cardId) => dispatch(caseActions.restoreCard(cardId))}
        onFocusCard={(cardId) =>
          dispatch(
            caseActions.focusCard({
              cardId,
              viewportWidth: window.innerWidth || 1200,
              viewportHeight: window.innerHeight || 800,
            })
          )
        }
        onSpawnPhotoFromAsset={(asset) =>
          dispatch(
            caseActions.spawnCard({
              kind: 'photo',
              title: asset.filename,
              assetId: asset.id,
              imageCaption: asset.filename,
            })
          )
        }
        onPinPdfStackFromAsset={(asset) => setPendingPdfImport(asset)}
      />
      {pendingPdfImport && (
        <PdfImportSheet
          asset={pendingPdfImport}
          onCancel={() => setPendingPdfImport(null)}
          onConfirm={(range) => {
            dispatch(
              caseActions.spawnCard({
                kind: 'pdf-stack',
                title: pendingPdfImport.filename,
                assetId: pendingPdfImport.id,
                pdfPageRange: range,
                currentPageIndex: 0,
              })
            );
            setPendingPdfImport(null);
          }}
        />
      )}
      <WoodenPencilTray
        state={state}
        onSpawnCard={(kind) => dispatch(caseActions.spawnCard({ kind }))}
        onUploadPhoto={(file) => void handleUploadPhoto(file)}
        onUploadPdf={(file) => void handleUploadPdf(file)}
        onSetActiveTool={(tool) => dispatch(caseActions.setActiveTool(tool))}
        onSetYarnColor={(color) => dispatch(caseActions.setYarnColor(color))}
        onAlignAll={() => dispatch(caseActions.alignAllCards())}
        onToggleMode={() => dispatch(caseActions.toggleMode())}
      />
    </div>
  );
};
