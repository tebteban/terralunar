import { LngLatBounds, Map as MapLibre, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useLayoutEffect, useRef } from 'react'
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
// Color por similitud S (0..1): gris → ámbar → crema
const COLOR = ['interpolate', ['linear'], ['get', 'score'], 0.4, '#475569', 0.7, '#f59e0b', 0.9, '#fde68a'] as const

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
  ranked: Ranked[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function MapView({ ranked, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
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
    const m = new MapLibre({ container: container.current!, style: STYLE, center: [-30, 15], zoom: 1.4 })
    map.current = m
    m.addControl(new NavigationControl(), 'bottom-right')
    m.on('load', () => {
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
          'circle-stroke-color': ['case', ['get', 'selected'], '#ffffff', ['get', 'known'], '#38bdf8', '#0f172a'],
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
    return () => m.remove()
  }, [])

  useEffect(sync, [ranked, selectedId])

  useEffect(focus, [selectedId]) // solo mover la cámara al cambiar la selección, no al mover sliders

  return <div ref={container} className="h-full w-full" role="region" aria-label="Mapa de zonas análogas" />

  // Al elegir zona: relieve 3D y cámara inclinada sobre ella (dejando lugar a la ficha a la derecha).
  // Al cerrar la ficha: mapa plano otra vez. Se llama también en 'load' por si se eligió antes de cargar.
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
