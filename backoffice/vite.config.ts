import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Back office (panel de administración) · puerto de desarrollo 5174
export default defineConfig({
  server: { port: 5174, strictPort: true },
  build: { sourcemap: true },
  plugins: [react()]
})
