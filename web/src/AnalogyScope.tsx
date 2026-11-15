import {DIMENSIONS,PROFILES,profileScope} from './analogyScope.ts'
export default function AnalogyScope({value,onChange,disabled}:{value:string;onChange:(id:string)=>void;disabled:boolean}){
 const scope=profileScope(value)
 return <section aria-label="Objetivos del ensayo" className="flex flex-col gap-3 rounded-2xl border border-pressed p-4 text-sm">
  <label className="flex flex-col gap-2 font-semibold">¿Qué querés estudiar o ensayar?
   <select className="w-full rounded-lg bg-canvas-soft p-2 text-ink" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{PROFILES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
  </label>
  <p className="font-semibold">{scope.plan.stage}</p><p>{scope.plan.question}</p>
  {!scope.canRank&&<p>Podés comparar el relieve del entorno y obtener candidatos para caracterizar. Este puntaje no evalúa todavía el desempeño del ensayo.</p>}
  <details><summary className="cursor-pointer font-semibold">Plan de evaluación del ensayo</summary><p className="mt-2">{scope.plan.measure}</p><p className="mt-2">Datos y mediciones: {scope.plan.products}</p><p className="mt-2 text-xs">{scope.plan.calibration}</p></details>
  <details><summary className="cursor-pointer">Evidencia necesaria y alcance</summary><ul>{scope.dimensions.map(d=><li key={d.id} className="mt-2"><strong>{d.name}</strong>: {d.available?'relieve regional integrado':'evaluación específica por integrar'}. {d.missing}</li>)}</ul><p className="mt-2">{scope.scope}</p><ul>{scope.limitations.map(l=><li key={l}>{l}</li>)}</ul></details>
  <details><summary className="cursor-pointer">Fuentes para los ocho ejes del desafío</summary>{DIMENSIONS.map(d=><p key={d.id} className="mt-2"><strong>{d.name}.</strong> {d.source}</p>)}</details>
 </section>
}
