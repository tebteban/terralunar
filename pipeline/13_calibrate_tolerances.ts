// Calibración de las tolerancias del ranking con datos reales (D-030). Método de CLAUDE.md:
// "se ajusta con fit; la métrica es el % de test en el 10 % superior".
// Uso: node --experimental-strip-types pipeline/13_calibrate_tolerances.ts
//
// REGLAS FIJADAS ANTES DE CORRER (no se cambian después de ver test):
//  1. Escala de cada medida = rango intercuartil (P75 − P25) en las 300 ventanas de tierra al azar
//     (data/validation/usgs-holdout.json, medidas igual que los candidatos). Es "cuánto varía esa medida en la Tierra".
//  2. Tolerancia = c × escala, con c en {0,25; 0,5; 1; 2; 4} (pocas opciones a propósito, para no sobreajustar).
//  3. Destino de calibración: Mons Mouton (sitio principal), pesos iguales.
//  4. Se elige el c con mayor acierto en FIT; si empatan, el más cercano a ×1 (en escala logarítmica).
//  5. TEST se evalúa UNA vez, con el c elegido, y se informa junto al resultado de las tolerancias a mano.
import fs from 'node:fs'
import {metrics, TOLERANCES, type Relief} from '../web/src/marsData.ts'
import {evaluateHoldout, percentile, type HoldoutManifest} from '../web/src/validation.ts'

const root = new URL('../data/', import.meta.url)
const holdout: HoldoutManifest = JSON.parse(fs.readFileSync(new URL('validation/usgs-holdout.json', root), 'utf8'))
const index = JSON.parse(fs.readFileSync(new URL('compare/index.json', root), 'utf8'))
const KEYS = Object.keys(TOLERANCES) as (keyof Relief)[]
const MULTIPLIERS = [.25, .5, 1, 2, 4]
const WEIGHTS = Object.fromEntries(KEYS.map(k => [k, 25]))

/** Mismo agregado a 2 km que analysisRun.referenceFor (recorte LOLA de 250×250 celdas de 80 m → 10×10). */
function lunarReference(file: string) {
  const buf = fs.readFileSync(new URL('compare/' + file, root)), view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), h = new Float32Array(100)
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    let s = 0
    for (let j = 0; j < 25; j++) for (let i = 0; i < 25; i++) s += view.getUint16(((y * 25 + j) * 250 + x * 25 + i) * 2, true)
    h[y * 10 + x] = s / 625
  }
  return metrics(h)
}

// 1. Escala real: rango intercuartil de cada medida en el fondo de tierra al azar.
const bg = holdout.background.map(b => metrics(Float32Array.from(b.heights)))
const scale = Object.fromEntries(KEYS.map(k => { const v = bg.map(r => r[k]); return [k, percentile(v, .75) - percentile(v, .25)] })) as Relief
const tol = (c: number) => Object.fromEntries(KEYS.map(k => [k, c * scale[k]])) as Relief

const moons = index.items.filter((i: {body: string}) => i.body === 'luna')
const mouton = moons.find((i: {id: string}) => i.id === 'luna-mons-mouton')
const ref = lunarReference(mouton.file)

// 2–4. Selección SOLO con fit.
const fitRuns = MULTIPLIERS.map(c => { const v = evaluateHoldout(holdout, ref, WEIGHTS, tol(c)); return {c, fitHits: v.fit.hits, fitUsed: v.fit.used, fitRate: v.fit.rate} })
const best = [...fitRuns].sort((a, b) => b.fitRate - a.fitRate || Math.abs(Math.log(a.c)) - Math.abs(Math.log(b.c)))[0]
console.log('FIT (selección):', fitRuns.map(r => `×${r.c}: ${r.fitHits}/${r.fitUsed}`).join(' · '), '→ elegido ×' + best.c)

// 5. Test, una vez, para cada destino lunar: tolerancias a mano vs calibradas.
const calibrated = tol(best.c)
const round = (r: Relief) => Object.fromEntries(KEYS.map(k => [k, Number(r[k].toPrecision(3))])) as Relief
const results = moons.map((m: {id: string; name: string; file: string}) => {
  const r = lunarReference(m.file)
  const manual = evaluateHoldout(holdout, r, WEIGHTS), cal = evaluateHoldout(holdout, r, WEIGHTS, round(calibrated))
  const pick = (v: ReturnType<typeof evaluateHoldout>) => ({hits: v.test.hits, used: v.test.used, rate: v.test.rate, pValue: v.test.pValue, threshold: v.threshold, top: v.test.sites.slice(0, 5).map(s => s.name)})
  return {id: m.id, name: m.name, manual: {...pick(manual), informative: manual.informative}, calibrated: {...pick(cal), informative: cal.informative}}
})
for (const r of results) console.log(`TEST ${r.name}: a mano ${r.manual.hits}/${r.manual.used} (p=${r.manual.pValue.toFixed(3)}) → calibradas ${r.calibrated.hits}/${r.calibrated.used} (p=${r.calibrated.pValue.toFixed(3)}, umbral ${r.calibrated.threshold.toFixed(1)}${r.calibrated.informative ? "" : ", NO INFORMATIVA"})`)

const out = {version: 'tolerance-calibration/1', generated_utc: new Date().toISOString(),
  method: 'Escala = rango intercuartil de cada medida en 300 ventanas de tierra al azar; tolerancia = c × escala; c elegido con los análogos USGS fit (Mons Mouton, pesos iguales); test evaluado una sola vez.',
  rules: ['c ∈ {0,25; 0,5; 1; 2; 4}', 'mayor acierto en fit; empate → c más cercano a 1', 'test se evalúa una vez y se informa junto a las tolerancias a mano'],
  scale: round(scale), multipliers: fitRuns, chosen: best.c, manualTolerances: TOLERANCES, calibratedTolerances: round(calibrated), test: results}
fs.writeFileSync(new URL('validation/calibration.json', root), JSON.stringify(out, null, 2))
console.log('Tolerancias calibradas:', JSON.stringify(out.calibratedTolerances), '· escala:', JSON.stringify(out.scale))
