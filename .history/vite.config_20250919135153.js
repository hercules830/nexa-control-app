// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Esta sección es la clave.
    // Le dice a Vite que si no encuentra un archivo,
    // debe devolver 'index.html' para que React Router pueda manejar la ruta.
    historyApiFallback: true,
  },
  // Opcional pero recomendado: para que el build de producción también funcione
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});