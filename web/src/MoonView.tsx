import { useEffect, useRef, useState } from 'react'

// Cesium is loaded only for the lunar view, so the original Earth map stays untouched.
type CesiumApi = {
  Ion: { defaultAccessToken: string }
  Ellipsoid: { default: unknown; MOON: unknown }
  Math: { toDegrees: (n: number) => number; toRadians: (n: number) => number }
  Cartographic: { fromCartesian: (p: unknown) => { longitude: number; latitude: number } }
  ScreenSpaceEventType: { LEFT_DOUBLE_CLICK: unknown }
  ScreenSpaceEventHandler: new (canvas: unknown) => { setInputAction: (fn: (e: { position: unknown }) => void, event: unknown) => void; destroy: () => void }
  Viewer: new (node: HTMLElement, options: Record<string, unknown>) => {
    scene: { primitives: { add: (tileset: unknown) => void }; canvas: unknown; pickPosition: (p: unknown) => unknown; pickPositionSupported: boolean }
    screenSpaceEventHandler: { removeInputAction: (event: unknown) => void }
    camera: { flyTo: (options: Record<string, unknown>) => void }
    destroy: () => void
    isDestroyed: () => boolean
  }
  Cesium3DTileset: { fromIonAssetId: (id: number) => Promise<unknown> }
  Cartesian3: { fromDegrees: (lon: number, lat: number, height: number) => unknown }
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
  const [token, setToken] = useState(() => { try { return localStorage.getItem('terralunar.cesium-token') || import.meta.env.VITE_CESIUM_ION_TOKEN || '' } catch { return import.meta.env.VITE_CESIUM_ION_TOKEN || '' } })
  const [draft, setDraft] = useState(token)
  const [status, setStatus] = useState('')
  useEffect(() => {
    if (!token || !target.current) return
    let cancelled = false
    let viewer: InstanceType<CesiumApi['Viewer']> | undefined
    let handler: InstanceType<CesiumApi['ScreenSpaceEventHandler']> | undefined
    setStatus('Cargando superficie lunar…')
    loadCesium().then(async (C) => {
      if (cancelled || !target.current) return
      C.Ion.defaultAccessToken = token
      C.Ellipsoid.default = C.Ellipsoid.MOON
      viewer = new C.Viewer(target.current, { globe: false, baseLayerPicker: false, geocoder: false, sceneModePicker: false, homeButton: false, animation: false, timeline: false, navigationHelpButton: false, skyAtmosphere: false, baseLayer: false })
      const tiles = await C.Cesium3DTileset.fromIonAssetId(2684829)
      if (cancelled || !viewer || viewer.isDestroyed()) return
      viewer.scene.primitives.add(tiles)
      // Double click a visible location to fly to an oblique view of the real 3D tiles.
      viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas)
      handler.setInputAction((event) => {
        if (!viewer || !viewer.scene.pickPositionSupported) return
        const hit = viewer.scene.pickPosition(event.position)
        if (!hit) return
        const point = C.Cartographic.fromCartesian(hit)
        const lon = C.Math.toDegrees(point.longitude)
        const lat = C.Math.toDegrees(point.latitude)
        const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2.5
        viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, Math.max(-89.9, lat - 0.35), 24000), orientation: { heading: 0, pitch: C.Math.toRadians(-48), roll: 0 }, duration })
      }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(0, 0, 6000000), duration: 1.8 })
      setStatus('')
    }).catch(() => { if (!cancelled) setStatus('No se pudo cargar la Luna. Verificá tu conexión y que el token tenga acceso a Cesium Moon.') })
    return () => { cancelled = true; handler?.destroy(); if (viewer && !viewer.isDestroyed()) viewer.destroy() }
  }, [token])
  return <div className="relative h-full w-full bg-slate-950">
    <div ref={target} className="h-full w-full" aria-label="Visor tridimensional de la Luna" />
    {!token && <div className="absolute inset-0 flex items-center justify-center p-6"><div className="max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
      <h2 className="mb-2 text-xl font-semibold">Activar la Luna en 3D</h2>
      <p className="mb-4 text-sm text-slate-300">Cesium Moon usa imágenes y elevación de la NASA. Para cargarlo, agregá el conjunto Cesium Moon a tu cuenta de Cesium ion y pegá un token de acceso.</p>
      <a className="text-sm text-amber-300 underline" href="https://ion.cesium.com/" target="_blank" rel="noreferrer">Abrir Cesium ion ↗</a>
      <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); const value = draft.trim(); try { localStorage.setItem('terralunar.cesium-token', value) } catch { /* session still works */ }; setToken(value) }}><input aria-label="Token de Cesium ion" type="password" value={draft} onChange={e => setDraft(e.target.value)} className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm" placeholder="Token de acceso" /><button className="rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950">Cargar</button></form>
      <p className="mt-3 text-xs text-slate-400">El token se guarda en este navegador y se envía a Cesium para acceder al servicio.</p>
    </div></div>}
    {status && <div role="status" className="absolute left-4 top-16 max-w-md rounded-lg bg-slate-950/90 p-3 text-sm text-slate-100">{status} {status.startsWith('No se pudo') && <button className="ml-2 text-amber-300 underline" onClick={() => { try { localStorage.removeItem('terralunar.cesium-token') } catch { /* ignore */ }; setToken('') }}>Cambiar token</button>}</div>}
    <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-slate-950/85 px-3 py-2 text-xs text-slate-200">Doble clic en la superficie para volar en 3D · Rueda para acercar</div>
    <div className="absolute bottom-5 left-3 rounded bg-slate-950/80 px-2 py-1 text-xs text-slate-300">Imágenes y relieve: NASA LRO / USGS · Cesium Moon</div>
  </div>
}
