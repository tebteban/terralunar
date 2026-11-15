import {test} from 'node:test'
import assert from 'node:assert/strict'
import {GEO_PROFILES, band, evaluateGeomechanics, geoProfileFor, ramp, superMask} from '../src/geomechanics.ts'

const relief = {pendiente_mediana: 2, pendiente_p90: 4, rugosidad_m: 50, desnivel_m: 300}
const flatHigh = Array.from({length: 100}, () => 4200)
const thermal = {day: {kelvin: [300, 310, 320]}, night: {kelvin: [260, 270, 280]}} as never

test('ramp follows the document endpoints in both directions', () => {
  assert.equal(ramp(0, 0, 4000), 0)
  assert.equal(ramp(4000, 0, 4000), 1)
  assert.equal(ramp(2000, 0, 4000), .5)
  assert.equal(ramp(5, 20, 5), 1)   // pendiente ≤ 5° → 1
  assert.equal(ramp(20, 20, 5), 0)  // pendiente ≥ 20° → 0
})

test('profiles only apply to the documented sites', () => {
  assert.equal(geoProfileFor({name: 'Mons Mouton (meseta)', body: 'luna'})?.id, 'mons-mouton')
  assert.equal(geoProfileFor({name: 'Arcadia Planitia', body: 'marte'})?.id, 'arcadia-planitia')
  assert.equal(geoProfileFor({name: 'Mons Malapert (macizo)', body: 'luna'}), null)
  assert.equal(geoProfileFor({name: 'Jezero', body: 'marte'}), null)
  for (const p of GEO_PROFILES) assert.ok(Math.abs(p.criteria.reduce((s, c) => s + c.weight, 0) - 1) < 1e-9)
})

test('unmeasured criteria stay pending and never enter the index', () => {
  const p = geoProfileFor({name: 'Mons Mouton', body: 'luna'})!
  const g = evaluateGeomechanics(p, {features: relief})
  const pending = g.results.filter(r => r.status === 'pending').map(r => r.id).sort()
  assert.deepEqual(pending, ['bearing', 'composition', 'morphology', 'radiation', 'refuge', 'thermal', 'volatiles'])
  assert.equal(g.partialIndex, null)
  assert.equal(g.evaluatedWeight, 0)
})

test('measured criteria use real inputs and declare the weight they cover', () => {
  const p = geoProfileFor({name: 'Mons Mouton', body: 'luna'})!
  const g = evaluateGeomechanics(p, {features: relief, heights: flatHigh, thermal})
  const byId = Object.fromEntries(g.results.map(r => [r.id, r]))
  assert.equal(byId.thermal.score, 1)         // amplitud 40 °C > 30 °C
  assert.equal(byId.radiation.score, 1)       // 4200 m > 4000 m
  assert.equal(byId.morphology.score, 1)      // 2° y 4200 m
  assert.equal(byId.bearing.status, 'pending')
  assert.ok(Math.abs(g.evaluatedWeight - .40) < 1e-9)
  assert.equal(g.partialIndex, 1)
  assert.equal(g.complete, false)
})

test('supermask discards vegetation, water or built-up areas and reports missing layers', () => {
  const base = {id: 'x', valid_fraction: 1, water: 0, built: 0, vegetation: 0, ndvi: .05}
  assert.equal(superMask(base).pass, true)
  assert.equal(superMask({...base, ndvi: .3}).pass, false)
  assert.equal(superMask({...base, built: null}).pass, null)
  assert.equal(superMask(undefined).pass, null)
  const p = geoProfileFor({name: 'Arcadia Planitia', body: 'marte'})!
  const g = evaluateGeomechanics(p, {features: relief, heights: flatHigh, thermal, cover: {...base, water: .2}})
  assert.equal(g.finalIndex, 0)               // descartado por agua: WLC × supermáscara = 0
})

// Datos reales de earth.json (pipeline/11_geomechanics.py). Valores tomados de la ventana Atacama (Yungay).
const earth = {
  id: 'atacama-yungay', lat: -24.1, lon: -70,
  soil: {product: 'SoilGrids', url: '', citation: '', depths: {'0-5cm': {g_cm3: [1.31, 1.33, 1.35], valid: 1}, '5-15cm': {g_cm3: [1.32, 1.34, 1.37], valid: 1}, '15-30cm': {g_cm3: [1.34, 1.36, 1.38], valid: 1}, '30-60cm': {g_cm3: [1.39, 1.41, 1.43], valid: 1}}},
  pzi: {covered: true, product: 'PZI', url: '', citation: '', mean: 0, max: 0, frac_ge_01: 0, frac_ge_05: 0, frac_ge_09: 0, pixels: 528},
  dem: {covered: true, product: 'NASADEM', collection: 'nasadem', valid: 1, altitude_m: [1011, 1156, 1378], slope_deg: [2, 5.8, 15.4], frac_slope_lt5: .43, frac_slope_lt15: .89, frac_slope_gt25: .008, largest_flat5_km2: 111, refuge_moon_frac: .0257, refuge_mars_frac: .0659, relief_window_m: 206},
  s2: {covered: true, product: 'S2', scene: 's', date: '2026-11-08', land_frac: 1, water_frac: 0, snow_frac: 0, nir: [.241, .303, .382], ndvi: [.052, .072, .1], frac_moon_nir: .046, frac_mars_nir: .011, frac_ndvi_gt04: 0},
  modis: {product: 'MOD11A2', year: 2024, composites: [], diurnal_c: {median: 30.4, max: 36, months: 11}, seasonal_c: 43.9, min_c: 6, max_c: 50},
  wc: {covered: true, product: 'WC', valid: 1, crop: 0, built: 0, water: 0, snow_ice: 0, bare: .999, tree: 0, shrub: 0, grass: 0, wetland: 0},
} as never

test('real earth layers measure all seven criteria for a fully covered window', () => {
  const p = geoProfileFor({name: 'Mons Mouton', body: 'luna'})!
  const g = evaluateGeomechanics(p, {features: relief, heights: flatHigh, earth})
  const byId = Object.fromEntries(g.results.map(r => [r.id, r]))
  assert.equal(g.complete, true)
  assert.equal(byId.volatiles.score, 0)                        // hiperárido: PZI 0
  assert.ok(Math.abs(byId.bearing.score! - ((1.33 + 1.34 + 1.36) / 3 - 1.1) / .3) < 1e-9) // 1,34 g/cm³: apenas bajo 1,4
  assert.equal(byId.composition.score!.toFixed(3), ramp(.072, .4, .05).toFixed(3)) // NIR 0,30 en rango; NDVI manda
  assert.equal(byId.refuge.score, 1)                           // 2,6 % ≥ 2 %
  assert.equal(byId.thermal.score, 1)                          // estacional 43,9 °C > 30 °C
  assert.match(byId.morphology.measured!, /30 m/)
  assert.equal(g.mask.pass, true)                              // sin cobertura regional: WorldCover + NDVI S2 (0,072 < 0,1)
  assert.ok(g.mask.checks!.some(c => c.name === 'sin cultivos'))
})

test('band is 1 inside the range and decays linearly outside', () => {
  assert.equal(band(1.5, 1.4, 1.8, .3), 1)
  assert.ok(band(1.1, 1.4, 1.8, .3) < 1e-9)
  assert.ok(Math.abs(band(1.95, 1.4, 1.8, .3) - .5) < 1e-9)
})

test('uncovered layers keep the criterion pending with the source reason', () => {
  const p = geoProfileFor({name: 'Arcadia Planitia', body: 'marte'})!
  const e = {id: 'mcmurdo', lat: -77.5, lon: 161.8, pzi: {covered: false, reason: 'El PZI cubre solo al norte de 60° S.'}} as never
  const g = evaluateGeomechanics(p, {features: relief, earth: e})
  const v = g.results.find(r => r.id === 'volatiles')!
  assert.equal(v.status, 'pending')
  assert.match(v.missing!, /60° S/)
})
