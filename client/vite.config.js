import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const API = process.env.VITE_API_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../shared') },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': API,
      '/uploads': API,
      '/socket.io': { target: API, ws: true },
    },
  },
});
