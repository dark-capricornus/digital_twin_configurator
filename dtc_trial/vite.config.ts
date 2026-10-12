import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // three.js + drei are inherently large; the app is an internal desktop tool.
  build: { chunkSizeWarningLimit: 2000 },
});
