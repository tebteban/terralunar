// Validación con sitios reservados (CLAUDE.md: "nunca se recorta"). Datos: pipeline/12_validation.py.
// Reglas fijadas ANTES de ver resultados (D-028):
//  1. Solo cuenta la división `test` de los análogos USGS; `fit` se muestra aparte y no es la métrica.
//  2. Se descartan ventanas con menos del 50 % de tierra (el relieve sería fondo marino).
//  3. Umbral = percentil 90 de la semejanza de 300 ventanas de tierra al azar, medidas igual que los candidatos.
//  4. Acierto = semejanza ≥ umbral. Si el método no distinguiera nada, el acierto esperado es 10 %.
import {metrics, type Relief} from './marsData.ts'
import {reliefScore} from './globalSearch.ts'

export type HoldoutSite = {name: string; split: 'fit' | 'test'; type: string; lon: number; lat: number; land: number; heights: number[]}
export type HoldoutManifest = {version: string; generated_utc: string; method: string; source: string; seed: number
  sites: HoldoutSite[]; background: {lon: number; lat: number; heights: number[]}[]; failures: {name: string; error: string}[]}

export const MIN_LAND = .5
export const CHANCE = .1

const score = (heights: number[], reference: Relief, weights: Record<string, number>) =>
  reliefScore(metrics(Float32Array.from(heights)), reference, weights).score ?? 0

/** Percentil por rango más cercano (sin interpolar): el valor que deja `q` de la muestra por debajo. */
export function percentile(values: number[], q: number) {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]
}

/** P(X ≥ k) para X ~ Binomial(n, p): probabilidad de acertar al menos k por puro azar. */
export function binomialTail(k: number, n: number, p: number) {
  let total = 0, c = 1 // c = C(n, i)
  for (let i = 0; i <= n; i++) {
    if (i > 0) c = c * (n - i + 1) / i
    if (i >= k) total += c * p ** i * (1 - p) ** (n - i)
  }
  return Math.min(1, total)
}

export function evaluateHoldout(m: HoldoutManifest, reference: Relief, weights: Record<string, number>) {
  if (m.version !== 'validation-holdout/1') throw Error('Versión de validación desconocida')
  const background = m.background.map(b => score(b.heights, reference, weights))
  const threshold = percentile(background, 1 - CHANCE)
  const rate = (split: 'fit' | 'test') => {
    const all = m.sites.filter(s => s.split === split)
    const used = all.filter(s => s.land >= MIN_LAND).map(s => ({...s, score: score(s.heights, reference, weights)})).sort((a, b) => b.score - a.score)
    const hits = used.filter(s => s.score >= threshold)
    return {total: all.length, used: used.length, droppedSea: all.length - used.length, hits: hits.length,
      rate: used.length ? hits.length / used.length : 0, pValue: binomialTail(hits.length, used.length, CHANCE), sites: used}
  }
  return {threshold, backgroundN: background.length, test: rate('test'), fit: rate('fit')}
}
