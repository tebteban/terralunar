import { useEffect, useMemo, useState } from 'react'
import Compare3D from './Compare3D.tsx'
import MapView from './MapView.tsx'
import MoonView from './MoonView.tsx'
import ZoneCard from './ZoneCard.tsx'
import { presetWeights, rank, type Preset, type Profile, type Weights, type Zone } from './score.ts'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'movilidad', label: 'Movilidad de rover' },
  { id: 'excavacion', label: 'Excavación hielo/regolito' },
  { id: 'habitat', label: 'Cimientos de hábitat' },
]

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

export default function App() {
  const [zones, setZones] = useState<Zone[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('movilidad')
  const [weights, setWeights] = useState<Weights>({})
  const [body, setBody] = useState<'tierra' | 'luna'>('tierra')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    Promise.all([getJSON<Zone[]>('/zones.json'), getJSON<Record<string, Profile>>('/profiles.json')])
      .then(([z, p]) => {
        setZones(z)
        setProfiles(p)
        setWeights(presetWeights(p.luna, 'movilidad'))
      })
      .catch((e) => setError(String(e)))
  }, [])

  const profile = profiles?.luna
  const ranked = useMemo(() => rank(zones, weights), [zones, weights])
  const selectedIndex = ranked.findIndex((r) => r.zone.id === selectedId)

  const choosePreset = (p: Preset) => {
    setPreset(p)
    if (profile) setWeights(presetWeights(profile, p))
  }

  if (error) return <p className="p-6 text-ink">No se pudieron cargar los datos: {error}</p>
  if (!profile) return <p className="p-6 text-body">Cargando datos…</p>

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex flex-col gap-8 overflow-y-auto bg-ink p-6 text-canvas md:w-[400px] md:shrink-0">
        <header>
          <h1 className="text-[32px] font-bold leading-10">TerraLunar</h1>
          <p className="mt-2 text-base text-mute">Lugares de la Tierra que se parecen a los sitios de bases en la Luna.</p>
        </header>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Destino</span>
          <select className="rounded-lg bg-elevated px-4 py-3 text-base text-canvas">
            <option value="luna">{profile.name}</option>
            <option disabled>Marte (próximamente)</option>
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-3 text-sm font-medium">Tipo de prueba</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => choosePreset(p.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  preset === p.id ? 'bg-canvas text-ink' : 'bg-elevated text-canvas hover:bg-hairline'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold leading-7">
            Pesos <span className="text-sm font-normal text-mute">se reparten en proporción</span>
          </h2>
          {Object.entries(profile.dimensions).map(([k, d]) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between">
                <span>{d.name}</span>
                <span className="font-medium tabular-nums">{Math.round((weights[k] ?? 0) * 100)}</span>
              </span>
              <input
                type="range" min={0} max={1} step={0.05} value={weights[k] ?? 0}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold leading-7">Ranking</h2>
          <ol className="flex flex-col">
            {ranked.map(({ zone, score }, i) => (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => { setBody('tierra'); setSelectedId(zone.id) }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    zone.id === selectedId ? 'bg-elevated' : 'hover:bg-elevated/60'
                  }`}
                >
                  <span className="w-5 text-right text-sm tabular-nums text-mute">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{zone.name}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-mute">
                      {zone.country}
                      {zone.known && <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-medium text-canvas">análogo conocido</span>}
                    </span>
                  </span>
                  <span className="text-lg font-bold tabular-nums">{(score * 100).toFixed(0)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <p className="rounded-xl bg-elevated p-4 text-sm text-mute">Datos de prueba (mock): los puntajes todavía no son reales.</p>
      </aside>

      <main className="relative min-h-[60vh] flex-1">
        <div className={body === 'tierra' ? 'h-full' : 'hidden'}><MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} /></div>
        {body === 'luna' && <MoonView />}
        <div className="absolute left-4 top-16 z-10 flex gap-1 rounded-full bg-canvas p-1 shadow-float" aria-label="Cuerpo visualizado">
          {(['tierra', 'luna'] as const).map(b => <button key={b} type="button" aria-pressed={body === b} onClick={() => setBody(b)} className="rounded-full px-4 py-2 text-sm font-medium text-ink hover:bg-canvas-soft aria-pressed:bg-ink aria-pressed:text-canvas">{b === 'tierra' ? 'Tierra' : 'Luna'}</button>)}
        </div>
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
  )
}
