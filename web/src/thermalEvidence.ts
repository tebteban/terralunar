export type ThermalPhase={count:number;total:number;validFraction:number;kelvin:number[]|null;solarHours:number[]|null}
export type ThermalObservation={id:string;lat:number;lon:number;day:ThermalPhase;night:ThermalPhase}
export type ThermalManifest={version:string;product:string;date:string;granule:string;sha256:string;source:string;resolutionM:number;quality:string;comparisonEligible:false;items:ThermalObservation[]}
export type ThermalEvidence=Omit<ThermalManifest,'items'> & ThermalObservation
export function thermalAt(manifest:ThermalManifest,id:string,lon:number,lat:number):ThermalEvidence|undefined{
 if(manifest.version!=='thermal-observation/1'||manifest.comparisonEligible!==false||!Number.isFinite(manifest.resolutionM)||manifest.resolutionM<=0)return
 const item=manifest.items.find(v=>v.id===id&&Math.abs(v.lon-lon)<1e-6&&Math.abs(v.lat-lat)<1e-6)
 if(!item)return
 for(const p of [item.day,item.night]){
  if(!Number.isInteger(p.count)||!Number.isInteger(p.total)||p.total<=0||p.count<0||p.count>p.total||!Number.isFinite(p.validFraction)||Math.abs(p.validFraction-p.count/p.total)>1e-6)return
  if(p.count>0&&(!p.kelvin||p.kelvin.length!==3||p.kelvin.some((v,i,a)=>!Number.isFinite(v)||v<=0||(i>0&&v<a[i-1]))))return
  if(p.count===0&&p.kelvin!==null)return
 }
 const {items,...metadata}=manifest;void items
 return {...metadata,...item}
}
