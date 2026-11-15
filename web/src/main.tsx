import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App.tsx'
import LanguageToggle from './LanguageToggle.tsx'
import { startI18n, useLang } from './i18n.ts'

// Inglés por defecto con botón EN | ES (D-031). Al cambiar de idioma la app se vuelve a dibujar sin perder estado.
startI18n()
function Root() {
  useLang()
  return <><App /><LanguageToggle floating /></>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
