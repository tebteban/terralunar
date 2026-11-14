// Correr con: npm test
import assert from 'node:assert/strict'
import test from 'node:test'
import { rank, score, type Zone } from '../src/score.ts'

const z = (id: string, scores: Record<string, number>) => ({ id, scores }) as unknown as Zone

test('promedio ponderado normalizado', () => {
  assert.equal(score(z('a', { x: 1, y: 0 }), { x: 3, y: 1 }), 0.75)
  assert.ok(Math.abs(score(z('a', { x: 1, y: 0 }), { x: 0.3, y: 0.1 }) - 0.75) < 1e-9) // misma proporción, mismo S
})

test('pesos en cero y dimensión faltante', () => {
  assert.equal(score(z('a', { x: 1 }), { x: 0 }), 0)
  assert.equal(score(z('a', { x: 1 }), { x: 1, y: 1 }), 0.5)
})

test('ranking de mayor a menor', () => {
  const r = rank([z('baja', { x: 0.2 }), z('alta', { x: 0.9 })], { x: 1 })
  assert.deepEqual(r.map((e) => e.zone.id), ['alta', 'baja'])
})
