import React, { useEffect, useReducer, useState } from 'react';
import { AssetRecord, CaseState, WorkspaceStorageAdapter } from '../domain/types';
import {
  caseActions,
  caseReducer,
  createInitialCaseState,
} from '../domain/caseStore';
import { inMemoryWorkspaceAdapter } from '../storage/inMemoryWorkspaceAdapter';
import { BoardSurface } from './BoardSurface';
import { WoodenPencilTray } from './WoodenPencilTray';
import { PdfImportSheet } from './PdfImportSheet';
import { inspectPdfPageCount } from './PdfPageCanvas';
import { CaseDrawer } from './CaseDrawer';

export interface WorkspaceAppProps {
  storage?: WorkspaceStorageAdapter;
  initialCase?: CaseState;
}

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({
  storage = inMemoryWorkspaceAdapter,
  initialCase,
}) => {
  const [state, dispatch] = useReducer(
    caseReducer,
    initialCase ?? createInitialCaseState()
  );

  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [pendingPdfImport, setPendingPdfImport] = useState<AssetRecord | null>(
    null
  );

  useEffect(() => {
    void storage.saveCase(state.caseSlug, state);
  }, [storage, state]);

  useEffect(() => {
    let active = true;
    const loadUrls = async () => {
      const entries: Record<string, string> = {};
      for (const asset of state.assets) {
        const url = await storage.loadAssetUrl(state.caseSlug, asset.relativePath);
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
  }, [storage, state.caseSlug, state.assets]);

  const handleUploadPhoto = async (file: File) => {
    const record = await storage.saveAsset(state.caseSlug, file, file.name);
    const url = await storage.loadAssetUrl(state.caseSlug, record.relativePath);
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
    const savedRecord = await storage.saveAsset(state.caseSlug, file, file.name);
    const pageCount = await inspectPdfPageCount(file, savedRecord.id);
    const recordWithPages: AssetRecord = {
      ...savedRecord,
      pageCount,
    };
    const url = await storage.loadAssetUrl(
      state.caseSlug,
      recordWithPages.relativePath
    );
    setAssetUrls((prev) => ({ ...prev, [recordWithPages.id]: url }));
    dispatch(caseActions.registerAsset(recordWithPages));
    setPendingPdfImport(recordWithPages);
  };

  return (
    <div className="variant-shell variant-a">
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
