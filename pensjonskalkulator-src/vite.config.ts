import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploys under evers.no/pensjonskalkulator/.
// Build-output havner i søsken-mappen ../pensjonskalkulator/, som er det
// GitHub Pages serverer fra.
export default defineConfig({
  base: '/pensjonskalkulator/',
  plugins: [react()],
  build: {
    outDir: '../pensjonskalkulator',
    emptyOutDir: true,
    target: 'es2020',
  },
})
