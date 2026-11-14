import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { LIMITS } from './limits.ts'
import type { Profile, Ranked, Weights } from './score.ts'


// Capas de Worldview equivalentes a nuestras dimensiones. La 1ª queda arriba; "(hidden)" = cargada pero apagada.
const WORLDVIEW_LAYERS = [
  'Reference_Labels_15m',
  'Coastlines_15m',
  'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day(hidden)',
  'MODIS_Terra_L3_NDVI_Monthly(hidden)',
  'MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct(hidden)',
  'ASTER_GDEM_Greyscale_Shaded_Relief(hidden)',
  'MODIS_Terra_CorrectedReflectance_TrueColor',
].join(',')

function worldviewUrl(ring: number[][]) {
  const lons = ring.map((c) => c[0])
  const lats = ring.map((c) => c[1])
  const pad = 0.5 // grados de margen alrededor de la zona
  const v = [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad]
  // hace 90 días: las capas mensuales (NDVI, nieve) tardan semanas en publicarse
  const fecha = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
  return `https://worldview.earthdata.nasa.gov/?v=${v.map((n) => n.toFixed(3)).join(',')}&l=${WORLDVIEW_LAYERS}&t=${fecha}`
}

interface Props {
  ranked: Ranked
  position: number
  profile: Profile
  weights: Weights
  onClose: () => void
  onCompare: () => void
}

export default function ZoneCard({ ranked: { zone, score }, position, profile, weights, onClose, onCompare }: Props) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const dims = Object.entries(profile.dimensions).map(([k, d]) => {
    const s = zone.scores[k] ?? 0
    return { key: k, name: d.name, dataset: d.dataset, score: s, contribution: ((weights[k] ?? 0) * s) / total }
  })
  const datasets = [...new Set([...zone.sources, ...dims.map((d) => d.dataset)])]

  return (
    <article className="absolute inset-x-2 top-2 bottom-2 z-10 flex flex-col gap-6 overflow-y-auto rounded-2xl bg-canvas p-6 text-ink shadow-card md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[440px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-body">
            #{position} · {zone.country} · {zone.area_km2.toLocaleString('es-AR')} km²
            {zone.known && <span className="rounded-full bg-canvas-soft px-2 py-0.5 text-xs font-medium text-ink">análogo conocido</span>}
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-8">{zone.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-[36px] font-bold leading-[44px] tabular-nums">{(score * 100).toFixed(0)}</p>
          <p className="whitespace-nowrap text-xs text-body">similitud /100</p>
        </div>
      </header>

      <button type="button" onClick={onCompare}
        className="rounded-full bg-ink px-4 py-3 text-base font-medium text-canvas hover:bg-elevated">
        Comparar relieve con la Luna en 3D
      </button>

      <section aria-label="Puntaje por variable">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={dims} outerRadius="60%">
            <PolarGrid stroke="#e2e2e2" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#5e5e5e', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.12} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3 className="mb-3 text-xl font-bold leading-7">Aporte al puntaje</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {[...dims].sort((a, b) => b.contribution - a.contribution).map((d) => (
            <li key={d.key} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2">
              <span className="truncate" title={d.dataset}>{d.name}</span>
              <span className="h-2 rounded-full bg-canvas-soft">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${(d.contribution / (score || 1)) * 100}%` }} />
              </span>
              <span className="text-right font-medium tabular-nums">+{(d.contribution * 100).toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-ink p-6 text-canvas">
        <h3 className="mb-3 text-xl font-bold leading-7">Límites de la analogía</h3>
        <ul className="flex flex-col gap-2 text-sm text-pressed">
          {LIMITS.map(([title, text]) => (
            <li key={title}><strong className="font-medium text-canvas">{title}:</strong> {text}</li>
          ))}
        </ul>
      </section>

      <section className="text-sm text-body">
        <h3 className="mb-2 text-base font-medium text-ink">Fuentes</h3>
        <ul className="list-inside list-disc">
          {datasets.map((s) => <li key={s}>{s}</li>)}
        </ul>
        {zone.notes && <p className="mt-2 italic">{zone.notes}</p>}
      </section>

      <a
        href={worldviewUrl(zone.polygon.coordinates[0])}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-canvas-soft px-4 py-3 text-center text-base font-medium hover:bg-pressed"
      >
        Abrir en Worldview (imágenes satelitales de la zona) ↗
      </a>

      <button type="button" onClick={onClose} className="mt-auto rounded-full bg-canvas-soft px-4 py-3 text-base font-medium hover:bg-pressed">
        Cerrar ficha
      </button>
    </article>
  )
}
