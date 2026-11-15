import { discover, pilotZone, type PilotItem } from './discovery.ts'
import type { Zone } from './score.ts'
import { useEffect, useRef, useState } from 'react'
import { earthPatches, marsSitePatch, MARS_SITES, metrics, TOLERANCES, type Relief } from './marsData.ts'
import { combine, targetMatch, ENGINE_VERSION, MONS_WEIGHTS } from './scientificEngine.ts'
type Result = { id:string; name:string; source:string; score:number; zone?:Zone; contributions:ReturnType<typeof combine>['contributions'] }
export default function ScientificSearch({onClose,onSelect}:{onClose:()=>void;onSelect:(id:string,zone?:Zone,score?:number)=>void}) {
 const [scope,setScope]=useState('pilot'),[report,setReport]=useState('')
 const manifestRef=useRef<unknown>(null)
 const dialog=useRef<HTMLDialogElement>(null)
 const [target,setTarget]=useState('luna-mons-mouton'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[rows,setRows]=useState<Result[]>([])
 const [weights,setWeights]=useState<Record<string,number>>({pendiente_mediana:25,pendiente_p90:25,rugosidad_m:25,desnivel_m:25})
 const [elapsed,setElapsed]=useState(0)
 useEffect(()=>{dialog.current?.showModal()},[])
 async function run(){setBusy(true);setError('');setRows([]);const start=performance.now();try{
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
 const response=await fetch('/discovery/pilot.json');if(!response.ok)throw Error('Piloto aún no disponible');const manifest=await response.json()
 manifestRef.current=manifest
 if(manifest.cell_m!==2000||manifest.window_km!==20)throw Error('Escala incompatible')
 const catResponse=await fetch('/compare/index.json');if(!catResponse.ok)throw Error('Catálogo de exclusión no disponible');const catalog=await catResponse.json()
 const known=catalog.items.filter((p:{body:string})=>p.body==='tierra')
 const result=discover(manifest.items as PilotItem[],reference,weights,known)
 setRows(result.diverse.map(p=>({...p,zone:pilotZone(p)})))
 setReport(`${manifest.processed}/${manifest.requested} ventanas procesadas · ${manifest.area_nominal_km2} km² nominales · ${result.scored.length} fuera del radio de 30 km del catálogo · ${result.diverse.length} representantes separados ≥30 km. Extensión: ${JSON.stringify(manifest.extent)}. Sin máscara de agua ni vegetación; no implica aptitud operativa.`)
 setElapsed(performance.now()-start);return
 }
 setReport('Catálogo existente; no es descubrimiento.')
 const candidates=await earthPatches()
 const results=candidates.map(p=>{const result=combine(Object.entries(TOLERANCES).map(([id,tolerance])=>({id,weight:weights[id],value:targetMatch(p[id as keyof Relief],reference[id as keyof Relief],tolerance)})));return {id:p.id,name:p.name,source:p.source,score:result.score!,contributions:result.contributions}}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
 setRows(results);setElapsed(performance.now()-start)
 }catch(e){setError(String(e))}finally{setBusy(false)}}
 function exportResults(){const blob=new Blob([JSON.stringify({version:ENGINE_VERSION,target,weights,tolerances:TOLERANCES,cell_m:2000,window_km:20,scope,report,manifest:scope==='pilot'?manifestRef.current:null,elapsed_ms:elapsed,results:rows},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='terralunar-physical-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <dialog ref={dialog} onCancel={onClose} style={{padding:28,maxWidth:900,width:'90vw',maxHeight:'85vh',overflow:'auto',background:'#fff',color:'#141414',border:'1px solid #ccc',borderRadius:12}}><button onClick={onClose} style={{float:'right'}}>Cerrar</button><h2>Comparación científica · piloto</h2><p>Relieve real a escala regional. Exploración de ventanas nuevas fuera del catálogo. Candidatos para investigar, no sitios validados.</p><label>Área de búsqueda <select disabled={busy} value={scope} onChange={e=>{setScope(e.target.value);setRows([])}}><option value="pilot">Piloto Atacama · grilla 120 × 120 km</option><option value="catalogue">Catálogo de referencia</option></select></label><label>Objetivo <select disabled={busy} value={target} onChange={e=>{setTarget(e.target.value);setRows([])}}><option value="luna-mons-mouton">Luna · Mons Mouton</option><option value="luna-mons-malapert">Luna · Mons Malapert</option>{MARS_SITES.map((s,i)=><option key={s.name} value={'mars-'+i}>Marte · {s.name}</option>)}</select></label><p>Ventanas de 20 × 20 km · celdas de 2 km · pendientes en grados y relieve en metros. Tolerancias exploratorias sin calibración experimental.</p>{Object.entries(weights).map(([key,value])=><label key={key} style={{display:'block'}}>{key} · peso {value} <input type="range" min="0" max="100" disabled={busy} value={value} onChange={e=>{setWeights({...weights,[key]:Number(e.target.value)});setRows([])}}/></label>)}<button disabled={busy} onClick={run}>{busy?'Procesando datos…':'Calcular similitud física'}</button>{error&&<p role="alert">{error}</p>}{rows.length>0&&<><p>{report}</p><p>{rows.length} recortes · {(elapsed/1000).toFixed(2)} s · índice de ajuste, no probabilidad de éxito.</p><button onClick={exportResults}>Exportar cálculo y contribuciones</button><ol>{rows.map(r=><li key={r.id} style={{margin:'12px 0'}}><button onClick={()=>{onSelect(r.id,r.zone,r.score);onClose()}}>{r.name} · {r.score.toFixed(1)}/100 · Ver en Tierra</button><details><summary>Evidencia y aportes al puntaje</summary><p>{r.source}</p>{r.contributions.map(c=><p key={c.id}>{c.id}: {((c.contribution??0)*100).toFixed(2)} puntos</p>)}</details></li>)}</ol></> }<hr/><h3>Perfil integral propuesto · pendiente de datos</h3><p>Los pesos siguientes no se mezclan con el ranking topográfico ni se consideran validados.</p>{Object.entries(MONS_WEIGHTS).map(([k,w])=><p key={k}>{k}: {w*100}% · {k==='topografia'?'relieve disponible; requiere definir la función de aptitud':'sin medición integrada'}</p>)}<p>SVF no mide dosis de radiación. La cartografía geológica no determina por sí sola resistencia del suelo ni granulometría. No se emite un puntaje integral con datos faltantes.</p></dialog>
}

