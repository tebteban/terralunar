import { useEffect, useMemo, useState } from 'react'
import Compare3D from './Compare3D.tsx'
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
      {DATOS_DE_PRUEBA && <DataBanner />}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className={`${body === 'marte' ? 'hidden' : 'flex'} flex-col gap-7 overflow-y-auto border-r border-hairline bg-rail p-6 text-canvas md:w-[390px] md:shrink-0`}>
        <header className="flex flex-col gap-1">
          <h1 className="text-xl leading-7 font-bold tracking-tight">TerraLunar</h1>
          <p className="text-[13px] leading-[18px] text-mute">Buscador de análogos terrestres para misiones planetarias.</p>
        </header>

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
                    onClick={() => { setBody('tierra'); setSelectedId(zone.id) }}
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
      </aside>

      <main className="relative min-h-[60vh] flex-1 bg-space">
        <div className={body === 'tierra' ? 'h-full' : 'hidden'}><MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} /></div>
        {body === 'luna' && <MoonMap onPickEarth={(id) => { setBody('tierra'); setSelectedId(id) }} />}
        {body === 'marte' && <MarsView onPickEarth={(id) => { setBody('tierra'); setSelectedId(id) }} />}
        <nav className="absolute left-4 top-16 z-10 flex items-center gap-1 rounded-full border border-hairline bg-rail p-1 shadow-float" aria-label="Cuerpo visualizado">
          <button type="button" onClick={() => go('inicio')} className="rounded-full px-3.5 py-1.5 text-sm text-mute hover:text-canvas" aria-label="Volver al inicio">← Inicio</button>
          <span className="h-5 w-px bg-hairline" aria-hidden="true" />
          {(['tierra', 'luna', 'marte'] as const).map(b => (
            <button key={b} type="button" aria-pressed={body === b} onClick={() => setBody(b)}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-mute transition-colors hover:text-canvas aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink">
              {b === 'marte' && <span className="size-2 rounded-full bg-mars" aria-hidden="true" />}
              {{ tierra: 'Tierra', luna: 'Luna', marte: 'Marte' }[b]}
            </button>
          ))}
        </nav>
        {body === 'tierra' && selectedIndex >= 0 && (
          <ZoneCard
            ranked={ranked[selectedIndex]}
            position={selectedIndex + 1}
            profile={profile}
            weights={weights}
            onClose={() => setSelectedId(null)}
            onCompare={() => setComparing(true)}
          />
        )}
        {comparing && selectedId && <Compare3D zoneId={selectedId} onClose={() => setComparing(false)} />}
      </main>
      </div>
    </div>
  )
}

// Banner de datos de prueba (DESIGN.md, "Telemetry / Mock Data Banner"): fuentes reales que usa la app.
function DataBanner() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between gap-4 bg-ink px-4 font-mono text-[11px] tracking-wide text-canvas uppercase" role="note">
      <span className="truncate">Datos de prueba · puntajes simulados para evaluación</span>
      <span className="hidden shrink-0 gap-3 text-mute lg:flex">
        <span>MODIS</span><span>/</span><span>GPM IMERG</span><span>/</span><span>NASADEM</span><span>/</span><span>LRO LOLA</span><span>/</span><span className="text-canvas">MOLA</span>
      </span>
    </div>
  )
}
