// Parecido de relieve Luna ↔ Tierra (usado por el panel lunar y el comparador 3D).
// Ajuste por métrica = máx(0, 1 − |diferencia| / tolerancia); el parecido es el promedio (0..1).
export type ReliefMetric = 'pendiente_mediana' | 'pendiente_p90' | 'rugosidad_m' | 'desnivel_m'
export type ReliefMetrics = Record<ReliefMetric, number>

// Tolerancias PROVISORIAS, a validar por el equipo de ciencia (Civil).
export const MOON_TOL: ReliefMetrics = { pendiente_mediana: 5, pendiente_p90: 8, rugosidad_m: 3, desnivel_m: 1000 }

export function moonSimilarity(a: ReliefMetrics, b: ReliefMetrics) {
  const keys = Object.keys(MOON_TOL) as ReliefMetric[]
  return keys.reduce((s, k) => s + Math.max(0, 1 - Math.abs(a[k] - b[k]) / MOON_TOL[k]), 0) / keys.length
}
