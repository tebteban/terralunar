import {evaluateGeomechanics, geoProfileFor, type GeoInput} from './geomechanics.ts'
import {num} from './fmt.ts'

// Consideraciones geomecánicas del equipo de Civil aplicadas al candidato terrestre (D-024).
// Muestra cada criterio con su estado real: medido (con valor y nota) o pendiente (con el dato que falta).
export default function GeomechanicsCard({target, input}: {target: {name: string; body: 'luna' | 'marte'}; input: GeoInput}) {
  const profile = geoProfileFor(target)
  if (!profile) {
    return (
      <details>
        <summary className="cursor-pointer font-semibold">Consideraciones geomecánicas</summary>
        <p className="my-2 text-sm text-body">
          Los criterios geomecánicos del equipo están definidos para <strong>Mons Mouton</strong> (Luna) y <strong>Arcadia Planitia</strong> (Marte).
          Este destino ({target.name}) no tiene perfil propio, así que no se evalúa: aplicar umbrales de otro sitio sería inventar la analogía.
        </p>
      </details>
    )
  }
  const g = evaluateGeomechanics(profile, input)
  const pct = (v: number) => num(v * 100, 0) + ' %'
  return (
    <details open>
      <summary className="cursor-pointer font-semibold">Consideraciones geomecánicas · {profile.site}</summary>
      <div className="my-3 flex flex-col gap-3 text-sm">
        <div className="rounded-xl border border-pressed p-3">
          <p className="label-mono text-body">Índice geomecánico parcial</p>
          {g.finalIndex === null
            ? <p className="mt-1">Sin criterios medidos para este recorte.</p>
            : <p className="mt-1"><span className="metric text-3xl font-semibold">{num(g.finalIndex * 100, 0)}</span><span className="text-xs text-body"> /100 · evaluado con el {pct(g.evaluatedWeight)} del peso total</span></p>}
          <p className="mt-1 text-xs text-body">{g.note}</p>
          <p className="mt-2 text-xs"><strong>Supermáscara</strong> (NDVI &lt; 0,1 · sin agua · sin zonas urbanas): {g.mask.detail}
            {g.mask.checks && <> · {g.mask.checks.map(c => `${c.name}: ${c.shown}`).join(' · ')}</>}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {g.results.map(r => (
            <li key={r.id} className="rounded-xl bg-canvas-softer p-3">
              <div className="flex items-baseline justify-between gap-2">
                <strong>{r.name}</strong>
                <span className="metric shrink-0 text-xs text-body">peso {pct(r.weight)}</span>
              </div>
              {r.status === 'measured'
                ? <p className="mt-1"><span className="metric font-semibold">{num((r.score ?? 0) * 100, 0)}/100</span> · {r.measured}</p>
                : <p className="mt-1 text-body"><strong className="text-ink">Pendiente:</strong> {r.missing}</p>}
              <details className="mt-1 text-xs text-body">
                <summary className="cursor-pointer">Condición, traducción y regla</summary>
                <p className="mt-1"><strong>En {profile.site}:</strong> {r.target}</p>
                <p className="mt-1"><strong>En la Tierra:</strong> {r.earth}</p>
                <p className="mt-1"><strong>Regla:</strong> {r.rule}</p>
                {r.caveat && <p className="mt-1"><strong>Límite del dato:</strong> {r.caveat}</p>}
              </details>
            </li>
          ))}
        </ul>
        <p className="text-xs text-body">Umbrales del documento del equipo de Ingeniería Civil; los tramos intermedios son provisorios. Fuentes: {profile.sources.map((s, i) => <span key={s.url}>{i > 0 && ' · '}{s.url.startsWith('http') ? <a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</span>)}</p>
      </div>
    </details>
  )
}
