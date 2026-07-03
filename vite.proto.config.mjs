// Config for the single-file clickable prototype (npm run prototype:file).
// Builds demo.html as one JS chunk into dist-proto/ so
// scripts/build-prototype.mjs can inline everything into a single HTML file.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-proto',
    emptyOutDir: true,
    sourcemap: false,
    modulePreload: false,
    rollupOptions: {
      input: resolve(__dirname, 'demo.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
