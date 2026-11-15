import {thermalAt,type ThermalEvidence} from './thermalEvidence.ts'
import {earthPatches,metrics,TOLERANCES,type Relief} from './marsData.ts'
import {earthPatchZone} from './earthSelection.ts'
import {withinBounds,type Region,type SearchBounds} from './regions.ts'
import {maskDecision,type Cover,type MaskPolicy} from './coverageMask.ts'
import {distanceKm,pilotZone,type PilotItem} from './discovery.ts'
import {geologyAt,type GeologyFeature} from './geologyContext.ts'
import {combine,targetMatch} from './scientificEngine.ts'
import {classify,type TerrainModel} from './terrainML.ts'
import type {Zone} from './score.ts'

export type Candidate={thermal?:ThermalEvidence;file?:string;heights?:Float32Array;id:string;name:string;source:string;zone:Zone;features:Relief;origin:'catalogue'|'sampled';region:string;cover?:Cover;coverSource:string;geology:Record<string,unknown>[];ml?:ReturnType<typeof classify>;modelId?:string}
export type SearchResult=Candidate & {score:number;contributions:ReturnType<typeof combine>['contributions'];filterStatus:string}
export type CoverageReport={name:string;count:number;status:string;extent?:number[][];manifestHash?:string}
async function json(url:string,signal?:AbortSignal){const r=await fetch(url,{signal});if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return r.json()}
async function sha(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('')}

export async function loadCandidates(regions:Region[],scope:string,recent:boolean,signal?:AbortSignal){
 const candidates:Candidate[]=[],reports:CoverageReport[]=[]
 const references=await earthPatches().catch(()=>{throw Error('No se pudo cargar el catálogo para comprobar qué candidatos quedan fuera de los sitios de referencia.')})
 const referencePoints=references.map(({lon,lat})=>({lon,lat}))
 if(scope==='global'||scope==='catalogue'){
  try{const patches=references;for(const p of patches)candidates.push({...p,zone:earthPatchZone(p),features:p,origin:'catalogue',region:'Catálogo mundial',coverSource:'Sin cobertura terrestre integrada para este recorte',geology:[]});reports.push({name:'Catálogo mundial de referencia',count:patches.length,status:'DEM real; sin máscara de cobertura integrada'})}
  catch(e){if(signal?.aborted)throw e;reports.push({name:'Catálogo mundial',count:0,status:String(e)})}
 }
 const requested=scope==='global'?regions:regions.filter(r=>r.id===scope)
 const loaded=await Promise.all(requested.map(async region=>{
  const out:Candidate[]=[]
  try{
   const response=await fetch(region.base+'pilot.json',{signal});if(!response.ok)throw Error('DEM no disponible')
   const raw=await response.text(),manifest=JSON.parse(raw),hash=await sha(raw)
   if(manifest.cell_m!==2000||manifest.window_km!==20||!Array.isArray(manifest.items))throw Error('Escala incompatible')
   let covers:Cover[]=[],coverSource='Sin cobertura terrestre integrada'
   if(region.coverage){try{const c=await json(region.base+'coverage.json',signal);if(c.pilot_sha256!==hash)throw Error('Máscara desactualizada');covers=c.items;coverSource='WorldCover 2021; muestreo aproximado a 200 m'}catch(e){if(signal?.aborted)throw e;coverSource=String(e)}}
   if(recent){
    if(region.recent){try{const c=await json(region.base+'recent-2026.json',signal);if(c.pilot_sha256!==hash)throw Error('Observaciones desactualizadas');covers=c.items.map((v:Cover)=>({...v,built:covers.find(old=>old.id===v.id)?.built??null}));coverSource='Agua/vegetación: Sentinel-2 2026. Construido: WorldCover 2021; muestreo aproximado a 200 m'}catch(e){if(signal?.aborted)throw e;covers=[];coverSource='Sin evidencia reciente válida: '+String(e)}}
    else {covers=[];coverSource='Observaciones 2026 todavía no procesadas'}
   }
   let geology:GeologyFeature[]=[],model:TerrainModel|undefined
   if(region.geology)try{geology=(await json(region.base+'geology.geojson',signal)).features}catch(e){if(signal?.aborted)throw e}
   if(region.model)try{const m=await json(region.base+'model.json',signal);if(m.data_sha256===hash)model=m}catch(e){if(signal?.aborted)throw e}
   let invalid=0
   for(const p of manifest.items as PilotItem[]){
    if(p.coverage!==1||p.heights.length!==100||p.heights.some(v=>!Number.isFinite(v))){invalid++;continue}
    const features=metrics(new Float32Array(p.heights));let ml:ReturnType<typeof classify>|undefined
    try{if(model)ml=classify(model,features)}catch{/* Auxiliary ML never invalidates physical measurements. */}
    const name=region.name.replace(/ · \d+ ventanas$/,'')+' · '+p.name
    out.push({id:p.id,name,source:p.source,zone:{...pilotZone(p),name},features,heights:new Float32Array(p.heights),origin:'sampled',region:region.name,cover:covers.find(c=>c.id===p.id),coverSource,geology:geologyAt(p.lon,p.lat,geology),ml,modelId:model?region.id:undefined})
   }
   return {items:out,report:{name:region.name,count:out.length,status:`${invalid} ventanas inválidas; ${coverSource}`,extent:manifest.extent,manifestHash:hash}}
  }catch(e){if(signal?.aborted)throw e;return {items:out,report:{name:region.name,count:0,status:String(e)}}}
 }))
 for(const entry of loaded){candidates.push(...entry.items);reports.push(entry.report)}
 try{
  const thermal=await json('/thermal/modis-observations.json',signal)
  for(const c of candidates)c.thermal=thermalAt(thermal,c.id,c.zone.centroid[0],c.zone.centroid[1])
  reports.push({name:'Temperatura superficial MODIS',count:candidates.filter(c=>c.thermal).length,status:'Observación terrestre parcial; no modifica el índice topográfico'})
 }catch(e){if(signal?.aborted)throw e;reports.push({name:'Temperatura superficial MODIS',count:0,status:'Sin observaciones disponibles: '+String(e)})}
 if(signal?.aborted)throw new DOMException('Cancelado','AbortError')
 if(!candidates.length)throw Error('No hay recortes válidos disponibles en esta búsqueda.')
 return {candidates,reports,referencePoints}
}

export function rankCandidates(candidates:Candidate[],reference:Relief,weights:Record<string,number>,policy:MaskPolicy,bounds?:SearchBounds,referencePoints: {lon:number;lat:number}[]=[]){
 // Validate even when no candidate survives the filters.
 combine(Object.entries(TOLERANCES).map(([id,t])=>({id,weight:weights[id],value:targetMatch(reference[id as keyof Relief],reference[id as keyof Relief],t)})))
 if(bounds)withinBounds(0,0,bounds)
 const inArea=candidates.filter(c=>!bounds||withinBounds(c.zone.centroid[0],c.zone.centroid[1],bounds))
 const counts={loaded:candidates.length,inArea:inArea.length,excluded:0,unknown:0,nearReference:0,eligible:0}
 const known=[...referencePoints,...candidates.filter(c=>c.origin==='catalogue').map(c=>({lon:c.zone.centroid[0],lat:c.zone.centroid[1]}))]
 const rows:SearchResult[]=[]
 for(const c of inArea){
  const decision=maskDecision(c.cover,policy)
  if(decision.status==='excluded'){counts.excluded++;continue}
  if(decision.status==='unknown'){counts.unknown++;continue}
  if(c.origin==='sampled'&&known.some(k=>distanceKm(k,{lon:c.zone.centroid[0],lat:c.zone.centroid[1]})<30)){counts.nearReference++;continue}
  const result=combine(Object.entries(TOLERANCES).map(([id,t])=>({id,weight:weights[id],value:targetMatch(c.features[id as keyof Relief],reference[id as keyof Relief],t)})))
  rows.push({...c,score:result.score!,contributions:result.contributions,filterStatus:decision.status})
 }
 rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));counts.eligible=rows.length
 // Spatial diversity only among sampled windows; reference catalogue stays separately identified.
 const diverse:SearchResult[]=[]
 for(const c of rows)if(c.origin==='catalogue'||diverse.filter(p=>p.origin==='sampled').every(p=>distanceKm({lon:p.zone.centroid[0],lat:p.zone.centroid[1]},{lon:c.zone.centroid[0],lat:c.zone.centroid[1]})>=30))diverse.push(c)
 return {rows:diverse,counts}
}
