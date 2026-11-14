import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

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

function Terrain({ item, index, link, slot, exaggeration }: { item: Item; index: CompareIndex; link: Link; slot: number; exaggeration: number }) {
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
    ;(item.heights ? Promise.resolve(item.heights) : loadHeights(item.file)).then((h) => {
      if (disposed) return
      if (h.length !== index.n * index.n) throw new Error('Tamaño de recorte inválido')
      // Smooth rendering only: bilinear interpolation cannot add observed terrain detail.
      const n = index.n < 32 ? 100 : index.n
      const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1)
      geo.rotateX(-Math.PI / 2)
      const pos = geo.attributes.position
      // centrada en su altura media: la cámara (compartida) orbita alrededor del centro de cada maqueta
      let sum = 0
      for (const value of h) sum += value
      const mean = sum / h.length
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const gx = x / (n - 1) * (index.n - 1), gy = y / (n - 1) * (index.n - 1)
        const x0 = Math.floor(gx), y0 = Math.floor(gy), x1 = Math.min(index.n - 1, x0 + 1), y1 = Math.min(index.n - 1, y0 + 1)
        const fx = gx - x0, fy = gy - y0
        const value = h[y0 * index.n + x0] * (1-fx) * (1-fy) + h[y0 * index.n + x1] * fx * (1-fy) + h[y1 * index.n + x0] * (1-fx) * fy + h[y1 * index.n + x1] * fx * fy
        pos.setY(y * n + x, (value - mean) * exaggeration)
      }
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: item.body === 'marte' ? '#c29276' : '#adb5bd', roughness: 1, side: THREE.DoubleSide }))
      scene.add(mesh)
      render()
    }).catch(e => { if (!disposed) setTerrainError(String(e)) })
    return () => { scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()) } }); disposed = true; ro.disconnect(); controls.dispose(); renderer.dispose(); el.innerHTML = '' }
  }, [item, index, link, slot, exaggeration])
  return <div className="relative h-full w-full"><div ref={box} className="h-full w-full" aria-label={`Relieve 3D de ${item.name}`} />{terrainError && <p role="alert" className="absolute top-2 left-2 text-white">{terrainError}</p>}</div>
}

function Stats({ item, other }: { item: Item; other?: Item }) {
  const rows: [string, keyof Item, string][] = [
    ['Pendiente mediana', 'pendiente_mediana', '°'], ['Pendiente alta (p90)', 'pendiente_p90', '°'],
    ['Rugosidad', 'rugosidad_m', ' m'], ['Desnivel total', 'desnivel_m', ' m'],
  ]
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
      {rows.map(([label, key, unit]) => (
        <div key={key} className="contents">
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
  const index = supplied ?? loadedIndex
  const [exaggeration, setExaggeration] = useState(supplied ? 6 : EXAGGERATION)
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

  const moons = index?.items.filter((i) => i.body !== 'tierra') ?? []
  const moon = moons.find((i) => i.id === moonId) ?? moons[0]
  const earth = index?.items.find((i) => i.id === zoneId)

  return (
    <div className="absolute inset-0 z-20 flex flex-col gap-4 bg-ink p-6 text-canvas" role="dialog" aria-label="Comparador de relieve planetario y terrestre">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold leading-8">Comparar relieve en 3D</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-mute">Sitio planetario</span>
          <select value={moon?.id ?? ''} onChange={(e) => setMoonId(e.target.value)}
            className="rounded-lg bg-elevated px-4 py-2 text-base text-canvas">
            {moons.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {supplied && <label className="flex items-center gap-2 text-sm text-mute">Exageración vertical ×{exaggeration}
          <input aria-label="Exageración vertical" type="range" min="1" max="12" step="1" value={exaggeration} onChange={e => setExaggeration(Number(e.target.value))} />
        </label>}
        <button type="button" onClick={onClose} className="ml-auto rounded-full bg-canvas px-5 py-2 text-base font-medium text-ink hover:bg-pressed">
          Cerrar
        </button>
      </header>

      {error && <p className="text-canvas">No se pudieron cargar los recortes: {error}</p>}
      {index && !earth && <p className="text-mute">Esta zona todavía no tiene recorte. Correr pipeline/02_compare_patches.py.</p>}

      {index && moon && earth && (
        <>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
            {[moon, earth].map((it, slot) => (
              <section key={it.id + slot} className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-elevated">
                <div className="flex items-baseline justify-between gap-2 px-4 py-3">
                  <h3 className="truncate text-base font-bold"><span className="mr-2 rounded-full bg-ink px-2 py-0.5 text-xs font-medium">{it.body === 'luna' ? 'Luna' : it.body === 'marte' ? 'Marte' : 'Tierra'}</span>{it.name}</h3>
                  <span className="shrink-0 text-xs text-mute">{it.lat.toFixed(2)}°, {it.lon.toFixed(2)}°</span>
                </div>
                <div className="min-h-0 flex-1"><Terrain item={it} index={index} link={link} slot={slot} exaggeration={exaggeration} /></div>
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
          <p className="text-sm text-mute">
            Ambas maquetas: {index.size_km} × {index.size_km} km, celdas de {index.res_m} m, relieve exagerado ×{exaggeration} y la misma luz.
            Arrastrá para girar (las dos giran juntas). {supplied && 'La malla se suaviza por interpolación: no agrega detalles medidos. Cambiar la exageración solo afecta la vista, no las métricas. '}A esta escala no se ven rocas chicas ni el tipo de suelo; la gravedad, el vacío y la radiación tampoco se comparan.
          </p>
        </>
      )}
    </div>
  )
}
