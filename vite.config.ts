import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteWorkspacePlugin } from './src/storage/viteWorkspacePlugin';

export default defineConfig({
  plugins: [react(), viteWorkspacePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
