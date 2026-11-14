import { localBuffer } from './localData.ts'
import { useEffect, useMemo, useState } from 'react'
import Compare3D, { type CompareIndex } from './Compare3D.tsx'
import { LIMITS } from './limits.ts'
import MoonGlobe, { type GlobeIndex } from './MoonGlobe.tsx'
import MoonView from './MoonView.tsx'
import { latLonToPx } from './moonProj.ts'

interface MoonIndex extends GlobeIndex {
  grid: { file: string; w: number; first_center_px: number; stride_px: number; layers: Metric[]; scale: number[] }
  source: string
}
type Metric = 'pendiente_mediana' | 'pendiente_p90' | 'rugosidad_m' | 'desnivel_m'
type Metrics = Record<Metric, number>
interface EarthItem extends Metrics { id: string; name: string; body: string; file: string; lat: number; lon: number; source: string }

const LABELS: Record<Metric, [string, string]> = {
  pendiente_mediana: ['Pendiente mediana', '°'], pendiente_p90: ['Pendiente alta (p90)', '°'],
  rugosidad_m: ['Rugosidad', ' m'], desnivel_m: ['Desnivel', ' m'],
}
// Tolerancias PROVISORIAS (Brief: ajuste = máx(0, 1 − distancia/tolerancia)); a validar por Civil.
const TOL: Metrics = { pendiente_mediana: 5, pendiente_p90: 8, rugosidad_m: 3, desnivel_m: 1000 }

function similarity(a: Metrics, b: Metrics) {
  const keys = Object.keys(TOL) as Metric[]
  return keys.reduce((s, k) => s + Math.max(0, 1 - Math.abs(a[k] - b[k]) / TOL[k]), 0) / keys.length
}

interface Pick { line: number; sample: number; lat: number; lon: number; m: Metrics }

export default function MoonMap({ onPickEarth }: { onPickEarth: (zoneId: string) => void }) {
  const [index, setIndex] = useState<MoonIndex | null>(null)
  const [grid, setGrid] = useState<Uint16Array | null>(null)
  const [earth, setEarth] = useState<EarthItem[]>([])
  const [pick, setPick] = useState<Pick | null>(null)
  const [compare, setCompare] = useState<CompareIndex | null>(null)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Con token de Cesium se usa la Luna de alta resolución (MoonView); sin token, el globo propio (MoonGlobe).
  const [hiRes, setHiRes] = useState(() => {
    try { return !!(localStorage.getItem('terralunar.cesium-token') || import.meta.env.VITE_CESIUM_ION_TOKEN) } catch { return !!import.meta.env.VITE_CESIUM_ION_TOKEN }
  })

  useEffect(() => {
    let alive = true
    fetch('/moon/index.json').then(r => {
      if (!r.ok) throw new Error('No se pudo cargar el índice lunar')
      return r.json()
    }).then(i => { if (alive) setIndex(i) }).catch(e => { if (alive) setError(String(e)) })
    Promise.all([
      localBuffer('/moon/metrics.bin'),
      fetch('/compare/index.json').then(r => { if (!r.ok) throw new Error('Falta el catálogo terrestre'); return r.json() }),
    ]).then(([g, c]) => {
      if (!alive) return
      setGrid(new Uint16Array(g))
      setEarth(c.items.filter((it: EarthItem) => it.body === 'tierra'))
    }).catch(e => { if (alive) setError(String(e)) })
    return () => { alive = false }
  }, [])

  // píxel LOLA -> métricas de la ventana de 20 km más cercana y coordenadas lunares
  const pickAt = useMemo(() => (line: number, sample: number): Pick | null => {
    if (!index || !grid) return null
    const { w, first_center_px: f, stride_px: s, scale, layers } = index.grid
    const i = Math.min(w - 1, Math.max(0, Math.round((line - f) / s)))
    const j = Math.min(w - 1, Math.max(0, Math.round((sample - f) / s)))
    const m = Object.fromEntries(layers.map((k, l) => [k, grid[l * w * w + i * w + j] / scale[l]])) as Metrics
    const x = (sample - index.lola_offset) * index.lola_res_m
    const y = (index.lola_offset - line) * index.lola_res_m
    const lat = (2 * Math.atan(Math.hypot(x, y) / (2 * index.radius_m)) - Math.PI / 2) * (180 / Math.PI)
    const lon = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
    return { line, sample, lat, lon, m }
  }, [index, grid])

  const matches = useMemo(() => pick
    ? earth.map((e) => ({ e, s: similarity(pick.m, e) })).sort((a, b) => b.s - a.s).slice(0, 6)
    : [], [pick, earth])
  const nearest = useMemo(() => {
    if (!pick || !index) return null
    const d = index.sites.map((s) => ({ s, km: (Math.hypot(s.line - pick.line, s.sample - pick.sample) * index.lola_res_m) / 1000 }))
    return d.sort((a, b) => a.km - b.km)[0]
  }, [pick, index])

  const openCompare = async (e: EarthItem) => {
    if (!pick || !index) return
    const N = index.globe.cap_n, K = index.globe.cap_block, C = 25 // 25 celdas de 800 m = 20 km
    const dem = new Int16Array(await localBuffer(`/moon/${index.globe.cap_dem}`))
    const i0 = Math.round((pick.line + 0.5) / K - 0.5) - 12, j0 = Math.round((pick.sample + 0.5) / K - 0.5) - 12
    const moonH = new Float32Array(C * C)
    for (let i = 0; i < C; i++) for (let j = 0; j < C; j++) {
      const ii = Math.min(N - 1, Math.max(0, i0 + i)), jj = Math.min(N - 1, Math.max(0, j0 + j))
      moonH[i * C + j] = dem[ii * N + jj]
    }
    const src = new DataView(await (await fetch(`/compare/${e.file}`)).arrayBuffer()), earthH = new Float32Array(C * C)
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) { // promedio de bloques 10 x 10 de 80 m
      let sum = 0
      for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) sum += src.getUint16(((y * 10 + j) * 250 + x * 10 + i) * 2, true)
      earthH[y * C + x] = sum / 100
    }
    setCompare({ size_km: 20, res_m: 800, n: C, items: [
      { id: 'luna-elegido', name: 'Punto elegido en la Luna', body: 'luna', file: '', lat: pick.lat, lon: pick.lon, heights: moonH, ...pick.m,
        source: 'LRO LOLA (métricas a 80 m; maqueta promediada a 800 m)' },
      { ...e, body: 'tierra', heights: earthH, source: `${e.source}; maqueta promediada a 800 m` },
    ] })
    setCompareId(e.id)
  }

  const outside = (lat: number) => setNotice(`Tocaste ${lat.toFixed(0)}°: por ahora analizamos el relieve del polo sur (80°–90° S), donde están los sitios de Artemis III. Girá la Luna hacia abajo.`)

  return (
    <div className="relative h-full w-full bg-ink">
      {index && hiRes && <MoonView onUnavailable={() => setHiRes(false)} onPick={(lat, lon) => {
        if (lat > -80) return outside(lat)
        const p = latLonToPx(index, lat, lon)
        setNotice(null); setPick(pickAt(p.line, p.sample))
      }} />}
      {index && !hiRes && <MoonGlobe index={index} pick={pick}
        onPick={(line, sample) => { setNotice(null); setPick(pickAt(line, sample)) }}
        onOutside={outside} />}
      {!hiRes && <p className="pointer-events-none absolute left-4 top-28 rounded-full bg-canvas px-4 py-2 text-xs font-medium text-ink shadow-float">
        Luna 3D · datos locales LRO/LOLA · arrastrá para girar · rueda para acercar · clic en el polo sur
      </p>}
      {notice && <p className="absolute left-4 top-40 max-w-sm rounded-2xl bg-canvas p-4 text-sm text-ink shadow-card">{notice}</p>}
      {compare && compareId && <Compare3D zoneId={compareId} supplied={compare} onClose={() => { setCompare(null); setCompareId(null) }} />}
      {error && <p className="absolute left-4 top-40 text-canvas">No se pudieron cargar los datos lunares: {error}</p>}

      <aside className="absolute inset-x-2 bottom-2 top-auto z-10 flex max-h-[60%] flex-col gap-5 overflow-y-auto rounded-2xl bg-canvas p-6 text-ink shadow-card md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[440px]">
        {!pick ? (
          <>
            <h2 className="text-2xl font-bold leading-8">Elegí un lugar en la Luna</h2>
            <p className="text-base text-body">
              Girá la Luna y hacé clic en cualquier punto del polo sur (el círculo blanco). Medimos el relieve de una ventana de {index?.window_km ?? 20} × {index?.window_km ?? 20} km
              con el altímetro láser LOLA y buscamos los lugares de la Tierra con relieve más parecido.
            </p>
            <div className="flex flex-wrap gap-2">
              {index?.sites.map((s) => (
                <button key={s.name} type="button" onClick={() => setPick(pickAt(s.line, s.sample))}
                  className="rounded-full bg-canvas-soft px-4 py-2 text-sm font-medium hover:bg-pressed">{s.name}</button>
              ))}
            </div>
            <p className="text-xs text-body">Son los accidentes que dan nombre a las regiones candidatas de Artemis III (centros según la IAU).</p>

          </>
        ) : (
          <>
            <header>
              <p className="text-sm text-body">
                {pick.lat.toFixed(2)}°, {pick.lon.toFixed(1)}° E{nearest && ` · a ${nearest.km.toFixed(0)} km de ${nearest.s.name}`}
              </p>
              <h2 className="mt-1 text-2xl font-bold leading-8">Punto elegido en la Luna</h2>
            </header>
            <dl className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS) as Metric[]).map((k) => (
                <div key={k} className="rounded-xl bg-canvas-soft p-3">
                  <dt className="text-xs text-body">{LABELS[k][0]}</dt>
                  <dd className="text-xl font-bold tabular-nums">{Math.round(pick.m[k] * 10) / 10}{LABELS[k][1]}</dd>
                </div>
              ))}
            </dl>
            <section>
              <h3 className="mb-3 text-xl font-bold leading-7">Lugares parecidos en la Tierra</h3>
              <ol className="flex flex-col gap-1">
                {matches.map(({ e, s }) => (
                  <li key={e.id} className="rounded-xl px-3 py-2 hover:bg-canvas-soft">
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{e.name}</span>
                        <span className="block text-xs text-body">
                          pendiente {e.pendiente_mediana}° · rugosidad {e.rugosidad_m} m · desnivel {e.desnivel_m} m
                        </span>
                      </span>
                      <span className="text-lg font-bold tabular-nums">{Math.round(s * 100)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => openCompare(e)} className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-canvas">Comparar relieve 3D</button>
                      <button type="button" onClick={() => onPickEarth(e.id)} className="rounded-full bg-canvas-soft px-3 py-1 text-xs font-medium">Ver en la Tierra</button>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-body">
                Parecido de relieve /100: promedio de ajustes máx(0, 1 − diferencia/tolerancia) con tolerancias provisorias
                (pendiente {TOL.pendiente_mediana}°, p90 {TOL.pendiente_p90}°, rugosidad {TOL.rugosidad_m} m, desnivel {TOL.desnivel_m} m).
                Solo relieve: no incluye temperatura ni suelo. Tocá un lugar para verlo en la Tierra.
              </p>
            </section>
            <section className="rounded-2xl bg-ink p-6 text-canvas">
              <h3 className="mb-3 text-xl font-bold leading-7">Límites de la analogía</h3>
              <ul className="flex flex-col gap-2 text-sm text-pressed">
                {LIMITS.map(([t, x]) => <li key={t}><strong className="font-medium text-canvas">{t}:</strong> {x}</li>)}
              </ul>
            </section>
            <p className="text-xs text-body">Fuente: {index?.source}. Ventanas cada {index ? (index.grid.stride_px * index.lola_res_m) / 1000 : 4} km.</p>
            <button type="button" onClick={() => setPick(null)} className="rounded-full bg-canvas-soft px-4 py-3 text-base font-medium hover:bg-pressed">
              Elegir otro lugar
            </button>
          </>
        )}
      </aside>
    </div>
  )
}
