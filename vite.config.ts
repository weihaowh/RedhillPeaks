import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from /<repo>/ (and `vite preview` mimics it); the dev server stays at /.
  base: command === 'build' || isPreview ? '/RedhillPeaks/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  // pdf.js uses top-level await.
  build: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
}))
