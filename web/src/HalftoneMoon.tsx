import { useEffect, useRef } from 'react'

// Luna en trama de puntos (halftone) para la portada.
// Cada punto toma el brillo real de la textura LRO (NASA SVS CGI Moon Kit, data/moon/globe_color.jpg):
// más brillante la superficie → punto más grande. Vista ortográfica inclinada hacia el polo sur.
// Proyección ortográfica: como mirar una pelota desde lejos, sin perspectiva.

const LAT0 = (-62 * Math.PI) / 180 // centro de la vista: 62° S, así se ve el polo sur
const DEG = Math.PI / 180
const TEX_W = 1024
const TEX_H = 512
const SPIN_S = 140 // segundos por vuelta completa

interface Site { name: string; lat: number; lon: number }

async function loadTexture(): Promise<Float32Array> {
  const img = new Image()
  img.src = '/moon/globe_color.jpg'
  await img.decode()
  const c = document.createElement('canvas')
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, TEX_W, TEX_H)
  const px = ctx.getImageData(0, 0, TEX_W, TEX_H).data
  const lum = new Float32Array(TEX_W * TEX_H)
  for (let i = 0; i < lum.length; i++) lum[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]
  // Estira el contraste entre los percentiles 2 y 98: la Luna es gris y sin esto la trama queda plana
  const sorted = Array.from(lum.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b)
  const lo = sorted[Math.floor(sorted.length * 0.02)]
  const hi = sorted[Math.floor(sorted.length * 0.98)]
  for (let i = 0; i < lum.length; i++) lum[i] = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo)))
  return lum
}

// annotate=false: solo la trama, sin sitios ni rótulo (para usarla de fondo)
export default function HalftoneMoon({ className = '', annotate = true }: { className?: string; annotate?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvas.current!
    const box = wrap.current!
    const ctx = cv.getContext('2d')!
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let tex: Float32Array | null = null
    let sites: Site[] = []
    let raf = 0
    let alive = true
    const t0 = performance.now()

    // Puntos precalculados en coordenadas de pantalla con su lat/lon (sin la rotación, que se suma por cuadro)
    let W = 0, H = 0, R = 0, cx = 0, cy = 0, step = 0
    let px = new Float32Array(0), py = new Float32Array(0), plat = new Float32Array(0), pdlon = new Float32Array(0), pz = new Float32Array(0), prho = new Float32Array(0)

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = box.clientWidth
      H = box.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      R = Math.min(W, H) * 0.46
      cx = W / 2
      cy = H / 2
      step = Math.max(4.2, R / 50)
      const xs: number[] = [], ys: number[] = [], la: number[] = [], dl: number[] = [], zs: number[] = [], rs: number[] = []
      const rowH = step * 0.866 // grilla hexagonal: filas alternadas desplazadas medio paso
      for (let j = -Math.ceil(R / rowH); j <= Math.ceil(R / rowH); j++) {
        const off = j % 2 ? step / 2 : 0
        for (let i = -Math.ceil(R / step) - 1; i <= Math.ceil(R / step) + 1; i++) {
          const x = (i * step + off) / R
          const y = -(j * rowH) / R // y hacia arriba
          const rho = Math.hypot(x, y)
          if (rho >= 0.995) continue
          const c = Math.asin(rho)
          const lat = rho === 0 ? LAT0 : Math.asin(Math.cos(c) * Math.sin(LAT0) + (y * Math.sin(c) * Math.cos(LAT0)) / rho)
          const dlon = Math.atan2(x * Math.sin(c), rho * Math.cos(c) * Math.cos(LAT0) - y * Math.sin(c) * Math.sin(LAT0))
          xs.push(cx + i * step + off); ys.push(cy + j * rowH); la.push(lat); dl.push(dlon); zs.push(Math.sqrt(1 - rho * rho)); rs.push(rho)
        }
      }
      px = Float32Array.from(xs); py = Float32Array.from(ys); plat = Float32Array.from(la)
      pdlon = Float32Array.from(dl); pz = Float32Array.from(zs); prho = Float32Array.from(rs)
    }

    const project = (lat: number, lon: number, lon0: number) => {
      const d = lon - lon0
      const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(d)
      const x = Math.cos(lat) * Math.sin(d)
      const y = Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(d)
      return { x: cx + x * R, y: cy - y * R, visible: cosc > 0 }
    }

    const draw = (now: number) => {
      const t = (now - t0) / 1000
      const lon0 = still ? 0 : ((t / SPIN_S) * 2 * Math.PI) % (2 * Math.PI)
      const reveal = still ? 2 : Math.min(2, t / 1.6) // los puntos aparecen del centro hacia el borde
      ctx.clearRect(0, 0, W, H)

      if (tex) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        for (let k = 0; k < px.length; k++) {
          const edge = prho[k] - (reveal - 1)
          if (edge > 0) continue
          let lon = (pdlon[k] + lon0) / DEG
          lon = ((lon % 360) + 540) % 360 // 0..360, con 0 = lon −180 del borde izquierdo de la textura
          const u = Math.min(TEX_W - 1, Math.floor((lon / 360) * TEX_W))
          const v = Math.min(TEX_H - 1, Math.floor(((90 - plat[k] / DEG) / 180) * TEX_H))
          const l = tex[v * TEX_W + u]
          const fade = Math.min(1, -edge * 6)
          const r = step * 0.5 * (0.12 + 0.88 * l) * (0.45 + 0.55 * pz[k]) * fade
          if (r < 0.35) continue
          ctx.moveTo(px[k] + r, py[k])
          ctx.arc(px[k], py[k], r, 0, Math.PI * 2)
        }
        ctx.fill();
      }

      // paralelo 80° S: el borde de la zona de estudio del polo sur
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let i = 0; annotate && i < 180; i++) {
        const p = project(-80 * DEG, (i / 180) * 2 * Math.PI, lon0)
        if (p.visible && i % 2 === 0) ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6)
      }

      // sitios del polo sur (IAU), con un pulso suave
      const pulse = still ? 0.5 : (t % 2.4) / 2.4
      let sx = 0, sy = 0, n = 0
      for (const s of annotate ? sites : []) {
        const p = project(s.lat * DEG, s.lon * DEG, lon0)
        if (!p.visible) continue
        sx += p.x; sy += p.y; n++
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - pulse)})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 + pulse * 9, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#000'
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill()
      }

      // rótulo con línea guía desde el grupo de sitios; se da vuelta si no entra a la derecha
      if (n && reveal > 1.2) {
        const ax = sx / n, ay = sy / n
        // El canvas puede salirse de la pantalla por la derecha: se mide el borde visible de verdad
        const rect = cv.getBoundingClientRect()
        const visibleRight = Math.min(W, window.innerWidth - rect.left - 16)
        const visibleLeft = Math.max(0, -rect.left + 16)
        const dir = ax + 230 < visibleRight || ax - 230 < visibleLeft ? 1 : -1
        const ex = ax + dir * 40, ey = ay + 64
        const l1 = 'POLO SUR · 82°–90° S', l2 = `${sites.length} SITIOS DE REFERENCIA`
        ctx.font = '600 12px "Barlow", Arial, sans-serif'
        if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '1px'
        const tw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + 20
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(ax + dir * 10, ay + 10); ctx.lineTo(ex, ey); ctx.stroke()
        // rótulo sobre un recuadro negro con borde fino, para que se lea encima de la trama
        const bx = dir === 1 ? ex : ex - tw
        ctx.fillStyle = '#000'
        ctx.fillRect(bx, ey - 2, tw, 44)
        ctx.strokeStyle = '#3a3a3f'
        ctx.strokeRect(bx + 0.5, ey - 1.5, tw - 1, 43)
        ctx.textAlign = 'left'
        ctx.fillStyle = '#fff'
        ctx.fillText(l1, bx + 10, ey + 16)
        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.fillText(l2, bx + 10, ey + 33)
      }

      if (!still && alive) raf = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(() => { layout(); if (still) draw(performance.now()) })
    ro.observe(box)
    layout()

    Promise.all([
      loadTexture(),
      fetch('/moon/index.json').then((r) => r.json()).then((d: { sites: Site[] }) => d.sites).catch(() => [] as Site[]),
    ]).then(([t, s]) => {
      if (!alive) return
      tex = t
      sites = s
      if (still) draw(performance.now())
    }).catch(() => { /* sin textura quedan solo los sitios: la portada sigue usable */ })

    if (still) draw(performance.now())
    else raf = requestAnimationFrame(draw)
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect() }
  }, [annotate])

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" role="img"
        aria-label="La Luna vista desde el sur, dibujada en puntos con el brillo real de la superficie (LRO). Se marcan los sitios del polo sur." />
    </div>
  )
}
