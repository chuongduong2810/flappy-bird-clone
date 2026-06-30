import { defineConfig } from 'vite';
import { adminApiPlugin } from './vite-admin-api.js';

export default defineConfig({
  base: './',
  plugins: [adminApiPlugin()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    target: 'es2018',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
  server: {
    open: true,
    port: 5173,
  },
});
