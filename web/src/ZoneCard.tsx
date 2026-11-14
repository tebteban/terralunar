import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { LIMITS } from './limits.ts'
import LimitsCard from './LimitsCard.tsx'
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
  mock?: boolean
}

export default function ZoneCard({ ranked: { zone, score }, position, profile, weights, onClose, onCompare, mock = false }: Props) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const dims = Object.entries(profile.dimensions).map(([k, d]) => {
    const s = zone.scores[k] ?? 0
    return { key: k, name: d.name, dataset: d.dataset, score: s, contribution: ((weights[k] ?? 0) * s) / total }
  })
  const datasets = [...new Set([...zone.sources, ...dims.map((d) => d.dataset)])]

  return (
    <article className="absolute inset-x-2 top-2 bottom-2 z-10 flex flex-col gap-5 [&>*]:shrink-0 overflow-y-auto rounded-2xl border border-pressed bg-canvas p-6 text-ink shadow-card md:inset-x-auto md:right-6 md:top-6 md:bottom-6 md:w-[420px]">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-mono text-body">#{String(position).padStart(2, '0')} · {zone.country} · <span className="metric">{zone.area_km2.toLocaleString('es-AR')}</span> km²</p>
          {zone.known && <span className="rounded-full bg-canvas-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink">Análogo conocido</span>}
        </div>
        <h2 className="text-2xl leading-8 font-bold tracking-tight">{zone.name}</h2>
        <p className="metric text-xs text-body">{zone.centroid[1].toFixed(4)}°, {zone.centroid[0].toFixed(4)}°{mock && <span className="font-sans"> · puntaje de demostración</span>}</p>
      </header>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-canvas-softer p-4">
        <div className="flex flex-col">
          <span className="label-mono text-body">Índice ponderado</span>
          <span className="text-[13px] text-body">Similitud con el sitio lunar</span>
        </div>
        <p className="flex items-baseline gap-1">
          <span className="metric text-[42px] leading-none font-bold">{(score * 100).toFixed(0)}</span>
          <span className="metric text-sm text-body">/ 100</span>
        </p>
      </div>

      <button type="button" onClick={onCompare} className="btn-primary h-11 w-full">
        Comparar relieve 3D con la Luna o Marte
      </button>

      <section aria-label="Puntaje por variable" className="flex flex-col gap-1">
        <h3 className="flex items-center justify-between">
          <span className="label-mono text-body">Firma de la zona</span>
          <span className="label-mono text-mute">{dims.length} variables</span>
        </h3>
        <ResponsiveContainer width="100%" height={230}>
          <RadarChart data={dims} outerRadius="55%">
            <PolarGrid stroke="#e2e2e2" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#4c4546', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.12} dot={{ r: 3, fill: '#000' }} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-body">Aporte al puntaje</h3>
        <ul className="flex flex-col gap-2.5">
          {[...dims].sort((a, b) => b.contribution - a.contribution).map((d) => (
            <li key={d.key} className="flex flex-col gap-1">
              <span className="flex justify-between gap-2 font-mono text-[11px]">
                <span className="truncate" title={d.dataset}>{d.name}</span>
                <span className="metric shrink-0 font-bold">+{(d.contribution * 100).toFixed(1)} ptos</span>
              </span>
              <span className="h-1.5 rounded-full bg-pressed">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${(d.contribution / (score || 1)) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <LimitsCard items={LIMITS} />

      <section className="flex flex-col gap-1 font-mono text-[11px] text-body">
        <h3 className="label-mono text-ink">Fuentes</h3>
        <p className="uppercase">{datasets.join(' · ')}</p>
        {zone.notes && <p className="mt-1 font-sans text-[13px] italic">{zone.notes}</p>}
      </section>

      <a href={worldviewUrl(zone.polygon.coordinates[0])} target="_blank" rel="noreferrer" className="btn-secondary w-full">
        Abrir en Worldview (imágenes satelitales) ↗
      </a>
      <button type="button" onClick={onClose} className="btn-secondary mt-auto w-full">
        Cerrar ficha
      </button>
    </article>
  )
}
