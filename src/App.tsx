import React from 'react';
import { WorkspaceApp } from './components/WorkspaceApp';
import { defaultWorkspaceAdapter } from './storage/localDiskWorkspaceAdapter';

export const App: React.FC = () => {
  return <WorkspaceApp storage={defaultWorkspaceAdapter} autoSaveDebounceMs={120} />;
};

export default App;
