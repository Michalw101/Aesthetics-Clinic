import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // npm run dev: Vite על 3000, בקאנד מקומי בדרך כלל על 8000 (ראו README)
  const devBackend =
    process.env.VITE_DEV_BACKEND_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': { target: devBackend, changeOrigin: true },
        '/add_data': { target: devBackend, changeOrigin: true },
      },
    },
  };
});
