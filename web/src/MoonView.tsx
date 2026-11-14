import { useEffect, useRef, useState } from 'react'

// Cesium is loaded only for the lunar view, so the original Earth map stays untouched.
type CesiumApi = {
  Ion: { defaultAccessToken: string }
  Ellipsoid: { default: unknown; MOON: unknown }
  Math: { toRadians: (n: number) => number }
  Cartesian2: new (x: number, y: number) => unknown
  Matrix4: { new (): unknown; IDENTITY: unknown; inverseTransformation: (matrix: unknown, result: unknown) => unknown; multiplyByPoint: (matrix: unknown, point: unknown, result: unknown) => { x: number; y: number; z: number } }
  Transforms: { eastNorthUpToFixedFrame: (point: unknown, ellipsoid: unknown) => unknown }
  BoundingSphere: new (center: unknown, radius: number) => unknown
  HeadingPitchRange: new (heading: number, pitch: number, range: number) => unknown
  Cartographic: { fromCartesian: (p: unknown) => { longitude: number; latitude: number } }
  ScreenSpaceEventType: { LEFT_DOUBLE_CLICK: unknown }
  ScreenSpaceEventHandler: new (canvas: unknown) => { setInputAction: (fn: (e: { position: unknown }) => void, event: unknown) => void; destroy: () => void }
  Viewer: new (node: HTMLElement, options: Record<string, unknown>) => {
    scene: { primitives: { add: (tileset: unknown) => void }; canvas: HTMLCanvasElement; pickPosition: (p: unknown) => unknown; pickPositionSupported: boolean }
    screenSpaceEventHandler: { removeInputAction: (event: unknown) => void }
    camera: { positionWC: unknown; lookAt: (target: unknown, offset: unknown) => void; lookAtTransform: (matrix: unknown) => void; cancelFlight: () => void; pickEllipsoid: (position: unknown, ellipsoid: unknown) => unknown; flyTo: (options: Record<string, unknown>) => void; flyToBoundingSphere: (sphere: unknown, options: Record<string, unknown>) => void; positionCartographic: { height: number }; heading: number; pitch: number }
    destroy: () => void
    isDestroyed: () => boolean
  }
  Cesium3DTileset: { fromIonAssetId: (id: number) => Promise<unknown> }
  Cartesian3: { new (): unknown; fromDegrees: (lon: number, lat: number, height: number) => unknown }
}
declare global { interface Window { Cesium?: CesiumApi; CESIUM_BASE_URL?: string } }

const CDN = 'https://cdn.jsdelivr.net/npm/cesium@1.129.0/Build/Cesium/'
function loadCesium(): Promise<CesiumApi> {
  if (window.Cesium) return Promise.resolve(window.Cesium)
  return new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = CDN
    if (!document.getElementById('cesium-css')) {
      const css = document.createElement('link'); css.id = 'cesium-css'; css.rel = 'stylesheet'; css.href = `${CDN}Widgets/widgets.css`; document.head.appendChild(css)
    }
    const script = document.createElement('script'); script.src = `${CDN}Cesium.js`
    script.onload = () => window.Cesium ? resolve(window.Cesium) : reject(new Error('Cesium no se inicializó'))
    script.onerror = () => reject(new Error('No se pudo descargar Cesium. Revisá la conexión.'))
    document.head.appendChild(script)
  })
}

export default function MoonView() {
  const target = useRef<HTMLDivElement>(null)
  const resetCamera = useRef<() => void>(() => {})
  const [token, setToken] = useState(() => { try { return localStorage.getItem('terralunar.cesium-token') || import.meta.env.VITE_CESIUM_ION_TOKEN || '' } catch { return import.meta.env.VITE_CESIUM_ION_TOKEN || '' } })
  const [draft, setDraft] = useState(token)
  const [status, setStatus] = useState('')
  useEffect(() => {
    if (!token || !target.current) return
    let cancelled = false
    let viewer: InstanceType<CesiumApi['Viewer']> | undefined
    let handler: InstanceType<CesiumApi['ScreenSpaceEventHandler']> | undefined
    let zoomFrame = 0
    let removeWheel = () => {}
    setStatus('Cargando superficie lunar…')
    loadCesium().then(async (C) => {
      if (cancelled || !target.current) return
      C.Ion.defaultAccessToken = token
      C.Ellipsoid.default = C.Ellipsoid.MOON
      viewer = new C.Viewer(target.current, { globe: false, baseLayerPicker: false, geocoder: false, sceneModePicker: false, homeButton: false, animation: false, timeline: false, navigationHelpButton: false, skyAtmosphere: false, baseLayer: false })
      const tiles = await C.Cesium3DTileset.fromIonAssetId(2684829)
      if (cancelled || !viewer || viewer.isDestroyed()) return
      viewer.scene.primitives.add(tiles)
      const canvas = viewer.scene.canvas
      const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
      let desiredRange = 6000000
      let anchor: unknown
      // A 60° map tilt is a Cesium pitch of -30° (measured from the horizon).
      const flyOver = (position: unknown, range: number, duration: number) => {
        if (!viewer || viewer.isDestroyed()) return false
        stopZoom()
        let hit: unknown
        if (viewer.scene.pickPositionSupported) {
          try { hit = viewer.scene.pickPosition(position) } catch { /* tiles may still be loading */ }
        }
        hit ||= viewer.camera.pickEllipsoid(position, C.Ellipsoid.MOON)
        if (!hit) return false
        anchor = hit
        desiredRange = Math.max(1500, Math.min(8000000, range))
        const progress = Math.max(0, Math.min(1, Math.log(800000 / desiredRange) / Math.log(800000 / 45000)))
        const smooth = progress * progress * (3 - 2 * progress)
        viewer.camera.cancelFlight()
        viewer.camera.flyToBoundingSphere(new C.BoundingSphere(anchor, 1), {
          offset: new C.HeadingPitchRange(viewer.camera.heading, C.Math.toRadians(-90 + 60 * smooth), desiredRange),
          duration: reducedMotion() ? 0 : duration,
          easingFunction: (t: number) => t * t * (3 - 2 * t),
        })
        return true
      }
      resetCamera.current = () => {
        if (!viewer || viewer.isDestroyed()) return
        stopZoom()
        viewer.camera.cancelFlight()
        desiredRange = 6000000
        anchor = undefined
        viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(0, 0, 6000000),
          orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 }, duration: reducedMotion() ? 0 : 1.8 })
      }
      viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      handler = new C.ScreenSpaceEventHandler(canvas)
      handler.setInputAction((event) => { flyOver(event.position, 45000, 2.8) }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      // A single damped animation consumes wheel input, without restarting camera flights.
      // Anchor at the view center so zoom never snaps the cursor location to the center.
      let zoomAnchor: unknown
      let currentRange = 0
      let currentPitch = 0
      let zoomHeading = 0
      let lastFrame = 0
      const stopZoom = () => {
        cancelAnimationFrame(zoomFrame)
        zoomFrame = 0
        zoomAnchor = undefined
      }
      const animateZoom = (now: number) => {
        if (!viewer || viewer.isDestroyed() || !zoomAnchor) return
        const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000))
        lastFrame = now
        const alpha = reducedMotion() ? 1 : 1 - Math.exp(-dt / 0.14)
        currentRange = Math.exp(Math.log(currentRange) + Math.log(desiredRange / currentRange) * alpha)
        const progress = Math.max(0, Math.min(1, Math.log(800000 / currentRange) / Math.log(800000 / 45000)))
        const targetPitch = C.Math.toRadians(-90 + 60 * progress * progress * (3 - 2 * progress))
        currentPitch += (targetPitch - currentPitch) * alpha
        viewer.camera.lookAt(zoomAnchor, new C.HeadingPitchRange(zoomHeading, currentPitch, currentRange))
        // Release the local frame immediately so native dragging and orbiting remain available.
        viewer.camera.lookAtTransform(C.Matrix4.IDENTITY)
        if (Math.abs(Math.log(desiredRange / currentRange)) < 0.0001 && Math.abs(targetPitch - currentPitch) < 0.0001) {
          stopZoom()
        } else {
          zoomFrame = requestAnimationFrame(animateZoom)
        }
      }
      const onWheel = (event: WheelEvent) => {
        if (!viewer || event.deltaY === 0 || event.buttons) return
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!zoomAnchor) {
          const center = new C.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
          if (viewer.scene.pickPositionSupported) {
            try { zoomAnchor = viewer.scene.pickPosition(center) } catch { /* depth not ready */ }
          }
          zoomAnchor ||= viewer.camera.pickEllipsoid(center, C.Ellipsoid.MOON)
          if (!zoomAnchor) return
          viewer.camera.cancelFlight()
          // Recover the exact camera offset in the target's local frame, including lunar curvature.
          const frame = C.Transforms.eastNorthUpToFixedFrame(zoomAnchor, C.Ellipsoid.MOON)
          const inverse = C.Matrix4.inverseTransformation(frame, new C.Matrix4())
          const local = C.Matrix4.multiplyByPoint(inverse, viewer.camera.positionWC, new C.Cartesian3())
          currentRange = Math.hypot(local.x, local.y, local.z)
          if (currentRange < 1) { stopZoom(); return }
          currentPitch = -Math.asin(Math.max(-1, Math.min(1, local.z / currentRange)))
          zoomHeading = Math.hypot(local.x, local.y) < 1 ? viewer.camera.heading : Math.atan2(-local.x, -local.y)
          desiredRange = currentRange
        }
        const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1)
        desiredRange = Math.max(1500, Math.min(8000000, desiredRange * Math.exp(Math.max(-0.3, Math.min(0.3, pixels * 0.0012)))))
        if (!zoomFrame) {
          lastFrame = performance.now()
          zoomFrame = requestAnimationFrame(animateZoom)
        }
      }
      const interrupt = () => { stopZoom(); viewer?.camera.cancelFlight() }
      canvas.addEventListener('wheel', onWheel, { passive: false, capture: true })
      canvas.addEventListener('pointerdown', interrupt, true)
      window.addEventListener('blur', interrupt)
      removeWheel = () => {
        stopZoom()
        canvas.removeEventListener('wheel', onWheel, true)
        canvas.removeEventListener('pointerdown', interrupt, true)
        window.removeEventListener('blur', interrupt)
      }
      resetCamera.current()
      setStatus('')
    }).catch(() => { if (!cancelled) setStatus('No se pudo cargar la Luna. Verificá tu conexión y que el token tenga acceso a Cesium Moon.') })
    return () => { cancelled = true; resetCamera.current = () => {}; cancelAnimationFrame(zoomFrame); removeWheel(); handler?.destroy(); if (viewer && !viewer.isDestroyed()) viewer.destroy() }
  }, [token])
  return <div className="relative h-full w-full bg-slate-950">
    <div ref={target} className="h-full w-full" aria-label="Visor tridimensional de la Luna" />
    {!token && <div className="absolute inset-0 flex items-center justify-center p-6"><div className="max-w-lg rounded-2xl bg-canvas p-6 text-ink shadow-card">
      <h2 className="mb-2 text-2xl font-bold leading-8">Activar la Luna en 3D</h2>
      <p className="mb-4 text-base text-body">Cesium Moon usa imágenes y elevación de la NASA. Para cargarlo, agregá el conjunto Cesium Moon a tu cuenta de Cesium ion y pegá un token de acceso.</p>
      <a className="text-sm font-medium text-ink underline" href="https://ion.cesium.com/" target="_blank" rel="noreferrer">Abrir Cesium ion ↗</a>
      <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); const value = draft.trim(); try { localStorage.setItem('terralunar.cesium-token', value) } catch { /* session still works */ }; setToken(value) }}><input aria-label="Token de Cesium ion" type="password" value={draft} onChange={e => setDraft(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-canvas-soft px-4 py-3 text-base" placeholder="Token de acceso" /><button className="rounded-full bg-ink px-5 py-3 text-base font-medium text-canvas">Cargar</button></form>
      <p className="mt-3 text-xs text-body">El token se guarda en este navegador y se envía a Cesium para acceder al servicio.</p>
    </div></div>}
    {status && <div role="status" className="absolute left-4 top-28 max-w-md rounded-2xl bg-canvas p-4 text-sm text-ink shadow-card">{status} {status.startsWith('No se pudo') && <button className="ml-2 font-medium underline" onClick={() => { try { localStorage.removeItem('terralunar.cesium-token') } catch { /* ignore */ }; setToken('') }}>Cambiar token</button>}</div>}
    <button type="button" onClick={() => resetCamera.current()} className="absolute left-4 top-4 rounded-full bg-canvas px-4 py-2 text-sm font-medium text-ink shadow-float hover:bg-canvas-soft">Ver planeta</button>
    <div className="pointer-events-none absolute left-4 top-16 rounded-full bg-canvas px-4 py-2 text-xs font-medium text-ink shadow-float">Acercá con la rueda para ver el relieve 3D · Doble clic para volar a un punto</div>
    <div className="absolute bottom-5 left-4 rounded-full bg-canvas px-3 py-1 text-xs text-body shadow-float">Imágenes y relieve: NASA LRO / USGS · Cesium Moon</div>
  </div>
}
