import {test} from 'node:test'
import assert from 'node:assert/strict'
import {GEO_PROFILES, evaluateGeomechanics, geoProfileFor, ramp, superMask} from '../src/geomechanics.ts'

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
