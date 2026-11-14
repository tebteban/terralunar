import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import type { Profile, Ranked, Weights } from './score.ts'

// Lo que ninguna zona de la Tierra puede copiar. Se muestra SIEMPRE en la ficha.
const LIMITS = [
  ['Gravedad', 'La Luna tiene 1/6 de la gravedad terrestre: el polvo, las ruedas y las cargas se comportan distinto.'],
  ['Vacío', 'Sin atmósfera no hay viento, erosión ni aire que transporte calor; el polvo no se asienta igual.'],
  ['Radiación', 'Sin campo magnético ni atmósfera, la radiación solar y cósmica llega directo a la superficie.'],
  ['Comunicaciones', 'Hay ~2,6 s de demora ida y vuelta, y desde el polo sur la Tierra puede quedar bajo el horizonte.'],
]

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
}

export default function ZoneCard({ ranked: { zone, score }, position, profile, weights, onClose }: Props) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const dims = Object.entries(profile.dimensions).map(([k, d]) => {
    const s = zone.scores[k] ?? 0
    return { key: k, name: d.name, dataset: d.dataset, score: s, contribution: ((weights[k] ?? 0) * s) / total }
  })
  const datasets = [...new Set([...zone.sources, ...dims.map((d) => d.dataset)])]

  return (
    <article className="absolute inset-x-2 top-2 bottom-2 flex flex-col gap-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[420px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            #{position} · {zone.country} · {zone.area_km2.toLocaleString('es-AR')} km²
            {zone.known && <span className="ml-2 text-sky-400">análogo conocido</span>}
          </p>
          <h2 className="text-xl font-semibold">{zone.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-amber-300">{(score * 100).toFixed(0)}</p>
          <p className="text-xs text-slate-500">similitud /100</p>
        </div>
      </header>

      <section aria-label="Puntaje por variable">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={dims} outerRadius="60%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.35} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Aporte de cada variable al puntaje</h3>
        <ul className="flex flex-col gap-1.5 text-xs">
          {[...dims].sort((a, b) => b.contribution - a.contribution).map((d) => (
            <li key={d.key} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2">
              <span className="truncate" title={d.dataset}>{d.name}</span>
              <span className="h-1.5 rounded-full bg-slate-800">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(d.contribution / (score || 1)) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-slate-400">+{(d.contribution * 100).toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
        <h3 className="mb-2 text-sm font-semibold text-amber-200">Límites de la analogía</h3>
        <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
          {LIMITS.map(([title, text]) => (
            <li key={title}><strong className="text-amber-100">{title}:</strong> {text}</li>
          ))}
        </ul>
      </section>

      <section className="text-xs text-slate-400">
        <h3 className="mb-1 text-sm font-medium text-slate-300">Fuentes</h3>
        <ul className="list-inside list-disc">
          {datasets.map((s) => <li key={s}>{s}</li>)}
        </ul>
        {zone.notes && <p className="mt-2 italic">{zone.notes}</p>}
      </section>

      <a
        href={worldviewUrl(zone.polygon.coordinates[0])}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-slate-700 py-2 text-center text-sm hover:border-slate-500"
      >
        Abrir en Worldview (imágenes satelitales de la zona) ↗
      </a>

      <button type="button" onClick={onClose} className="mt-auto rounded-md border border-slate-700 py-2 text-sm hover:border-slate-500">
        Cerrar ficha
      </button>
    </article>
  )
}
