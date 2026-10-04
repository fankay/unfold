import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chineseFontPlugin } from './scripts/excalidraw-font-plugin.mjs';
import { mindMapDeletionPlugin } from './scripts/excalidraw-mindmap-plugin.mjs';
export default defineConfig({
  plugins: [react(), chineseFontPlugin(), mindMapDeletionPlugin()],
  // Keep the app and registry adapter on the same Excalidraw module instance.
  optimizeDeps: { include: ['@excalidraw/excalidraw', 'unfold-excalidraw-core'] },
  server: { port: 5173 },
});
