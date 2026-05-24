import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite serves index.html as entry. Build → dist/. Capacitor's webDir points to dist/.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
});
