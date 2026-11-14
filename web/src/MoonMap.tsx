import { Map as MapLibre, Marker, NavigationControl, type GeoJSONSource } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LIMITS } from './limits.ts'

// Mapa del polo sur lunar (LOLA, estereográfica polar). La imagen se apoya en un cuadrado "falso" de
// ±L grados para usar MapLibre (zoom, arrastre, clic); las coordenadas lunares se calculan aparte.
const L = 5
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const YL = mercY(L)
const toMap = (fx: number, fy: number): [number, number] =>
  [-L + 2 * L * fx, ((2 * Math.atan(Math.exp(YL - 2 * YL * fy)) - Math.PI / 2) * 180) / Math.PI]
const fromMap = (lng: number, lat: number) => ({ fx: (lng + L) / (2 * L), fy: (YL - mercY(lat)) / (2 * YL) })

interface MoonIndex {
  image: string; lola_px: number; lola_res_m: number; lola_offset: number; radius_m: number
  grid: { file: string; w: number; first_center_px: number; stride_px: number; layers: Metric[]; scale: number[] }
  window_km: number; source: string
  sites: { name: string; lat: number; lon: number; line: number; sample: number; ref: string; url: string }[]
}
type Metric = 'pendiente_mediana' | 'pendiente_p90' | 'rugosidad_m' | 'desnivel_m'
type Metrics = Record<Metric, number>
interface EarthItem extends Metrics { id: string; name: string; body: string }

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
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | null>(null)
  const [index, setIndex] = useState<MoonIndex | null>(null)
  const [grid, setGrid] = useState<Uint16Array | null>(null)
  const [earth, setEarth] = useState<EarthItem[]>([])
  const [pick, setPick] = useState<Pick | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/moon/index.json').then((r) => r.json()),
      fetch('/moon/metrics.bin').then((r) => r.arrayBuffer()),
      fetch('/compare/index.json').then((r) => r.json()),
    ]).then(([i, g, c]) => {
      setIndex(i)
      setGrid(new Uint16Array(g))
      setEarth(c.items.filter((it: EarthItem) => it.body === 'tierra'))
    }).catch((e) => setError(String(e)))
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

  useEffect(() => {
    if (!index || !container.current) return
    const n = index.lola_px
    const m = new MapLibre({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#000000' } }] },
      center: [0, 0], zoom: 4, minZoom: 3, maxZoom: 10, renderWorldCopies: false,
      maxBounds: [[-L * 1.4, -L * 1.4], [L * 1.4, L * 1.4]], attributionControl: false,
    })
    map.current = m
    m.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('load', () => {
      m.addSource('moon', { type: 'image', url: `/moon/${index.image}`, coordinates: [toMap(0, 0), toMap(1, 0), toMap(1, 1), toMap(0, 1)] })
      m.addLayer({ id: 'moon', type: 'raster', source: 'moon' })
      m.addSource('pick', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'pick', type: 'line', source: 'pick', paint: { 'line-color': '#ffffff', 'line-width': 2 } })
      m.fitBounds([toMap(0, 1), toMap(1, 0)], { padding: { top: 20, bottom: 20, left: 20, right: 480 }, duration: 0 })
    })
    for (const s of index.sites) {
      const el = document.createElement('div')
      el.className = 'flex items-center gap-1 text-xs font-medium'
      el.innerHTML = `<span class="h-2 w-2 rounded-full bg-white"></span><span class="rounded-full bg-black/70 px-2 py-0.5 text-white"></span>`
      el.lastElementChild!.textContent = s.name
      new Marker({ element: el, anchor: 'left' }).setLngLat(toMap((s.sample + 0.5) / n, (s.line + 0.5) / n)).addTo(m)
    }
    m.on('click', (e) => {
      const { fx, fy } = fromMap(e.lngLat.lng, e.lngLat.lat)
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return
      setPick(pickAt(fy * n - 0.5, fx * n - 0.5))
    })
    return () => m.remove()
  }, [index, pickAt])

  // cuadrado de 20 x 20 km alrededor del punto elegido
  useEffect(() => {
    const m = map.current
    const src = m?.getSource('pick') as GeoJSONSource | undefined
    if (!src || !index) return
    if (!pick) { src.setData({ type: 'FeatureCollection', features: [] }); return }
    const n = index.lola_px
    const h = (index.window_km * 1000) / index.lola_res_m / 2
    const c = (dl: number, ds: number) => toMap((pick.sample + ds + 0.5) / n, (pick.line + dl + 0.5) / n)
    src.setData({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[c(-h, -h), c(-h, h), c(h, h), c(h, -h), c(-h, -h)]] } })
    m!.easeTo({ center: c(0, 0), padding: { top: 0, bottom: 0, left: 0, right: window.innerWidth >= 768 ? 460 : 0 }, duration: 600 })
  }, [pick, index])

  const matches = useMemo(() => pick
    ? earth.map((e) => ({ e, s: similarity(pick.m, e) })).sort((a, b) => b.s - a.s).slice(0, 6)
    : [], [pick, earth])
  const nearest = useMemo(() => {
    if (!pick || !index) return null
    const d = index.sites.map((s) => ({ s, km: (Math.hypot(s.line - pick.line, s.sample - pick.sample) * index.lola_res_m) / 1000 }))
    return d.sort((a, b) => a.km - b.km)[0]
  }, [pick, index])

  return (
    <div className="relative h-full w-full bg-ink">
      <div ref={container} className="h-full w-full" role="region" aria-label="Mapa de relieve del polo sur lunar" />
      <p className="pointer-events-none absolute left-4 top-28 rounded-full bg-canvas px-4 py-2 text-xs font-medium text-ink shadow-float">
        Polo sur lunar (80°–90° S) · arriba = longitud 0°
      </p>
      {error && <p className="absolute left-4 top-40 text-canvas">No se pudieron cargar los datos lunares: {error}</p>}

      <aside className="absolute inset-x-2 bottom-2 top-auto z-10 flex max-h-[60%] flex-col gap-5 overflow-y-auto rounded-2xl bg-canvas p-6 text-ink shadow-card md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[440px]">
        {!pick ? (
          <>
            <h2 className="text-2xl font-bold leading-8">Elegí un lugar en la Luna</h2>
            <p className="text-base text-body">
              Hacé clic en cualquier punto del mapa. Medimos el relieve de una ventana de {index?.window_km ?? 20} × {index?.window_km ?? 20} km
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
                  <li key={e.id}>
                    <button type="button" onClick={() => onPickEarth(e.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-canvas-soft">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{e.name}</span>
                        <span className="block text-xs text-body">
                          pendiente {e.pendiente_mediana}° · rugosidad {e.rugosidad_m} m · desnivel {e.desnivel_m} m
                        </span>
                      </span>
                      <span className="text-lg font-bold tabular-nums">{Math.round(s * 100)}</span>
                    </button>
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
