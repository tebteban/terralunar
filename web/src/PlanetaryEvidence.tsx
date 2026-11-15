import type {PlanetaryObservation} from './planetaryEvidence.ts'
import type {ThermalEvidence} from './thermalEvidence.ts'
import {num} from './fmt.ts'

export default function PlanetaryEvidence({observation, earth, geology}: {
  observation?: PlanetaryObservation
  earth?: ThermalEvidence
  geology: Record<string, unknown>[]
}) {
  const targetName = observation?.body === 'luna' ? 'Luna' : 'Marte'
  const terrestrialUnits = geology.map(unit =>
    [unit.unidad, unit.edad, unit.tipoderoca].filter(Boolean).join(' · '))
  return <section className="space-y-3 rounded-xl border border-pressed p-3 text-sm" aria-label="Evidencia entre cuerpos">
    <h3 className="font-semibold">Geología y temperatura de ambos sitios</h3>
    <details open>
      <summary className="cursor-pointer font-medium">Unidades geológicas en el centro</summary>
      <p className="mt-2"><strong>Tierra:</strong> {terrestrialUnits.join('; ') || 'sin cartografía integrada para este candidato'}.</p>
      {observation?.units.length ? <>
        <p><strong>{targetName}:</strong> {observation.units.map(unit => [unit.code, unit.name, unit.age].filter(Boolean).join(' · ')).join('; ')}.</p>
        <a className="underline" href={observation.geologySource} target="_blank" rel="noreferrer">
          USGS · escala 1:{num(observation.geologyScale)}
        </a>
      </> : <p><strong>Destino:</strong> sin unidad geológica integrada en este punto.</p>}
      <p className="mt-1 text-xs text-body">Las unidades describen el contexto regional. La comparación de minerales y propiedades del suelo requiere mediciones específicas.</p>
    </details>
    <details open={Boolean(observation?.thermal.length && earth)}>
      <summary className="cursor-pointer font-medium">Temperatura superficial del destino</summary>
      {observation?.thermal.length ? <>
        <p className="my-2">LRO Diviner · 240 m · verano austral lunar · observaciones de 2009 a 2019.</p>
        <ul className="space-y-1">
          {observation.thermal.map(bin => <li key={bin.source}>
            <a className="underline" href={bin.source} target="_blank" rel="noreferrer">{bin.localHours.map(value=>num(value,2)).join('–')} h solares</a>
            {' · '}{num(bin.kelvin[1],1)} K de mediana · {num(bin.count)} celdas
          </li>)}
        </ul>
        {earth && <ul className="my-2 space-y-1">
          {(['day','night'] as const).map(phase => {
            const pass = earth[phase]
            if (!pass.kelvin || !pass.solarHours) return null
            const med = pass.kelvin[1]
            const [start, end] = pass.solarHours
            const matched = observation.thermal.filter(bin => start < bin.localHours[1] && end >= bin.localHours[0])
            return <li key={phase}>
              <strong>Tierra · {phase === 'day' ? 'día' : 'noche'}:</strong> {num(med,1)} K · {start === end ? num(start,1) : [start,end].map(v=>num(v,1)).join('–')} h solares.
              {matched.map(bin => <p key={bin.source}>Diferencia observada Tierra − Luna ({bin.localHours.map(v=>num(v,2)).join('–')} h): {num(med-bin.kelvin[1],1)} K.</p>)}
            </li>
          })}
        </ul>}
        <p className="text-xs text-body">El contraste usa horas solares coincidentes cuando existen. MODIS observa una fecha terrestre y Diviner reúne varios años lunares. Para evaluar un ciclo térmico faltan series con condiciones de iluminación y estaciones comparables.</p>
      </> : <p className="my-2">Sin mediciones térmicas planetarias integradas para este punto.</p>}
    </details>
  </section>
}
