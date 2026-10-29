import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativo: funciona localmente e em qualquer subcaminho do GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
})
