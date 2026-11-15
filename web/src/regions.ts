export type Region={id:string;name:string;base:string;coverage:boolean;recent:boolean;model:boolean;geology:boolean}
export function validateRegions(value:unknown):Region[]{
 const data=value as {version:number;regions:Region[]}
 if(data?.version!==1||!Array.isArray(data.regions)||!data.regions.length)throw Error('Registro de regiones inválido')
 const ids=new Set<string>()
 for(const r of data.regions){if(!r||typeof r.id!=='string'||!r.id.match(/^[a-z0-9_-]+$/)||ids.has(r.id)||typeof r.name!=='string'||typeof r.base!=='string'||!r.base.match(/^\/discovery\/(?:[a-z0-9_-]+\/)?$/)||['coverage','recent','model','geology'].some(k=>typeof r[k as keyof Region]!=='boolean'))throw Error('Región incompatible');ids.add(r.id)}
 return data.regions
}
export type SearchBounds={west:number;south:number;east:number;north:number}
export function withinBounds(lon:number,lat:number,b:SearchBounds){if(!Object.values(b).every(Number.isFinite)||b.west>=b.east||b.south>=b.north||b.west< -180||b.east>180||b.south< -90||b.north>90)throw Error('Área inválida: oeste < este, sur < norte; sin cruce del antimeridiano');return lon>=b.west&&lon<=b.east&&lat>=b.south&&lat<=b.north}
