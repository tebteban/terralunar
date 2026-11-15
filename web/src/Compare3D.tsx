import { localBuffer } from './localData.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { fromUrl, type GeoTIFFImage } from 'geotiff'
import { offset } from './marsData.ts'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MARS_SITES, earthIndex, earthPatch, marsSitePatch, similarity } from './marsData.ts'
import { MOON_TOL, moonSimilarity } from './moonRelief.ts'
import { TOLERANCES as MARS_TOL } from './marsData.ts'
import ConsoleIcon from './ConsoleIcon.tsx'
import NoWebGL from './NoWebGL.tsx'
import { hasWebGL } from './webgl.ts'
import { coord, degrees, meters, num } from './fmt.ts'
import { terrainFile, terrainGeometry } from './terrainExport.ts'

// Comparador Luna vs Tierra: dos maquetas del MISMO tamaño (20 x 20 km), misma resolución (80 m),
// misma exageración vertical y misma luz. Girar una gira la otra.
interface Item {
  id: string; name: string; body: 'luna' | 'tierra' | 'marte'; heights?: Float32Array; file: string; lat: number; lon: number
  pendiente_mediana: number; pendiente_p90: number; rugosidad_m: number; desnivel_m: number
  visualHeights?:Float32Array; source: string; ref?: string; url?: string; agua?: number
}
export interface CompareIndex { size_km: number; res_m: number; n: number; items: Item[] }

const EXAGGERATION = 2

// COG global MOLA/HRSC: su índice de teselas pesa ~1 MB. Bloques de 1 MB (2 pedidos en vez de 4–8) y una sola apertura por sesión.
let marsDetail: Promise<GeoTIFFImage> | undefined
const openMarsDetail = () => fromUrl('https://huggingface.co/datasets/Biscut4Biscuit/mola-hrsc-baseline-cog/resolve/main/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2_cog.tif', { blockSize: 1 << 20 } as Parameters<typeof fromUrl>[1]) // blockSize llega al BlockedSource aunque los tipos 3.0.5 no lo declaren
  .then(t => t.getImage()).catch(e => { marsDetail = undefined; throw e })

async function loadHeights(file: string) {
  return new Uint16Array(await localBuffer(`/compare/${file}`))
}

type Shared = { cams: THREE.PerspectiveCamera[]; controls: OrbitControls[]; syncing: boolean }
type Link = { register: (slot: number, cam: THREE.PerspectiveCamera, ctl: OrbitControls) => void; follow: (slot: number) => void }

function Terrain({ item, index, link, slot, exaggeration, meshHeights, meshN }: { item: Item; index: CompareIndex; link: Link; slot: number; exaggeration: number; meshHeights?: Float32Array; meshN?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [terrainError, setTerrainError] = useState('')
  useEffect(() => {
    if (!hasWebGL()) return
    const el = box.current!
    let disposed = false
    const size = index.size_km * 1000
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#000000')
    scene.add(new THREE.AmbientLight('#ffffff', 0.55))
    scene.add(new THREE.HemisphereLight('#dbeafe', '#5b4538', 0.65))
    const sun = new THREE.DirectionalLight('#ffffff', 2.2)
    sun.position.set(-size, size * 0.3, size * 0.3) // sol bajo, igual en los dos paneles
    scene.add(sun)
    const camera = new THREE.PerspectiveCamera(45, 1, 10, size * 10)
    camera.position.set(0, size * 1.1, size * 1.4)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.maxPolarAngle = Math.PI * 0.38 // no bajar a ras del suelo: la maqueta se vuelve ilegible
    controls.minDistance = size * 0.6 // no meter la cámara adentro del relieve
    link.register(slot, camera, controls)
    const render = () => renderer.render(scene, camera)
    controls.addEventListener('change', () => {
      render()
      link.follow(slot)
    })
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    ;(meshHeights ? Promise.resolve(meshHeights) : item.heights ? Promise.resolve(item.heights) : loadHeights(item.file)).then((h) => {
      if (disposed) return
      // centrada en su altura media: la cámara (compartida) orbita alrededor del centro de cada maqueta
      const geo = terrainGeometry(h, meshN ?? index.n, size, exaggeration)
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: item.body === 'marte' ? '#c29276' : '#adb5bd', roughness: 1, side: THREE.DoubleSide }))
      scene.add(mesh)
      render()
    }).catch(e => { if (!disposed) setTerrainError(String(e)) })
    return () => { scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()) } }); disposed = true; ro.disconnect(); controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); el.innerHTML = '' } // forceContextLoss: liberar el contexto WebGL (Chrome mantiene ~16)
  }, [item, index, link, slot, exaggeration, meshHeights, meshN])
  if (!hasWebGL()) return <NoWebGL what="la maqueta de relieve" href="https://trek.nasa.gov/" label="Abrir NASA Trek" />
  return <div className="relative h-full w-full"><div ref={box} className="h-full w-full" aria-label={`Relieve 3D de ${item.name}`} />{terrainError && <p role="alert" className="absolute top-2 left-2 text-canvas">{terrainError}</p>}</div>
}

// En la Tierra se muestra el Δ contra el objetivo y si entra en la tolerancia del método (ok/warn).
function Stats({ item, other, regional }: { item: Item; other?: Item; regional?:boolean }) {
  const rows: [string, 'pendiente_mediana' | 'pendiente_p90' | 'rugosidad_m' | 'desnivel_m', string][] = [
    ['Pendiente mediana', 'pendiente_mediana', '°'], ['Pendiente alta (p90)', 'pendiente_p90', '°'],
    ['Rugosidad', 'rugosidad_m', ' m'], ['Desnivel total', 'desnivel_m', ' m'],
  ]
  const tol = regional || other?.body === 'marte' ? MARS_TOL : MOON_TOL
  return (
    <dl className="flex flex-col divide-y divide-white/10">
      {rows.map(([label, key, unit]) => {
        const d = other ? item[key] - other[key] : 0
        const ok = other ? Math.abs(d) <= tol[key] : true
        const fmt = unit === '°' ? degrees : meters
        return (
          <div key={key} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="text-[13px] text-mute">{label}</dt>
            <dd className="metric flex items-baseline gap-2 text-right text-lg font-semibold text-canvas">
              {fmt(item[key])}
              {other && <span className="hud flex items-center gap-1.5 font-normal text-mute" title={`Tolerancia del método: ${tol[key]}${unit.trim()}`}>
                <span className={`size-1.5 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} aria-hidden="true" />
                Δ {d > 0 ? '+' : ''}{fmt(d)} · tol {tol[key]}{unit}
              </span>}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function Compare3D({ zoneId, onClose, supplied, analysisScore, analysisId }: { zoneId: string; onClose: () => void; supplied?: CompareIndex;analysisScore?:number;analysisId?:string }) {
  const [loadedIndex, setIndex] = useState<CompareIndex | null>(null)
  // Desde la ficha terrestre se puede comparar con la Luna (LOLA 80 m) o con Marte (MOLA, celdas de 2 km)
  const [planet, setPlanet] = useState<'luna' | 'marte'>('luna')
  const [marsSite, setMarsSite] = useState(MARS_SITES[2].name) // Jezero
  const [marsIndex, setMarsIndex] = useState<CompareIndex | null>(null)
  const index = supplied ?? (planet === 'marte' ? marsIndex : loadedIndex)
  // celdas de 2 km (Marte) aplanan el relieve: arranca más exagerado; a 80–800 m alcanza con ×2
  const [exaggeration, setExaggeration] = useState(supplied && supplied.res_m >= 2000 ? 6 : EXAGGERATION)
  const [highRes, setHighRes] = useState<{key: string; mars: Float32Array; earth: Float32Array;n?:number;cell?:number} | null>(null)
  const [detailStatus, setDetailStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [moonId, setMoonId] = useState<string | null>(null)
  const shared = useRef<Shared>({ cams: [], controls: [], syncing: false })
  const link = useMemo<Link>(() => ({
    register: (slot, cam, ctl) => { shared.current.cams[slot] = cam; shared.current.controls[slot] = ctl },
    follow: (slot) => { // copia la vista del panel que se movió al otro
      const s = shared.current
      if (s.syncing) return
      s.syncing = true
      s.controls.forEach((c, i) => {
        if (i === slot || !c) return
        s.cams[i].position.copy(s.cams[slot].position)
        c.target.copy(s.controls[slot].target)
        c.update()
      })
      s.syncing = false
    },
  }), [])

  useEffect(() => {
    if (supplied) return
    fetch('/compare/index.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CompareIndex) => { setIndex(d); setMoonId(d.items.find((i) => i.body === 'luna')?.id ?? null) })
      .catch((e) => setError(String(e)))
  }, [supplied])

  useEffect(() => {
    if (supplied || planet !== 'marte') return
    let off = false
    const site = MARS_SITES.find((s) => s.name === marsSite)!
    // Solo la malla terrestre que se compara, no todo el catálogo
    Promise.all([marsSitePatch(site), earthIndex()]).then(async ([mars, items]) => {
      const item = items.find((p) => p.id === zoneId)
      if (!item) { if (!off) setError('esta zona incluye mar aplanado y no entra en la comparación con Marte'); return }
      const zone = await earthPatch(item)
      if (!off) setMarsIndex({ size_km: 20, res_m: 2000, n: 10, items: [mars, zone] })
    }).catch((e) => { if (!off) setError(String(e)) })
    return () => { off = true }
  }, [supplied, planet, marsSite, zoneId])

  const moons = index?.items.filter((i) => i.body !== 'tierra') ?? []
  const moon = moons.find((i) => i.id === moonId) ?? moons[0]
  const earth = index?.items.find((i) => i.id === zoneId)
  const detail = highRes && moon && earth && highRes.key === `${moon.id}|${moon.lat}|${moon.lon}|${earth.id}` ? highRes : null // nunca el relieve de otro sitio
  useEffect(() => {
    if (!moon || !earth || !earth.file || moon.body !== 'marte') return // el modelo de 200 m es solo de Marte
    let cancelled = false
    // 200 m cell centres on the same 20 km footprint, independent of the coarse ranking.
    const run = async () => {
      setDetailStatus('Cargando elevaciones detalladas de Marte y Tierra…')
      const image = await (marsDetail ??= openMarsDetail())
      const width = image.getWidth(), height = image.getHeight(), bbox = image.getBoundingBox()
      const points: [number, number][] = []
      for (let y=0;y<100;y++) for (let x=0;x<100;x++) points.push(offset(moon.lon,moon.lat,(x-49.5)*200,(49.5-y)*200))
      const px=points.map(([lon])=>(lon-bbox[0])/(bbox[2]-bbox[0])*width-.5)
      const py=points.map(([,lat])=>(bbox[3]-lat)/(bbox[3]-bbox[1])*height-.5)
      const minX=Math.floor(Math.min(...px))-1,maxX=Math.ceil(Math.max(...px))+2,minY=Math.floor(Math.min(...py))-1,maxY=Math.ceil(Math.max(...py))+2
      if(minX<0||maxX>width||minY<0||maxY>height||maxX-minX>4000||maxY-minY>4000) throw new Error('Esta región cruza el borde del modelo global o está demasiado cerca de un polo')
      const raster=await image.readRasters({window:[minX,minY,maxX,maxY],samples:[0],interleave:true})
      const w=maxX-minX, out=new Float32Array(10000), noData=image.getGDALNoData()
      for(let i=0;i<out.length;i++) {
        const x=px[i]-minX,y=py[i]-minY,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0
        const z=[raster[y0*w+x0],raster[y0*w+x0+1],raster[(y0+1)*w+x0],raster[(y0+1)*w+x0+1]]
        if(z.some(v=>!Number.isFinite(v)||v===noData)) throw new Error('El modelo detallado contiene celdas sin datos en esta región')
        out[i]=z[0]*(1-fx)*(1-fy)+z[1]*fx*(1-fy)+z[2]*(1-fx)*fy+z[3]*fx*fy
      }
      const data=await localBuffer(`/compare/${earth.file}`).catch(()=>{throw new Error('No se pudo cargar el recorte terrestre detallado')}); if(data.byteLength!==250*250*2) throw new Error('Recorte terrestre inválido')
      const view=new DataView(data), ground=new Float32Array(10000)
      for(let y=0;y<100;y++) for(let x=0;x<100;x++) {
        // 200 m cells average 80 m samples with fractional overlap.
        let total=0, weight=0
        for(let j=Math.floor(y*2.5);j<Math.ceil((y+1)*2.5);j++) for(let i=Math.floor(x*2.5);i<Math.ceil((x+1)*2.5);i++) {
          const f=(Math.min((x+1)*2.5,i+1)-Math.max(x*2.5,i))*(Math.min((y+1)*2.5,j+1)-Math.max(y*2.5,j))
          total+=view.getUint16((j*250+i)*2,true)*f;weight+=f
        }
        ground[y*100+x]=total/weight
      }
      if(!cancelled){setHighRes({key:`${moon.id}|${moon.lat}|${moon.lon}|${earth.id}`,mars:out,earth:ground});setDetailStatus('Relieve detallado: MOLA/HRSC 200 m y Tierra promediada a 200 m. Las métricas del ranking siguen calculadas a 2 km.')}
    }
    run().catch(e=>{if(!cancelled)setDetailStatus(`No se pudo cargar el relieve detallado: ${String(e)}. Se muestra el modelo regional de 2 km.`)})
    return()=>{cancelled=true}
  }, [supplied, moon, earth])


  useEffect(()=>{
    if(!moon||!earth||moon.body!=='luna'||!earth.file||(!moon.file&&!moon.visualHeights))return
    let cancelled=false
    const load=async()=>{
      const raw=new Uint16Array(await localBuffer('/compare/'+earth.file))
      if(raw.length!==62500)throw Error('Recorte terrestre incompleto')
      let mh:Float32Array,eh:Float32Array,n:number,cell:number
      if(moon.file){const lunar=new Uint16Array(await localBuffer('/compare/'+moon.file));if(lunar.length!==62500)throw Error('Recorte lunar incompleto');mh=new Float32Array(lunar);eh=new Float32Array(raw);n=250;cell=80}
      else {mh=moon.visualHeights!;n=25;cell=800;eh=new Float32Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let sum=0;for(let j=0;j<10;j++)for(let i=0;i<10;i++)sum+=raw[(y*10+j)*250+x*10+i];eh[y*n+x]=sum/100}}
      if(!cancelled){setHighRes({key:`${moon.id}|${moon.lat}|${moon.lon}|${earth.id}`,mars:mh,earth:eh,n,cell});setDetailStatus(`Mallas a ${cell} m. El puntaje de esta ejecución conserva las métricas a ${index?.res_m} m.`)}
    }
    load().catch(e=>{if(!cancelled)setDetailStatus('Detalle no disponible: '+String(e)+'. Se conserva la malla regional.')})
    return()=>{cancelled=true}
  },[moon,earth,index?.res_m])
  const tag = (body: string) => body === 'marte'
    ? 'border-mars/40 bg-mars/15 text-[#ffb59c]'
    : body === 'luna' ? 'border-white/20 bg-canvas text-ink' : 'border-white/20 bg-pressed text-ink'
  const toolbar = 'flex items-center gap-2 rounded-full border border-white/[0.07] bg-obsidian px-4 py-2 text-sm'
  const bodyName = (b: string) => b === 'luna' ? 'Luna' : b === 'marte' ? 'Marte' : 'Tierra'
  // Parecido de relieve con la misma fórmula y tolerancias que el panel de origen (Luna o Marte)
  const score = analysisScore!==undefined ? analysisScore/100 : moon && earth ? (moon.body === 'marte' ? similarity(moon, earth) : moonSimilarity(moon, earth)) : null
  const cell = index ? (detail ? (detail.cell??200) : index.res_m) : 0
  const short = (src: string) => src.split(/[;(]/)[0].trim()
  const [exportMsg, setExportMsg] = useState('')
  // La misma grilla que dibuja cada panel: detalle si llegó, si no la del índice.
  async function gridFor(it: Item, slot: number) {
    if (detail) return { h: slot === 0 ? detail.mars : detail.earth, n: detail.n ?? 100, cell: detail.cell ?? 200 }
    return { h: it.heights ?? new Float32Array(await loadHeights(it.file)), n: index!.n, cell: index!.res_m }
  }
  const slug = (s: string) => s.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  function save(name: string, data: BlobPart, type: string) {
    const url = URL.createObjectURL(new Blob([data], { type }))
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function exportFile(kind: 'json' | 'stl' | 'obj', slot = 0) {
    if (!index || !moon || !earth) return
    setExportMsg('Preparando archivo…')
    try {
      const items = [moon, earth]
      if (kind === 'json') {
        const grids = await Promise.all(items.map(gridFor))
        const tol = index.res_m >= 2000 || moon.body === 'marte' ? MARS_TOL : MOON_TOL
        save(`terralunar-comparacion-${slug(moon.name)}-${slug(earth.name)}.json`, JSON.stringify({
          formato: 'terralunar-comparacion/1', generado: new Date().toISOString(), analisis: analysisId ?? null,
          escala: { ventana_km: index.size_km, celda_metricas_m: index.res_m, exageracion_vista: exaggeration },
          parecido_relieve: score === null ? null : Math.round(score * 100), tolerancias: tol,
          nota: 'Métricas calculadas sobre la grilla del índice. Alturas en metros con origen vertical propio de cada fuente: solo las diferencias son comparables.',
          sitios: items.map((it, i) => ({
            id: it.id, nombre: it.name, cuerpo: it.body, lat: it.lat, lon: it.lon, fuente: it.source, referencia: it.ref ?? null, url: it.url ?? null,
            metricas: { pendiente_mediana_grados: it.pendiente_mediana, pendiente_p90_grados: it.pendiente_p90, rugosidad_m: it.rugosidad_m, desnivel_m: it.desnivel_m },
            grilla: { n: grids[i].n, celda_m: grids[i].cell, alturas_m: Array.from(grids[i].h, v => Math.round(v * 10) / 10) },
          })),
        }, null, 2), 'application/json')
      } else {
        const it = items[slot], g = await gridFor(it, slot)
        const data = terrainFile(g.h, g.n, index.size_km * 1000, exaggeration, kind, it.name)
        save(`terralunar-${slug(it.name)}-${index.size_km}km-x${exaggeration}.${kind}`, data, kind === 'stl' ? 'model/stl' : 'model/obj')
      }
      setExportMsg('')
    } catch (e) { setExportMsg('No se pudo exportar: ' + String(e)) }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-space p-4 text-canvas md:p-6" role="dialog" aria-label="Comparador de relieve planetario y terrestre">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        {analysisId&&<span className="sr-only" data-testid="comparison-run">{analysisId}</span>}<h2 className="mr-2 text-xl leading-7 font-bold tracking-tight">Comparar relieve en 3D</h2>
        {!supplied && <div className="flex gap-1 rounded-full border border-white/[0.07] bg-rail p-1" aria-label="Cuerpo a comparar">
          {(['luna', 'marte'] as const).map((b) => (
            <button key={b} type="button" aria-pressed={planet === b}
              onClick={() => { setPlanet(b); setMarsIndex(null); setError(null); setExaggeration(b === 'marte' ? 6 : EXAGGERATION) }}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs text-mute transition-colors hover:text-canvas aria-pressed:bg-canvas aria-pressed:font-bold aria-pressed:text-ink">
              {b === 'marte' && <span className="size-2 rounded-full bg-mars" aria-hidden="true" />}{bodyName(b)}
            </button>
          ))}
        </div>}
        {!supplied && planet === 'marte' ? <label className={toolbar}>
          <span className="size-2 rounded-full bg-mars" aria-hidden="true" />
          <span className="label-mono text-mute">Sitio:</span>
          <select value={marsSite} onChange={(e) => { setMarsSite(e.target.value); setMarsIndex(null); setError(null) }} className="cursor-pointer bg-transparent text-sm text-canvas outline-none">
            {MARS_SITES.map((s) => <option key={s.name} className="bg-obsidian">{s.name}</option>)}
          </select>
        </label> : <label className={toolbar}>
          <span className="label-mono text-mute">Sitio:</span>
          <select value={moon?.id ?? ''} onChange={(e) => setMoonId(e.target.value)} className="cursor-pointer bg-transparent text-sm text-canvas outline-none">
            {moons.map((m) => <option key={m.id} value={m.id} className="bg-obsidian">{m.name}</option>)}
          </select>
        </label>}
        {<label className={toolbar}>
          <span className="label-mono whitespace-nowrap text-mute">Exageración vertical: <span className="metric font-bold text-canvas">×{num(exaggeration)}</span></span>
          <input aria-label="Exageración vertical" className="w-28" type="range" min="1" max="12" step="1" value={exaggeration} onChange={e => setExaggeration(Number(e.target.value))} />
        </label>}
        <button type="button" onClick={onClose} className="btn-ghost ml-auto h-10">Cerrar <ConsoleIcon name="close" /></button>
      </header>

      {index && moon && earth && (
        <div className="-mt-2 flex items-center justify-between gap-4 border-b border-white/10 pb-2 font-mono text-xs text-mute">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 font-bold text-canvas">MISMA ESCALA</span>
            <span className="truncate uppercase">{short(moon.source)} · {short(earth.source)}</span>
          </span>
          <span className="hidden shrink-0 gap-5 md:flex">
            <span>GRILLA: {index.size_km} × {index.size_km} km</span>
            <span>CELDA: {cell} m</span>
            <span className="text-canvas">RELIEVE ×{num(exaggeration)}</span>
          </span>
        </div>
      )}

      {error && <p className="text-canvas">No se pudieron cargar los recortes: {error}</p>}
      {!supplied && planet === 'marte' && !marsIndex && !error && <p className="font-mono text-xs text-mute">Cargando la franja de MOLA de {marsSite} (~6 MB)…</p>}
      {index && !earth && <p className="text-mute">Esta zona todavía no tiene recorte. Correr pipeline/02_compare_patches.py.</p>}

      {index && moon && earth && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[moon, earth].map((it, slot) => (
              <section key={it.id + slot} className="flex flex-col rounded-2xl border border-white/[0.07] bg-rail p-5 shadow-limits">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-bold uppercase ${tag(it.body)}`}>{bodyName(it.body)}</span>
                    <span className="min-w-0">
                      <h3 className="truncate text-lg leading-6 font-bold tracking-tight">{it.name}</h3>
                      <span className="hud block text-mute">{coord(it.lat, it.lon)}</span>
                    </span>
                  </div>
                  <span className="hidden shrink-0 text-right font-mono text-[11px] leading-4 uppercase 2xl:block">
                    <span className="block tracking-widest text-mute">{slot === 0 ? 'Objetivo' : 'Análogo terrestre'}</span>
                    <span className="block text-mute">{slot === 0 ? `${bodyName(it.body)} · ${short(it.source)}` : 'misma luz y escala'}</span>
                  </span>
                </div>

                {/* Visor 3D de alto fijo, como en la maqueta: no depende del espacio que sobre */}
                <div className="hud-frame relative h-72 w-full overflow-hidden rounded-xl border border-white/10 bg-ink sm:h-96">
                  <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
                    <Terrain item={it} index={index} link={link} slot={slot} exaggeration={exaggeration} meshHeights={detail ? (slot === 0 ? detail.mars : detail.earth) : undefined} meshN={detail ? (detail.n??100) : undefined} />
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 font-mono text-[11px] text-mute">
                    <div className="flex justify-between">
                      <span>{coord(it.lat,it.lon)}</span>

                    </div>
                    <svg className="mx-auto size-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 48 48" aria-hidden="true">
                      <circle cx="24" cy="24" r="16" strokeDasharray="2 2" strokeWidth="0.75" />
                      <line strokeWidth="0.75" x1="24" x2="24" y1="4" y2="44" /><line strokeWidth="0.75" x1="4" x2="44" y1="24" y2="24" />
                    </svg>
                    <div className="flex items-end justify-between gap-2">
                      <span className="flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-white/80 uppercase">
                        <span className={`size-1.5 rounded-full ${it.body === 'marte' ? 'bg-mars' : it.body === 'luna' ? 'bg-canvas' : 'bg-pressed'}`} />
                        {it.body === 'tierra' ? 'Relieve terrestre' : `Relieve de ${bodyName(it.body)}`}
                      </span>
                      <span className="uppercase">{index.size_km} × {index.size_km} km</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4"><Stats regional={index.res_m>=2000} item={it} other={it.body === 'tierra' ? moon : undefined} /></div>
                {!!it.agua && <p className="mt-2 text-xs text-canvas">Incluye {Math.round(it.agua * 100)} % de mar (aplanado a nivel 0).</p>}
                <p className="mt-3 border-t border-white/10 pt-3 font-mono text-[11px] leading-4 text-mute uppercase">
                  Fuente: {it.source}{it.ref && <> · Ubicación: <a className="underline" href={it.url} target="_blank" rel="noreferrer">{it.ref}</a></>}
                </p>
              </section>
            ))}
          </div>

          <p className="mx-auto flex max-w-full items-center gap-3 rounded-full border border-white/20 bg-black/90 px-5 py-2.5 text-center text-sm shadow-limits">
            <ConsoleIcon name="rotate" className="text-mute" />
            <span>Ambas maquetas: <strong className="metric">{index.size_km} × {index.size_km} km</strong>, misma escala, misma luz. <span className="text-mute">Arrastrá para girar: las dos giran juntas.</span></span>
          </p>
          {detailStatus && <p role="status" className="text-center font-mono text-xs text-mute">{detailStatus}</p>}

          <div role="group" aria-label="Exportar comparación" className="flex flex-wrap items-center justify-center gap-2">
            <span className="label-mono text-mute">Exportar</span>
            <button type="button" className="btn-ghost h-10" onClick={() => exportFile('json')}>Datos (JSON)</button>
            {[moon, earth].map((it, slot) => (['stl', 'obj'] as const).map(f => (
              <button key={it.id + slot + f} type="button" className="btn-ghost h-10" aria-label={`Modelo 3D de ${it.name} en ${f.toUpperCase()}`} onClick={() => exportFile(f, slot)}>
                {bodyName(it.body)} · {f.toUpperCase()}
              </button>
            )))}
            <span className="hud w-full text-center text-mute">Modelos en metros con la exageración ×{num(exaggeration)} de la vista; superficie abierta, sin base para imprimir.</span>
            {exportMsg && <p role="status" className="w-full text-center text-xs text-canvas">{exportMsg}</p>}
          </div>

          <footer className="flex flex-col items-stretch gap-4 border-t border-white/10 pt-4 md:flex-row">
            {score !== null && (
              <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-rail px-5 py-4 md:w-80 md:shrink-0">
                <div className="relative grid size-14 shrink-0 place-items-center">
                  <svg className="absolute inset-0 size-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.round(score * 100)}, 100`} className="text-canvas" />
                  </svg>
                  <span className="metric text-sm font-bold">{Math.round(score * 100)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="label-mono text-mute">Índice de relieve</span>
                  <span className="text-sm font-bold">Parecido de relieve: <span className="metric">{Math.round(score * 100)}/100</span></span>
                  <span className="hud text-mute">Solo pendiente, rugosidad y desnivel · tolerancias provisorias</span>
                </div>
              </div>
            )}
            <div className="flex flex-1 flex-col justify-center gap-2 rounded-2xl border border-white/[0.07] bg-obsidian px-5 py-4 shadow-limits">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-white/20 bg-elevated px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-pressed uppercase">Régimen no análogo</span>
                <h3 className="text-sm font-bold tracking-tight uppercase">Límites de la comparación</h3>
              </div>
              <p className="text-[13px] leading-[18px] text-mute">
                {supplied && 'La malla se suaviza por interpolación: no agrega detalles medidos. Cambiar la exageración solo afecta la vista, no las métricas. '}A esta escala no se ven rocas chicas ni el tipo de suelo; la gravedad, el vacío y la radiación tampoco se comparan.
              </p>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}
