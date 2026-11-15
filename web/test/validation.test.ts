import {test} from 'node:test'
import assert from 'node:assert/strict'
import {binomialTail, evaluateHoldout, percentile} from '../src/validation.ts'
import {metrics} from '../src/marsData.ts'

test('percentile uses nearest rank', () => {
  const v = Array.from({length: 10}, (_, i) => i + 1)
  assert.equal(percentile(v, .9), 9)
  assert.equal(percentile(v, 1), 10)
})

test('binomial tail matches known values', () => {
  assert.equal(binomialTail(0, 10, .1), 1)
  assert.ok(Math.abs(binomialTail(10, 10, .1) - 1e-10) < 1e-15)
  assert.ok(Math.abs(binomialTail(1, 2, .5) - .75) < 1e-12)
})

// Relieve sintético: plano (fondo) contra ondulado (sitios); el destino es el ondulado.
const flat = Array.from({length: 100}, () => 100)
const wavy = Array.from({length: 100}, (_, i) => 1000 + 400 * Math.sin(i % 10) + 300 * Math.cos(Math.floor(i / 10)))
const weights = {pendiente_mediana: 25, pendiente_p90: 25, rugosidad_m: 25, desnivel_m: 25}
const base = {version: 'validation-holdout/1', generated_utc: '', method: '', source: '', seed: 1, failures: []}

test('test sites that resemble the target beat the random background', () => {
  const m = {...base, background: Array.from({length: 20}, () => ({lon: 0, lat: 0, heights: flat})),
    sites: [
      ...Array.from({length: 5}, (_, i) => ({name: 't' + i, split: 'test' as const, type: '', lon: 0, lat: 0, land: 1, heights: wavy})),
      {name: 'mar', split: 'test' as const, type: '', lon: 0, lat: 0, land: .2, heights: wavy},
      {name: 'f', split: 'fit' as const, type: '', lon: 0, lat: 0, land: 1, heights: flat},
    ]}
  const v = evaluateHoldout(m, metrics(Float32Array.from(wavy)), weights)
  assert.equal(v.test.used, 5)          // el sitio con 20 % de tierra se descarta (regla fijada antes)
  assert.equal(v.test.droppedSea, 1)
  assert.equal(v.test.rate, 1)
  assert.ok(v.test.pValue < 1e-4)
  assert.equal(v.fit.total, 1)          // fit se informa aparte
})

test('unknown manifest version is rejected', () => {
  assert.throws(() => evaluateHoldout({...base, version: 'x', background: [], sites: []}, metrics(Float32Array.from(wavy)), weights))
})
