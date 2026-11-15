import { metrics, TOLERANCES, type Relief } from './marsData.ts'
import { combine, targetMatch } from './scientificEngine.ts'
import type { Zone } from './score.ts'
export type PilotItem={id:string;name:string;lat:number;lon:number;heights:number[];source:string;polygon:Zone['polygon'];coverage:number}
export function distanceKm(a:{lat:number;lon:number},b:{lat:number;lon:number}){const r=Math.PI/180;const v=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 12742.0176*Math.asin(Math.sqrt(Math.min(1,v)))}
export function discover(items:PilotItem[],target:Relief,weights:Record<string,number>,known:{lat:number;lon:number}[]=[]){
 const scored=items.filter(p=>p.coverage===1&&known.every(k=>distanceKm(p,k)>=30)).map(p=>{
 if(p.heights.length!==100||p.heights.some(v=>!Number.isFinite(v)))throw Error('Ventana inválida: '+p.id)
 const features=metrics(new Float32Array(p.heights));const result=combine(Object.entries(TOLERANCES).map(([id,t])=>({id,weight:weights[id],value:targetMatch(features[id as keyof Relief],target[id as keyof Relief],t)})))
 return {...p,features,score:result.score!,contributions:result.contributions}
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
 const diverse:typeof scored=[];for(const p of scored)if(diverse.every(q=>distanceKm(p,q)>=30))diverse.push(p)
 return {scored,diverse}
}
export function pilotZone(p:PilotItem):Zone{return {id:p.id,name:p.name,country:'Piloto regional · coordenadas verificables',centroid:[p.lon,p.lat],polygon:p.polygon,area_km2:400,scores:{},known:false,sources:[p.source],notes:'Candidato topográfico exploratorio. Sin verificación de agua, vegetación, geología ni acceso.'}}
