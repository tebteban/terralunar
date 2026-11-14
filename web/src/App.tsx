import { useEffect, useMemo, useState } from 'react'
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

  if (error) return <p className="p-6 text-red-400">No se pudieron cargar los datos: {error}</p>
  if (!profile) return <p className="p-6 text-slate-400">Cargando datos…</p>

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className="flex flex-col gap-5 overflow-y-auto border-slate-800 p-4 md:w-96 md:shrink-0 md:border-r">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">TerraLunar</h1>
          <p className="text-sm text-slate-400">Lugares de la Tierra que se parecen a los sitios de bases en la Luna.</p>
        </header>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-300">Destino</span>
          <select className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
            <option value="luna">{profile.name}</option>
            <option disabled>Marte (próximamente)</option>
          </select>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-slate-300">Tipo de prueba</legend>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => choosePreset(p.id)}
                className={`rounded-md border px-2 py-2 text-xs leading-tight transition-colors ${
                  preset === p.id ? 'border-amber-400 bg-amber-400/15 text-amber-200' : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-300">
            Pesos <span className="font-normal text-slate-500">(se reparten en proporción)</span>
          </h2>
          {Object.entries(profile.dimensions).map(([k, d]) => (
            <label key={k} className="flex flex-col gap-1 text-xs">
              <span className="flex justify-between">
                <span>{d.name}</span>
                <span className="tabular-nums text-slate-400">{Math.round((weights[k] ?? 0) * 100)}</span>
              </span>
              <input
                type="range" min={0} max={1} step={0.05} value={weights[k] ?? 0}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                className="accent-amber-400"
              />
            </label>
          ))}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-300">Ranking</h2>
          <ol className="flex flex-col gap-1">
            {ranked.map(({ zone, score }, i) => (
              <li key={zone.id}>
                <button
                  type="button"
                  onClick={() => { setBody('tierra'); setSelectedId(zone.id) }}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    zone.id === selectedId ? 'bg-slate-800' : 'hover:bg-slate-900'
                  }`}
                >
                  <span className="w-5 text-right tabular-nums text-slate-500">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{zone.name}</span>
                    <span className="block text-xs text-slate-500">
                      {zone.country}
                      {zone.known && <span className="ml-2 text-sky-400">análogo conocido</span>}
                    </span>
                  </span>
                  <span className="tabular-nums text-amber-300">{(score * 100).toFixed(0)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <p className="text-xs text-amber-500/80">Datos de prueba (mock): los puntajes todavía no son reales.</p>
      </aside>

      <main className="relative min-h-[60vh] flex-1">
        <div className={body === 'tierra' ? 'h-full' : 'hidden'}><MapView ranked={ranked} selectedId={selectedId} onSelect={setSelectedId} /></div>
        {body === 'luna' && <MoonView />}
        <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-lg border border-slate-600 bg-slate-950/95 p-1" aria-label="Cuerpo visualizado">
          {(['tierra', 'luna'] as const).map(b => <button key={b} type="button" aria-pressed={body === b} onClick={() => setBody(b)} className="rounded px-3 py-2 text-sm text-slate-300 aria-pressed:bg-amber-400/20 aria-pressed:text-amber-200">{b === 'tierra' ? '🌍 Tierra' : '🌕 Luna'}</button>)}
        </div>
        {body === 'tierra' && selectedIndex >= 0 && (
          <ZoneCard
            ranked={ranked[selectedIndex]}
            position={selectedIndex + 1}
            profile={profile}
            weights={weights}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
    </div>
  )
}
