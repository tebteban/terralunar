import {withPlanetaryEvidence} from './planetaryEvidence.ts'
import {referenceFor,type AnalysisRun,serializeRun} from './analysisRun.ts'
import {coord,num} from './fmt.ts'
import {useEffect,useRef,useState} from 'react'
import AnalogyScope from './AnalogyScope.tsx'
import {experimentPlan,profileScope,RELIEF_LABELS} from './analogyScope.ts'
import {validateRegions,type Region,type SearchBounds} from './regions.ts'
import {DEFAULT_MASK} from './coverageMask.ts'
import {loadCandidates,rankCandidates} from './globalSearch.ts'
import {MARS_SITES,TOLERANCES,type Relief} from './marsData.ts'
import {ENGINE_VERSION} from './scientificEngine.ts'
import type {SearchTarget} from './searchTarget.ts'
import type {Zone} from './score.ts'

type Props={initialRun?:AnalysisRun|null;onRun:(run:AnalysisRun)=>void;selectedTarget?:SearchTarget|null;onClose:()=>void;onSelect:(id:string,zone?:Zone,score?:number)=>void;onShowMap?:(origin:string)=>void}
type Run=AnalysisRun
function download(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export default function ScientificSearch({onClose,onSelect,onShowMap,selectedTarget,initialRun,onRun}:Props){
 const dialog=useRef<HTMLDialogElement>(null),controller=useRef<AbortController|null>(null)
 const [regions,setRegions]=useState<Region[]>([]),[loading,setLoading]=useState(true)
 const [experiment,setExperiment]=useState(initialRun?.experiment??selectedTarget?.experiment??'regional')
 const [weights,setWeights]=useState(()=>initialRun?.weights??experimentPlan(selectedTarget?.experiment??'regional').weights)
 const [scope,setScope]=useState(initialRun?.scope??'global'),[target,setTarget]=useState(initialRun?.target??(selectedTarget?'selected':'luna-mons-mouton'))
 const [mask,setMask]=useState(initialRun?.mask??DEFAULT_MASK),[recent,setRecent]=useState(initialRun?.recent??true)
 const [restrict,setRestrict]=useState(!!initialRun?.bounds),[bounds,setBounds]=useState<SearchBounds>(initialRun?.bounds??{west:-180,east:180,south:-90,north:90})
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Run|null>(initialRun??null)
 const [origin,setOrigin]=useState(initialRun?.scope==='catalogue'?'catalogue':'sampled')
 const [contextConsent,setContextConsent]=useState(!!initialRun)
 const plan=experimentPlan(experiment)
 useEffect(()=>{let alive=true;dialog.current?.showModal();fetch('/discovery/regions.json').then(r=>{if(!r.ok)throw Error('Registro de cobertura no disponible');return r.json()}).then(v=>{if(alive)setRegions(validateRegions(v))}).catch(e=>{if(alive)setError(String(e))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false;controller.current?.abort()}},[])
 function reset(){setResult(null);setError('');setOrigin(scope==='catalogue'?'catalogue':'sampled')}
 async function run(){
  if(experiment!=='regional'&&!contextConsent){setError('Elegí explícitamente comparar solo el contexto topográfico.');return}
  setBusy(true);reset();const abort=new AbortController();controller.current=abort;const start=performance.now()
  try{
   const [reference,loaded]=await Promise.all([referenceFor(target,selectedTarget).then(site=>withPlanetaryEvidence(site,abort.signal)),loadCandidates(regions,scope,recent,abort.signal)])
   if(abort.signal.aborted)return
   const ranked=rankCandidates(loaded.candidates,reference.features,weights,mask,restrict?bounds:undefined,loaded.referencePoints)
   const completed:Run={id:crypto.randomUUID(),...ranked,reports:loaded.reports,elapsed:performance.now()-start,reference:reference.features,resolvedTarget:reference,target,experiment,weights:{...weights},scope,recent,mask:{...mask},bounds:restrict?{...bounds}:null,selectedTarget:target==='selected'?selectedTarget:null,generated:new Date().toISOString()};setResult(completed);onRun(completed)
  }catch(e){if(!abort.signal.aborted)setError(String(e))}finally{if(!abort.signal.aborted)setBusy(false)}
 }
 function exportResults(){if(!result)return;download('terralunar-comparacion-y-plan.json',{version:ENGINE_VERSION,cell_m:2000,window_km:20,tolerances:TOLERANCES,analogy:profileScope(result.experiment),...JSON.parse(serializeRun(result))})}
 const visible=result?.rows.filter(r=>origin==='all'||r.origin===origin)??[]
 const input='rounded-lg border border-pressed bg-canvas-soft px-3 py-2 text-ink'
 return <dialog ref={dialog} onCancel={onClose} className="m-auto max-h-[92vh] w-[min(1100px,96vw)] overflow-y-auto rounded-2xl border border-pressed bg-canvas p-5 text-ink shadow-card md:p-8">
  <header className="mb-5 flex items-start justify-between gap-4"><div><p className="label-mono text-body">TerraLunar · análisis reproducible</p><h2 className="text-2xl font-bold">Comparar entornos de misión</h2><p className="mt-2 text-sm">Elegí destino, ensayo y área. Compará datos reales y llevá los candidatos al globo terrestre.</p></div><button className="btn-secondary" onClick={onClose}>Cerrar</button></header>
  <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
   <div className="flex flex-col gap-3"><label className="flex flex-col gap-2 font-semibold">1 · Destino de misión<select className={input} value={target} onChange={e=>{setTarget(e.target.value);reset()}}>{selectedTarget&&<option value="selected">{selectedTarget.body==='luna'?'Luna':'Marte'} · punto {coord(selectedTarget.lat,selectedTarget.lon)}</option>}<optgroup label="Luna · recortes LOLA"><option value="luna-mons-mouton">Mons Mouton</option><option value="luna-mons-malapert">Mons Malapert</option><option value="luna-nobile-rim-2">Nobile Rim 2</option></optgroup><optgroup label="Marte · recortes MOLA">{MARS_SITES.map((s,i)=><option key={s.name} value={'mars-'+i}>{s.name}</option>)}</optgroup></select></label>
    <AnalogyScope value={experiment} disabled={busy} onChange={id=>{setContextConsent(false);setExperiment(id);setWeights(experimentPlan(id).weights);reset()}}/>
   </div>
   <div className="flex flex-col gap-4"><label className="flex flex-col gap-2 font-semibold">2 · Cobertura de búsqueda<select className={input} value={scope} onChange={e=>{setScope(e.target.value);reset()}}><option value="global">Todas las regiones procesadas + catálogo de referencia</option>{regions.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}<option value="catalogue">Solo catálogo mundial de referencia</option></select></label>
    <p className="text-sm">Cobertura discontinua: se buscan ventanas ya procesadas, no cada punto del planeta. El catálogo de referencia se distingue de las ventanas exploratorias.</p>
    <details className="rounded-xl border border-pressed p-3"><summary className="cursor-pointer font-semibold">Limitar el área terrestre</summary><label className="mt-3 block"><input type="checkbox" checked={restrict} onChange={e=>{setRestrict(e.target.checked);reset()}}/> Filtrar por coordenadas del centro</label>{restrict&&<div className="mt-2 grid grid-cols-2 gap-2">{(['west','south','east','north'] as const).map((k,i)=><label key={k}>{['Oeste','Sur','Este','Norte'][i]}<input className={'w-full '+input} type="number" step="any" value={bounds[k]} onChange={e=>{setBounds({...bounds,[k]:Number(e.target.value)});reset()}}/></label>)}</div>}<p className="mt-2 text-xs">Oeste debe ser menor que este; para cruzar el antimeridiano realizá dos búsquedas.</p></details>
    <details className="rounded-xl border border-pressed p-3"><summary className="cursor-pointer font-semibold">Filtros de cobertura y observaciones</summary><label className="mt-3 block"><input type="checkbox" checked={recent} onChange={e=>{setRecent(e.target.checked);reset()}}/> Consultar observaciones Sentinel-2 de 2026 procesadas</label><label className="mt-2 block"><input type="checkbox" checked={mask.enabled} onChange={e=>{setMask({...mask,enabled:e.target.checked});reset()}}/> Exigir terreno despejado</label><p className="my-2 text-xs">Si activás el filtro, los recortes sin mediciones suficientes quedan fuera. Desactivado, no se certifica ausencia de agua, vegetación o construcciones.</p>{(['waterMax','builtMax','vegetationMax'] as const).map((k,i)=><label key={k} className="my-2 flex items-center justify-between gap-2">{['Agua máxima (%)','Construido máximo (%)','Vegetación máxima (%)'][i]}<input className={'w-20 '+input} type="number" min="0" max="100" value={mask[k]*100} onChange={e=>{setMask({...mask,[k]:Number(e.target.value)/100});reset()}}/></label>)}<label><input type="checkbox" checked={mask.ndviMax!==null} onChange={e=>{setMask({...mask,ndviMax:e.target.checked?.1:null});reset()}}/> Exigir NDVI p90 &lt; 0,1</label></details>
    <section className="rounded-xl bg-canvas-soft p-4"><h3 className="font-semibold">3 · Pesos del contexto topográfico</h3><p className="mb-3 text-xs">{plan.calibration} No miden aptitud integral.</p>{Object.entries(weights).map(([k,v])=><label key={k} className="my-2 block text-sm"><span className="flex justify-between"><span>{RELIEF_LABELS[k]}</span><span>{v}</span></span><input className="w-full accent-ink" type="range" min="0" max="100" value={v} onChange={e=>{setWeights({...weights,[k]:Number(e.target.value)});reset()}}/></label>)}</section>
   </div>
  </fieldset>
  <p className="my-4 text-xs">Escala común: ventanas de 20 × 20 km, celdas de 2 km. Rugosidad sobre vecindario de 6 km. No resuelve bloques ni obstáculos a escala del vehículo.</p>
  {plan.requiresContextConsent&&<label className="my-4 flex items-start gap-2 rounded-xl border border-pressed p-4 text-sm"><input type="checkbox" checked={contextConsent} onChange={e=>setContextConsent(e.target.checked)}/>Comparar solo el contexto topográfico; no evaluar la compatibilidad de este ensayo.</label>}
  <button className="btn-primary" disabled={busy||loading||(plan.requiresContextConsent&&!contextConsent)} onClick={run}>{busy?'Calculando con datos reales…':loading?'Cargando cobertura…':experiment==='regional'?'Buscar análogos topográficos':'Comparar solo el contexto topográfico'}</button>
  {error&&<p role="alert" className="my-4 rounded-lg border border-red-400 p-3">{error}</p>}
  {result&&<section className="mt-6 border-t border-pressed pt-5" aria-label="Resultados científicos">
   {result.experiment!=='regional'&&<p className="mb-3 font-semibold">Compatibilidad del ensayo: pendiente. Los resultados siguientes comparan únicamente relieve.</p>}<h3 className="text-xl font-bold">{experimentPlan(result.experiment).scoreLabel} · {result.rows.length} candidatos</h3>
   <p className="my-2 text-sm">{result.counts.loaded} ventanas cargadas · {result.counts.inArea} dentro del área · {result.counts.excluded} excluidas por cobertura · {result.counts.unknown} sin evidencia para el filtro · {result.counts.nearReference} ventanas cerca del catálogo excluidas · {(result.elapsed/1000).toFixed(1)} s.</p>
   <p className="text-sm">Índice de semejanza al destino, no probabilidad de éxito. Ventanas exploratorias separadas al menos 30 km entre sí.</p>
   <details className="my-3"><summary className="cursor-pointer font-semibold">Cobertura y procedencia de esta ejecución</summary>{result.reports.map(r=><p className="my-2 text-xs" key={r.name}><strong>{r.name}</strong> · {r.count} recortes · {r.status}{r.extent?' · extensión '+JSON.stringify(r.extent):''}</p>)}</details>
   <div className="my-4 flex flex-wrap gap-2"><button className="btn-secondary" onClick={exportResults}>Descargar análisis + plan de ensayo</button><button className="btn-secondary" disabled={!visible.length} onClick={()=>download('terralunar-candidatos.geojson',{type:'FeatureCollection',features:visible.map(r=>({type:'Feature',geometry:r.zone.polygon,properties:{id:r.id,name:r.name,score:r.score,score_kind:'topographic-context',origin:r.origin,source:r.source,cell_m:2000,window_km:20}}))})}>Exportar GeoJSON</button>{onShowMap&&<button className="btn-primary" disabled={!visible.length} onClick={()=>{onRun(result);onShowMap(origin);onClose()}}>Ver {visible.length} candidatos en el globo</button>}</div>
   <label className="text-sm">Mostrar <select className={input} value={origin} onChange={e=>setOrigin(e.target.value)}><option value="all">Todos</option><option value="sampled">Candidatos fuera del catálogo</option><option value="catalogue">Catálogo de referencia</option></select></label>
   {!visible.length&&<p role="status" className="my-4">No hay candidatos con estos filtros. Revisá área, cobertura o tipo de resultado; no implica que no existan análogos.</p>}
   <ol className="mt-4 grid gap-3 md:grid-cols-2">{visible.map(r=><li key={r.id} className="rounded-xl border border-pressed p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-body">{r.origin==='catalogue'?'CATÁLOGO DE REFERENCIA':'VENTANA EXPLORATORIA'}</p><h4 className="font-bold">{r.name}</h4></div><strong className="metric text-xl">{num(r.score)}<span className="text-xs">/100</span></strong></div><p className="my-2 text-xs">{coord(r.zone.centroid[1],r.zone.centroid[0])} · 20 × 20 km</p><button className="btn-secondary" onClick={()=>{onRun(result);onSelect(r.id,r.zone,r.score);onClose()}}>Ver recorte exacto en Tierra</button><details className="mt-3 text-sm"><summary className="cursor-pointer">Mediciones, aportes y evidencia</summary>{r.contributions.map(c=><p className="my-1" key={c.id}>{RELIEF_LABELS[c.id]}: {num(r.features[c.id as keyof Relief],2)} · aporte {num((c.contribution??0)*100)} puntos</p>)}<p className="my-2 text-xs">{r.source}</p><p className="text-xs">{r.coverSource}</p>{r.cover&&<p className="my-2 text-xs">Muestras válidas: {(r.cover.valid_fraction*100).toFixed(1)}%. Agua: {r.cover.water===null?'sin medición':(r.cover.water*100).toFixed(1)+'%'}. Vegetación: {r.cover.vegetation===null?'sin medición':(r.cover.vegetation*100).toFixed(1)+'%'}. NDVI p90: {r.cover.ndvi?.toFixed(2)??'sin medición'}. Fechas: {r.cover.dates?.join(', ')||'2021 (producto anual)'}.</p>}<p className="my-2 text-xs">Geología del centro, no de todo el recorte: {r.geology.length?r.geology.map(g=>[g.unidad,g.edad,g.tipoderoca].filter(Boolean).join(' · ')).join('; '):'sin unidad cartográfica integrada'}. No determina resistencia del suelo.</p>{r.ml&&<p className="text-xs">Agrupamiento experimental {r.modelId}: grupo {r.ml.group}{r.ml.outsideTrainingRange?' · fuera del rango de entrenamiento':''}. Describe relieve; no modifica el puntaje ni predice aptitud.</p>}</details></li>)}</ol>
  </section>}
 </dialog>
}
