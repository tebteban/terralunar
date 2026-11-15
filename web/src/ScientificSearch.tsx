import {DEFAULT_MASK,maskDecision,type Cover} from './coverageMask.ts'
import AnalogyScope from './AnalogyScope.tsx'
import { profileScope } from './analogyScope.ts'
import { classify, type TerrainModel } from './terrainML.ts'
import { discover, pilotZone, type PilotItem } from './discovery.ts'
import type { Zone } from './score.ts'
import { useEffect, useRef, useState } from 'react'
import { earthPatches, marsSitePatch, MARS_SITES, metrics, TOLERANCES, type Relief } from './marsData.ts'
import { combine, targetMatch, ENGINE_VERSION, MONS_WEIGHTS } from './scientificEngine.ts'
type Result = { id:string; name:string; source:string; score:number; cover?:Cover; ml?:ReturnType<typeof classify>; zone?:Zone; contributions:ReturnType<typeof combine>['contributions'] }
export default function ScientificSearch({onClose,onSelect}:{onClose:()=>void;onSelect:(id:string,zone?:Zone,score?:number)=>void}) {
 const [mask,setMask]=useState(DEFAULT_MASK)
 const [coverageNote,setCoverageNote]=useState('')
 const coverRef=useRef<unknown>(null)
 const [experiment,setExperiment]=useState('regional')
 const [mlInfo,setMlInfo]=useState(''),[group,setGroup]=useState(0)
 const [activeModel,setActiveModel]=useState<TerrainModel | null>(null)
 const [scope,setScope]=useState('pilot'),[report,setReport]=useState('')
 const manifestRef=useRef<unknown>(null)
 const dialog=useRef<HTMLDialogElement>(null)
 const [target,setTarget]=useState('luna-mons-mouton'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState<Result[]>([])
 const [weights,setWeights]=useState<Record<string,number>>({pendiente_mediana:25,pendiente_p90:25,rugosidad_m:25,desnivel_m:25})
 const [elapsed,setElapsed]=useState(0)
 useEffect(()=>{dialog.current?.showModal()},[])
 async function run(){if(!profileScope(experiment).canRank){setError('Este ensayo requiere datos adicionales.');return}setBusy(true);setError('');setRows([]);setMlInfo('');setGroup(0);setActiveModel(null);const start=performance.now();try{
 let reference:Relief
 if(target.startsWith('mars-')) reference=await marsSitePatch(MARS_SITES[Number(target.slice(5))])
 else {
 const response=await fetch('/compare/index.json');if(!response.ok)throw Error('Índice lunar no disponible')
 const index=await response.json();if(index.n!==250||index.res_m!==80)throw Error('Escala lunar incompatible')
 const item=index.items.find((i:{id:string})=>i.id===target);if(!item)throw Error('Objetivo no disponible')
 const res=await fetch('/compare/'+item.file);if(!res.ok)throw Error('Recorte no disponible')
 const buffer=await res.arrayBuffer();if(buffer.byteLength!==125000)throw Error('Recorte incompleto')
 const view=new DataView(buffer), h=new Float32Array(100)
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){let sum=0;for(let j=0;j<25;j++)for(let i=0;i<25;i++)sum+=view.getUint16(((y*25+j)*250+x*25+i)*2,true);h[y*10+x]=sum/625}
 reference=metrics(h)
 }
 if(scope==='pilot'){
 const response=await fetch('/discovery/pilot.json');if(!response.ok)throw Error('Piloto aún no disponible');const manifestText=await response.text();const manifest=JSON.parse(manifestText)
 manifestRef.current=manifest
 if(manifest.cell_m!==2000||manifest.window_km!==20)throw Error('Escala incompatible')
 const catResponse=await fetch('/compare/index.json');if(!catResponse.ok)throw Error('Catálogo de exclusión no disponible');const catalog=await catResponse.json()
 const known=catalog.items.filter((p:{body:string})=>p.body==='tierra')
 let covers:Cover[]=[];let coverInfo='Cobertura no disponible'
 try{const cr=await fetch('/discovery/coverage.json');if(!cr.ok)throw Error('No disponible');const cm=await cr.json();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(manifestText));const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(cm.pilot_sha256!==hash)throw Error('Cobertura desactualizada');covers=cm.items;coverRef.current=cm;coverInfo=cm.product+' · muestreo aproximado de 200 m; puede omitir elementos pequeños. No es NDVI.'}catch(e){coverRef.current=null;coverInfo=String(e)}
 const decisions=(manifest.items as PilotItem[]).map(p=>({p,decision:maskDecision(covers.find(c=>c.id===p.id),mask)}))
 const eligible=decisions.filter(d=>d.decision.status==='pass'||d.decision.status==='off').map(d=>d.p)
 setCoverageNote(coverInfo+` · Excluidas: ${decisions.filter(d=>d.decision.status==='excluded').length}; sin evidencia suficiente: ${decisions.filter(d=>d.decision.status==='unknown').length}.`)
 const result=discover(eligible,reference,weights,known)
 let model:TerrainModel|null=null
 try {
 const mr=await fetch('/discovery/model.json');if(!mr.ok)throw Error('Modelo no disponible');const candidate:TerrainModel=await mr.json()
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(manifestText));const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
 if(candidate.data_sha256!==hash)throw Error('Modelo desactualizado para esta región; requiere reentrenamiento')
 const targetClass=classify(candidate,reference);model=candidate;setActiveModel(model)
 setMlInfo(`ML experimental · K-means · ${model.training_ids.length} ventanas de entrenamiento · objetivo en grupo ${targetClass.group}${targetClass.outsideTrainingRange?' · objetivo fuera del rango de entrenamiento':''}. Los grupos describen relieve; no son clases geológicas ni predicen aptitud. El ranking conserva el cálculo físico.`)
 }catch(e){setMlInfo('Agrupamiento no disponible: '+String(e)+'. Se conserva el comparador físico.')}
 setRows(result.diverse.map(p=>({...p,zone:pilotZone(p),cover:covers.find(c=>c.id===p.id),ml:model?classify(model,p.features):undefined})))
 setReport(`${manifest.processed}/${manifest.requested} ventanas procesadas · ${manifest.area_nominal_km2} km² nominales · ${result.scored.length} fuera del radio de 30 km del catálogo · ${result.diverse.length} representantes separados ≥30 km. Extensión: ${JSON.stringify(manifest.extent)}. Filtro de cobertura exploratorio configurable; no implica aptitud operativa.`)
 setElapsed(performance.now()-start);return
 }
 setReport('Catálogo existente; no es descubrimiento.')
 const candidates=await earthPatches()
 const results=candidates.map(p=>{const result=combine(Object.entries(TOLERANCES).map(([id,tolerance])=>({id,weight:weights[id],value:targetMatch(p[id as keyof Relief],reference[id as keyof Relief],tolerance)})));return {id:p.id,name:p.name,source:p.source,score:result.score!,contributions:result.contributions}}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
 setRows(results);setElapsed(performance.now()-start)
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 function exportResults(){const blob=new Blob([JSON.stringify({version:ENGINE_VERSION,analogy:profileScope(experiment),target,weights,tolerances:TOLERANCES,cell_m:2000,window_km:20,scope,report,mask,coverage:coverRef.current,ml_model:activeModel,manifest:scope==='pilot'?manifestRef.current:null,elapsed_ms:elapsed,results:rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='terralunar-physical-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <dialog ref={dialog} onCancel={onClose} style={{padding:28,maxWidth:900,width:'90vw',maxHeight:'85vh',overflow:'auto',background:'#fff',color:'#141414',border:'1px solid #ccc',borderRadius:12}}><button onClick={onClose} style={{float:'right'}}>Cerrar</button><h2>Comparación científica · piloto</h2><p>Relieve real a escala regional. Exploración de ventanas nuevas fuera del catálogo. Candidatos para investigar, no sitios validados.</p><AnalogyScope value={experiment} disabled={busy} onChange={id=>{setExperiment(id);setRows([]);setMlInfo('')}}/><fieldset style={{border:'1px solid #ccc',padding:12}}><legend>Filtro de cobertura terrestre · exploratorio</legend><label><input type="checkbox" checked={mask.enabled} disabled={busy} onChange={e=>{setMask({...mask,enabled:e.target.checked});setRows([])}}/> Aplicar filtro para terreno despejado</label>{(['waterMax','builtMax','vegetationMax'] as const).map((key,i)=><label key={key} style={{display:'block'}}>{['Agua máxima (%)','Construido máximo (%)','Vegetación máxima (%)'][i]} <input type="number" min="0" max="100" disabled={busy} value={mask[key]*100} onChange={e=>{setMask({...mask,[key]:Number(e.target.value)/100});setRows([])}}/></label>)}<label><input type="checkbox" checked={mask.ndviMax!==null} disabled={busy} onChange={e=>{setMask({...mask,ndviMax:e.target.checked?.1:null});setRows([])}}/> Exigir NDVI &lt; 0,1 (sin datos NDVI: candidatos no evaluables)</label><p>No certifica ausencia de agua, asentamientos ni vegetación. No usar como regla universal para hielo, biología o subsuelo.</p></fieldset><p role="status">{coverageNote}</p><details><summary>Contexto geológico regional</summary><p>SEGEMAR SIGAM · unidades del NOA a escala 1:1.000.000. Cobertura argentina; no asigna litología a todo el recorte ni equivale a composición lunar/marciana.</p><a href="/discovery/geology.geojson" download>Descargar unidades regionales</a> · <a href="/discovery/geology-source.json" target="_blank" rel="noreferrer">Procedencia y escala</a></details><label>Área de búsqueda <select disabled={busy} value={scope} onChange={e=>{setScope(e.target.value);setRows([])}}><option value="pilot">Piloto Atacama · grilla 120 × 120 km</option><option value="catalogue">Catálogo de referencia</option></select></label><label>Objetivo <select disabled={busy} value={target} onChange={e=>{setTarget(e.target.value);setRows([])}}><option value="luna-mons-mouton">Luna · Mons Mouton</option><option value="luna-mons-malapert">Luna · Mons Malapert</option>{MARS_SITES.map((s,i)=><option key={s.name} value={'mars-'+i}>Marte · {s.name}</option>)}</select></label><p>Ventanas de 20 × 20 km · celdas de 2 km · pendientes en grados y relieve en metros. Tolerancias exploratorias sin calibración experimental.</p>{Object.entries(weights).map(([key,value])=><label key={key} style={{display:'block'}}>{key} · peso {value} <input type="range" min="0" max="100" disabled={busy} value={value} onChange={e=>{setWeights({...weights,[key]:Number(e.target.value)});setRows([])}}/></label>)}<button disabled={busy || !profileScope(experiment).canRank} onClick={run}>{busy?'Procesando datos…':'Calcular similitud física'}</button>{error&&<p role="alert">{error}</p>}{rows.length>0&&<><p>{report}</p>{mlInfo&&<section aria-label="Aprendizaje automático"><h3>Grupos aprendidos de terreno</h3><p>{mlInfo}</p>{activeModel&&<label>Explorar grupo <select value={group} onChange={e=>setGroup(Number(e.target.value))}><option value={0}>Todos los grupos</option>{activeModel.centers.map((_,i)=><option key={i} value={i+1}>Grupo {i+1}</option>)}</select></label>}</section>}<p>{rows.length} recortes · {(elapsed/1000).toFixed(2)} s · índice de ajuste, no probabilidad de éxito.</p><button onClick={exportResults}>Exportar cálculo y contribuciones</button><ol>{rows.filter(r=>group===0||r.ml?.group===group).map(r=><li key={r.id} style={{margin:'12px 0'}}><button onClick={()=>{onSelect(r.id,r.zone,r.score);onClose()}}>{r.name} · {r.score.toFixed(1)}/100 · Ver en Tierra</button><p>{r.ml?`Grupo ML ${r.ml.group} · distancia al centro ${r.ml.distance.toFixed(2)}${r.ml.outsideTrainingRange?" · fuera del rango de entrenamiento":""}`:""}</p><details><summary>Evidencia y aportes al puntaje</summary><p>{r.source}</p>{r.cover&&<p>Cobertura muestreada 2021: agua {((r.cover.water??0)*100).toFixed(2)}%; construido {((r.cover.built??0)*100).toFixed(2)}%; vegetación {((r.cover.vegetation??0)*100).toFixed(2)}%. NDVI no medido.</p>}{r.contributions.map(c=><p key={c.id}>{c.id}: {((c.contribution??0)*100).toFixed(2)} puntos</p>)}</details></li>)}</ol></> }<hr/><h3>Perfil integral propuesto · pendiente de datos</h3><p>Los pesos siguientes no se mezclan con el ranking topográfico ni se consideran validados.</p>{Object.entries(MONS_WEIGHTS).map(([k,w])=><p key={k}>{k}: {w*100}% · {k==='topografia'?'relieve disponible; requiere definir la función de aptitud':'sin medición integrada'}</p>)}<p>SVF no mide dosis de radiación. La cartografía geológica no determina por sí sola resistencia del suelo ni granulometría. No se emite un puntaje integral con datos faltantes.</p></dialog>
}



