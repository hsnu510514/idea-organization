import React, { useEffect, useReducer } from 'react';
import { CaseState, WorkspaceStorageAdapter } from '../domain/types';
import {
  caseActions,
  caseReducer,
  createInitialCaseState,
} from '../domain/caseStore';
import { inMemoryWorkspaceAdapter } from '../storage/inMemoryWorkspaceAdapter';
import { BoardSurface } from './BoardSurface';
import { WoodenPencilTray } from './WoodenPencilTray';

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

  useEffect(() => {
    void storage.saveCase(state.caseSlug, state);
  }, [storage, state]);

  return (
    <div className="variant-shell variant-a">
      <BoardSurface state={state} dispatch={dispatch} />
      <WoodenPencilTray
        state={state}
        onSpawnCard={(kind) => dispatch(caseActions.spawnCard({ kind }))}
        onSetActiveTool={(tool) => dispatch(caseActions.setActiveTool(tool))}
        onSetYarnColor={(color) => dispatch(caseActions.setYarnColor(color))}
        onAlignAll={() => dispatch(caseActions.alignAllCards())}
        onToggleMode={() => dispatch(caseActions.toggleMode())}
      />
    </div>
  );
};
