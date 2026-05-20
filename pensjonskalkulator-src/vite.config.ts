import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deploys under evers.no/pensjonskalkulator/
export default defineConfig({
  base: '/pensjonskalkulator/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
})
