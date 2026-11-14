import { useMemo, useState } from 'react'
import { Chevron, TopBar } from './Landing.tsx'
import SpaceBackdrop from './SpaceBackdrop.tsx'
import { rank, type Dimension, type Preset, type Profile, type Weights, type Zone } from './score.ts'

// Explicación simple de cada variable: qué mide y por qué importa para la Luna.
const HELP: Record<string, string> = {
  lst: 'Qué tan frío es el suelo. El polo sur lunar es extremadamente frío.',
  ndvi: 'Lugares sin plantas, como la superficie de la Luna.',
  nieve: 'Hielo o nieve todo el año, como el hielo de los cráteres en sombra.',
  lluvia: 'Lugares muy secos, donde casi no llueve.',
  cobertura: 'Roca o arena al descubierto, sin cultivos ni ciudades.',
  pendiente: 'Qué tan empinado es el terreno. Clave para mover un rover.',
  rugosidad: 'Qué tan irregular o accidentado es el terreno.',
}

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Clima', keys: ['lst', 'lluvia', 'nieve'] },
  { title: 'Superficie', keys: ['ndvi', 'cobertura'] },
  { title: 'Relieve', keys: ['pendiente', 'rugosidad'] },
]

const LEVELS = [
  { label: 'Baja', value: 1 },
  { label: 'Media', value: 2 },
  { label: 'Alta', value: 3 },
] as const

const STARTS: { id: Preset; label: string }[] = [
  { id: 'movilidad', label: 'Rover' },
  { id: 'excavacion', label: 'Excavación' },
  { id: 'habitat', label: 'Hábitat' },
]

export type Selection = Record<string, number> // variable → importancia (1 a 3)

const num = (v: number) => v.toLocaleString('es-AR', { maximumFractionDigits: 2 }).replace('-', '−')

// "Lo que pide la Luna": la meseta del trapecio difuso (donde la nota es 1), en las unidades de la variable
function target(d: Dimension) {
  const { a, b, c, d: e } = d.fuzzy
  const unit = d.unit === 'NDVI' ? '' : ` ${d.unit}`
  if (a === b) return `≤ ${num(c)}${unit}`
  if (c === e) return `≥ ${num(b)}${unit}`
  return `${num(b)} a ${num(c)}${unit}`
}

// Dibujo chico del trapecio: nota 0 afuera, sube, meseta en 1, baja.
function Trapezoid({ d, on }: { d: Dimension; on: boolean }) {
  const { a, b, c, d: e } = d.fuzzy
  const pad = (e - a) * 0.25 || 1
  const lo = a - pad, hi = e + pad
  const x = (v: number) => ((v - lo) / (hi - lo)) * 64
  const pts = `0,18 ${x(a)},18 ${x(b)},3 ${x(c)},3 ${x(e)},18 64,18`
  return (
    <svg viewBox="0 0 64 20" className="h-5 w-16 shrink-0" aria-hidden="true">
      <polygon points={`${x(a)},18 ${x(b)},3 ${x(c)},3 ${x(e)},18`} className={on ? 'fill-white/15' : 'fill-white/5'} />
      <polyline points={pts} fill="none" strokeWidth="1.25" strokeLinejoin="round" className={on ? 'stroke-canvas' : 'stroke-mute'} />
    </svg>
  )
}

export default function CustomSearch({ profile, zones, initial, mock, onBack, onSearch }: {
  profile: Profile
  zones: Zone[]
  initial: Selection
  mock: boolean
  onBack: () => void
  onSearch: (weights: Weights, selection: Selection) => void
}) {
  const [sel, setSel] = useState<Selection>(initial)
  const dims = profile.dimensions
  const keys = Object.keys(sel)
  const total = keys.reduce((s, k) => s + sel[k], 0)
  // Las variables no elegidas quedan con peso 0: no cuentan en el puntaje.
  const weights = useMemo(() => Object.fromEntries(Object.keys(dims).map((k) => [k, sel[k] ?? 0])), [dims, sel])
  const preview = useMemo(() => (total > 0 ? rank(zones, weights).slice(0, 5) : []), [zones, weights, total])

  const toggle = (k: string) => setSel((s) => {
    const next = { ...s }
    if (k in next) delete next[k]
    else next[k] = 2
    return next
  })

  // Sugerencia: las 3 variables con más peso en ese tipo de prueba, con importancia Alta, Media y Media
  const startFrom = (p: Preset) => {
    const top = Object.entries(dims).sort((x, y) => y[1].weights[p] - x[1].weights[p]).slice(0, 3)
    setSel(Object.fromEntries(top.map(([k], i) => [k, i === 0 ? 3 : 2])))
  }

  // Grupos conocidos primero; cualquier variable nueva del perfil cae en "Otras"
  const known = new Set(GROUPS.flatMap((g) => g.keys))
  const groups = [...GROUPS, { title: 'Otras', keys: Object.keys(dims).filter((k) => !known.has(k)) }]
    .map((g) => ({ ...g, keys: g.keys.filter((k) => k in dims) }))
    .filter((g) => g.keys.length)

  const go = () => onSearch(weights, sel)

  return (
    <div className="relative h-full overflow-x-hidden overflow-y-auto bg-ink text-canvas">
      <SpaceBackdrop bodies={false} />
      <div className="relative flex min-h-full flex-col">
        <TopBar step={2} mock={mock} onHome={onBack} />

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-12 px-6 pt-6 pb-28 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16">
          <main className="flex flex-col gap-12">
            <header className="landing-rise flex flex-col gap-6">
              <button type="button" onClick={onBack} className="flex items-center gap-2 self-start text-sm font-medium text-mute hover:text-canvas">
                <Chevron className="rotate-180" /> Inicio
              </button>
              <h1 className="display text-[26px] leading-[34px] text-balance md:text-[32px] md:leading-10">Armá tu búsqueda</h1>
              <p className="max-w-[56ch] text-base leading-[1.7] text-canvas-soft/80">
                Elegí qué variables comparar con el sitio de destino y cuánto importa cada una. Con pocas, por ejemplo 3, el ranking es más fácil de explicar.
              </p>
              <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-y border-hairline py-4">
                <dt className="micro-cap text-mute">Destino</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-canvas px-4 py-1.5 text-sm font-semibold text-ink">{profile.name}</span>
                  <span className="flex items-center gap-2 rounded-full border border-hairline px-4 py-1.5 text-sm text-mute" title="Marte todavía no tiene variables calibradas">Marte · todavía sin variables</span>
                </dd>
                <dt className="micro-cap text-mute">Empezar desde</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  {STARTS.map((s) => (
                    <button key={s.id} type="button" onClick={() => startFrom(s.id)} className="rounded-full bg-white/5 px-4 py-1.5 text-sm text-pressed transition-colors hover:bg-canvas hover:text-ink">
                      {s.label}
                    </button>
                  ))}
                  {keys.length > 0 && (
                    <button type="button" onClick={() => setSel({})} className="px-3 py-1.5 text-sm text-mute underline underline-offset-4 hover:text-canvas">Limpiar</button>
                  )}
                </dd>
              </dl>
            </header>

            {groups.map((g, gi) => (
              <section key={g.title} className="landing-rise flex flex-col gap-2" style={{ animationDelay: `${120 + gi * 80}ms` }} aria-labelledby={`g-${g.title}`}>
                <h2 id={`g-${g.title}`} className="label-mono text-mute">{g.title}</h2>
                <ul className="flex flex-col gap-2">
                  {g.keys.map((k) => {
                    const d = dims[k]
                    const on = k in sel
                    return (
                      <li key={k} className={`grid grid-cols-[minmax(0,1fr)] items-center gap-4 rounded-2xl border p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8 ${on ? 'border-mute bg-elevated' : 'border-hairline bg-rail hover:bg-elevated'}`}>
                        <button type="button" aria-pressed={on} onClick={() => toggle(k)} className="group flex items-start gap-4 text-left">
                          <span className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${on ? 'border-canvas bg-canvas text-ink' : 'border-mute group-hover:border-canvas'}`} aria-hidden="true">
                            {on && <svg viewBox="0 0 12 12" className="size-3"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>}
                          </span>
                          <span className="flex min-w-0 flex-col gap-1.5">
                            <span className="text-lg leading-6 font-semibold">{d.name}</span>
                            <span className="text-sm leading-[1.5] text-mute">{HELP[k] ?? d.dataset}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
                              <Trapezoid d={d} on={on} />
                              <span>La Luna pide <span className={on ? 'text-canvas' : ''}>{target(d)}</span></span>
                              <span aria-hidden="true">·</span>
                              <span className="micro-cap">{d.dataset}</span>
                            </span>
                          </span>
                        </button>
                        {on && (
                          <div className="flex items-center gap-1 justify-self-start rounded-full bg-white/5 p-1 sm:justify-self-end" role="group" aria-label={`Importancia de ${d.name}`}>
                            {LEVELS.map((l) => (
                              <button
                                key={l.value}
                                type="button"
                                aria-pressed={sel[k] === l.value}
                                onClick={() => setSel({ ...sel, [k]: l.value })}
                                className="rounded-full px-3.5 py-1.5 font-mono text-xs text-mute transition-colors hover:text-canvas aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink"
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </main>

          <aside className="landing-rise lg:sticky lg:top-6 lg:self-start" style={{ animationDelay: '200ms' }} aria-label="Vista previa">
            <div className="flex flex-col gap-6 rounded-2xl border border-pressed bg-canvas p-6 text-ink shadow-card">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-xl leading-7 font-bold tracking-tight">Vista previa</h2>
                <span className="label-mono text-body">{keys.length} de {Object.keys(dims).length}</span>
              </div>

              <section className="flex flex-col gap-3">
                <h3 className="label-mono text-body">Peso en el puntaje</h3>
                {keys.length === 0 && <p className="text-sm text-body">Elegí al menos una variable de la lista.</p>}
                {Object.keys(dims).filter((k) => k in sel).map((k) => {
                  const pct = Math.round((sel[k] / total) * 100)
                  return (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-sm">
                      <span className="truncate">{dims[k].name}</span>
                      <span className="metric text-[13px] font-semibold">{pct}%</span>
                      <span className="col-span-2 h-1.5 rounded-full bg-pressed" aria-hidden="true">
                        <span className="block h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
                      </span>
                    </div>
                  )
                })}
              </section>

              <section className="flex flex-col gap-1">
                <h3 className="label-mono mb-1 text-body">Mejores 5 en la Tierra</h3>
                {preview.length === 0 && <p className="text-sm text-body">Acá aparece el ranking en cuanto elijas una variable.</p>}
                <ol className="flex flex-col gap-1.5">
                  {preview.map(({ zone, score }, i) => (
                    <li key={zone.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl bg-canvas-softer px-3 py-2">
                      <span className="metric text-[13px] text-body">#{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{zone.name}</span>
                        <span className="block truncate text-xs text-body">{zone.country}{zone.known ? ' · análogo conocido' : ''}</span>
                      </span>
                      <span className={`metric rounded-full px-2.5 py-1 text-xs font-bold ${i === 0 ? 'bg-ink text-canvas' : 'bg-pressed text-ink'}`}>{Math.round(score * 100)}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <button type="button" disabled={keys.length === 0} onClick={go} className="btn-primary hidden h-11 w-full justify-between lg:flex">
                Ver las {zones.length} zonas en el mapa <Chevron />
              </button>
              <p className="font-mono text-[11px] leading-[1.5] text-body">
                Umbrales provisorios, a validar con el equipo de ciencia.{mock ? ' Puntajes de prueba.' : ''}
              </p>
            </div>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-rail p-3 lg:hidden">
          <button type="button" disabled={keys.length === 0} onClick={go} className="btn-ghost w-full justify-between">
            {keys.length === 0 ? 'Elegí al menos una variable' : `Ver en el mapa · ${keys.length} variables`} <Chevron />
          </button>
        </div>
      </div>
    </div>
  )
}
