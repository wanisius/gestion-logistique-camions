import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement (`npm run dev`), l'API est relayée vers le serveur Python.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8765', changeOrigin: true } } },
})
