// Formato único de datos (DESIGN.md §6): es-AR (coma decimal, punto de miles), unidad visible, hemisferio en coordenadas.
export const num = (v: number, digits = 1) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−')

// Metros enteros si son grandes (1.513 m), un decimal si son chicos (3,3 m)
export const meters = (v: number) => (Math.abs(v) >= 100 ? num(v, 0) : num(v, 1)) + ' m'
export const degrees = (v: number) => num(v, 1) + '°'

// 64,8500° N · 16,8000° O  (lon de entrada en −180..180 o 0..360)
export function coord(lat: number, lon: number, digits = 2) {
  const l = ((lon + 540) % 360) - 180
  return `${num(Math.abs(lat), digits)}° ${lat < 0 ? 'S' : 'N'} · ${num(Math.abs(l), digits)}° ${l < 0 ? 'O' : 'E'}`
}
