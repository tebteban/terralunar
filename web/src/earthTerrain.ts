import { offset } from './marsData.ts'

// Relieve terrestre real para cualquier punto, desde los mismos tiles que usa el mapa (AWS Terrain Tiles,
// codificación Terrarium). z12 ≈ 38 m por píxel en el ecuador: alcanza para muestrear cada 80 m.
const TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const Z = 12

// Píxel global (Web Mercator) de una coordenada en el zoom z.
export function tilePixel(lon: number, lat: number, z = Z): [number, number] {
  const size = 256 * 2 ** z, r = lat * Math.PI / 180
  return [(lon + 180) / 360 * size, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * size]
}
export const terrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768

const tiles = new Map<string, Promise<Uint8ClampedArray>>()
function tile(x: number, y: number) {
  const key = `${x}/${y}`
  if (!tiles.has(key)) tiles.set(key, (async () => {
    const r = await fetch(`${TILES}/${Z}/${x}/${y}.png`)
    if (!r.ok) throw new Error(`Tile de elevación ${key}: ${r.status}`)
    const bitmap = await createImageBitmap(await r.blob())
    const ctx = new OffscreenCanvas(256, 256).getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bitmap, 0, 0)
    return ctx.getImageData(0, 0, 256, 256).data
  })().catch(e => { tiles.delete(key); throw e }))
  return tiles.get(key)!
}

// Grilla n×n (fila 0 = norte) centrada en lon/lat, con celdas de `cell` metros, en metros sobre el nivel del mar.
export async function earthTerrain(lon: number, lat: number, n = 250, cell = 80) {
  const px: number[] = [], py: number[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const [l, p] = offset(lon, lat, (x - (n - 1) / 2) * cell, ((n - 1) / 2 - y) * cell)
    const [X, Y] = tilePixel(l, p)
    px.push(X - 0.5); py.push(Y - 0.5)
  }
  const keys = new Set<string>()
  for (let i = 0; i < px.length; i++) for (const dx of [0, 1]) for (const dy of [0, 1])
    keys.add(`${Math.floor((Math.floor(px[i]) + dx) / 256)}/${Math.floor((Math.floor(py[i]) + dy) / 256)}`)
  const data = new Map(await Promise.all([...keys].map(async k => { const [x, y] = k.split('/').map(Number); return [k, await tile(x, y)] as const })))
  const at = (X: number, Y: number) => {
    const d = data.get(`${Math.floor(X / 256)}/${Math.floor(Y / 256)}`)!, i = ((Y & 255) * 256 + (X & 255)) * 4
    return terrarium(d[i], d[i + 1], d[i + 2])
  }
  const out = new Float32Array(n * n)
  for (let i = 0; i < out.length; i++) {
    const x0 = Math.floor(px[i]), y0 = Math.floor(py[i]), fx = px[i] - x0, fy = py[i] - y0
    out[i] = at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy
  }
  return out
}
