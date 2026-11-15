export const ENGINE_VERSION = 'physical-wlc/1.0.0'
export const MONS_WEIGHTS = { portante: .20, volatiles: .20, granulometria: .15, termico: .15, topografia: .15, radiacion: .15 }
export type Criterion = { id: string; weight: number; value: number | null }
export function normalize(value: number, min: number, max: number, direction: 'benefit' | 'cost') {
  if (![value,min,max].every(Number.isFinite) || max <= min) throw new Error('Rango de normalización inválido')
  const v = Math.max(0, Math.min(1, (value-min)/(max-min)))
  return direction === 'benefit' ? v : 1-v
}
export function targetMatch(value: number, target: number, tolerance: number) {
  if (![value,target,tolerance].every(Number.isFinite) || tolerance <= 0) throw new Error('Tolerancia inválida')
  return Math.max(0, 1-Math.abs(value-target)/tolerance)
}
// Unknown restrictions block an operational suitability claim; excluded is distinct from missing.
export function combine(criteria: Criterion[], mask: 0 | 1 | null = 1) {
  if (!criteria.length || new Set(criteria.map(c=>c.id)).size !== criteria.length) throw new Error('Criterios vacíos o duplicados')
  for (const c of criteria) if (!Number.isFinite(c.weight) || c.weight < 0 || (c.value !== null && (!Number.isFinite(c.value) || c.value < 0 || c.value > 1))) throw new Error('Criterio inválido')
  if (mask !== null && mask !== 0 && mask !== 1) throw new Error('Máscara inválida')
  const total = criteria.reduce((s,c)=>s+c.weight,0)
  if (!total) throw new Error('Se requiere al menos un peso positivo')
  const contributions = criteria.map(c=>({...c, contribution:c.value === null ? null : c.value*c.weight/total}))
  const coverage = criteria.reduce((s,c)=>s+(c.value === null ? 0 : c.weight),0)/total
  const lower = contributions.reduce((s,c)=>s+(c.contribution ?? 0),0)
  return {version:ENGINE_VERSION, status:mask===0?'excluded':mask===null?'restriction-unknown':coverage<1-1e-12?'incomplete':'complete', coverage, score:mask===0?0:mask===null||coverage<1-1e-12?null:100*lower, bounds:mask===0?[0,0]:[100*lower,100*Math.min(1,lower+1-coverage)], contributions}
}
