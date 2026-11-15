import TeamMusic from './TeamMusic.tsx'
import { useEffect, useState, type PointerEvent } from 'react'
import { moonSimilarity } from './moonRelief.ts'
import HalftoneMoon from './HalftoneMoon.tsx'
import SpaceBackdrop from './SpaceBackdrop.tsx'

export type LandingChoice = 'luna' | 'marte' | 'personalizado' | 'ejemplo'

const TITLE = 'TerraLunar'

const OPTIONS: { id: Exclude<LandingChoice, 'ejemplo'>; key: string; title: string; tag: string; text: string }[] = [
  { id: 'luna', key: '1', title: 'Luna', tag: 'Principal', text: 'Elegí una región del polo sur lunar y buscá entornos terrestres comparables.' },
  { id: 'marte', key: '2', title: 'Marte', tag: 'Exploratorio', text: 'Explorá el relieve de Marte y compará con lugares de la Tierra.' },
  { id: 'personalizado', key: '3', title: 'Búsqueda global', tag: 'Datos reales', text: 'Compará el catálogo mundial y las regiones procesadas; elegí el ensayo y sus pesos.' },
]

const STEPS = ['Destino', 'Variables', 'Mapa'] as const

export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 ${className}`} aria-hidden="true">
      <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// Ícono de "Búsqueda global": la Tierra en líneas (meridianos y paralelos), al lado de las fotos de Luna y Marte
function GlobeIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="24" cy="24" r="22" />
      <ellipse cx="24" cy="24" rx="9" ry="22" strokeOpacity=".6" />
      <path d="M2 24h44M6 13h36M6 35h36" strokeOpacity=".45" />
    </svg>
  )
}

type Item = { id: string; name: string; body: string; pendiente_mediana: number; pendiente_p90: number; rugosidad_m: number; desnivel_m: number }
const STEPS_HOW = [
  ['01', 'Elegí un sitio', 'En la Luna o en Marte: un punto del polo sur o una región marciana.'],
  ['02', 'Medimos', 'Relieve con LOLA, MOLA y DEM terrestre. Cobertura y geología cuando hay evidencia disponible.'],
  ['03', 'Compará', 'Ranking de lugares en la Tierra y maquetas 3D lado a lado, a la misma escala.'],
] as const

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
  const [stats, setStats] = useState<{ zones: number; regions: number } | null>(null)
  const [example, setExample] = useState<{ moon: Item; earth: Item } | null>(null)
  useEffect(() => {
    Promise.all([fetch('/compare/index.json').then((r) => r.json()), fetch('/discovery/regions.json').then((r) => r.json())])
      .then(([c, r]) => {
        setStats({ zones: c.items.filter((i:{body:string})=>i.body==='tierra').length, regions: r.regions.length })
        const find = (id: string) => c.items.find((i: Item) => i.id === id)
        const moon = find('luna-mons-mouton'), earth = find('mcmurdo-dry-valleys')
        if (moon && earth) setExample({ moon, earth })
      })
      .catch(() => {}) // la portada funciona igual sin cifras
  }, [])
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

  // Parallax de las estrellas con el puntero (±10 px). Con reduced-motion no se mueve nada.
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = e.currentTarget
    el.style.setProperty('--px', `${((e.clientX / el.clientWidth) - 0.5) * -20}px`)
    el.style.setProperty('--py', `${((e.clientY / el.clientHeight) - 0.5) * -20}px`)
  }

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto bg-ink text-canvas" onPointerMove={onMove}>
      <SpaceBackdrop bodies={false} />

      {/* La Luna asoma desde abajo, tenue, como horizonte: acompaña sin competir con el contenido */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
      <div className="hero-moon pointer-events-none absolute left-1/2 top-[72%] aspect-square w-[max(160vw,900px)] -translate-x-1/2 md:top-[68%] md:w-[min(120vw,1400px)]" aria-hidden="true">
        <HalftoneMoon className="h-full w-full" annotate={false} />
      </div>
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
                        ? <GlobeIcon />
                        : <img src={`/landing/${o.id === 'luna' ? 'moon' : 'mars'}.png`} alt="" width={48} height={48} className="size-12 rounded-full" />}
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

        {/* Debajo de la primera pantalla, fondo sólido: la Luna de puntos queda solo como horizonte del inicio */}
        <div className="relative bg-ink">
        <div className="pointer-events-none absolute inset-x-0 -top-32 h-32 bg-gradient-to-b from-transparent to-ink" aria-hidden="true" />
        <section className="mx-auto w-full max-w-[1120px] px-6 pt-8 pb-20 md:px-8" aria-labelledby="how-title">
          <h2 id="how-title" className="label-mono mb-6 text-center text-mute">Cómo funciona</h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS_HOW.map(([n, title, text], i) => (
              <li key={n} className="relative flex flex-col gap-2 border-t border-white/15 pt-5 text-left">
                {i < 2 && <span className="absolute -top-px right-0 hidden h-px w-6 bg-canvas/40 sm:block" aria-hidden="true" />}
                <span className="metric text-sm text-mute">{n}</span>
                <span className="text-lg font-semibold">{title}</span>
                <span className="text-sm leading-[1.6] text-mute">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        {stats && (
          <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 md:px-8" aria-label="El proyecto en cifras">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-4">
              {[[9, 'regiones candidatas de Artemis III'], [stats.regions, 'regiones terrestres con datos reales'], [stats.zones, 'recortes del catálogo de referencia'], [2, 'misiones planetarias de relieve']].map(([n, label]) => (
                <div key={label} className="flex flex-col gap-1 bg-ink/90 p-6 text-left">
                  <dt className="order-2 text-sm text-mute">{label}</dt>
                  <dd className="metric text-4xl font-semibold">{n}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {example && (
          <section className="mx-auto w-full max-w-[1120px] px-6 pb-20 md:px-8" aria-labelledby="example-title">
            <div className="flex flex-col gap-6 rounded-2xl border border-white/15 bg-white/[0.03] p-6 md:flex-row md:items-center md:p-8">
              <div className="flex flex-1 flex-col gap-2 text-left">
                <span className="label-mono text-mute">Ejemplo</span>
                <h2 id="example-title" className="text-2xl font-semibold">{example.moon.name.replace(/ \(.*\)/, '')} <span className="text-mute">↔</span> {example.earth.name}</h2>
                <p className="text-sm text-mute">Una meseta del polo sur lunar y un desierto polar de la Antártida: relieve medido con LOLA y elevación terrestre, en ventanas de 20 × 20 km.</p>
                <button type="button" onClick={() => onPick('ejemplo')} className="btn-primary mt-2 self-start">Ver la comparación 3D <Chevron /></button>
              </div>
              <table className="w-full max-w-sm text-left text-sm md:w-auto">
                <thead><tr className="label-mono text-mute"><th className="py-1 pr-4 font-normal" /><th className="py-1 pr-4 font-normal">Luna</th><th className="py-1 font-normal">Tierra</th></tr></thead>
                <tbody className="metric">
                  {([['Pendiente mediana', 'pendiente_mediana', '°'], ['Rugosidad', 'rugosidad_m', ' m'], ['Desnivel', 'desnivel_m', ' m']] as const).map(([label, k, u]) => (
                    <tr key={k} className="border-t border-white/10"><td className="py-2 pr-4 font-sans text-mute">{label}</td><td className="py-2 pr-4">{example.moon[k].toLocaleString('es-AR')}{u}</td><td className="py-2">{example.earth[k].toLocaleString('es-AR')}{u}</td></tr>
                  ))}
                  <tr className="border-t border-white/10"><td className="py-2 pr-4 font-sans text-mute">Parecido</td><td colSpan={2} className="py-2 text-2xl font-semibold">{Math.round(moonSimilarity(example.moon, example.earth) * 100)}<span className="text-sm text-mute">/100</span></td></tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        </div>

        <footer className="landing-rise flex shrink-0 justify-center bg-ink px-6 pb-6 text-center" style={{ animationDelay: '1700ms' }}>
          <div className="flex flex-col items-center gap-2">
            <p className="micro-cap bg-ink px-3 text-mute">Relieve: LRO LOLA · MOLA · DEM terrestre</p>
            <p className="text-xs text-mute/70">Equipo q'kodigo · Santiago del Estero · NASA Space Apps Challenge 2026{mock ? ' · puntajes de demostración' : ''}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
