// Proyección estereográfica polar sur de LOLA (esfera R): píxel de la grilla <-> lat/lon en grados.
export interface Proj { lola_offset: number; lola_res_m: number; radius_m: number }
const D = Math.PI / 180

export function pxToLatLon(p: Proj, line: number, sample: number) {
  const x = (sample - p.lola_offset) * p.lola_res_m, y = (p.lola_offset - line) * p.lola_res_m
  return { lat: (2 * Math.atan(Math.hypot(x, y) / (2 * p.radius_m)) - Math.PI / 2) / D, lon: Math.atan2(x, y) / D }
}

export function latLonToPx(p: Proj, lat: number, lon: number) {
  const rho = 2 * p.radius_m * Math.tan(Math.PI / 4 + (lat * D) / 2)
  return { line: p.lola_offset - (rho * Math.cos(lon * D)) / p.lola_res_m, sample: p.lola_offset + (rho * Math.sin(lon * D)) / p.lola_res_m }
}
