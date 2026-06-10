import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Content-Security-Policy for the app shell. Injected at BUILD time only
// (dev needs inline scripts for React refresh). This is the policy enforced
// inside the Capacitor WebView, where server response headers don't exist:
// network egress is limited to the app itself + Supabase (HTTPS/WSS);
// 'unsafe-inline' is granted to styles only (React inline style attributes).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const injectCsp = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      // Only the app shell (what ships in the APK). Marketing/legal pages load
      // Google Fonts and inline scripts, so the policy would break them.
      if (!ctx.filename.endsWith('index.html')) return html;
      return html.replace(
        '<meta charset="utf-8">',
        `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
      );
    },
  },
};

// Two entries:
//   index.html — minimal app shell, this is what gets bundled into the APK
//   demo.html  — interactive marketing prototype with narrative pane
// Build emits both into dist/. Capacitor only references dist/index.html.
export default defineConfig({
  plugins: [react(), injectCsp],
  server: { port: 5173, host: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // No source maps in production artifacts — dist/ is packaged verbatim into
    // the APK; maps would ship the full app source to every device.
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        prototype: resolve(__dirname, 'prototype.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        deleteAccount: resolve(__dirname, 'delete-account.html'),
      },
    },
  },
});
