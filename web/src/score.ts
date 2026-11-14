// Tipos de los contratos de data/ y el cálculo del ranking: S = Σ w_i · puntaje_i / Σ w_i

export type Preset = 'movilidad' | 'excavacion' | 'habitat'
export type Weights = Record<string, number>

export interface Zone {
  id: string
  name: string
  country: string
  centroid: [number, number]
  polygon: { type: 'Polygon'; coordinates: number[][][] }
  area_km2: number
  scores: Record<string, number>
  known: boolean
  sources: string[]
  notes: string
}

export interface Dimension {
  name: string
  unit: string
  dataset: string
  fuzzy: { type: 'trapezoid'; a: number; b: number; c: number; d: number }
  weights: Record<Preset, number>
}

export interface Profile {
  name: string
  sites: string[]
  notes: string
  dimensions: Record<string, Dimension>
}

export interface Ranked {
  zone: Zone
  score: number
}

// Divide por Σw para que S quede en 0..1 aunque los sliders no sumen 1. Dimensión sin dato = 0.
export function score(zone: Zone, w: Weights): number {
  let sum = 0
  let total = 0
  for (const k in w) {
    sum += w[k] * (zone.scores[k] ?? 0)
    total += w[k]
  }
  return total > 0 ? sum / total : 0
}

export function rank(zones: Zone[], w: Weights): Ranked[] {
  return zones.map((zone) => ({ zone, score: score(zone, w) })).sort((a, b) => b.score - a.score)
}

export function presetWeights(profile: Profile, preset: Preset): Weights {
  return Object.fromEntries(Object.entries(profile.dimensions).map(([k, d]) => [k, d.weights[preset]]))
}
