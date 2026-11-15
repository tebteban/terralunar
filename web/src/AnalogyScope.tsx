import {DIMENSIONS,PROFILES,profileScope} from './analogyScope.ts'
export default function AnalogyScope({value,onChange,disabled}:{value:string;onChange:(id:string)=>void;disabled:boolean}){
 const scope=profileScope(value)
 const sum='flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden'
 const chevron=<svg viewBox="0 0 16 16" className="size-4 shrink-0 text-body transition-transform group-open:rotate-180" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
 return <section aria-label="Objetivos del ensayo" className="flex flex-col gap-3 text-sm">
  <label className="flex flex-col gap-2 text-body">¿Qué querés estudiar o ensayar?
   <select className="field" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{PROFILES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
  </label>
  <p><strong>{scope.plan.stage}.</strong> {scope.plan.question}</p>
  {!scope.canRank&&<p>No hay un índice de compatibilidad para este ensayo: faltan criterios esenciales. La comparación de relieve es opcional y no sustituye esas mediciones.</p>}
  <section aria-label="Criterios del ensayo" className="rounded-xl bg-canvas-softer px-3.5 py-3"><h3 className="label-mono text-body">Criterios necesarios</h3><ul>{scope.requirements.map(c=><li key={c.id} className="mt-2"><strong>{c.name}</strong> · {c.available?'disponible a escala regional':'pendiente de mediciones'}<p className="text-xs">{c.evidence}</p><p className="text-xs">Método: {c.method}.</p></li>)}</ul></section><div className="divide-y divide-pressed/70 border-y border-pressed/70"><details className="group py-2.5"><summary className={sum}>Plan de evaluación del ensayo{chevron}</summary><p className="mt-2">{scope.plan.measure}</p><p className="mt-2">Datos y mediciones: {scope.plan.products}</p><p className="mt-2 text-xs">{scope.plan.calibration}</p></details>
  <details className="group py-2.5"><summary className={sum}>Evidencia necesaria y alcance{chevron}</summary><ul>{scope.dimensions.map(d=><li key={d.id} className="mt-2"><strong>{d.name}</strong>: {d.available?'relieve regional integrado':'evaluación específica por integrar'}. {d.missing}</li>)}</ul><p className="mt-2">{scope.scope}</p><ul>{scope.limitations.map(l=><li key={l}>{l}</li>)}</ul></details>
  <details className="group py-2.5"><summary className={sum}>Fuentes para los ocho ejes del desafío{chevron}</summary>{DIMENSIONS.map(d=><p key={d.id} className="mt-2"><strong>{d.name}.</strong> {d.source}</p>)}</details></div>
 </section>
}
