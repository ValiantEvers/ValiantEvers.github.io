import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploys under evers.no/nb-watch/.
// Build-output havner i søsken-mappen ../nb-watch/, som er det GitHub Pages
// serverer fra. Mønsteret speiler pensjonskalkulator-src/.
export default defineConfig({
  base: '/nb-watch/',
  plugins: [react()],
  build: {
    outDir: '../nb-watch',
    emptyOutDir: true,
    target: 'es2020',
  },
})
