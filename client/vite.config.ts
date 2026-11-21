import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [preact()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:7777', ws: true },
      '/api': { target: 'http://localhost:7777' },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
  },
});
