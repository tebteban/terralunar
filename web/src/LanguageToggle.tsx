import {setLang, useLang} from './i18n.ts'

// Botón EN | ES (D-031). `floating` lo fija arriba al centro en escritorio y abajo a la izquierda en celular (sobre el globo, sin tapar paneles), en todas las pantallas; dentro de los diálogos
// modales va una copia en línea (un <dialog> modal tapa y bloquea lo que está fuera de él).
export default function LanguageToggle({floating = false}: {floating?: boolean}) {
  const lang = useLang()
  const btn = 'min-h-7 rounded-full px-2.5 text-xs font-semibold aria-pressed:bg-ink aria-pressed:text-canvas'
  return (
    <div data-no-translate role="group" aria-label="Language / Idioma"
      className={(floating ? 'fixed bottom-24 left-3 z-[2000] shadow-lg md:bottom-auto md:top-1.5 md:left-1/2 md:-translate-x-1/2 ' : 'inline-flex ') + 'flex gap-1 rounded-full border border-pressed bg-canvas p-0.5 text-ink'}>
      <button type="button" aria-pressed={lang === 'en'} className={btn} onClick={() => setLang('en')} title="English">EN</button>
      <button type="button" aria-pressed={lang === 'es'} className={btn} onClick={() => setLang('es')} title="Español">ES</button>
    </div>
  )
}
