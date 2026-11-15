import SurfacePanel from './SurfacePanel.tsx'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import ConsoleIcon from './ConsoleIcon.tsx'
import { coord, num } from './fmt.ts'
import { LIMITS } from './limits.ts'
import LimitsCard from './LimitsCard.tsx'
import { target, type Profile, type Ranked, type Weights, SHORT } from './score.ts'


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
    return { key: k, short: SHORT[k] ?? d.name, name: d.name, dataset: d.dataset, asks: target(d), score: s, weight: (weights[k] ?? 0) / total, contribution: ((weights[k] ?? 0) * s) / total }
  })
  const datasets = [...new Set([...zone.sources, ...dims.map((d) => d.dataset)])]

  return (
    <SurfacePanel label="Ficha de la Tierra">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label-mono text-body">#{String(position).padStart(2, '0')} · {zone.country} · <span className="metric">{zone.area_km2.toLocaleString('es-AR')}</span> km²</p>
          {zone.known && <span className="hud rounded-full bg-canvas-soft px-2.5 py-0.5 font-semibold text-ink">Análogo conocido</span>}
        </div>
        <h2 className="text-2xl leading-8 font-bold tracking-tight">{zone.name}</h2>
        <p className="hud text-body">{coord(zone.centroid[1], zone.centroid[0], 4)}{mock && <span className="font-sans"> · puntaje de demostración</span>}</p>
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

      <button type="button" onClick={onCompare} className="btn-primary w-full">
        Comparar relieve 3D con la Luna o Marte
      </button>

      <section aria-label="Puntaje por variable" className="flex flex-col gap-1">
        <h3 className="flex items-center justify-between">
          <span className="label-mono text-body">Firma de la zona</span>
          <span className="label-mono text-body">{dims.length} variables</span>
        </h3>
        <ResponsiveContainer width="100%" height={230}>
          <RadarChart data={dims} outerRadius="55%">
            <PolarGrid stroke="#ddd9d1" />
            <PolarAngleAxis dataKey="short" tick={{ fill: '#615e58', fontSize: 10.5, fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }} />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#16161a" strokeWidth={2} fill="#16161a" fillOpacity={0.12} dot={{ r: 3, fill: '#16161a' }} isAnimationActive={false} />
            <Tooltip cursor={false} isAnimationActive={false} content={({ payload }) => {
              const d = payload?.[0]?.payload as (typeof dims)[number] | undefined
              return d ? (
                <div className="rounded-xl border border-pressed bg-canvas px-3 py-2 text-xs text-ink shadow-float">
                  <strong className="block">{d.name}</strong>
                  <span className="metric">nota {num(d.score, 2)}</span> · la Luna pide {d.asks}
                  <span className="micro-cap block text-body">{d.dataset}</span>
                </div>
              ) : null
            }} />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="label-mono text-body">Aporte al puntaje</h3>
        <ul className="flex flex-col gap-2.5">
          {[...dims].sort((a, b) => b.contribution - a.contribution).map((d) => (
            // las variables sin peso se atenúan: siguen listadas para que la ficha sea completa, pero no compiten
            <li key={d.key} className={`flex flex-col gap-1 ${d.weight === 0 ? 'opacity-50' : ''}`}>
              <span className="flex justify-between gap-2 text-[12px]">
                <span className="truncate" title={d.dataset}>{d.name} <span className="hud text-body">nota {num(d.score, 2)} · peso {Math.round(d.weight * 100)}%</span></span>
                <span className="metric shrink-0 font-bold">+{num(d.contribution * 100)} ptos</span>
              </span>
              <span className="h-1.5 rounded-full bg-pressed">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${(d.contribution / (score || 1)) * 100}%` }} />
              </span>
              <span className="hud text-body">la Luna pide {d.asks}</span>
            </li>
          ))}
        </ul>
      </section>

      <LimitsCard items={LIMITS} />

      <section className="flex flex-col gap-1 text-body">
        <h3 className="label-mono text-ink">Fuentes</h3>
        <p className="hud uppercase">{datasets.join(' · ')}</p>
        {zone.notes && <p className="mt-1 text-[13px] italic">{zone.notes}</p>}
      </section>

      <a href={worldviewUrl(zone.polygon.coordinates[0])} target="_blank" rel="noreferrer" className="btn-secondary w-full">
        Abrir en Worldview (imágenes satelitales) <ConsoleIcon name="external" />
      </a>
      <button type="button" onClick={onClose} className="btn-secondary mt-auto w-full">
        Cerrar ficha
      </button>
    </SurfacePanel>
  )
}
