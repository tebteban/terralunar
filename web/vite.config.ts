import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// publicDir apunta a ../data: la app sirve zones.json y profiles.json tal cual los deja el pipeline
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: '../data',
})
