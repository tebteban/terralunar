import { localBuffer } from './localData.ts'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { latLonToPx as toPx, pxToLatLon as toLL } from './moonProj.ts'
import SpaceBackdrop from './SpaceBackdrop.tsx'

// Globo lunar 3D: imagen LRO + relieve LOLA (CGI Moon Kit de NASA) y, encima del polo sur, una "tapa"
// con el mapa LOLA detallado (estereográfico) donde se puede hacer clic para analizar el relieve.
export interface GlobeIndex {
  image: string; lola_px: number; lola_res_m: number; lola_offset: number; radius_m: number; window_km: number
  globe: { color: string; height: string; cap_dem: string; cap_n: number; cap_block: number }
  sites: { name: string; lat: number; lon: number; line: number; sample: number }[]
}
interface Props {
  index: GlobeIndex
  pick: { line: number; sample: number } | null
  onPick: (line: number, sample: number) => void
  onOutside: (lat: number, lon: number) => void
}

const D = Math.PI / 180
// lat/lon (grados, lon 0..360 o -180..180) -> punto en la esfera, coherente con los UV de SphereGeometry
function toXYZ(lat: number, lon: number, r: number) {
  const phi = ((lon + 180) / 360) * 2 * Math.PI
  const theta = (90 - lat) * D
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r)
}

export default function MoonGlobe({ index, pick, onPick, onOutside }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const api = useRef<{ showPick: (p: Props['pick'], fly?: boolean) => void; reset: () => void } | null>(null)
  const handlers = useRef({ onPick, onOutside })
  useEffect(() => { handlers.current = { onPick, onOutside } })

  useEffect(() => {
    const el = box.current!
    const n = index.lola_px, off = index.lola_offset, res = index.lola_res_m, R_M = index.radius_m
    const EX = 1.5 // exageración vertical del relieve del polo (a escala real 7 km sobre 1737 km casi no se ve)
    const rmax = off * res // borde de la tapa = 80° S
    // Relieve LOLA del polo (Int16 en metros, grilla cap_n x cap_n de cap_block píxeles LOLA); llega por fetch
    let dem: Int16Array | null = null
    const N = index.globe.cap_n, K = index.globe.cap_block
    const heightAtPx = (line: number, sample: number) => { // metros (ya exagerados), 0 fuera de la tapa
      if (!dem) return 0
      const rho = Math.hypot((sample - off) * res, (off - line) * res)
      const fade = THREE.MathUtils.clamp((rmax - rho) / (0.03 * rmax), 0, 1) // baja a 0 en el borde: empalma con la esfera
      if (fade <= 0) return 0
      const fi = THREE.MathUtils.clamp((line + 0.5) / K - 0.5, 0, N - 1.001), fj = THREE.MathUtils.clamp((sample + 0.5) / K - 0.5, 0, N - 1.001)
      const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j
      const h = dem[i * N + j] * (1 - u) * (1 - v) + dem[i * N + j + 1] * (1 - u) * v + dem[(i + 1) * N + j] * u * (1 - v) + dem[(i + 1) * N + j + 1] * u * v
      return h * EX * fade
    }
    const heightAt = (lat: number, lon: number) => {
      if (lat > -80) return 0
      const p = toPx(index, lat, lon)
      return heightAtPx(p.line, p.sample)
    }
    const surface = (lat: number, lon: number, extra = 0) => toXYZ(lat, lon, 1 + (heightAt(lat, lon) + extra) / R_M)
    const pxToLatLon = (line: number, sample: number) => toLL(index, line, sample)
    const latLonToPx = (lat: number, lon: number) => toPx(index, lat, lon)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.appendChild(renderer.domElement)
    const labels = new CSS2DRenderer()
    labels.domElement.style.position = 'absolute'
    labels.domElement.style.inset = '0'
    labels.domElement.style.pointerEvents = 'none'
    el.appendChild(labels.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.002, 100)
    scene.add(new THREE.AmbientLight('#ffffff', 0.55))
    const sun = new THREE.DirectionalLight('#ffffff', 2.4) // luz que acompaña a la cámara: la cara visible siempre iluminada
    sun.position.set(-1, 1, 0.5)
    camera.add(sun)
    scene.add(camera)

    const loader = new THREE.TextureLoader()
    const color = loader.load(`/moon/${index.globe.color}`)
    color.colorSpace = THREE.SRGBColorSpace
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1, 256, 128, 0, 2 * Math.PI, 0, (170.5 / 180) * Math.PI), // hasta 80,5° S; el resto lo cubre la tapa
      new THREE.MeshStandardMaterial({ map: color, bumpMap: loader.load(`/moon/${index.globe.height}`), bumpScale: 6, roughness: 1 }),
    )
    scene.add(moon)

    // Tapa del polo sur (80°–90° S): malla con el relieve real de LOLA y el mapa detallado encima
    const capTex = loader.load(`/moon/${index.image}`)
    capTex.colorSpace = THREE.SRGBColorSpace
    const cap = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: capTex, roughness: 1 }))
    scene.add(cap)
    const buildCap = () => {
      const pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2), inside = new Uint8Array(N * N), idx: number[] = []
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const line = (i + 0.5) * K - 0.5, sample = (j + 0.5) * K - 0.5, v = i * N + j
          const ll = pxToLatLon(line, sample)
          toXYZ(ll.lat, ll.lon, 1 + heightAtPx(line, sample) / R_M).toArray(pos, v * 3)
          uv[v * 2] = (sample + 0.5) / n
          uv[v * 2 + 1] = 1 - (line + 0.5) / n
          inside[v] = Math.hypot((sample - off) * res, (off - line) * res) <= rmax ? 1 : 0
        }
      }
      for (let i = 0; i < N - 1; i++) {
        for (let j = 0; j < N - 1; j++) {
          const a = i * N + j, b = a + N
          if (inside[a] && inside[a + 1] && inside[b] && inside[b + 1]) idx.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
      g.setIndex(idx)
      g.computeVertexNormals()
      cap.geometry.dispose()
      cap.geometry = g
    }
    const rim = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(Array.from({ length: 180 }, (_, k) => toXYZ(-80, k * 2, 1.0016))),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }),
    )
    scene.add(rim)

    // Sitios Artemis III (centros IAU) con etiqueta
    const siteLabels: { obj: CSS2DObject; normal: THREE.Vector3; lat: number; lon: number }[] = []
    for (const s of index.sites) {
      const p = toXYZ(s.lat, s.lon, 1.002)
      // punto + nombre en HTML: mantienen el mismo tamaño en pantalla a cualquier zoom
      const tag = document.createElement('span')
      tag.className = 'flex items-center gap-1.5 text-[11px] font-medium text-white'
      tag.innerHTML = '<i class="h-2 w-2 rounded-full bg-white shadow"></i><b class="rounded-full bg-black/70 px-2 py-0.5 font-medium"></b>'
      tag.lastElementChild!.textContent = s.name
      const obj = new CSS2DObject(tag)
      obj.position.copy(p)
      obj.center.set(0.02, 0.5)
      scene.add(obj)
      siteLabels.push({ obj, normal: p.clone().normalize(), lat: s.lat, lon: s.lon })
    }

    // Cámara de mapa (misma lógica que la Luna de Eze y que el mapa de la Tierra): siempre mira a un punto
    // de la superficie (el centro de la vista); la rueda cambia la distancia y, al acercarse, la cámara se
    // inclina de 0° a 60° (entre 800 y 45 km). Arrastrar desplaza el terreno; arrastrar con clic derecho gira.
    const KM = 1 / 1737.4 // 1 unidad = radio lunar
    const MIN_RANGE = 15 * KM, MAX_RANGE = 8000 * KM
    const tiltFor = (range: number) => {
      const p = THREE.MathUtils.clamp(Math.log((800 * KM) / range) / Math.log(800 / 45), 0, 1)
      return (60 * p * p * (3 - 2 * p)) * D
    }
    const northAt = (a: THREE.Vector3) => {
      const v = new THREE.Vector3(0, 1, 0).addScaledVector(a, -a.y)
      return v.lengthSq() < 1e-8 ? new THREE.Vector3(0, 0, 1) : v.normalize()
    }
    const HOME = { lat: -58, lon: 0, range: 5200 * KM }
    // estado: punto mirado (a), dirección "adelante" sobre la superficie (fwd) y distancia (range)
    const s = { a: toXYZ(HOME.lat, HOME.lon, 1).normalize(), fwd: new THREE.Vector3(), range: HOME.range }
    s.fwd.copy(northAt(s.a))
    const target: { a: THREE.Vector3 | null; range: number } = { a: null, range: s.range }
    let autoRotate = true
    const moveAnchor = (q: THREE.Quaternion) => { // mueve el punto y arrastra "adelante" con él (sin trabarse en el polo)
      s.a.applyQuaternion(q).normalize()
      s.fwd.applyQuaternion(q).addScaledVector(s.a, -s.fwd.dot(s.a)).normalize()
    }
    const place = () => {
      const t = tiltFor(s.range)
      const lat = Math.asin(THREE.MathUtils.clamp(s.a.y, -1, 1)) / D
      let phi = Math.atan2(s.a.z, -s.a.x)
      if (phi < 0) phi += 2 * Math.PI
      const ground = s.a.clone().multiplyScalar(1 + heightAt(lat, (phi / (2 * Math.PI)) * 360 - 180) / R_M) // punto mirado sobre el relieve
      const dir = s.a.clone().multiplyScalar(Math.cos(t)).addScaledVector(s.fwd, -Math.sin(t))
      camera.position.copy(ground).addScaledVector(dir, s.range)
      camera.up.copy(s.fwd)
      camera.lookAt(ground)
    }
    const flyTo = (lat: number, lon: number, range: number) => {
      autoRotate = false
      target.a = toXYZ(lat, lon, 1).normalize()
      target.range = range
    }

    // Marca del punto elegido: cuadrado de 20 x 20 km
    const pickLine = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffffff', depthTest: false }))
    pickLine.renderOrder = 1
    scene.add(pickLine)
    let lastPick: Props['pick'] = null // para reubicar la marca cuando llega el relieve
    api.current = {
      showPick: (p, fly = true) => {
        lastPick = p
        pickLine.visible = !!p
        if (!p) return
        const h = (index.window_km * 1000) / res / 2
        const corners = [[-h, -h], [-h, h], [h, h], [h, -h]].map(([dl, ds]) => {
          const ll = pxToLatLon(p.line + dl, p.sample + ds)
          return surface(ll.lat, ll.lon, 300)
        })
        pickLine.geometry.dispose()
        pickLine.geometry = new THREE.BufferGeometry().setFromPoints(corners)
        if (!fly) return
        const c = pxToLatLon(p.line, p.sample)
        flyTo(c.lat, c.lon, 300 * KM)
      },
      reset: () => flyTo(HOME.lat, HOME.lon, HOME.range),
    }

    const ray = new THREE.Raycaster()
    const ndc = (e: { clientX: number; clientY: number }) => {
      const r = renderer.domElement.getBoundingClientRect()
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    }
    // arrastre: izquierdo desplaza, derecho (o Ctrl) gira; clic sin arrastre -> píxel LOLA del lugar tocado
    let down: { x: number; y: number; lastX: number; lastY: number; rotate: boolean } | null = null
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, rotate: e.button === 2 || e.ctrlKey }
      renderer.domElement.setPointerCapture(e.pointerId)
      autoRotate = false
      target.a = null
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY
      down.lastX = e.clientX
      down.lastY = e.clientY
      if (down.rotate) { s.fwd.applyAxisAngle(s.a, -dx * 0.006); return }
      const perPx = (2 * s.range * Math.tan((camera.fov * D) / 2)) / Math.max(renderer.domElement.clientHeight, 1)
      const right = new THREE.Vector3().crossVectors(s.fwd, s.a)
      const to = s.a.clone().addScaledVector(right, -dx * perPx).addScaledVector(s.fwd, dy * perPx).normalize()
      moveAnchor(new THREE.Quaternion().setFromUnitVectors(s.a, to))
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      down = null
      if (!d || d.rotate || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return
      ray.setFromCamera(ndc(e), camera)
      const hit = ray.intersectObjects([cap, moon])[0]
      if (!hit?.uv) return
      if (hit.object === cap) return handlers.current.onPick((1 - hit.uv.y) * n - 0.5, hit.uv.x * n - 0.5)
      const lat = hit.uv.y * 180 - 90, lon = hit.uv.x * 360 - 180
      if (lat <= -80) {
        const p = latLonToPx(lat, lon)
        return handlers.current.onPick(p.line, p.sample)
      }
      handlers.current.onOutside(lat, lon)
    }
    // rueda: cambia la distancia en proporción (como el mapa de la Tierra); la inclinación sale de la distancia
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      autoRotate = false
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
      target.range = THREE.MathUtils.clamp(target.range * Math.exp(Math.max(-0.3, Math.min(0.3, px * 0.0012))), MIN_RANGE, MAX_RANGE)
    }
    const noMenu = (e: Event) => e.preventDefault()
    const cv = renderer.domElement
    cv.style.touchAction = 'none'
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('wheel', onWheel, { passive: false })
    cv.addEventListener('contextmenu', noMenu)

    let alive = true
    localBuffer(`/moon/${index.globe.cap_dem}`).then((b) => {
      if (!alive) return
      dem = new Int16Array(b)
      buildCap()
      for (const l of siteLabels) l.obj.position.copy(surface(l.lat, l.lon, 500))
      api.current?.showPick(lastPick, false) // solo reubicar la marca sobre el relieve, sin volver a volar
    })

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h)
      labels.setSize(w, h)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    let frame = 0, last = performance.now()
    const view = new THREE.Vector3()
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      const alpha = 1 - Math.exp(-dt / 0.14) // mismo amortiguado que la Luna de Eze
      if (autoRotate) moveAnchor(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05))
      s.range = Math.exp(Math.log(s.range) + Math.log(target.range / s.range) * alpha)
      if (target.a) {
        const q = new THREE.Quaternion().setFromUnitVectors(s.a, target.a)
        moveAnchor(new THREE.Quaternion().slerp(q, alpha))
        if (s.a.angleTo(target.a) < 1e-5) target.a = null
      }
      place()
      view.copy(camera.position).normalize()
      for (const l of siteLabels) l.obj.visible = l.normal.dot(view) > 0.2 // ocultar las del lado de atrás
      renderer.render(scene, camera)
      labels.render(scene, camera)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('wheel', onWheel)
      cv.removeEventListener('contextmenu', noMenu)
      renderer.dispose()
      renderer.forceContextLoss() // libera el contexto WebGL: Chrome solo mantiene ~16 activos
      el.innerHTML = ''
      api.current = null
      alive = false
    }
  }, [index])

  useEffect(() => { api.current?.showPick(pick) }, [pick])

  return (
    <div className="relative h-full w-full overflow-hidden bg-space">
      <SpaceBackdrop />
      <div ref={box} className="absolute inset-0 md:right-[470px]" role="region" aria-label="Globo 3D de la Luna. Arrastrá para moverte, rueda para acercar; clic en el polo sur para analizar." />
      <button type="button" onClick={() => api.current?.reset()}
        className="chip-dark absolute left-4 top-4">Ver planeta</button>
    </div>
  )
}
