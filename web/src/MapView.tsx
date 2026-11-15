import { startGlobeRotation } from './globeRotation.ts'
import { LngLatBounds, Map as MapLibre, NavigationControl, ScaleControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import SpaceBackdrop from './SpaceBackdrop.tsx'
import type { Ranked } from './score.ts'

// MapLibre v6 busca su worker al lado de su propio archivo; Vite lo mueve, así que le damos la URL
setWorkerUrl(workerUrl)

// Mapa base oscuro sin API key
const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
// Alturas del mundo en PNG (codificación "terrarium"), gratis y sin key. Solo para el relieve visual;
// las métricas de pendiente/rugosidad salen de NASADEM en el pipeline.
const DEM = {
  type: 'raster-dem' as const,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium' as const,
  tileSize: 256,
  maxzoom: 14,
  attribution: 'Relieve: <a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a> (Mapzen; incl. NASA SRTM)',
}
// Escala de similitud de DESIGN.md (S 0..1): pizarra → ámbar → crema
const COLOR = ['interpolate', ['linear'], ['get', 'score'], 0.4, '#1e293b', 0.7, '#d97706', 0.9, '#fef3c7'] as const

function toGeoJSON(ranked: Ranked[], selectedId: string | null, kind: 'polygon' | 'point') {
  return {
    type: 'FeatureCollection' as const,
    features: ranked.map(({ zone, score }, i) => ({
      type: 'Feature' as const,
      id: i,
      geometry: kind === 'polygon' ? zone.polygon : { type: 'Point' as const, coordinates: zone.centroid },
      properties: { id: zone.id, score, known: zone.known, selected: zone.id === selectedId },
    })),
  }
}

interface Props {
  active?: boolean
  ranked: Ranked[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function MapView({ ranked, selectedId, onSelect, active = true }: Props) {
  // De Eze (c891b87): lectura de cámara y aviso si falla una capa
  const [cameraInfo, setCameraInfo] = useState('')
  const [mapError, setMapError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const scene = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibre | null>(null)
  // refs para que los handlers del mapa (creados una sola vez) vean siempre los props actuales
  const latest = useRef({ ranked, selectedId, onSelect })
  useLayoutEffect(() => {
    latest.current = { ranked, selectedId, onSelect }
  })

  const sync = () => {
    const m = map.current
    const { ranked, selectedId } = latest.current
    ;(m?.getSource('zones') as GeoJSONSource | undefined)?.setData(toGeoJSON(ranked, selectedId, 'polygon'))
    ;(m?.getSource('centroids') as GeoJSONSource | undefined)?.setData(toGeoJSON(ranked, selectedId, 'point'))
  }

  useEffect(() => {
    const m = new MapLibre({ container: container.current!, style: STYLE, center: [-30, 15], zoom: 1.4, minZoom: -0.5,
      canvasContextAttributes: { antialias: true } })
    map.current = m
    m.addControl(new NavigationControl(), 'bottom-right')
    m.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
    m.on('error', () => setMapError('No se pudo cargar una capa. Revisá la conexión.'))
    m.on('moveend', () => { const c = m.getCenter(); setCameraInfo(`${c.lat.toFixed(2)}°, ${c.lng.toFixed(2)}° · zoom ${m.getZoom().toFixed(1)}`) })
    const updateSpace = () => {
      const opacity = Math.max(0, Math.min(1, (3 - m.getZoom()) / 1.6))
      scene.current?.style.setProperty('--space-opacity', String(opacity))
      scene.current?.style.setProperty('--space-motion', opacity === 0 ? 'paused' : 'running')
    }
    m.on('zoom', updateSpace)
    updateSpace()
    // Misma regla que Marte y la Luna: al acercarse la cámara se inclina sola (0° lejos, 60° cerca)
    let autoPitch = false
    m.on('zoomend', (e) => {
      if (autoPitch || !e.originalEvent) return // solo zoom del usuario; los vuelos ya traen su inclinación
      const pitch = Math.max(0, Math.min(60, (m.getZoom() - 3) * 15))
      if (Math.abs(m.getPitch() - pitch) > 3) {
        autoPitch = true
        m.easeTo({ pitch, duration: 700 })
        m.once('moveend', () => { autoPitch = false })
      }
    })
    let stopRotation: (() => void) | undefined
    m.on('load', () => {
      m.setProjection({ type: 'globe' })
      stopRotation = startGlobeRotation(m)
      m.setSky({ 'sky-color': 'rgba(2,6,23,0)', 'horizon-color': '#93c5fd', 'fog-color': '#020617', 'atmosphere-blend': 0.85 })
      // Imágenes por teselas: el detalle aumenta con el zoom, sin una textura gigante.
      // A escala local reaparece el mapa original, con sus capas y relieve.
      m.addSource('earth-imagery', {
        type: 'raster', tileSize: 256, maxzoom: 8,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community',
      })
      m.addLayer({ id: 'earth-imagery', type: 'raster', source: 'earth-imagery', maxzoom: 8,
        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 1, 8, 0], 'raster-fade-duration': 300 },
      })
      const empty = { type: 'FeatureCollection' as const, features: [] }
      m.addSource('zones', { type: 'geojson', data: empty })
      m.addSource('centroids', { type: 'geojson', data: empty })
      // dos fuentes iguales: MapLibre recomienda no compartir la del terreno 3D con la del sombreado
      m.addSource('dem-terrain', DEM)
      m.addSource('dem-hillshade', DEM)
      m.addLayer({
        id: 'hillshade', type: 'hillshade', source: 'dem-hillshade', minzoom: 5,
        paint: { 'hillshade-shadow-color': '#020617', 'hillshade-highlight-color': '#94a3b8', 'hillshade-exaggeration': 0.6 },
      })
      // la zona elegida casi transparente, para que se vea el relieve debajo
      m.addLayer({
        id: 'zones-fill', type: 'fill', source: 'zones',
        paint: { 'fill-color': COLOR as never, 'fill-opacity': ['case', ['get', 'selected'], 0.08, 0.45] },
      })
      m.addLayer({
        id: 'zones-line', type: 'line', source: 'zones',
        paint: { 'line-color': ['case', ['get', 'selected'], '#ffffff', COLOR] as never, 'line-width': ['case', ['get', 'selected'], 2.5, 1] },
      })
      // Puntos visibles a zoom mundial (las zonas miden pocos km y no se verían)
      m.addLayer({
        id: 'centroids', type: 'circle', source: 'centroids', maxzoom: 7,
        paint: {
          'circle-color': COLOR as never,
          'circle-opacity': ['case', ['get', 'selected'], 0, 1], // no tapar el relieve de la zona elegida
          'circle-stroke-opacity': ['case', ['get', 'selected'], 0, 1],
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0.3, 4, 0.9, 10],
          'circle-stroke-color': ['case', ['get', 'selected'], '#ffffff', ['get', 'known'], '#ffffff', '#afafaf'],
          'circle-stroke-width': ['case', ['get', 'selected'], 3, ['get', 'known'], 2, 1],
        },
      })
      sync()
      focus()
      for (const layer of ['centroids', 'zones-fill']) {
        m.on('click', layer, (e) => {
          const id = e.features?.[0]?.properties?.id
          if (id) latest.current.onSelect(id)
        })
        m.on('mouseenter', layer, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', layer, () => (m.getCanvas().style.cursor = ''))
      }
    })
    // reajustar el lienzo cuando cambia el tamaño del contenedor (barra lateral, ventana)
    const resize = new ResizeObserver(() => { if (container.current?.offsetWidth) m.resize() })
    resize.observe(container.current!)
    return () => { resize.disconnect(); stopRotation?.(); m.remove() }
  }, [])

  useEffect(sync, [ranked, selectedId])

  const selectedGeometry = JSON.stringify(ranked.find(r=>r.zone.id===selectedId)?.zone.polygon ?? null)
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => { map.current?.resize(); focus() })
    return () => cancelAnimationFrame(frame)
  }, [selectedId, active, selectedGeometry]) // refocus after restoring a hidden map or replacing its footprint

  return <div ref={scene} className="space-scene relative h-full w-full overflow-hidden bg-space">
    <SpaceBackdrop />
    <div ref={container} className="relative h-full w-full" role="region" aria-label="Globo 3D de la Tierra y mapa de zonas análogas" />
    <button type="button" className="chip-dark absolute left-4 top-4"
      onClick={() => map.current?.flyTo({ center: [-30, 15], zoom: 1.4, pitch: 0, bearing: 0, duration: 1800 })}>
      Ver planeta
    </button>
    <div className="absolute bottom-10 left-4 z-[1] hidden items-center gap-1 rounded-full border border-hairline bg-rail p-1 shadow-float md:flex">
      <button type="button" onClick={focus} disabled={!selectedId} className="rounded-full px-3.5 py-1.5 text-xs text-canvas hover:bg-elevated disabled:opacity-40">Centrar selección</button>
      <button type="button" onClick={() => { const m = map.current; if (m) m.easeTo({ pitch: m.getPitch() > 5 ? 0 : 60, duration: 650 }) }} className="rounded-full px-3.5 py-1.5 text-xs text-canvas hover:bg-elevated">Cenital / oblicua</button>
    </div>
    {cameraInfo && <output className="metric pointer-events-none absolute bottom-3 left-28 z-[1] hidden text-[11px] text-mute md:block">{cameraInfo}</output>}
    {mapError && <button type="button" className="chip-dark absolute left-4 top-28 z-[1] text-xs" onClick={() => setMapError('')}>{mapError} · Cerrar</button>}
  </div>

  // Al elegir zona: relieve 3D y cámara inclinada sobre ella (dejando lugar a la ficha a la derecha).
  // Al cerrar la ficha: cámara cenital, conservando el globo. Se llama también en 'load' por si se eligió antes de cargar.
  function focus() {
    const m = map.current
    if (!m?.getSource('dem-terrain')) return // el mapa todavía no terminó 'load'
    const { ranked, selectedId } = latest.current
    const zone = ranked.find((r) => r.zone.id === selectedId)?.zone
    if (!zone) {
      m.setTerrain(null)
      m.easeTo({ pitch: 0, bearing: 0 })
      return
    }
    m.setTerrain({ source: 'dem-terrain', exaggeration: 1.5 })
    const bounds = new LngLatBounds()
    for (const c of zone.polygon.coordinates[0]) bounds.extend(c as [number, number])
    const cam = m.cameraForBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: window.innerWidth >= 768 ? 480 : 60 },
    })
    m.flyTo({ ...cam, pitch: 60, bearing: -20, speed: 1.4 })
  }
}
