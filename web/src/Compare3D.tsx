import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Comparador Luna vs Tierra: dos maquetas del MISMO tamaño (20 x 20 km), misma resolución (80 m),
// misma exageración vertical y misma luz. Girar una gira la otra.
interface Item {
  id: string; name: string; body: 'luna' | 'tierra'; file: string; lat: number; lon: number
  pendiente_mediana: number; pendiente_p90: number; rugosidad_m: number; desnivel_m: number
  source: string; ref?: string; url?: string; agua?: number
}
interface Index { size_km: number; res_m: number; n: number; items: Item[] }

const EXAGGERATION = 2

async function loadHeights(file: string) {
  const res = await fetch(`/compare/${file}`)
  if (!res.ok) throw new Error(`${file}: ${res.status}`)
  return new Uint16Array(await res.arrayBuffer())
}

type Shared = { cams: THREE.PerspectiveCamera[]; controls: OrbitControls[]; syncing: boolean }
type Link = { register: (slot: number, cam: THREE.PerspectiveCamera, ctl: OrbitControls) => void; follow: (slot: number) => void }

function Terrain({ item, index, link, slot }: { item: Item; index: Index; link: Link; slot: number }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current!
    let disposed = false
    const size = index.size_km * 1000
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#020617')
    scene.add(new THREE.AmbientLight('#ffffff', 0.35))
    const sun = new THREE.DirectionalLight('#ffffff', 2.2)
    sun.position.set(-size, size * 0.45, size * 0.3) // sol bajo, igual en los dos paneles
    scene.add(sun)
    const camera = new THREE.PerspectiveCamera(45, 1, 10, size * 10)
    camera.position.set(0, size * 0.7, size * 0.9)
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
    loadHeights(item.file).then((h) => {
      if (disposed) return
      const geo = new THREE.PlaneGeometry(size, size, index.n - 1, index.n - 1)
      geo.rotateX(-Math.PI / 2)
      const pos = geo.attributes.position
      // centrada en su altura media: la cámara (compartida) orbita alrededor del centro de cada maqueta
      const mean = h.reduce((a, b) => a + b, 0) / h.length
      for (let i = 0; i < pos.count; i++) pos.setY(i, (h[i] - mean) * EXAGGERATION)
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 1 }))
      scene.add(mesh)
      render()
    })
    return () => { disposed = true; ro.disconnect(); controls.dispose(); renderer.dispose(); el.innerHTML = '' }
  }, [item, index, link, slot])
  return <div ref={box} className="h-full w-full" aria-label={`Relieve 3D de ${item.name}`} />
}

function Stats({ item, other }: { item: Item; other?: Item }) {
  const rows: [string, keyof Item, string][] = [
    ['Pendiente mediana', 'pendiente_mediana', '°'], ['Pendiente alta (p90)', 'pendiente_p90', '°'],
    ['Rugosidad', 'rugosidad_m', ' m'], ['Desnivel total', 'desnivel_m', ' m'],
  ]
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(([label, key, unit]) => (
        <div key={key} className="contents">
          <dt className="text-slate-400">{label}</dt>
          <dd className="text-right tabular-nums">
            {item[key] as number}{unit}
            {other && <span className="ml-1 text-slate-500">(Luna {other[key] as number}{unit})</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function Compare3D({ zoneId, onClose }: { zoneId: string; onClose: () => void }) {
  const [index, setIndex] = useState<Index | null>(null)
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
    fetch('/compare/index.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Index) => { setIndex(d); setMoonId(d.items.find((i) => i.body === 'luna')?.id ?? null) })
      .catch((e) => setError(String(e)))
  }, [])

  const moons = index?.items.filter((i) => i.body === 'luna') ?? []
  const moon = moons.find((i) => i.id === moonId)
  const earth = index?.items.find((i) => i.id === zoneId)

  return (
    <div className="absolute inset-0 z-20 flex flex-col gap-3 bg-slate-950/98 p-4" role="dialog" aria-label="Comparador 3D Luna y Tierra">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Comparar relieve en 3D</h2>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Sitio lunar</span>
          <select value={moonId ?? ''} onChange={(e) => setMoonId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
            {moons.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={onClose} className="ml-auto rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500">
          Cerrar
        </button>
      </header>

      {error && <p className="text-red-400">No se pudieron cargar los recortes: {error}</p>}
      {index && !earth && <p className="text-amber-300">Esta zona todavía no tiene recorte. Correr pipeline/02_compare_patches.py.</p>}

      {index && moon && earth && (
        <>
          <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 md:grid-cols-2 md:grid-rows-1">
            {[moon, earth].map((it, slot) => (
              <section key={it.id + slot} className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800">
                <div className="flex items-baseline justify-between gap-2 border-b border-slate-800 px-3 py-2">
                  <h3 className="truncate text-sm font-medium">{it.body === 'luna' ? '🌕' : '🌍'} {it.name}</h3>
                  <span className="shrink-0 text-xs text-slate-500">{it.lat.toFixed(2)}°, {it.lon.toFixed(2)}°</span>
                </div>
                <div className="min-h-0 flex-1"><Terrain item={it} index={index} link={link} slot={slot} /></div>
                <div className="border-t border-slate-800 px-3 py-2">
                  <Stats item={it} other={it.body === 'tierra' ? moon : undefined} />
                  {!!it.agua && <p className="mt-1 text-xs text-amber-300">Incluye {Math.round(it.agua * 100)} % de mar (aplanado a nivel 0).</p>}
                  <p className="mt-1 text-[11px] text-slate-500">
                    Fuente: {it.source}{it.ref && <> · Ubicación: <a className="underline" href={it.url} target="_blank" rel="noreferrer">{it.ref}</a></>}
                  </p>
                </div>
              </section>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Ambas maquetas: {index.size_km} × {index.size_km} km, celdas de {index.res_m} m, relieve exagerado ×{EXAGGERATION} y la misma luz.
            Arrastrá para girar (las dos giran juntas). A esta escala no se ven rocas chicas ni el tipo de suelo; la gravedad, el vacío y la radiación tampoco se comparan.
          </p>
        </>
      )}
    </div>
  )
}
