import type {SearchTarget} from './searchTarget.ts'
import ScientificSearch from './ScientificSearch.tsx'
import { useEffect, useMemo, useState } from 'react'
import Compare3D from './Compare3D.tsx'
import ConsoleIcon from './ConsoleIcon.tsx'
import MethodDialog from './MethodDialog.tsx'
import CustomSearch, { type Selection } from './CustomSearch.tsx'
import Landing, { type LandingChoice } from './Landing.tsx'
import MapView from './MapView.tsx'
import MoonMap from './MoonMap.tsx'
import MarsView from './MarsView.tsx'
import ZoneCard from './ZoneCard.tsx'
import { presetWeights, rank, type Preset, type Profile, type Weights, type Zone } from './score.ts'

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

// La pantalla vive en la URL (#personalizado, #explorar, #marte) para que funcione el botón "atrás".
function fromHash(): { screen: Screen; body: Body } {
  const h = window.location.hash.slice(1)
  if (h === 'personalizado') return { screen: 'personalizado', body: 'tierra' }
  if (h === 'marte') return { screen: 'explorar', body: 'marte' }
  if (h === 'explorar') return { screen: 'explorar', body: 'tierra' }
  return { screen: 'inicio', body: 'tierra' }
}

export default function App() {
  const [searchTarget,setSearchTarget]=useState<SearchTarget|null>(null)
  const analyze=(target:SearchTarget)=>{setSearchTarget(target);setScientificOpen(true)}
  const [scientificOpen,setScientificOpen]=useState(false)
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

  useEffect(() => {
    Promise.all([getJSON<Zone[]>('/zones.json'), getJSON<Record<string, Profile>>('/profiles.json')])
      .then(([z, p]) => {
        setZones(z)
        setProfiles(p)
        setWeights(presetWeights(p.luna, 'movilidad'))
      })
      .catch((e) => setError(String(e)))
  }, [])

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

  const choosePreset = (p: Preset) => {
    setPreset(p)
    setCustom(null)
    if (profile) setWeights(presetWeights(profile, p))
  }

  const pickEarth = (id: string) => { setDiscovery(null); setBody('tierra'); setComparing(false); setSelectedId(id) }
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() }
    catch { setNotice('La pantalla completa no está disponible en este navegador.') }
  }

  const pick = (c: LandingChoice) => {
    setSelectedId(null)
    setComparing(false)
    if (c === 'personalizado') return go('personalizado')
    if (c === 'luna') choosePreset(preset)
    go('explorar', c === 'marte' ? 'marte' : 'tierra')
  }

  // La portada no depende de los datos: se muestra mientras cargan.
  if (screen === 'inicio') return (
    <Landing onPick={pick} mock={DATOS_DE_PRUEBA} />
  )
  if (error) return <p className="p-6 text-canvas">No se pudieron cargar los datos: {error}</p>
  if (!profile) return <p className="p-6 text-mute">Cargando datos…</p>

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

  return (
    <div className="flex h-full flex-col bg-space">
      {DATOS_DE_PRUEBA && <DataBanner onMethod={() => setMethodOpen(true)} onFullscreen={fullscreen} />}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className={`flex flex-col gap-7 overflow-y-auto border-r border-hairline bg-rail p-6 text-canvas md:w-[390px] md:shrink-0`}>
        <button className="btn-primary" onClick={()=>setScientificOpen(true)}>Comparación científica</button><header className="flex flex-col gap-1">
          <h1 className="text-xl leading-7 font-bold tracking-tight">TerraLunar</h1>
          <p className="text-[13px] leading-[18px] text-mute">Buscador de análogos terrestres para misiones planetarias.</p>
        </header>

        {body !== 'tierra' ? <PlanetOverview body={body} onMethod={() => setMethodOpen(true)} /> : <>
        <label className="flex flex-col gap-2">
          <span className="label-mono text-mute">Destino de misión</span>
          <select className="h-11 rounded-full border border-hairline bg-white/5 px-4 text-sm text-canvas focus:outline-2 focus:outline-canvas">
            <option value="luna" className="bg-rail">{profile.name}</option>
            <option disabled className="bg-rail">Marte: solo relieve, en la pestaña Marte</option>
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-mono mb-2 text-mute">Tipo de prueba</legend>
          <div className="flex flex-wrap gap-1.5 rounded-[22px] bg-white/5 p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id && !isCustom}
                onClick={() => choosePreset(p.id)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  preset === p.id && !isCustom ? 'bg-canvas font-semibold text-ink' : 'text-mute hover:text-canvas'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {custom !== null && (
            <p className="flex items-center justify-between gap-2 text-[13px] text-mute">
              <span>Búsqueda personalizada · {Object.keys(custom).length} variables</span>
              <button type="button" onClick={() => go('personalizado')} className="shrink-0 font-medium text-canvas underline underline-offset-2">
                Editar
              </button>
            </p>
          )}
          {custom === null && isCustom && (
            <p className="flex items-center justify-between gap-2 text-[13px] text-mute">
              <span>Personalizado (basado en «{PRESETS.find((p) => p.id === preset)?.label}»)</span>
              <button type="button" onClick={() => choosePreset(preset)} className="shrink-0 font-medium text-canvas underline underline-offset-2">
                Restaurar
              </button>
            </p>
          )}
        </fieldset>

        <section className="flex flex-col gap-3">
          <h2 className="flex flex-col gap-1">
            <span className="label-mono text-mute">Pesos de similitud</span>
            <span className="text-[13px] leading-[18px] text-mute/80">Arrastrá cada control: el ranking se recalcula en el momento.</span>
          </h2>
          {visibleDims.map(([k, d]) => (
            <label key={k} className="flex flex-col gap-1.5">
              <span className="flex justify-between text-[13px]">
                <span className="text-pressed" title={d.dataset}>{d.name}</span>
                <span className="metric text-[13px] font-semibold">
                  {totalWeight > 0 ? Math.round(((weights[k] ?? 0) / totalWeight) * 100) : 0}%
                </span>
              </span>
              <input
                type="range" min={0} max={1} step={0.05} value={weights[k] ?? 0}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
          {totalWeight === 0 && (
            <p role="alert" className="rounded-2xl border border-canvas p-3 text-sm font-medium text-canvas">Todos los pesos están en 0: el ranking no tiene sentido. Subí al menos uno.</p>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="flex items-center justify-between">
            <span className="label-mono text-mute">Ranking de sitios terrestres</span>
            <span className="metric text-[13px] font-medium text-pressed">{ranked.length} sitios</span>
          </h2>
          <ol className="flex flex-col gap-1">
            {ranked.map(({ zone, score }, i) => {
              const on = zone.id === selectedId
              return (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => pickEarth(zone.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
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
                    </span>
                    <span className="metric text-[22px] leading-7 font-semibold">{(score * 100).toFixed(0)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
        <div className="flex flex-col gap-2 rounded-2xl border border-hairline bg-white/[0.03] p-4 text-[13px] leading-[18px] text-mute">
          <strong className="text-canvas">Catálogo en preparación</strong>
          <p>Estos pesos modifican solo el ranking terrestre de demostración. Luna y Marte usan comparaciones de relieve independientes.</p>
        </div>
        <button type="button" onClick={() => setMethodOpen(true)} className="btn-ghost h-10 w-full">Fuentes y método ↗</button>
        </>}
      </aside>

      <main className="relative min-h-[60vh] flex-1 bg-space">
        <div className={body === 'tierra' ? 'h-full' : 'hidden'}><MapView ranked={discovery?[{zone:discovery.zone,score:discovery.score/100}]:ranked} selectedId={selectedId} onSelect={pickEarth} /></div>
        {body === 'luna' && <MoonMap onAnalyze={analyze} onPickEarth={pickEarth} />}
        {body === 'marte' && <MarsView onAnalyze={analyze} onPickEarth={pickEarth} />}
        <nav className="absolute left-4 top-16 z-10 flex items-center gap-1 rounded-full border border-hairline bg-rail p-1 shadow-float" aria-label="Cuerpo visualizado">
          <button type="button" onClick={() => go('inicio')} className="rounded-full px-3.5 py-1.5 text-sm text-mute hover:text-canvas" aria-label="Volver al inicio">← Inicio</button>
          <span className="h-5 w-px bg-hairline" aria-hidden="true" />
          {(['tierra', 'luna', 'marte'] as const).map(b => (
            <button key={b} type="button" aria-pressed={body === b && !comparing} onClick={() => { setBody(b); setComparing(false) }}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-mute transition-colors hover:text-canvas aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink">
              {b === 'marte' && <span className="size-2 rounded-full bg-mars" aria-hidden="true" />}
              {{ tierra: 'Tierra', luna: 'Luna', marte: 'Marte' }[b]}
            </button>
          ))}
          <span className="h-5 w-px bg-hairline" aria-hidden="true" />
          <button type="button" disabled={!selectedId || !!discovery} aria-pressed={comparing} onClick={() => setComparing(true)}
            title={selectedId ? 'Comparar el relieve del candidato elegido' : 'Elegí un lugar del ranking para comparar'}
            className="rounded-full px-4 py-1.5 text-sm text-mute transition-colors hover:text-canvas disabled:opacity-40 disabled:hover:text-mute aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink">
            Comparador 3D
          </button>
        </nav>
        {body === 'tierra' && !discovery && selectedIndex >= 0 && (
          <ZoneCard
            ranked={ranked[selectedIndex]}
            position={selectedIndex + 1}
            profile={profile}
            weights={weights}
            onClose={() => setSelectedId(null)}
            onCompare={() => setComparing(true)}
            mock={DATOS_DE_PRUEBA}
          />
        )}
        {comparing && selectedId && !discovery && <Compare3D zoneId={selectedId} onClose={() => setComparing(false)} />}
      </main>
      </div>
      {scientificOpen&&<ScientificSearch selectedTarget={searchTarget} onClose={()=>setScientificOpen(false)} onSelect={(id,zone,score)=>{pickEarth(id);if(zone)setDiscovery({zone,score:score??0})}}/>}
      {discovery&&body==='tierra'&&<aside className="fixed right-6 bottom-6 z-20 max-w-sm rounded-2xl bg-white p-6 text-black"><h2>{discovery.zone.name}</h2><p>{discovery.score.toFixed(1)}/100 · similitud topográfica</p><p>{discovery.zone.centroid.join(', ')} · 20 × 20 km</p><p>{discovery.zone.notes}</p><button onClick={()=>setScientificOpen(true)}>Volver a búsqueda</button><button onClick={()=>{setDiscovery(null);setSelectedId(null)}}>Cerrar candidato</button></aside>}
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
          <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${luna ? 'bg-white/10 text-canvas' : 'bg-mars/15 text-[#ffb59c]'}`}>{luna ? 'LRO / LOLA' : 'MGS / MOLA'}</span>
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
      <button type="button" onClick={onMethod} className="btn-ghost h-10 w-full">Fuentes y límites del análisis ↗</button>
    </div>
  )
}

// Banner de datos de prueba (DESIGN.md, "Telemetry / Mock Data Banner"): fuentes reales que usa la app.
function DataBanner({ onMethod, onFullscreen }: { onMethod: () => void; onFullscreen: () => void }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-space px-5 text-xs text-mute" role="note">
      <span className="flex min-w-0 items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-data" aria-hidden="true" /><span className="truncate">Datos de prueba · puntajes simulados para evaluación</span></span>
      <span className="flex shrink-0 items-center gap-3 text-mute">
        <span className="hidden gap-2 xl:flex text-mute/80">MODIS · GPM IMERG · NASADEM · LRO LOLA · MOLA</span>
        <button type="button" onClick={onMethod} className="cursor-pointer rounded-full px-2 py-0.5 font-medium text-canvas transition-colors hover:bg-elevated">Fuentes y método</button>
        <button type="button" onClick={onFullscreen} aria-label="Alternar pantalla completa" title="Pantalla completa" className="grid size-7 cursor-pointer place-items-center rounded-full text-canvas transition-colors hover:bg-elevated [&_svg]:size-4"><ConsoleIcon name="expand" /></button>
      </span>
    </div>
  )
}
