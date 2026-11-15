import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { fromUrl } from 'geotiff'
import { offset } from './marsData.ts'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MARS_SITES, earthPatches, marsSitePatch } from './marsData.ts'

// Comparador Luna vs Tierra: dos maquetas del MISMO tamaño (20 x 20 km), misma resolución (80 m),
// misma exageración vertical y misma luz. Girar una gira la otra.
interface Item {
  id: string; name: string; body: 'luna' | 'tierra' | 'marte'; heights?: Float32Array; file: string; lat: number; lon: number
  pendiente_mediana: number; pendiente_p90: number; rugosidad_m: number; desnivel_m: number
  source: string; ref?: string; url?: string; agua?: number
}
export interface CompareIndex { size_km: number; res_m: number; n: number; items: Item[] }

const EXAGGERATION = 2

async function loadHeights(file: string) {
  const res = await fetch(`/compare/${file}`)
  if (!res.ok) throw new Error(`${file}: ${res.status}`)
  return new Uint16Array(await res.arrayBuffer())
}

type Shared = { cams: THREE.PerspectiveCamera[]; controls: OrbitControls[]; syncing: boolean }
type Link = { register: (slot: number, cam: THREE.PerspectiveCamera, ctl: OrbitControls) => void; follow: (slot: number) => void }

function Terrain({ item, index, link, slot, exaggeration, meshHeights, meshN }: { item: Item; index: CompareIndex; link: Link; slot: number; exaggeration: number; meshHeights?: Float32Array; meshN?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [terrainError, setTerrainError] = useState('')
  useEffect(() => {
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
      const inputN = meshN ?? index.n
      if (disposed) return
      if (h.length !== inputN * inputN) throw new Error('Tamaño de recorte inválido')
      // Smooth rendering only: bilinear interpolation cannot add observed terrain detail.
      const n = inputN < 32 ? 100 : inputN
      const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1)
      geo.rotateX(-Math.PI / 2)
      const pos = geo.attributes.position
      // centrada en su altura media: la cámara (compartida) orbita alrededor del centro de cada maqueta
      let sum = 0
      for (const value of h) sum += value
      const mean = sum / h.length
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const gx = x / (n - 1) * (inputN - 1), gy = y / (n - 1) * (inputN - 1)
        const x0 = Math.floor(gx), y0 = Math.floor(gy), x1 = Math.min(inputN - 1, x0 + 1), y1 = Math.min(inputN - 1, y0 + 1)
        const fx = gx - x0, fy = gy - y0
        const value = h[y0 * inputN + x0] * (1-fx) * (1-fy) + h[y0 * inputN + x1] * fx * (1-fy) + h[y1 * inputN + x0] * (1-fx) * fy + h[y1 * inputN + x1] * fx * fy
        pos.setY(y * n + x, (value - mean) * exaggeration)
      }
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: item.body === 'marte' ? '#c29276' : '#adb5bd', roughness: 1, side: THREE.DoubleSide }))
      scene.add(mesh)
      render()
    }).catch(e => { if (!disposed) setTerrainError(String(e)) })
    return () => { scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()) } }); disposed = true; ro.disconnect(); controls.dispose(); renderer.dispose(); el.innerHTML = '' }
  }, [item, index, link, slot, exaggeration, meshHeights, meshN])
  return <div className="relative h-full w-full"><div ref={box} className="h-full w-full" aria-label={`Relieve 3D de ${item.name}`} />{terrainError && <p role="alert" className="absolute top-2 left-2 text-white">{terrainError}</p>}</div>
}

function Stats({ item, other }: { item: Item; other?: Item }) {
  const rows: [string, keyof Item, string][] = [
    ['Pendiente mediana', 'pendiente_mediana', '°'], ['Pendiente alta (p90)', 'pendiente_p90', '°'],
    ['Rugosidad', 'rugosidad_m', ' m'], ['Desnivel total', 'desnivel_m', ' m'],
  ]
  return (
    <dl className="comparison-stats">
      {rows.map(([label, key, unit]) => (
        <div key={key} className="comparison-stat-row">
          <dt className="text-mute">{label}</dt>
          <dd className="text-right font-medium tabular-nums">
            {Number(item[key]).toFixed(1)}{unit}
            {other && <span className="ml-1 font-normal text-mute">({other.body === 'marte' ? 'Marte' : 'Luna'} {Number(other[key]).toFixed(1)}{unit})</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function Compare3D({ zoneId, onClose, supplied }: { zoneId: string; onClose: () => void; supplied?: CompareIndex }) {
  const [loadedIndex, setIndex] = useState<CompareIndex | null>(null)
  // Desde la ficha terrestre se puede comparar con la Luna (LOLA 80 m) o con Marte (MOLA, celdas de 2 km)
  const [planet, setPlanet] = useState<'luna' | 'marte'>('luna')
  const [marsSite, setMarsSite] = useState(MARS_SITES[2].name) // Jezero
  const [marsIndex, setMarsIndex] = useState<CompareIndex | null>(null)
  const index = supplied ?? (planet === 'marte' ? marsIndex : loadedIndex)
  // celdas de 2 km (Marte) aplanan el relieve: arranca más exagerado; a 80–800 m alcanza con ×2
  const [exaggeration, setExaggeration] = useState(supplied && supplied.res_m >= 2000 ? 6 : EXAGGERATION)
  const [highRes, setHighRes] = useState<{key: string; mars: Float32Array; earth: Float32Array} | null>(null)
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
    Promise.all([marsSitePatch(site), earthPatches()]).then(([mars, patches]) => {
      if (off) return
      const zone = patches.find((p) => p.id === zoneId)
      if (!zone) return setError('esta zona incluye mar aplanado y no entra en la comparación con Marte')
      setMarsIndex({ size_km: 20, res_m: 2000, n: 10, items: [mars, zone] })
    }).catch((e) => { if (!off) setError(String(e)) })
    return () => { off = true }
  }, [supplied, planet, marsSite, zoneId])

  const moons = index?.items.filter((i) => i.body !== 'tierra') ?? []
  const moon = moons.find((i) => i.id === moonId) ?? moons[0]
  const earth = index?.items.find((i) => i.id === zoneId)
  const detail = highRes && moon && earth && highRes.key === `${moon.id}|${moon.lat}|${moon.lon}|${earth.id}` ? highRes : null // nunca el relieve de otro sitio
  useEffect(() => {
    if (!moon || !earth || moon.body !== 'marte') return // el modelo de 200 m es solo de Marte
    let cancelled = false
    // 200 m cell centres on the same 20 km footprint, independent of the coarse ranking.
    const run = async () => {
      setDetailStatus('Cargando elevaciones detalladas de Marte y Tierra…')
      const url = 'https://huggingface.co/datasets/Biscut4Biscuit/mola-hrsc-baseline-cog/resolve/main/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2_cog.tif'
      const tiff = await fromUrl(url)
      const image = await tiff.getImage()
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
      const r=await fetch(`/compare/${earth.file}`)
      if(!r.ok) throw new Error('No se pudo cargar el recorte terrestre detallado')
      const data=await r.arrayBuffer(); if(data.byteLength!==250*250*2) throw new Error('Recorte terrestre inválido')
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


  return (
    <div className="comparison-dialog fixed inset-0 z-20 flex flex-col gap-4 bg-ink p-6 text-canvas" role="dialog" aria-label="Comparador de relieve planetario y terrestre">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold leading-8">Comparar relieve en 3D</h2>
        {!supplied && <div className="flex gap-1 rounded-full bg-elevated p-1" aria-label="Cuerpo a comparar">
          {(['luna', 'marte'] as const).map((b) => (
            <button key={b} type="button" aria-pressed={planet === b}
              onClick={() => { setPlanet(b); setMarsIndex(null); setError(null); setExaggeration(b === 'marte' ? 6 : EXAGGERATION) }}
              className="rounded-full px-4 py-1.5 text-sm font-medium aria-pressed:bg-canvas aria-pressed:text-ink">{b === 'luna' ? 'Luna' : 'Marte'}</button>
          ))}
        </div>}
        {!supplied && planet === 'marte' ? <label className="flex items-center gap-2 text-sm">
          <span className="text-mute">Sitio en Marte</span>
          <select value={marsSite} onChange={(e) => { setMarsSite(e.target.value); setMarsIndex(null); setError(null) }} className="rounded-lg bg-elevated px-4 py-2 text-base text-canvas">
            {MARS_SITES.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label> : <label className="flex items-center gap-2 text-sm">
          <span className="text-mute">Sitio planetario</span>
          <select value={moon?.id ?? ''} onChange={(e) => setMoonId(e.target.value)}
            className="rounded-lg bg-elevated px-4 py-2 text-base text-canvas">
            {moons.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>}
        {(supplied || planet === 'marte') && <label className="flex items-center gap-2 text-sm text-mute">Exageración vertical ×{exaggeration}
          <input aria-label="Exageración vertical" type="range" min="1" max="12" step="1" value={exaggeration} onChange={e => setExaggeration(Number(e.target.value))} />
        </label>}
        <button type="button" onClick={onClose} className="ml-auto rounded-full bg-canvas px-5 py-2 text-base font-medium text-ink hover:bg-pressed">
          Cerrar
        </button>
      </header>

      {error && <p className="text-canvas">No se pudieron cargar los recortes: {error}</p>}
      {!supplied && planet === 'marte' && !marsIndex && !error && <p className="text-mute">Cargando la franja de MOLA de {marsSite} (~6 MB)…</p>}
      {index && !earth && <p className="text-mute">Esta zona todavía no tiene recorte. Correr pipeline/02_compare_patches.py.</p>}

      {index && moon && earth && (
        <>
          <div className="comparison-metadata"><span>CÁMARAS SINCRONIZADAS</span><span>VENTANA: {index.size_km} × {index.size_km} km</span><span>CELDA VISUAL: {detail ? 200 : index.res_m} m</span><span>EXAGERACIÓN: ×{exaggeration}</span></div>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
            {[moon, earth].map((it, slot) => (
              <section key={it.id + slot} className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-elevated">
                <div className="flex items-baseline justify-between gap-2 px-4 py-3">
                  <h3 className="truncate text-base font-bold"><span className="mr-2 rounded-full bg-ink px-2 py-0.5 text-xs font-medium">{it.body === 'luna' ? 'Luna' : it.body === 'marte' ? 'Marte' : 'Tierra'}</span>{it.name}</h3>
                  <span className="shrink-0 text-xs text-mute">{it.lat.toFixed(2)}°, {it.lon.toFixed(2)}°</span>
                </div>
                <div className="min-h-0 flex-1"><Terrain item={it} index={index} link={link} slot={slot} exaggeration={exaggeration} meshHeights={detail ? (slot === 0 ? detail.mars : detail.earth) : undefined} meshN={detail ? 100 : undefined} /></div>
                <div className="px-4 py-3">
                  <Stats item={it} other={it.body === 'tierra' ? moon : undefined} />
                  {!!it.agua && <p className="mt-2 text-xs text-canvas">Incluye {Math.round(it.agua * 100)} % de mar (aplanado a nivel 0).</p>}
                  <p className="mt-2 text-xs text-mute">
                    Fuente: {it.source}{it.ref && <> · Ubicación: <a className="underline" href={it.url} target="_blank" rel="noreferrer">{it.ref}</a></>}
                  </p>
                </div>
              </section>
            ))}
          </div>
          {detailStatus && moon?.body === 'marte' && <p role="status" className="text-sm text-mute">{detailStatus}</p>}
          <p className="text-sm text-mute">
            Ambas maquetas: {index.size_km} × {index.size_km} km, celdas visuales de {detail ? 200 : index.res_m} m, relieve exagerado ×{exaggeration} y la misma luz.
            Arrastrá para girar (las dos giran juntas). {supplied && 'La malla se suaviza por interpolación: no agrega detalles medidos. Cambiar la exageración solo afecta la vista, no las métricas. '}A esta escala no se ven rocas chicas ni el tipo de suelo; la gravedad, el vacío y la radiación tampoco se comparan.
          </p>
        </>
      )}
    </div>
  )
}
