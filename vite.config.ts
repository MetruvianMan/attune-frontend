import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3002,
    open: false,
    host: true, // Expose on LAN so phones on same wifi can access
  },
  resolve: {
    alias: {
      '@src': path.resolve(import.meta.dirname, 'src'),
      '@tests': path.resolve(import.meta.dirname, 'tests'),
    },
  },
});
