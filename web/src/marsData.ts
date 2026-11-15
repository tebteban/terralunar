import { combine, targetMatch } from './scientificEngine.ts'
// NASA MOLA MEGDR 32 px/degree. Signed big-endian metres above the areoid.
export const MARS_RADIUS = 3396000
export const PATCH_N = 10
export const PATCH_STEP = 2000
export type Relief = { pendiente_mediana: number; pendiente_p90: number; rugosidad_m: number; desnivel_m: number }
export type Patch = Relief & { id: string; name: string; body: 'marte' | 'tierra'; file: string; lat: number; lon: number; source: string; heights: Float32Array }
let loading: Promise<Int16Array> | undefined
export function loadMars() {
  return loading ??= (async () => {
    const values = new Int16Array(11520 * 5760)
    let nextBand = 0
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (nextBand < 16) {
      const band = nextBand++
      const response = await fetch(`/mars/mola32-${band}.dat`)
      if (!response.ok || !response.body) throw new Error('No se pudo cargar MOLA')
      const buffer = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      if (buffer.byteLength !== 11520 * 360 * 2) throw new Error('Grilla MOLA incompleta')
      const bytes = new DataView(buffer)
      for (let i = 0; i < 11520 * 360; i++) values[band * 11520 * 360 + i] = bytes.getInt16(i * 2, false)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      }
    }))
    return values
  })().catch(e => { loading = undefined; throw e })
}
export function elevation(grid: Int16Array, lon: number, lat: number) {
  const x = ((lon % 360 + 360) % 360) * 32 - 0.5
  const y = Math.max(0, Math.min(5759, (90 - lat) * 32 - 0.5))
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const at = (xx: number, yy: number) => grid[Math.min(5759, yy) * 11520 + (xx + 11520) % 11520]
  return at(x0,y0)*(1-fx)*(1-fy)+at(x0+1,y0)*fx*(1-fy)+at(x0,y0+1)*(1-fx)*fy+at(x0+1,y0+1)*fx*fy
}
const rad = Math.PI / 180
// Spherical direct geodesic: valid across the antimeridian and close to the poles.
export function offset(lon: number, lat: number, east: number, north: number): [number, number] {
  const distance = Math.hypot(east,north) / MARS_RADIUS, bearing = Math.atan2(east,north), phi = lat*rad
  const p = Math.asin(Math.sin(phi)*Math.cos(distance)+Math.cos(phi)*Math.sin(distance)*Math.cos(bearing))
  const l = lon*rad + Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(phi),Math.cos(distance)-Math.sin(phi)*Math.sin(p))
  return [((l/rad+540)%360)-180,p/rad]
}
export function metrics(h: Float32Array, n = PATCH_N, step = PATCH_STEP): Relief {
  if (h.length !== n*n || h.some(v => !Number.isFinite(v))) throw new Error('Recorte inválido')
  const slopes: number[] = [], residuals: number[] = []
  for (let y=1;y<n-1;y++) for(let x=1;x<n-1;x++) {
    const dx=(h[y*n+x+1]-h[y*n+x-1])/(2*step),dy=(h[(y+1)*n+x]-h[(y-1)*n+x])/(2*step)
    slopes.push(Math.atan(Math.hypot(dx,dy))/rad)
    let mean=0
    for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) mean+=h[(y+j)*n+x+i]/9
    residuals.push(h[y*n+x]-mean)
  }
  slopes.sort((a,b)=>a-b)
  const mean=residuals.reduce((a,b)=>a+b,0)/residuals.length
  return { pendiente_mediana: slopes[Math.floor(slopes.length*.5)], pendiente_p90: slopes[Math.floor(slopes.length*.9)], rugosidad_m: Math.sqrt(residuals.reduce((s,v)=>s+(v-mean)**2,0)/residuals.length), desnivel_m: Math.max(...h)-Math.min(...h) }
}
export function marsPatch(grid: Int16Array, lon: number, lat: number): Patch {
  return patchFrom((l, p) => elevation(grid, l, p), lon, lat)
}
function patchFrom(elev: (lon: number, lat: number) => number, lon: number, lat: number): Patch {
  const heights=new Float32Array(PATCH_N*PATCH_N)
  // Area averaging over each 2 km cell, also applied to Earth below.
  for(let y=0;y<PATCH_N;y++) for(let x=0;x<PATCH_N;x++) {
    let sum=0
    for(let j=0;j<5;j++) for(let i=0;i<5;i++) {
      const [l,p]=offset(lon,lat,(x-4.5)*2000+(i-2)*400,(4.5-y)*2000+(2-j)*400)
      sum+=elev(l,p)
    }
    heights[y*PATCH_N+x]=sum/25
  }
  return {id:'mars-picked', name:'Región seleccionada',body:'marte', file:'',lat,lon,source:'NASA MGS MOLA MEGDR 32 px/°; grilla nominal 1,853 km; interpolación y promedio a 2 km',heights,...metrics(heights)}
}
export async function earthPatches(): Promise<Patch[]> {
  const response=await fetch('/compare/index.json')
  if(!response.ok) throw new Error('No se pudo cargar el catálogo terrestre')
  const index=await response.json()
  if(index.n!==250 || index.res_m!==80 || index.size_km!==20) throw new Error('Escala del catálogo terrestre incompatible')
  return Promise.all(index.items.filter((i: {body:string;agua?:number})=>i.body==='tierra' && !i.agua).map(async (item: Patch)=>{
    const r=await fetch(`/compare/${item.file}`)
    if(!r.ok) throw new Error(`Falta el recorte ${item.name}`)
    const buffer=await r.arrayBuffer()
    if(buffer.byteLength!==250*250*2) throw new Error('Recorte terrestre incompleto')
    const source=new DataView(buffer), heights=new Float32Array(100)
    for(let y=0;y<10;y++) for(let x=0;x<10;x++) {
      let sum=0
      for(let j=0;j<25;j++) for(let i=0;i<25;i++) sum+=source.getUint16(((y*25+j)*250+x*25+i)*2,true)
      heights[y*10+x]=sum/625
    }
    return {...item,heights,...metrics(heights),source:item.source+'; promedio de celdas de 80 m a 2 km'}
  }))
}
export const TOLERANCES: Relief = {pendiente_mediana:5,pendiente_p90:8,rugosidad_m:200,desnivel_m:1000}
export function similarity(a: Relief,b: Relief) {
  return combine(Object.entries(TOLERANCES).map(([k,t])=>({id:k,weight:1,value:targetMatch(a[k as keyof Relief],b[k as keyof Relief],t)}))).score! / 100
}

// Sitios de referencia en Marte (compartidos por la vista de Marte y el comparador de la ficha terrestre)
export const MARS_SITES = [
  {name:'Olympus Mons',lon:-133.8,lat:18.65}, {name:'Valles Marineris',lon:-60,lat:-13},
  {name:'Jezero',lon:77.58,lat:18.44}, {name:'Gale',lon:137.4,lat:-4.6},
  {name:'Elysium Planitia',lon:135.6,lat:4.5}, {name:'Hellas Planitia',lon:70,lat:-42.4},
]

// Recorte de un sitio sin bajar todo MOLA: solo las franjas de 11,25° de latitud que toca (~6 MB c/u)
const bands = new Map<number, Promise<Int16Array>>()
function loadBand(band: number) {
  if (!bands.has(band)) bands.set(band, (async () => {
    const response = await fetch(`/mars/mola32-${band}.dat`)
    if (!response.ok || !response.body) throw new Error('No se pudo cargar MOLA')
    const buffer = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    if (buffer.byteLength !== 11520 * 360 * 2) throw new Error('Franja MOLA incompleta')
    const view = new DataView(buffer), out = new Int16Array(11520 * 360)
    for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, false)
    return out
  })().catch(e => { bands.delete(band); throw e }))
  return bands.get(band)!
}
export async function marsSitePatch(site: { name: string; lon: number; lat: number }): Promise<Patch> {
  const row = (lat: number) => Math.max(0, Math.min(5759, (90 - lat) * 32 - 0.5))
  const needed = new Set<number>()
  for (const dLat of [-0.5, 0, 0.5]) for (const dy of [0, 1]) needed.add(Math.min(15, Math.floor((Math.floor(row(site.lat + dLat)) + dy) / 360)))
  const loaded = new Map(await Promise.all([...needed].map(async b => [b, await loadBand(b)] as const)))
  const at = (xx: number, yy: number) => {
    const y = Math.min(5759, yy), band = loaded.get(Math.floor(y / 360))
    if (!band) throw new Error('Franja MOLA faltante')
    return band[(y % 360) * 11520 + ((xx % 11520) + 11520) % 11520]
  }
  const elev = (lon: number, lat: number) => { // misma interpolación bilineal que elevation()
    const x = ((lon % 360 + 360) % 360) * 32 - 0.5, y = row(lat)
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
    return at(x0,y0)*(1-fx)*(1-fy)+at(x0+1,y0)*fx*(1-fy)+at(x0,y0+1)*(1-fx)*fy+at(x0+1,y0+1)*fx*fy
  }
  return { ...patchFrom(elev, site.lon, site.lat), id: `marte-${site.name}`, name: site.name }
}
