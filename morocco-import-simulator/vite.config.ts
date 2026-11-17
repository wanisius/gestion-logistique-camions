import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:standalone` produit un unique fichier HTML ouvrable par double-clic (sans serveur).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'standalone' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'standalone' ? { outDir: 'dist-standalone' } : undefined,
}));
