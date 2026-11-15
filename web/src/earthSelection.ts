import type { Zone } from './score.ts'

// Matches pipeline/02_compare_patches.py earth_patch: cell edges, not mock zone polygons.
export function earthPatchZone(p: {id:string;name:string;lon:number;lat:number;source:string}, sizeKm=20): Zone {
  if (![p.lon,p.lat,sizeKm].every(Number.isFinite) || Math.abs(p.lat)>=90 || sizeKm<=0) throw Error('Recorte terrestre inválido')
  const dy=sizeKm*500/111320, dx=dy/Math.cos(p.lat*Math.PI/180)
  const ring=[[p.lon-dx,p.lat+dy],[p.lon+dx,p.lat+dy],[p.lon+dx,p.lat-dy],[p.lon-dx,p.lat-dy],[p.lon-dx,p.lat+dy]]
  return {id:p.id,name:p.name,country:'Recorte terrestre analizado',centroid:[p.lon,p.lat],polygon:{type:'Polygon',coordinates:[ring]},area_km2:sizeKm**2,scores:{},known:false,sources:[p.source],notes:'Huella de muestreo del DEM: 20 × 20 km nominales. Analogía de relieve; no certifica geología, recursos ni aptitud operativa.'}
}
export type PickEarth = (id:string, zone?:Zone, score?:number)=>void
