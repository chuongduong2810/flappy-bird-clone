import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the production build works from any sub-path
  // (e.g. GitHub Pages project sites) when opened directly.
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0, // keep sprite/audio files as real files
    target: 'es2018',
  },
  server: {
    open: true,
    port: 5173,
  },
});
