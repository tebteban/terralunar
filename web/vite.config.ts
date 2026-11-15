import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// publicDir apunta a ../data: la app sirve los JSON de data/ tal cual los deja el pipeline
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: '../data',
  // Pre-empaquetar lo que se importa con lazy(): si Vite lo descubre a mitad de sesión recarga la página y se pierde el estado
  optimizeDeps: { include: ['recharts', 'three', 'three/addons/controls/OrbitControls.js', 'three/addons/renderers/CSS2DRenderer.js', 'geotiff'] },
})
