import SurfacePanel from './SurfacePanel.tsx'
import {coord,num} from './fmt.ts'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { SearchTarget } from './searchTarget.ts'
import ScientificSearch from './ScientificSearch.tsx'
import ConsoleIcon from './ConsoleIcon.tsx'
import MethodDialog from './MethodDialog.tsx'
import CustomSearch, { type Selection } from './CustomSearch.tsx'
import Landing, { type LandingChoice } from './Landing.tsx'
import MapView from './MapView.tsx'
import { presetWeights, rank, SHORT, target, type Preset, type Profile, type Weights, type Zone } from './score.ts'

// Los visores pesados (three.js, Recharts, geotiff) se bajan solo cuando se abren: la portada y el mapa cargan antes.
const ZoneCard = lazy(() => import('./ZoneCard.tsx'))
const MoonMap = lazy(() => import('./MoonMap.tsx'))
const MarsView = lazy(() => import('./MarsView.tsx'))
const Compare3D = lazy(() => import('./Compare3D.tsx'))

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'movilidad', label: 'Movilidad de rover' },
  { id: 'excavacion', label: 'Excavación hielo/regolito' },
  { id: 'habitat', label: 'Cimientos de hábitat' },
]

function sameWeights(a: Weights, b: Weights) {
  return Object.keys(b).every((k) => Math.abs((a[k] ?? 0) - b[k]) < 1e-9)
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

// Mientras zones.json sea el falso de 20 zonas. Pasar a false cuando lleguen los datos reales.
const DATOS_DE_PRUEBA = true

type Screen = 'inicio' | 'personalizado' | 'explorar'
type Body = 'tierra' | 'luna' | 'marte'
// En pantallas angostas (< lg) la barra lateral se parte en dos paneles que tapan el mapa cuando se abren.
type Panel = 'ajustes' | 'mapa' | 'ranking'

// La pantalla vive en la URL (#personalizado, #explorar, #marte) para que funcione el botón "atrás".
function fromHash(): { screen: Screen; body: Body } {
  const h = window.location.hash.slice(1)
  if (h === 'personalizado') return { screen: 'personalizado', body: 'tierra' }
  if (h === 'marte') return { screen: 'explorar', body: 'marte' }
  if (h === 'explorar') return { screen: 'explorar', body: 'tierra' }
  return { screen: 'inicio', body: 'tierra' }
}

const Loading = ({ what }: { what: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-space" role="status">
    <div className="flex w-56 flex-col gap-2">
      <span className="hud text-mute">Cargando {what}…</span>
      <span className="loading-bar" aria-hidden="true" />
    </div>
  </div>
)

export default function App() {
  const [searchTarget,setSearchTarget]=useState<SearchTarget|null>(null)
  const analyze=(target:SearchTarget)=>{setSearchTarget(target);setScientificOpen(true)}
  const [scientificOpen,setScientificOpen]=useState(false)
  const [scientificMap,setScientificMap]=useState<{zone:Zone;score:number}[]>([])
  const [discovery,setDiscovery]=useState<{zone:Zone;score:number}|null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('movilidad')
  const [weights, setWeights] = useState<Weights>({})
  const [body, setBody] = useState<Body>(() => fromHash().body)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  // Pantallas: inicio → (personalizado) → explorar (mapa, ranking y fichas)
  const [screen, setScreen] = useState<Screen>(() => fromHash().screen)
  // Variables elegidas en la búsqueda personalizada (null = se usa un preset)
  const [custom, setCustom] = useState<Selection | null>(null)
  // De Eze (c891b87): diálogo de método y pantalla completa
  const [methodOpen, setMethodOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [panel, setPanel] = useState<Panel>('mapa')
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState<'todos' | 'conocidos' | 'nuevos' | 'argentina'>('todos')
  const [showAll, setShowAll] = useState(false)
  // Panel lateral ocultable (escritorio) en Luna, Marte y búsqueda personalizada; se recuerda en el navegador
  const [panelHidden, setPanelHidden] = useState(() => { try { return localStorage.getItem('terralunar.panel-oculto') === '1' } catch { return false } })
  const togglePanel = (hidden: boolean) => {
    setPanelHidden(hidden)
    try { localStorage.setItem('terralunar.panel-oculto', hidden ? '1' : '0') } catch { /* sin almacenamiento: solo esta sesión */ }
  }

  useEffect(() => {
    Promise.all([getJSON<Zone[]>('/zones.json'), getJSON<Record<string, Profile>>('/profiles.json')])
      .then(([z, p]) => {
        setZones(z)
        setProfiles(p)
        setWeights(presetWeights(p.luna, 'movilidad'))
      })
      .catch((e) => setError(String(e)))
  }, [attempt])

  useEffect(() => {
    const onPop = () => {
      const h = fromHash()
      setScreen(h.screen)
      if (h.screen === 'explorar') setBody(h.body)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = (s: Screen, b: Body = 'tierra') => {
    setScreen(s)
    if (s === 'explorar') setBody(b)
    const hash = s === 'inicio' ? '' : s === 'personalizado' ? '#personalizado' : b === 'marte' ? '#marte' : '#explorar'
    window.history.pushState(null, '', hash || window.location.pathname)
  }

  const profile = profiles?.luna
  const ranked = useMemo(() => rank(zones, weights), [zones, weights])
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  // "Personalizado" se deriva comparando con el preset: no hace falta otro estado que mantener sincronizado
  const isCustom = custom !== null || (profile ? !sameWeights(weights, presetWeights(profile, preset)) : false)
  const selectedIndex = ranked.findIndex((r) => r.zone.id === selectedId)
  const topScore = ranked[0]?.score || 1
  const maxWeight = Math.max(0, ...Object.values(weights))
  const filtered = ranked.map((r, i) => ({ ...r, i })).filter(({ zone }) =>
    filter === 'todos' || (filter === 'conocidos' ? zone.known : filter === 'nuevos' ? !zone.known : zone.country === 'Argentina'))
  // shortcut: cuenta todos los conocidos del mock; con datos reales usar solo los de split "test"
  const validation = (() => {
    const top = Math.max(1, Math.ceil(ranked.length * 0.1))
    return { top, hit: ranked.slice(0, top).filter((r) => r.zone.known).length, known: ranked.filter((r) => r.zone.known).length }
  })()

  const choosePreset = (p: Preset) => {
    setPreset(p)
    setCustom(null)
    if (profile) setWeights(presetWeights(profile, p))
  }

  const pickEarth = (id: string, zone?: Zone, score?: number) => {
    if (!zone) setScientificMap([])
    setDiscovery(zone ? { zone, score: score ?? 0 } : null)
    setBody('tierra')
    setComparing(false)
    setSelectedId(id)
    setPanel('mapa')
  }
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
    catch { setNotice('La pantalla completa no está disponible en este navegador.') }
  }

  const pick = (c: LandingChoice) => {
    setSelectedId(null)
    setComparing(false)
    if (c === 'personalizado') {setScientificOpen(true);return go('explorar')}
    if (c === 'ejemplo') { go('explorar', 'tierra'); setSelectedId('mcmurdo-dry-valleys'); setComparing(true); return } // abre el comparador con Mons Mouton
    if (c === 'luna') choosePreset(preset)
    go('explorar', c === 'marte' ? 'marte' : 'luna')
  }

  // La portada no depende de los datos: se muestra mientras cargan.
  if (screen === 'inicio') return (
    <Landing onPick={pick} mock={DATOS_DE_PRUEBA} />
  )
  if (error) return (
    <div className="flex h-full items-center justify-center bg-space p-6 text-canvas">
      <div role="alert" className="hud-frame flex max-w-sm flex-col gap-3 rounded-2xl border border-hairline bg-rail p-6">
        <span className="label-mono text-mute">Sin datos</span>
        <p className="text-sm leading-5">No se pudieron cargar los datos del catálogo.</p>
        <p className="hud text-mute">{error}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost h-10" onClick={() => { setError(null); setAttempt((a) => a + 1) }}>Reintentar</button>
          <button type="button" className="chip-dark h-10" onClick={() => go('inicio')}>Volver al inicio</button>
        </div>
      </div>
    </div>
  )
  if (!profile) return <Loading what="el catálogo" />

  if (screen === 'personalizado') return (
    <CustomSearch
      profile={profile}
      zones={zones}
      mock={DATOS_DE_PRUEBA}
      initial={custom ?? {}}
      onBack={() => go('inicio')}
      onSearch={(w, sel) => {
        setWeights(w)
        setCustom(sel)
        go('explorar')
      }}
    />
  )

  const visibleDims = Object.entries(profile.dimensions).filter(([k]) => custom === null || k in custom)
  const section = (p: Panel) => (panel === p ? 'contents' : 'hidden lg:contents')
  const collapsible = body !== 'tierra' || custom !== null
  const collapsed = collapsible && panelHidden
  const panelName = body === 'luna' ? 'Luna' : body === 'marte' ? 'Marte' : 'Búsqueda personalizada'

  return (
    <div className="flex h-full flex-col bg-space">
      {DATOS_DE_PRUEBA && <DataBanner onMethod={() => setMethodOpen(true)} onFullscreen={fullscreen} />}
      {/* Pestañas solo en pantallas angostas: Ajustes · Mapa · Ranking */}
      <nav aria-label="Paneles" className="flex shrink-0 border-b border-hairline bg-rail px-2 lg:hidden">
        {([['ajustes', 'Ajustes'], ['mapa', 'Mapa'], ['ranking', 'Ranking']] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}
            className="button-cap relative min-h-11 flex-1 text-mute transition-colors aria-pressed:text-canvas after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent aria-pressed:after:bg-canvas">
            {label}{id === 'ranking' && <span className="metric ml-1.5 text-xs text-mute">{ranked.length}</span>}
          </button>
        ))}
      </nav>
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Barra fina para volver a mostrar el panel cuando está oculto (solo escritorio) */}
      {collapsed && (
        <div className="hidden w-12 shrink-0 flex-col items-center gap-3 border-r border-hairline bg-rail py-4 lg:flex">
          <button type="button" onClick={() => togglePanel(false)} aria-expanded={false} aria-controls="panel-lateral"
            title={`Mostrar panel · ${panelName}`} aria-label={`Mostrar panel de ${panelName}`}
            className="grid size-9 cursor-pointer place-items-center rounded-full text-canvas transition-colors hover:bg-elevated">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => togglePanel(false)} tabIndex={-1} aria-hidden="true"
            className="label-mono cursor-pointer rotate-180 text-mute transition-colors [writing-mode:vertical-rl] hover:text-canvas">
            Mostrar panel · {panelName}
          </button>
        </div>
      )}
      <aside id="panel-lateral" className={`${panel === 'mapa' ? 'hidden' : 'absolute inset-0 z-20 flex'} flex-col gap-7 overflow-y-auto border-hairline bg-rail p-6 text-canvas lg:static lg:w-[340px] lg:shrink-0 lg:border-r xl:w-[390px] ${collapsed ? 'lg:hidden' : 'panel-in lg:flex'}`}>
        {collapsible && (
          <button type="button" onClick={() => togglePanel(true)} aria-expanded={true} aria-controls="panel-lateral"
            className="-mt-2 -mb-3 hidden cursor-pointer items-center gap-1.5 self-end rounded-full px-3 py-1.5 text-xs text-mute transition-colors hover:bg-elevated hover:text-canvas lg:inline-flex">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Ocultar panel
          </button>
        )}
        <button type="button" className="btn-primary" onClick={() => setScientificOpen(true)}>Buscar en todas las regiones</button>
        <header className="flex flex-col gap-1">
          <h1 className="text-xl leading-7 font-bold tracking-tight">TerraLunar</h1>
          <p className="text-[13px] leading-[18px] text-mute">Buscador de análogos terrestres para misiones planetarias.</p>
        </header>

        {scientificMap.length > 0 && body === 'tierra' && (
          <section className="flex flex-col gap-2">
            <h2 className="font-bold">Candidatos de la búsqueda · {scientificMap.length}</h2>
            <p className="text-xs text-mute">Recortes con datos reales. Cobertura mundial discontinua.</p>
            <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {scientificMap.map(r => (
                <li key={r.zone.id}>
                  <button type="button" className="flex w-full justify-between gap-2 rounded-lg bg-white/5 p-2 text-left text-sm" onClick={() => pickEarth(r.zone.id, r.zone, r.score)}>
                    <span>{r.zone.name}</span>
                    <strong>{r.score.toFixed(1)}</strong>
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" className="btn-ghost" onClick={() => { setScientificMap([]); setDiscovery(null); setSelectedId(null) }}>Cerrar resultados</button>
          </section>
        )}
        {scientificMap.length > 0 && !discovery && body === 'tierra' ? (
          <p className="text-sm text-mute">Elegí un candidato del globo o la lista para ver su recorte de 20 × 20 km.</p>
        ) : discovery && body === 'tierra' ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Recorte terrestre analizado</h2>
            <p>{discovery.zone.name}</p>
            <p className="metric">{discovery.score.toFixed(1)}/100 · similitud topográfica</p>
            <p>La línea blanca delimita la ventana utilizada en la comparación. El puntaje corresponde al objetivo planetario elegido.</p>
            <p>{discovery.zone.notes}</p>
            <p className="text-xs text-mute">{discovery.zone.sources.join(' · ')}</p>
            <button type="button" className="btn-ghost" onClick={() => { setScientificMap([]); setDiscovery(null); setSelectedId(null) }}>Volver al catálogo de demostración</button>
          </section>
        ) : body !== 'tierra' ? (
          <PlanetOverview body={body} onMethod={() => setMethodOpen(true)} />
        ) : (
          <>
            <div className={section('ajustes')}>
        <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white/[0.04] p-4" aria-label="Objetivo de la comparación">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="label-mono text-mute">Objetivo</span>
              <p className="mt-1 font-semibold leading-5">Luna · polo sur</p>
              <p className="text-[13px] text-mute">Candidatos Artemis III</p>
            </div>
            <button type="button" onClick={() => go('explorar', 'marte')} className="shrink-0 text-[13px] font-medium text-canvas underline underline-offset-2">Ver Marte →</button>
          </div>
          <div>
            <span className="label-mono text-[10px] text-mute">Lo que pide la Luna</span>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {visibleDims.map(([k, d]) => (
                <li key={k} title={`${d.name} · ${d.dataset}`} className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-pressed">
                  {SHORT[k] ?? d.name} <span className="text-canvas">{target(d)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono mb-2 text-mute">Tipo de prueba · simulación</legend>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-white/5 p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id && !isCustom}
                onClick={() => choosePreset(p.id)}
                className={`min-h-9 rounded-full px-2 text-[13px] transition-colors ${
                  preset === p.id && !isCustom ? 'bg-canvas font-semibold text-ink' : 'text-mute hover:text-canvas'
                }`}
              >
                {{ movilidad: 'Movilidad', excavacion: 'Excavación', habitat: 'Hábitat' }[p.id]}
              </button>
            ))}
          </div>
          {custom !== null && (
            <p className="flex items-center justify-between gap-2 text-[13px] text-mute">
              <span>Búsqueda personalizada · {Object.keys(custom).length} variables</span>
              <button type="button" onClick={() => go('personalizado')} className="-my-2 shrink-0 py-2 font-medium text-canvas underline underline-offset-2">
                Editar
              </button>
            </p>
          )}
          {custom === null && isCustom && (
            <p className="flex items-center justify-between gap-2 text-[13px] text-mute">
              <span>Personalizado (basado en «{PRESETS.find((p) => p.id === preset)?.label}»)</span>
              <button type="button" onClick={() => choosePreset(preset)} className="-my-2 shrink-0 py-2 font-medium text-canvas underline underline-offset-2">
                Restaurar
              </button>
            </p>
          )}
        </fieldset>

        <section className="flex flex-col gap-3">
          <h2 className="flex flex-col gap-1">
            <span className="label-mono text-mute">Pesos de similitud</span>
            <span className="text-[13px] leading-[18px] text-mute/80">Tocá los puntos para darle más o menos importancia a cada variable.</span>
          </h2>
          {/* reparto del 100 %: un segmento por variable, mismo tono que su fila */}
          <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            {visibleDims.map(([k], i) => (weights[k] ?? 0) > 0 && (
              <span key={k} title={SHORT[k]} style={{ flexGrow: weights[k], opacity: 1 - i * 0.11 }} className="h-full bg-canvas" />
            ))}
          </div>
          <ul className="flex flex-col gap-1">
            {visibleDims.map(([k, d], i) => {
              // 5 niveles relativos al peso más alto: nada · baja · media · alta · máxima
              const level = maxWeight > 0 ? Math.round(((weights[k] ?? 0) / maxWeight) * 4) : 0
              return (
                <li key={k} className="flex items-center gap-2.5">
                  <span className="size-2 shrink-0 rounded-full bg-canvas" style={{ opacity: 1 - i * 0.11 }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-pressed" title={`${d.name} (${d.unit}) · ${d.dataset}`}>{d.name}</span>
                  <span className="flex gap-1" role="radiogroup" aria-label={`Importancia de ${d.name}`}>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={level === n}
                        aria-label={['Nada', 'Baja', 'Media', 'Alta', 'Máxima'][n]}
                        onClick={() => setWeights({ ...weights, [k]: (n / 4) * (maxWeight || 1) })}
                        className={`size-3.5 rounded-full border transition-colors ${n === 0 ? 'border-dashed' : ''} ${n > 0 && n <= level ? 'border-canvas bg-canvas' : 'border-white/30 hover:border-canvas'}`} />
                    ))}
                  </span>
                  <span className="metric w-9 text-right text-[12px] font-semibold">{totalWeight > 0 ? Math.round(((weights[k] ?? 0) / totalWeight) * 100) : 0}%</span>
                </li>
              )
            })}
          </ul>
          {totalWeight === 0 && (
            <p role="alert" className="rounded-2xl border border-canvas p-3 text-sm font-medium text-canvas">Todos los pesos están en 0: el ranking no tiene sentido. Subí al menos uno.</p>
          )}
        </section>
        </div>

        <div className={section('ranking')}>
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center justify-between">
            <span className="label-mono text-mute">Ranking de sitios terrestres</span>
            <span className="metric text-[13px] font-medium text-pressed">{filtered.length} sitios</span>
          </h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar ranking">
            {(['todos', 'conocidos', 'nuevos', 'argentina'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-[12px] ${filter === f ? 'bg-canvas font-semibold text-ink' : 'bg-white/[0.06] text-mute hover:text-canvas'}`}>
                {{ todos: 'Todos', conocidos: 'Conocidos', nuevos: 'Nuevos', argentina: 'Argentina' }[f]}
              </button>
            ))}
          </div>
          <ol className="flex flex-col gap-1">
            {(showAll ? filtered : filtered.slice(0, 5)).map(({ zone, score, i }) => {
              const on = zone.id === selectedId
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => pickEarth(zone.id)}
                    className={`row flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                      on ? 'bg-canvas text-ink' : 'bg-white/[0.04] hover:bg-white/10'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`metric text-[13px] ${on ? 'text-body' : 'text-mute'}`}>#{String(i + 1).padStart(2, '0')}</span>
                        <span className="truncate text-sm font-semibold">{zone.name}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5">
                        <span className={`label-mono text-[10px] ${on ? 'text-body' : 'text-mute'}`}>{zone.country}</span>
                        {zone.known && <span className={`rounded-full px-1.5 font-mono text-[10px] ${on ? 'bg-ink text-canvas' : 'bg-white/15 text-canvas'}`}>análogo conocido</span>}
                      </span>
                      {/* gauge: largo relativo al primer puesto, así la caída del ranking se ve sin leer números */}
                      <span className={`mt-1.5 block h-0.5 w-full rounded-full ${on ? 'bg-pressed' : 'bg-white/10'}`} aria-hidden="true">
                        <span className={`block h-full rounded-full ${on ? 'bg-ink' : 'bg-canvas/70'}`} style={{ width: `${(score / topScore) * 100}%` }} />
                      </span>
                    </span>
                    <span className="metric text-[22px] leading-7 font-semibold">{(score * 100).toFixed(0)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {filtered.length === 0 && <p className="text-[13px] text-mute">Ningún sitio cumple este filtro.</p>}
          {filtered.length > 5 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="btn-ghost h-9 w-full text-[13px]">
              {showAll ? 'Ver solo los 5 primeros' : `Ver los ${filtered.length}`}
            </button>
          )}
        </section>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-hairline bg-white/[0.03] p-4 text-[13px] leading-[18px] text-mute">
          <span className="flex items-center justify-between gap-2">
            <strong className="text-canvas">Validación</strong>
            <span className="rounded-full bg-white/10 px-2 font-mono text-[10px] text-pressed">demostración</span>
          </span>
          <p><span className="metric text-[20px] font-semibold text-canvas">{validation.hit} de {validation.known}</span> análogos conocidos quedan en el 10 % superior ({validation.top} sitios).</p>
          <p>Con datos reales se mide solo con los sitios reservados para prueba. Luna y Marte usan comparaciones de relieve independientes.</p>
        </div>
        <button type="button" onClick={() => setMethodOpen(true)} className="btn-ghost h-10 w-full">Fuentes y método <ConsoleIcon name="external" /></button>
        </>)}
      </aside>

      <main className="relative min-h-0 flex-1 overflow-hidden bg-space">
        {/* key=body: cada cuerpo entra con su propia transición (view-in) */}
        <div key={body} className="view-in h-full">
          <div className={body === 'tierra' ? 'h-full' : 'hidden'}>
            <MapView
              active={body === 'tierra'}
              key={scientificMap.length ? 'scientific' : 'catalogue'}
              ranked={scientificMap.length ? scientificMap.map(r => ({ zone: r.zone, score: r.score / 100 })) : discovery ? [{ zone: discovery.zone, score: discovery.score / 100 }] : ranked}
              selectedId={selectedId}
              onSelect={id => {
                const r = scientificMap.find(r => r.zone.id === id)
                if (r) pickEarth(id, r.zone, r.score)
                else if (discovery?.zone.id !== id) pickEarth(id)
              }}
            />
          </div>
          {body === 'luna' && <Suspense fallback={<Loading what="la Luna (LRO LOLA)" />}><MoonMap onAnalyze={analyze} onPickEarth={pickEarth} /></Suspense>}
          {body === 'marte' && <Suspense fallback={<Loading what="Marte (MOLA)" />}><MarsView onAnalyze={analyze} onPickEarth={pickEarth} /></Suspense>}
        </div>
        <nav className="absolute left-2 right-2 top-16 z-10 flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-hairline bg-rail p-1 shadow-float sm:right-auto sm:left-4" aria-label="Cuerpo visualizado">
          <button type="button" onClick={() => go('inicio')} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-mute hover:text-canvas" aria-label="Volver al inicio" title="Inicio">
            <ConsoleIcon name="back" /><span className="hidden xl:inline">Inicio</span>
          </button>
          <span className="h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />
          {(['tierra', 'luna', 'marte'] as const).map(b => (
            <button key={b} type="button" aria-pressed={body === b && !comparing} onClick={() => { setBody(b); setComparing(false); setPanel('mapa') }}
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm text-mute transition-colors hover:text-canvas aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink sm:px-4">
              {b === 'marte' && <span className="size-2 rounded-full bg-mars" aria-hidden="true" />}
              {{ tierra: 'Tierra', luna: 'Luna', marte: 'Marte' }[b]}
            </button>
          ))}
          <span className="h-5 w-px shrink-0 bg-hairline" aria-hidden="true" />
          <button type="button" disabled={!selectedId || !!discovery} aria-pressed={comparing} onClick={() => setComparing(true)} aria-label="Comparador 3D"
            title={selectedId ? 'Comparar el relieve del candidato elegido' : 'Elegí un lugar del ranking para comparar'}
            className="min-h-10 shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap text-mute transition-colors hover:text-canvas disabled:opacity-40 disabled:hover:text-mute aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink sm:px-4">
            <span className="hidden xl:inline">Comparador </span>3D
          </button>
        </nav>
        {body === 'tierra' && !discovery && selectedIndex >= 0 && (
          <Suspense fallback={null}>
            <ZoneCard
              ranked={ranked[selectedIndex]}
              position={selectedIndex + 1}
              profile={profile}
              weights={weights}
              onClose={() => setSelectedId(null)}
              onCompare={() => setComparing(true)}
              mock={DATOS_DE_PRUEBA}
            />
          </Suspense>
        )}
        {comparing && selectedId && !discovery && <Suspense fallback={<Loading what="el comparador 3D" />}><Compare3D zoneId={selectedId} onClose={() => setComparing(false)} /></Suspense>}
        {discovery&&body==='tierra'&&<SurfacePanel label="Ficha del recorte terrestre"><header><p className="label-mono text-body">Tierra · recorte analizado</p><h2 className="text-2xl font-bold">{discovery.zone.name}</h2><p className="hud text-body">{coord(discovery.zone.centroid[1],discovery.zone.centroid[0])}</p></header><p className="metric text-3xl font-semibold">{num(discovery.score)}<span className="text-sm"> /100 · relieve</span></p><p className="text-sm">Ventana de 20 × 20 km · contorno blanco en el mapa.</p><p className="text-sm text-body">{discovery.zone.notes}</p><p className="hud text-body">{discovery.zone.sources.join(' · ')}</p><button className="btn-primary" onClick={()=>setScientificOpen(true)}>Volver a la comparación científica</button><button className="btn-secondary" onClick={()=>{setDiscovery(null);setSelectedId(null)}}>Cerrar candidato</button></SurfacePanel>}
      </main>
      </div>
      {scientificOpen&&<ScientificSearch selectedTarget={searchTarget} onClose={()=>setScientificOpen(false)} onSelect={pickEarth} onShowMap={results=>{setPanel('mapa');setScientificMap(results);setDiscovery(null);setSelectedId(null);setBody('tierra');setComparing(false)}}/>}

      <MethodDialog open={methodOpen} onClose={() => setMethodOpen(false)} />
      {notice && <button type="button" className="chip-dark fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-xs" onClick={() => setNotice('')}>{notice} · Cerrar</button>}
    </div>
  )
}

// Resumen del cuerpo en la barra lateral cuando se explora la Luna o Marte (idea de Eze, c891b87):
// ahí no se muestran los pesos porque no afectan las comparaciones de relieve.
function PlanetOverview({ body, onMethod }: { body: 'luna' | 'marte'; onMethod: () => void }) {
  const luna = body === 'luna'
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="label-mono text-mute">Cuerpo seleccionado</span>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl leading-7 font-bold tracking-tight">{luna ? 'Luna' : 'Marte'}</h2>
          <span className={`hud rounded-full px-2.5 py-0.5 font-semibold ${luna ? 'bg-white/10 text-canvas' : 'bg-mars/15 text-[#ffb59c]'}`}>{luna ? 'LRO / LOLA' : 'MGS / MOLA'}</span>
        </div>
        <p className="text-[13px] leading-[18px] text-mute">
          {luna ? 'Polo sur · 80°S — 90°S. Elegí una región para comparar su relieve con lugares de la Tierra.' : 'Explorá cráteres, llanuras y valles. Elegí una región para extraer un recorte de terreno.'}
        </p>
      </div>
      <dl className="flex flex-col gap-3 rounded-2xl border border-hairline bg-white/[0.03] p-4">
        <div><dt className="label-mono text-mute">Análisis disponible</dt><dd className="text-sm font-semibold">Analogía de relieve</dd><dd className="text-[13px] text-mute">Pendiente · rugosidad · desnivel</dd></div>
        <div><dt className="label-mono text-mute">Ventana de comparación</dt><dd className="metric text-lg font-semibold">20 × 20 km</dd></div>
        <div><dt className="label-mono text-mute">Alcance</dt><dd className="text-[13px] text-mute">{luna ? 'Métricas del polo sur lunar (LOLA a 80 m).' : 'Comparación regional a 2 km por celda. Exploratorio, sin calibrar.'}</dd></div>
      </dl>
      <p className="text-[13px] leading-[18px] text-mute">Los pesos del catálogo terrestre no se aplican acá: el parecido se calcula solo con el relieve.</p>
      <button type="button" onClick={onMethod} className="btn-ghost h-10 w-full">Fuentes y límites del análisis <ConsoleIcon name="external" /></button>
    </div>
  )
}

// Banner de datos de prueba (DESIGN.md, "Telemetry / Mock Data Banner"): fuentes reales que usa la app.
function DataBanner({ onMethod, onFullscreen }: { onMethod: () => void; onFullscreen: () => void }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-space px-3 text-xs text-mute sm:px-5" role="note">
      <span className="flex min-w-0 items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-data" aria-hidden="true" /><span className="truncate">Datos de prueba · puntajes simulados para evaluación</span></span>
      <span className="flex shrink-0 items-center gap-1 text-mute sm:gap-3">
        <span className="hud hidden text-mute/80 xl:flex">MODIS · GPM IMERG · NASADEM · LRO LOLA · MOLA</span>
        <button type="button" onClick={onMethod} className="min-h-9 cursor-pointer rounded-full px-2.5 font-medium text-canvas transition-colors hover:bg-elevated">Fuentes y método</button>
        <button type="button" onClick={onFullscreen} aria-label="Alternar pantalla completa" title="Pantalla completa" className="grid size-9 cursor-pointer place-items-center rounded-full text-canvas transition-colors hover:bg-elevated [&_svg]:size-4"><ConsoleIcon name="expand" /></button>
      </span>
    </div>
  )
}
