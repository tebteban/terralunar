import TeamMusic from './TeamMusic.tsx'
import { useEffect } from 'react'
import HalftoneMoon from './HalftoneMoon.tsx'
import SpaceBackdrop from './SpaceBackdrop.tsx'

export type LandingChoice = 'luna' | 'marte' | 'personalizado'

const TITLE = 'TerraLunar'

const OPTIONS: { id: LandingChoice; key: string; title: string; tag: string; text: string }[] = [
  { id: 'luna', key: '1', title: 'Luna', tag: 'Principal', text: 'Lugares de la Tierra parecidos al polo sur lunar, donde irán las bases.' },
  { id: 'marte', key: '2', title: 'Marte', tag: 'Exploratorio', text: 'Explorá el relieve de Marte y compará con lugares de la Tierra.' },
  { id: 'personalizado', key: '3', title: 'Personalizado', tag: 'A medida', text: 'Elegí vos qué variables comparar y cuánto importa cada una.' },
]

const STEPS = ['Destino', 'Variables', 'Mapa'] as const

export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 ${className}`} aria-hidden="true">
      <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// Ícono de "Personalizado": tres controles deslizantes, la idea de ajustar a gusto
function SlidersIcon() {
  return (
    <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
      <circle cx="20" cy="20" r="19.5" fill="none" stroke="currentColor" strokeOpacity=".35" />
      {[[12, 23], [20, 14], [28, 20]].map(([x, y]) => (
        <g key={x}>
          <path d={`M${x} 11v18`} stroke="currentColor" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="3" fill="#000" stroke="currentColor" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}

// Barra superior de las pantallas internas: transparente, todo en mayúsculas.
export function TopBar({ step, mock, onHome }: { step: 1 | 2; mock: boolean; onHome?: () => void }) {
  return (
    <nav className="relative z-20 mx-auto flex h-20 w-full max-w-[1200px] shrink-0 items-center justify-between gap-6 px-6 md:px-8">
      <button type="button" onClick={onHome} disabled={!onHome} className="text-xl font-bold tracking-tight uppercase disabled:cursor-default">
        TerraLunar
      </button>
      <ol className="hidden items-center gap-6 md:flex" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i + 1 === step ? 'step' : undefined}
            className={`button-cap ${i + 1 === step ? 'text-canvas underline decoration-1 underline-offset-[10px]' : 'text-mute'}`}>
            {String(i + 1).padStart(2, '0')} {s}
          </li>
        ))}
      </ol>
      {mock ? <span className="micro-cap text-mute">Datos de prueba</span> : <span />}
    </nav>
  )
}

// Portada mínima: el nombre en el centro entrando letra por letra, una frase y tres opciones en fila.
export default function Landing({ onPick, mock }: { onPick: (c: LandingChoice) => void; mock: boolean }) {
  // Atajos de teclado 1, 2, 3
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const o = OPTIONS.find((x) => x.key === e.key)
      if (o) onPick(o.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPick])

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto bg-ink text-canvas">
      <SpaceBackdrop bodies={false} />

      {/* La Luna asoma desde abajo, tenue, como horizonte: acompaña sin competir con el contenido */}
      <div className="hero-moon pointer-events-none absolute left-1/2 top-[72%] aspect-square w-[max(160vw,900px)] -translate-x-1/2 md:top-[68%] md:w-[min(120vw,1400px)]" aria-hidden="true">
        <HalftoneMoon className="h-full w-full" annotate={false} />
      </div>

      <div className="relative z-10 flex min-h-full flex-col">
        <header className="relative flex h-24 shrink-0 items-start justify-end px-6 pt-6 md:h-28 md:px-8"><TeamMusic />
          {mock && <span className="micro-cap text-mute">Datos de prueba</span>}
        </header>

        <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col items-center justify-center gap-14 px-6 pb-12 text-center md:px-8">
          <div className="flex flex-col items-center gap-5">
            <p className="landing-rise label-mono text-mute" style={{ animationDelay: '900ms' }}>Análogos terrestres para la Luna y Marte</p>
            <h1 className="display title-in text-[52px] leading-none font-semibold tracking-[0.04em] uppercase sm:text-[88px] lg:text-[124px]" aria-label={TITLE}>
              {[...TITLE].map((ch, i) => (
                <span key={i} className="letter-in" style={{ animationDelay: `${120 + i * 55}ms` }} aria-hidden="true">{ch}</span>
              ))}
            </h1>
            <p className="landing-rise max-w-[44ch] text-base leading-[1.7] text-canvas-soft/80 sm:text-lg" style={{ animationDelay: '1000ms' }}>
              Encontrá en la Tierra los lugares que más se parecen a los sitios de las futuras bases.
            </p>
          </div>

          <section className="flex w-full flex-col items-center gap-5" aria-labelledby="pick-title">
            <h2 id="pick-title" className="landing-rise text-lg font-semibold text-canvas" style={{ animationDelay: '1150ms' }}>¿Qué querés explorar?</h2>
            {/* Opciones sin cajas: entran deslizándose de a una; al pasar el cursor, la elegida se eleva
                y las demás se atenúan (estilos .option-* en index.css) */}
            <ul className="option-row grid w-full max-w-[1040px] grid-cols-1 sm:grid-cols-3">
              {OPTIONS.map((o, i) => (
                <li key={o.id} className="option-slide relative" style={{ animationDelay: `${1300 + i * 160}ms` }}>
                  {i > 0 && <span className="option-divider absolute top-6 bottom-6 left-0 hidden w-px bg-white/10 sm:block" style={{ animationDelay: `${1500 + i * 160}ms` }} aria-hidden="true" />}
                  {i > 0 && <span className="absolute inset-x-6 top-0 h-px bg-white/10 sm:hidden" aria-hidden="true" />}
                  <button type="button" onClick={() => onPick(o.id)} aria-describedby={`opt-${o.id}`}
                    className="option group relative flex w-full cursor-pointer items-center gap-5 px-6 py-6 text-left sm:flex-col sm:gap-4 sm:px-8 sm:py-8 sm:text-center">
                    <span className="option-icon relative grid shrink-0 place-items-center">
                      <span className="option-halo absolute -inset-3 rounded-full" aria-hidden="true" />
                      {o.id === 'personalizado'
                        ? <SlidersIcon />
                        : <span className={`pick-icon ${o.id === 'luna' ? 'pick-moon' : 'pick-mars'}`} aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:items-center">
                      <span className="micro-cap text-mute">{o.tag}</span>
                      <span className="relative text-[26px] leading-9 font-semibold tracking-tight sm:text-[30px]">
                        {o.title}
                        <span className="option-line absolute -bottom-1 left-0 h-px w-full origin-left bg-canvas sm:origin-center" aria-hidden="true" />
                      </span>
                      <span id={`opt-${o.id}`} className="option-text max-w-[28ch] text-sm leading-[1.55] text-mute">{o.text}</span>
                    </span>
                    <span className="option-cta flex shrink-0 items-center gap-1.5 text-sm font-medium text-canvas sm:mt-1" aria-hidden="true">
                      <span className="hidden sm:inline">Explorar</span> <Chevron />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="landing-rise flex shrink-0 justify-center px-6 pb-6 text-center" style={{ animationDelay: '1700ms' }}>
          <p className="micro-cap bg-ink px-3 text-mute">Datos NASA: MODIS · GPM IMERG · NASADEM · LRO · MOLA</p>
        </footer>
      </div>
    </div>
  )
}
