// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url'; // <-- 1. AÑADE ESTE IMPORT

// --- 2. AÑADE ESTAS DOS LÍNEAS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  resolve: {
    alias: {
      // Ahora '__dirname' está definido y funciona correctamente
      '@': path.resolve(__dirname, './src'),
    },
  },
});