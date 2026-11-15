import {useEffect, useState} from 'react'
import {CHANCE, MIN_LAND, evaluateHoldout, type HoldoutManifest} from './validation.ts'
import type {Relief} from './marsData.ts'
import {num} from './fmt.ts'

// Panel de validación con análogos USGS reservados (D-028). Se recalcula con el destino y los pesos de la búsqueda.
export default function ValidationPanel({target, reference, weights}: {target: string; reference: Relief; weights: Record<string, number>}) {
  const [manifest, setManifest] = useState<HoldoutManifest | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetch('/validation/usgs-holdout.json').then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.json() })
      .then(setManifest).catch(e => setError(String(e)))
  }, [])
  if (error) return <p className="my-3 text-xs">Validación no disponible: {error}</p>
  if (!manifest) return <p className="my-3 text-xs">Cargando validación…</p>
  let v
  try { v = evaluateHoldout(manifest, reference, weights) } catch (e) { return <p className="my-3 text-xs">Validación no disponible: {String(e)}</p> }
  const pct = (x: number) => num(x * 100, 0) + ' %'
  const t = v.test
  if (!v.informative) return (
    <section className="my-4 rounded-xl border border-pressed p-4" aria-label="Validación con sitios reservados">
      <p className="label-mono text-body">Validación con sitios reservados</p>
      <p className="mt-1 text-sm">No informativa para {target}: con estas tolerancias, más del 90 % de las ventanas de tierra al azar tienen semejanza 0, así que no hay un "10 % superior" contra el cual medir a los {t.used} análogos USGS reservados.</p>
    </section>
  )
  return (
    <section className="my-4 rounded-xl border border-pressed p-4" aria-label="Validación con sitios reservados">
      <p className="label-mono text-body">Validación con sitios reservados</p>
      <p className="mt-1"><span className="metric text-3xl font-semibold">{pct(t.rate)}</span>
        <span className="text-sm"> de los análogos USGS reservados ({t.hits} de {t.used}) quedan en el 10 % superior · al azar se esperaría {pct(CHANCE)}</span></p>
      <p className="mt-1 text-xs text-body">
        Probabilidad de lograr esto por azar: {t.pValue < .001 ? '< 0,1 %' : pct(t.pValue)}.
        {t.rate > CHANCE && t.pValue < .05 ? ' El método distingue a los análogos conocidos mejor que el azar.' : ' Con este destino y estos pesos, el relieve solo no distingue a los análogos conocidos mejor que el azar.'}
      </p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-semibold">Cómo se mide</summary>
        <p className="mt-1">Destino: {target}. La lista de la USGS se dividió en <strong>fit</strong> ({v.fit.total}) y <strong>test</strong> ({t.total}) por un hash del nombre <em>antes</em> de calcular, y la división no se cambió.
          Cada sitio se mide con la misma ventana de 20 km y la misma fórmula que los candidatos. El umbral del 10 % superior es el percentil 90 de {v.backgroundN} ventanas de tierra elegidas al azar (semejanza ≥ {num(v.threshold, 1)}/100).
          Se descartan ventanas con menos del {pct(MIN_LAND)} de tierra ({t.droppedSea} en test).</p>
        <p className="mt-1">Referencia, no métrica: en <strong>fit</strong> el acierto es {pct(v.fit.rate)} ({v.fit.hits} de {v.fit.used}).</p>
        <p className="mt-1">Límite: casi todos los sitios USGS son cráteres de impacto, análogos de Luna y Marte en general y no de un sitio de aterrizaje concreto; falta una lista curada de análogos de ensayo (ver datos faltantes).</p>
        <p className="mt-1">Mejores sitios test: {t.sites.slice(0, 5).map(s => `${s.name} (${num(s.score, 0)})`).join(' · ')}.</p>
        <p className="mt-1">Fuente: {manifest.source}.</p>
      </details>
    </section>
  )
}
