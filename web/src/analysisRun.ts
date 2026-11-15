import {ENGINE_VERSION} from './scientificEngine.ts'
import {profileScope} from './analogyScope.ts'
import {marsSitePatch,MARS_SITES,metrics,TOLERANCES} from './marsData.ts'
import type {SearchTarget} from './searchTarget.ts'
import type {SearchResult,CoverageReport,rankCandidates} from './globalSearch.ts'
import type {MaskPolicy} from './coverageMask.ts'
import type {SearchBounds} from './regions.ts'
import type {CompareIndex} from './Compare3D.tsx'
export type AnalysisRun={id:string;rows:SearchResult[];reports:CoverageReport[];counts:ReturnType<typeof rankCandidates>['counts'];elapsed:number;reference:SearchTarget['features'];target:string;resolvedTarget:SearchTarget;experiment:string;weights:Record<string,number>;scope:string;recent:boolean;mask:MaskPolicy;bounds:SearchBounds|null;selectedTarget?:SearchTarget|null;generated:string}
export function comparisonFor(run:AnalysisRun,row:SearchResult):CompareIndex|null{
 const t=run.resolvedTarget
 if(!run.rows.some(r=>r.id===row.id)||!t.heights||!row.heights||t.heights.length!==100||row.heights.length!==100)return null
 return {size_km:20,res_m:2000,n:10,items:[{...t.features,id:'mission-target',name:t.name,body:t.body,file:t.file??'',lat:t.lat,lon:t.lon,source:t.source,heights:t.heights,visualHeights:t.visualHeights},{...row.features,id:row.id,name:row.name,body:'tierra',file:row.file??'',lat:row.zone.centroid[1],lon:row.zone.centroid[0],source:row.source,heights:row.heights}]}
}
export function serializeRun(run:AnalysisRun){return JSON.stringify({version:'analysis-run/1',engine:ENGINE_VERSION,tolerances:TOLERANCES,analogy:profileScope(run.experiment),cell_m:2000,window_km:20,...run},(_k,v)=>ArrayBuffer.isView(v)?Array.from(v as unknown as ArrayLike<number>):v,2)}
export function exportRun(run:AnalysisRun){const url=URL.createObjectURL(new Blob([serializeRun(run)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='terralunar-analisis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function referenceFor(target:string,selected?:SearchTarget|null):Promise<SearchTarget>{
 if(target==='selected'&&selected){if(selected.cell_m!==2000||selected.window_km!==20)throw Error('Escala incompatible');return selected}
 if(target.startsWith('mars-')){const site=MARS_SITES[Number(target.slice(5))];if(!site)throw Error('Destino desconocido');const p=await marsSitePatch(site);return {name:site.name,body:'marte',lat:p.lat,lon:p.lon,heights:p.heights,features:metrics(p.heights),source:p.source,cell_m:2000,window_km:20}}
 const r=await fetch('/compare/index.json');if(!r.ok)throw Error('Índice lunar no disponible');const index=await r.json()
 if(index.n!==250||index.res_m!==80||index.size_km!==20)throw Error('Escala lunar incompatible')
 const item=index.items.find((p:{id:string;body:string})=>p.id===target&&p.body==='luna');if(!item)throw Error('Objetivo no disponible')
 const res=await fetch('/compare/'+item.file);if(!res.ok)throw Error('Recorte lunar no disponible');const buffer=await res.arrayBuffer();if(buffer.byteLength!==125000)throw Error('Recorte lunar incompleto')
 const view=new DataView(buffer),h=new Float32Array(100)
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){let sum=0;for(let j=0;j<25;j++)for(let i=0;i<25;i++)sum+=view.getUint16(((y*25+j)*250+x*25+i)*2,true);h[y*10+x]=sum/625}
 return {name:item.name,body:'luna',lat:item.lat,lon:item.lon,file:item.file,heights:h,features:metrics(h),source:item.source+'; métricas agregadas a 2 km',cell_m:2000,window_km:20}
}
