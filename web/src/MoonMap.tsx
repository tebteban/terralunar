import SurfacePanel from './SurfacePanel.tsx'
import { earthPatchZone, type PickEarth } from './earthSelection.ts'
import AnalogyScope from './AnalogyScope.tsx'
import { profileScope } from './analogyScope.ts'
import {lunarTarget,type SearchTarget} from './searchTarget.ts'
import { localBuffer } from './localData.ts'
import { useEffect, useMemo, useState } from 'react'
import Compare3D, { type CompareIndex } from './Compare3D.tsx'
import { LIMITS } from './limits.ts'
import LimitsCard from './LimitsCard.tsx'
import MoonGlobe, { type GlobeIndex } from './MoonGlobe.tsx'
import { MOON_TOL, moonSimilarity } from './moonRelief.ts'
import NoWebGL from './NoWebGL.tsx'
import { hasWebGL } from './webgl.ts'
import { coord, degrees, meters } from './fmt.ts'

interface MoonIndex extends GlobeIndex {
  grid: { file: string; w: number; first_center_px: number; stride_px: number; layers: Metric[]; scale: number[] }
  source: string
}
type Metric = 'pendiente_mediana' | 'pendiente_p90' | 'rugosidad_m' | 'desnivel_m'
type Metrics = Record<Metric, number>
interface EarthItem extends Metrics { id: string; name: string; body: string; file: string; lat: number; lon: number; source: string; agua?: number }

const LABELS: Record<Metric, [string, string]> = {
  pendiente_mediana: ['Pendiente mediana', '°'], pendiente_p90: ['Pendiente alta (p90)', '°'],
  rugosidad_m: ['Rugosidad', ' m'], desnivel_m: ['Desnivel', ' m'],
}
// Tolerancias y fórmula de parecido en moonRelief.ts (compartidas con el comparador 3D)
const TOL = MOON_TOL
const similarity = moonSimilarity

interface Pick { line: number; sample: number; lat: number; lon: number; m: Metrics }

export default function MoonMap({ onPickEarth,onAnalyze }: { onPickEarth: PickEarth;onAnalyze?:(target:SearchTarget)=>void }) {
  const [experiment,setExperiment]=useState('regional')
  const canRank=profileScope(experiment).canScreen
  const [index, setIndex] = useState<MoonIndex | null>(null)
  const [grid, setGrid] = useState<Uint16Array | null>(null)
  const [earth, setEarth] = useState<EarthItem[]>([])
  const [pick, setPick] = useState<Pick | null>(null)
  // Ficha plegable (D-021): el estado vive acá para que el globo use todo el ancho cuando está plegada
  const [panelOpen, setPanelOpen] = useState(false)
  const pickKey = pick ? `${pick.lat},${pick.lon}` : undefined
  const [lastPickKey, setLastPickKey] = useState(pickKey)
  if (pickKey !== lastPickKey) {
    setLastPickKey(pickKey)
    if (pickKey) setPanelOpen(true)
  }
  const [compare, setCompare] = useState<CompareIndex | null>(null)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
      setEarth(c.items.filter((it: EarthItem) => it.body === 'tierra' && !it.agua))
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
    line = f + i * s
    sample = f + j * s
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
    const src = new DataView(await localBuffer(`/compare/${e.file}`)), earthH = new Float32Array(C * C)
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

  const analyze=async()=>{if(!pick||!onAnalyze)return;try{onAnalyze({...await lunarTarget(pick.line,pick.sample,pick.lat,pick.lon),experiment})}catch(e){setNotice(String(e))}}
  const outside = (lat: number) => setNotice(`Tocaste ${lat.toFixed(0)}°: por ahora analizamos el relieve del polo sur (80°–90° S), donde están los sitios de Artemis III. Girá la Luna hacia abajo.`)

  return (
    <div className="relative h-full w-full bg-space">
      {pick&&onAnalyze&&canRank&&<button className="absolute bottom-4 left-4 z-30 btn-primary" onClick={analyze}>Buscar análogos de esta región</button>}
      {!hasWebGL() && <NoWebGL what="la Luna en 3D" href="https://trek.nasa.gov/moon/" label="Abrir NASA Moon Trek" />}
      {!index && !error && hasWebGL() && <div className="flex h-full items-center justify-center" role="status"><div className="flex w-56 flex-col gap-2"><span className="hud text-mute">Cargando relieve LOLA…</span><span className="loading-bar" aria-hidden="true" /></div></div>}
      {index && hasWebGL() && <MoonGlobe index={index} pick={pick} panelOpen={panelOpen}
        onPick={(line, sample) => { setNotice(null); setPick(pickAt(line, sample)) }}
        onOutside={outside} />}
      <div className="pointer-events-none absolute left-4 top-32 z-[1] hidden flex-col gap-1 rounded-2xl border border-hairline bg-rail/85 px-4 py-3 shadow-float lg:flex">
        <span className="label-mono text-mute">Elegí un lugar en la Luna</span>
        <span className="metric text-[22px] leading-7 font-semibold text-canvas">Polo sur · 80°S — 90°S</span>
        <span className="hud text-mute">LRO LOLA · proyección polar</span>
      </div>
      {<p className="chip-dark pointer-events-none absolute bottom-6 left-6 z-[1] hidden font-mono text-xs font-normal lg:inline-flex">
        Arrastrá para girar · rueda para acercar · clic en el polo sur
      </p>}
      {notice && <p role="status" className="absolute left-6 top-56 z-[1] max-w-sm rounded-2xl border border-pressed bg-canvas p-4 text-sm text-ink shadow-card">{notice}</p>}
      {compare && compareId && <Compare3D zoneId={compareId} supplied={compare} onClose={() => { setCompare(null); setCompareId(null) }} />}
      {error && <p role="alert" className="chip-dark absolute left-6 top-56 z-[1] max-w-sm text-xs">No se pudieron cargar los datos lunares: {error}</p>}

      <SurfacePanel label="Ficha de la Luna" collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <label className="flex flex-col gap-2 text-sm">Destino de misión · Luna
          <select aria-label="Destino lunar" value={index?.sites.find(s=>s.line===pick?.line&&s.sample===pick?.sample)?.name ?? ''} onChange={e=>{const site=index?.sites.find(s=>s.name===e.target.value);if(site)setPick(pickAt(site.line,site.sample))}}>
            <option value="">{pick?'Punto seleccionado en el mapa':'Elegí una región o un punto'}</option>
            {index?.sites.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </label>
        <AnalogyScope value={experiment} onChange={setExperiment} disabled={false}/>
        {!pick ? (
          <>
            <header className="flex flex-col gap-1.5">
              <span className="label-mono text-body">Luna · polo sur</span>
              <h2 className="text-2xl leading-8 font-bold tracking-tight">Elegí un lugar en la Luna</h2>
            </header>
            <p className="text-sm leading-5 text-body">
              Girá la Luna y hacé clic en cualquier punto del polo sur (el círculo blanco). Medimos el relieve de una ventana de <span className="metric">{index?.window_km ?? 20} × {index?.window_km ?? 20}</span> km
              con el altímetro láser LOLA y buscamos los lugares de la Tierra con relieve más parecido.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {index?.sites.map((s) => (
                <button key={s.name} type="button" onClick={() => setPick(pickAt(s.line, s.sample))}
                  className="min-h-9 rounded-full bg-canvas-soft px-3 font-mono text-xs text-body transition-colors hover:bg-ink hover:text-canvas">{s.name}</button>
              ))}
            </div>
            <p className="text-xs text-body">Son los accidentes que dan nombre a las regiones candidatas de Artemis III (centros según la IAU).</p>
            <LimitsCard items={LIMITS} />
          </>
        ) : (
          <>
            <header className="flex flex-col gap-1.5">
              <span className="label-mono text-body">Centro de la ventana analizada</span>
              <h2 className="text-2xl leading-8 font-bold tracking-tight">Punto elegido en la Luna</h2>
              <p className="hud text-xs text-body">
                {coord(pick.lat, pick.lon)}{nearest && ` · a ${nearest.km.toFixed(0)} km de ${nearest.s.name}`}
              </p>
            </header>
            <p className="text-xs text-body">El clic se ajusta al centro disponible de la grilla LOLA (paso de {index ? index.grid.stride_px * index.lola_res_m / 1000 : 4} km). Estas coordenadas identifican la ventana utilizada para el ranking.</p>
            <dl className="grid grid-cols-2 gap-2">
              {(Object.keys(LABELS) as Metric[]).map((k) => (
                <div key={k} className="flex flex-col gap-1 rounded-2xl bg-canvas-soft p-4">
                  <dt className="text-[13px] text-body">{LABELS[k][0]}</dt>
                  <dd className="metric text-[22px] leading-7 font-semibold">{k.startsWith('pendiente') ? degrees(pick.m[k]) : meters(pick.m[k])}</dd>
                  <span className="micro-cap text-[10px] text-body">LOLA · ventana 20 km</span>
                </div>
              ))}
            </dl>
            <section className="flex flex-col gap-2">
              <h3 className="text-lg leading-7 font-bold tracking-tight">Paisajes terrestres de contexto</h3>
              <ol className="flex flex-col gap-2">
                {(canRank?matches:[]).map(({ e, s }, i) => (
                  <li key={e.id} className="flex flex-col gap-2.5 rounded-2xl bg-canvas-softer p-4 transition-colors hover:bg-canvas-soft">
                    <div className="flex items-start gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{e.name}</span>
                        <span className="hud block text-body">
                          pend. {degrees(e.pendiente_mediana)} · rug. {meters(e.rugosidad_m)} · desn. {meters(e.desnivel_m)}
                        </span>
                      </span>
                      <span className={`metric rounded-full px-2.5 py-1 text-xs font-bold ${i === 0 ? 'bg-ink text-canvas' : 'bg-pressed text-ink'}`}>{Math.round(s * 100)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openCompare(e)} className="btn-primary btn-sm">Comparar relieve 3D</button>
                      <button type="button" onClick={() => onPickEarth(e.id, earthPatchZone(e), s*100)} className="btn-secondary btn-sm">Ver en la Tierra</button>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="rounded-2xl bg-canvas-soft p-3 font-mono text-[11px] leading-relaxed text-body">
                Parecido de relieve /100 = promedio de máx(0, 1 − diferencia/tolerancia). Tolerancias provisorias:
                pendiente {TOL.pendiente_mediana}°, p90 {TOL.pendiente_p90}°, rugosidad {TOL.rugosidad_m} m, desnivel {TOL.desnivel_m} m.
                Solo relieve: no incluye temperatura ni suelo. Métricas a 80 m; no comparar este puntaje directamente con Marte a 2 km. La búsqueda científica utiliza 2 km en ambos cuerpos.
              </p>
            </section>
            <LimitsCard items={LIMITS} />
            <p className="flex justify-between gap-2 border-t border-pressed pt-2 font-mono text-[11px] text-body">
              <span>Fuente: {index?.source}</span>
              <span className="shrink-0">cada {index ? (index.grid.stride_px * index.lola_res_m) / 1000 : 4} km</span>
            </p>
            <button type="button" onClick={() => setPick(null)} className="btn-secondary w-full">Elegir otro lugar</button>
          </>
        )}
      </SurfacePanel>
    </div>
  )
}
