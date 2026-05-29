import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Two entries:
//   index.html — minimal app shell, this is what gets bundled into the APK
//   demo.html  — interactive marketing prototype with narrative pane
// Build emits both into dist/. Capacitor only references dist/index.html.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
});
