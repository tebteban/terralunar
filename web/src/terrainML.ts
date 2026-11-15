import type { Relief } from './marsData.ts'
export const FEATURES = ['pendiente_mediana','pendiente_p90','rugosidad_m','desnivel_m'] as const
export type TerrainModel={version:string;mean:number[];scale:number[];centers:number[][];min:number[];max:number[];training_ids:string[];data_sha256:string;cell_m:number;window_km:number}
export function vector(p:Relief){return FEATURES.map(k=>p[k])}
function check(v:number[]){if(v.length!==4||v.some(x=>!Number.isFinite(x)))throw Error('Vector físico inválido')}
const sq=(a:number[],b:number[])=>a.reduce((s,v,j)=>s+(v-b[j])**2,0)
export function classify(model:TerrainModel,features:Relief){
 const v=vector(features);check(v);check(model.mean);check(model.scale);check(model.min);check(model.max)
 if(model.version!=='terrain-kmeans-1'||model.cell_m!==2000||model.window_km!==20||!model.centers.length||model.scale.some(s=>s<=0))throw Error('Modelo incompatible')
 model.centers.forEach(check)
 const x=v.map((a,j)=>(a-model.mean[j])/model.scale[j]);const distances=model.centers.map(c=>sq(x,c));const group=distances.indexOf(Math.min(...distances))
 return {group:group+1,distance:Math.sqrt(distances[group]),outsideTrainingRange:v.some((a,j)=>a<model.min[j]||a>model.max[j])}
}
// Offline Lloyd k-means, deterministic farthest-point starts. No target/score labels.
export function fitTerrain(rows:{id:string;features:Relief}[],k=3):TerrainModel{
 if(!Number.isInteger(k)||k<1||rows.length<k)throw Error('Muestras insuficientes')
 const values=rows.map(r=>vector(r.features));values.forEach(check)
 const mean=FEATURES.map((_,j)=>values.reduce((s,x)=>s+x[j],0)/values.length)
 const scale=mean.map((m,j)=>Math.sqrt(values.reduce((s,x)=>s+(x[j]-m)**2,0)/values.length)||1)
 const xs=values.map(v=>v.map((a,j)=>(a-mean[j])/scale[j]))
 let best:number[][]=[],loss=Infinity
 for(let start=0;start<Math.min(10,xs.length);start++){
 let centers=[xs[start].slice()]
 while(centers.length<k){const ds=xs.map(x=>Math.min(...centers.map(c=>sq(x,c))));if(Math.max(...ds)<1e-12)throw Error('No hay suficientes terrenos distintos');centers.push(xs[ds.indexOf(Math.max(...ds))].slice())}
 for(let iter=0;iter<100;iter++){
 const groups=xs.map(x=>{const ds=centers.map(c=>sq(x,c));return ds.indexOf(Math.min(...ds))})
 const updated=centers.map((c,i)=>{const members=xs.filter((_,j)=>groups[j]===i);return members.length?c.map((_,j)=>members.reduce((s,x)=>s+x[j],0)/members.length):c})
 const change=centers.reduce((s,c,i)=>s+sq(c,updated[i]),0);centers=updated;if(change<1e-12)break
 }
 const error=xs.reduce((s,x)=>s+Math.min(...centers.map(c=>sq(x,c))),0);if(error<loss){loss=error;best=centers}
 }
 best.sort((a,b)=>a[0]-b[0])
 return {version:'terrain-kmeans-1',mean,scale,centers:best,min:FEATURES.map((_,j)=>Math.min(...values.map(v=>v[j]))),max:FEATURES.map((_,j)=>Math.max(...values.map(v=>v[j]))),training_ids:rows.map(r=>r.id),data_sha256:'',cell_m:2000,window_km:20}
}
