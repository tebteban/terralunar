import {getLang} from './i18n.ts'

// Formato único de datos (DESIGN.md §6), según el idioma (D-031):
// inglés → en-US (3,278.5) · español → es-AR (3.278,5). Unidad visible, hemisferio en coordenadas.
export const locale = () => (getLang() === 'en' ? 'en-US' : 'es-AR')
export const num = (v: number, digits = 1) =>
  v.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−')

// Metros enteros si son grandes (1.513 m), un decimal si son chicos (3,3 m)
export const meters = (v: number) => (Math.abs(v) >= 100 ? num(v, 0) : num(v, 1)) + ' m'
export const degrees = (v: number) => num(v, 1) + '°'

// 64,8500° N · 16,8000° O  (lon de entrada en −180..180 o 0..360); en inglés el oeste es W
export function coord(lat: number, lon: number, digits = 2) {
  const l = ((lon + 540) % 360) - 180
  const west = getLang() === 'en' ? 'W' : 'O'
  return `${num(Math.abs(lat), digits)}° ${lat < 0 ? 'S' : 'N'} · ${num(Math.abs(l), digits)}° ${l < 0 ? west : 'E'}`
}
