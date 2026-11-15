// Consideraciones geomecánicas (docs/consideraciones-geomecanicas.md, equipo de Ingeniería Civil).
// Siete criterios por destino con su condición en el destino (bibliografía), su traducción a la Tierra,
// la regla 0–1 y el peso. REGLA DE VERACIDAD: un criterio solo recibe nota si el candidato terrestre
// tiene el dato medido; si falta, queda "pendiente" y no aporta. El documento fija los extremos de cada
// regla (1,0 y 0,0); entre ambos se usa un tramo lineal PROVISORIO, a validar por Civil.
import type {Cover} from './coverageMask.ts'
import type {ThermalEvidence} from './thermalEvidence.ts'
import type {Relief} from './marsData.ts'
import {covered, type GeoEarth} from './geoEarth.ts'

export type GeoCriterionId = 'composition' | 'bearing' | 'thermal' | 'volatiles' | 'morphology' | 'radiation' | 'refuge'
export type GeoInput = {features: Relief; heights?: ArrayLike<number>; thermal?: ThermalEvidence; cover?: Cover; earth?: GeoEarth}
export type GeoResult = {
  id: GeoCriterionId; name: string; weight: number
  target: string; earth: string; rule: string
  status: 'measured' | 'pending'
  score: number | null          // 0..1 solo si está medido
  measured: string | null       // valor terrestre usado, con unidad
  missing: string | null        // qué dato falta (si está pendiente)
  caveat: string | null         // límite del dato usado
}
type Criterion = {id: GeoCriterionId; name: string; weight: number; target: string; earth: string; rule: string
  evaluate: (x: GeoInput) => Pick<GeoResult, 'score' | 'measured' | 'missing' | 'caveat'>}
export type GeoProfile = {id: string; site: string; body: 'luna' | 'marte'; matches: RegExp; criteria: Criterion[]; sources: {name: string; url: string}[]}

/** Tramo lineal entre el valor que da 0 y el que da 1 (sirve en ambos sentidos). */
export function ramp(value: number, zeroAt: number, oneAt: number) {
  const t = (value - zeroAt) / (oneAt - zeroAt)
  return Math.max(0, Math.min(1, t))
}
const median = (v: ArrayLike<number>) => { const a = Array.from(v).filter(Number.isFinite).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : NaN }
const fmt = (v: number, d = 1) => v.toLocaleString('es-AR', {maximumFractionDigits: d})
const altitude = (x: GeoInput) => x.heights && x.heights.length ? median(x.heights) : NaN
const SLOPE_CAVEAT = 'Pendiente calculada con celdas de 2 km: subestima las pendientes locales que pide la regla (DEM de 30 m).'

function pending(missing: string) { return {score: null, measured: null, missing, caveat: null} }

/** 1 dentro de [lo, hi]; fuera, baja linealmente a 0 en `soft` unidades (tramo PROVISORIO, a validar por Civil). */
export function band(v: number, lo: number, hi: number, soft: number) {
  return v < lo ? ramp(v, lo - soft, lo) : v > hi ? ramp(v, hi + soft, hi) : 1
}
const pct = (v: number) => fmt(v * 100, 1) + ' %'

// ---- Lecturas de data/geomechanics/earth.json (datos reales; si la capa no cubre la ventana, queda el motivo)
/** Pendiente mediana a 30 m (NASADEM / Copernicus GLO-30). */
function slope30(x: GeoInput) { const d = x.earth?.dem; return covered(d) && d.slope_deg ? d.slope_deg[1] : NaN }
function demSource(x: GeoInput) { const d = x.earth?.dem; return covered(d) ? d.product : '' }
/** Densidad aparente 0–30 cm: promedio de las medianas SoilGrids 0–5, 5–15 y 15–30 cm (g/cm³). */
function bulkDensity(x: GeoInput): {value: number; deep: number | null} | {reason: string} {
  const s = x.earth?.soil
  if (!s) return {reason: COMMON_PENDING.bearing}
  if (!('depths' in s)) return {reason: s.reason.startsWith('SoilGrids') ? s.reason : 'SoilGrids: ' + s.reason}
  const top = ['0-5cm', '5-15cm', '15-30cm'].map(k => s.depths[k]).filter(d => d && d.g_cm3 && d.valid >= .5).map(d => d!.g_cm3![1])
  if (!top.length) return {reason: 'SoilGrids no predice suelo en esta ventana (roca expuesta, hielo, agua o zona urbana).'}
  const deep = s.depths['30-60cm']
  return {value: top.reduce((a, b) => a + b, 0) / top.length, deep: deep?.g_cm3 && deep.valid >= .5 ? deep.g_cm3[1] : null}
}
const SOIL_CAVEAT = 'SoilGrids 2.0 es una predicción estadística a 250 m (perfiles de suelo + covariables), no un ensayo de campo; cohesión y fricción no están medidas.'
const PZI_CAVEAT = 'El PZI (Gruber 2012, ~1 km) indica dónde es probable el permafrost según clima y relieve; no da profundidad ni contenido de hielo, que la regla pide. Inventarios de glaciares de escombros no integrados.'
const S2_CAVEAT = (d: string) => `Una escena Sentinel-2 (${d}) leída a 100 m. El NIR distingue suelo desnudo claro u oscuro; no identifica anortosita ni basalto.`
const MODIS_CAVEAT = 'MODIS Terra pasa ~10:30 y ~22:30: no capta el máximo ni el mínimo real del día, así que la amplitud diaria se subestima. 12 compuestos de 8 días (uno por mes).'

/** Amplitud térmica de un día (MODIS): mediana de día menos mediana de noche, en °C. */
function thermalAmplitude(t?: ThermalEvidence) {
  const day = t?.day.kelvin?.[1], night = t?.night.kelvin?.[1]
  return day !== undefined && night !== undefined ? day - night : NaN
}
/** Regla "amplitud diaria o estacional > umbral": usa la serie anual MODIS si existe; si no, la fecha única. */
function thermalCriterion(x: GeoInput, oneAt: number) {
  const m = x.earth?.modis
  if (m && m.diurnal_c && m.seasonal_c !== null) {
    const a = Math.max(m.diurnal_c.median, m.seasonal_c)
    return {score: ramp(a, 0, oneAt), measured: `amplitud diaria mediana ${fmt(m.diurnal_c.median)} °C (máx. ${fmt(m.diurnal_c.max)}) · estacional ${fmt(m.seasonal_c)} °C · ${m.year}, ${m.diurnal_c.months} meses`, missing: null, caveat: MODIS_CAVEAT}
  }
  const a = thermalAmplitude(x.thermal)
  return Number.isFinite(a)
    ? {score: ramp(a, 0, oneAt), measured: `amplitud ${fmt(a)} °C`, missing: null, caveat: THERMAL_CAVEAT}
    : pending('Este recorte no tiene temperatura de día y de noche (MODIS) integrada.')
}

function compositionCriterion(x: GeoInput, lo: number, hi: number, key: 'frac_moon_nir' | 'frac_mars_nir') {
  const s = x.earth?.s2
  if (!s) return pending(COMMON_PENDING.composition)
  if (!covered(s)) return pending('Sentinel-2: ' + s.reason)
  if (!s.nir || !s.ndvi) return pending('Sentinel-2 sin píxeles de suelo despejado en la ventana.')
  const nir = s.nir[1], ndvi = s.ndvi[1]
  return {score: Math.min(band(nir, lo, hi, .10), ramp(ndvi, .4, .05)),
    measured: `NIR mediana ${fmt(nir, 2)} · NDVI mediana ${fmt(ndvi, 2)} · ${pct(s[key])} de los píxeles cumple NIR ${fmt(lo, 2)}–${fmt(hi, 2)} y NDVI < 0,05`,
    missing: null, caveat: S2_CAVEAT(s.date)}
}

function bearingCriterion(x: GeoInput, lo: number, hi: number, slopeZero: number, slopeOne: number) {
  const d = bulkDensity(x)
  if ('reason' in d) return pending(d.reason)
  const s = slope30(x)
  if (!Number.isFinite(s)) return pending('Falta la pendiente a 30 m (DEM) de la ventana.')
  return {score: Math.min(band(d.value, lo, hi, .3), ramp(s, slopeZero, slopeOne)),
    measured: `densidad 0–30 cm ${fmt(d.value, 2)} g/cm³${d.deep !== null ? ` (30–60 cm: ${fmt(d.deep, 2)})` : ''} · pendiente mediana 30 m ${fmt(s)}°`,
    missing: null, caveat: SOIL_CAVEAT}
}

function volatilesCriterion(x: GeoInput, oneAt: number) {
  const p = x.earth?.pzi
  if (!p) return pending(COMMON_PENDING.volatiles)
  if (!covered(p)) return pending(p.reason)
  if (p.frac_ge_05 === null) return pending('El PZI no tiene píxeles válidos en la ventana.')
  return {score: ramp(p.frac_ge_05, 0, oneAt),
    measured: `permafrost probable (PZI ≥ 0,5) en ${pct(p.frac_ge_05)} de la ventana · PZI medio ${fmt(p.mean ?? 0, 2)}`,
    missing: null, caveat: PZI_CAVEAT}
}

function refugeCriterion(x: GeoInput, key: 'refuge_moon_frac' | 'refuge_mars_frac', drop: string, flank: string) {
  const d = x.earth?.dem
  if (!d) return pending(COMMON_PENDING.refuge)
  if (!covered(d)) return pending(d.reason)
  return {score: ramp(d[key], 0, .02),
    measured: `${pct(d[key])} de la ventana con desnivel local ${drop} y flanco ${flank} (ventana de ${d.relief_window_m} m)`,
    missing: null, caveat: `${d.product}. Mide escarpes y taludes, no cavidades: tubos de lava o cuevas no se ven en un DEM. Nota 1,0 desde el 2 % de la ventana (umbral provisorio).`}
}
const THERMAL_CAVEAT = 'Una sola fecha MODIS (día − noche, medianas del recorte): no es un ciclo diario ni estacional completo.'

const COMMON_PENDING = {
  composition: 'Falta reflectancia en el infrarrojo cercano (NIR) del recorte; el NDVI solo no alcanza para la regla.',
  bearing: 'Falta densidad aparente del suelo (p. ej. SoilGrids o ensayos de campo).',
  volatiles: 'Falta un mapa de permafrost o glaciares de escombros con profundidad y contenido de hielo.',
  refuge: 'Falta un DEM de 30 m: desniveles de decenas de metros no se resuelven con celdas de 2 km.',
}

export const GEO_PROFILES: GeoProfile[] = [
  {
    id: 'mons-mouton', site: 'Mons Mouton', body: 'luna', matches: /mons mouton/i,
    sources: [
      {name: 'Documento de criterios del equipo (Ingeniería Civil)', url: 'docs/consideraciones-geomecanicas.md'},
      {name: 'NASA PDS Geosciences Node (LRO LOLA)', url: 'https://pds-geosciences.wustl.edu/'},
    ],
    criteria: [
      {id: 'composition', name: 'Granulometría y composición', weight: .15,
        target: 'Regolito maduro de tierras altas (anortositas/brechas), 2–15 m de espesor, D50 40–100 µm, bloques > 0,5 m del 5–15 %.',
        earth: 'Rocas de tierras altas, reflectancia NIR 0,25–0,40 y NDVI < 0,05.',
        rule: '1,0: suelos clásticos/tefra sin vegetación con NIR 0,25–0,40 · 0,0: suelos vegetados con NDVI > 0,4.',
        evaluate: x => compositionCriterion(x, .25, .40, 'frac_moon_nir')},
      {id: 'bearing', name: 'Capacidad portante y consolidación', weight: .15,
        target: 'Densidad 1,1–1,3 g/cm³ (10–30 cm) y 1,5–1,8 en profundidad; cohesión 0,1–1,0 kPa; fricción 35–45°.',
        earth: 'Densidad aparente 1,4–1,8 g/cm³ en cimas; descartar laderas > 25°.',
        rule: '1,0: densidad 1,4–1,8 y pendiente < 15° · 0,0: suelos pantanosos o pendiente > 25°.',
        evaluate: x => bearingCriterion(x, 1.4, 1.8, 25, 15)},
      {id: 'thermal', name: 'Oscilaciones térmicas', weight: .10,
        target: 'Superficie diurna 100–240 K (−173 a −33 °C); cráteres en sombra 40–60 K.',
        earth: 'Amplitud térmica diaria o estacional > 25–40 °C.',
        rule: '1,0: amplitud > 30 °C · 0,0: climas isotérmicos (tramo lineal 0 → 30 °C).',
        evaluate: x => thermalCriterion(x, 30)},
      {id: 'volatiles', name: 'Volátiles y evaporitas', weight: .20,
        target: 'Hielo subsuperficial de 0,5 % a más de 5 % en peso en flancos y escarpes.',
        earth: 'Permafrost alpino o glaciares de escombros con 10–50 % de cobertura de hielo y detritos.',
        rule: '1,0: permafrost o glaciares de escombros 10–50 % · 0,0: hiperárido sin hielo subsuperficial.',
        evaluate: x => volatilesCriterion(x, .10)},
      {id: 'morphology', name: 'Morfología y topografía', weight: .20,
        target: 'Meseta elevada de relieve suave (15×15 a 20×30 km), pendientes < 5–10°.',
        earth: 'Altitud > 3000 m s. n. m., pendientes < 5°, área continua > 50 km².',
        rule: '1,0: pendiente 0–5° y altitud > 3000 m · 0,0: pendiente > 20° o tierras bajas (tramos lineales; nota = la menor de ambas).',
        evaluate: x => { const h = altitude(x), s30 = slope30(x), s = Number.isFinite(s30) ? s30 : x.features.pendiente_mediana
          if (!Number.isFinite(h) || !Number.isFinite(s)) return pending('Falta el DEM del recorte.')
          const d = x.earth?.dem, flat = covered(d) ? ` · mayor planicie < 5°: ${fmt(d.largest_flat5_km2, 0)} km²` : ''
          return {score: Math.min(ramp(s, 20, 5), ramp(h, 0, 3000)), measured: `pendiente mediana ${fmt(s)}° (${Number.isFinite(s30) ? '30 m' : '2 km'}) · altitud ${fmt(h, 0)} m${flat}`, missing: null,
            caveat: Number.isFinite(s30) ? `Pendiente de ${demSource(x)}.` : SLOPE_CAVEAT} }},
      {id: 'radiation', name: 'Exposición a radiación', weight: .10,
        target: 'Dosis GCR estimada 0,32–0,40 Sv/año con UV directa.',
        earth: 'Altitud > 3800–4500 m s. n. m. (índice UV > 11).',
        rule: '1,0: altitud > 4000 m · 0,0: nivel del mar (tramo lineal).',
        evaluate: x => { const h = altitude(x); return Number.isFinite(h)
          ? {score: ramp(h, 0, 4000), measured: `altitud ${fmt(h, 0)} m`, missing: null, caveat: 'La regla usa la altitud como sustituto de la columna atmosférica; el índice UV no está integrado.'}
          : pending('Falta el DEM del recorte.') }},
      {id: 'refuge', name: 'Refugio subterráneo', weight: .10,
        target: 'Escarpes escalonados con desniveles de 10–50 m y flancos de 15–30°.',
        earth: 'Rupturas de pendiente y cantiles de 10–50 m con pendientes basales de 15–30°.',
        rule: '1,0: desniveles 10–50 m con pendientes 15–30° · 0,0: planicies sin accidentes.',
        evaluate: x => refugeCriterion(x, 'refuge_moon_frac', '10–50 m', '15–30°')},
    ],
  },
  {
    id: 'arcadia-planitia', site: 'Arcadia Planitia', body: 'marte', matches: /arcadia/i,
    sources: [
      {name: 'Documento de criterios del equipo (Ingeniería Civil)', url: 'docs/consideraciones-geomecanicas.md'},
      {name: "NASA's Treasure Map for Water Ice on Mars (JPL)", url: 'https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/'},
      {name: 'Morgan et al. · Subsurface water-ice resources (NTRS)', url: 'https://ntrs.nasa.gov/api/citations/20205008958/downloads/Morgan_etal_NA_Perspective_NATASTRON_19122833C%20.pdf'},
      {name: 'NASA HLS2 · Arcadia Planitia study area', url: 'https://www.nasa.gov/wp-content/uploads/2015/06/hls2_newsletter_02-19_v19_tagged.pdf'},
      {name: 'NASA PDS Geosciences Node (MOLA)', url: 'https://pds-geosciences.wustl.edu/'},
    ],
    criteria: [
      {id: 'composition', name: 'Granulometría y composición', weight: .15,
        target: 'Polvo eólico 1–3 m sobre arenas basálticas, D50 50–200 µm, bloques < 5 %.',
        earth: 'Provincias basálticas, reflectancia NIR 0,15–0,30 y NDVI < 0,05.',
        rule: '1,0: suelos basálticos sin vegetación con NIR 0,15–0,30 · 0,0: NDVI > 0,4.',
        evaluate: x => compositionCriterion(x, .15, .30, 'frac_mars_nir')},
      {id: 'bearing', name: 'Capacidad portante y consolidación', weight: .15,
        target: 'Densidad 1,1–1,4 g/cm³ en superficie y 1,6–2,0 en profundidad; cohesión 0,2–1,5 kPa; fricción 30–40°.',
        earth: 'Planicies aluviales o desiertos planos, densidad 1,5–2,0 g/cm³ y pendiente < 5°.',
        rule: '1,0: densidad 1,5–2,0 y pendiente < 5° · 0,0: pendiente > 15° o suelos blandos.',
        evaluate: x => bearingCriterion(x, 1.5, 2.0, 15, 5)},
      {id: 'thermal', name: 'Oscilaciones térmicas', weight: .10,
        target: 'Superficie 150–270 K (−123 a −3 °C), amplitud diaria 50–80 °C.',
        earth: 'Regiones áridas o frías con amplitud diaria o estacional > 30–50 °C.',
        rule: '1,0: amplitud > 40 °C · 0,0: climas isotérmicos (tramo lineal 0 → 40 °C).',
        evaluate: x => thermalCriterion(x, 40)},
      {id: 'volatiles', name: 'Volátiles y evaporitas', weight: .20,
        target: 'Hielo subsuperficial en exceso a 0,5–3 m, 30–90 % en volumen.',
        earth: 'Permafrost continuo o discontinuo a < 1–3 m con 20–80 % de hielo o detritos.',
        rule: '1,0: permafrost a < 3 m con 30–80 % de hielo · 0,0: sin permafrost ni volátiles.',
        evaluate: x => volatilesCriterion(x, .50)},
      {id: 'morphology', name: 'Morfología y topografía', weight: .20,
        target: 'Planicie volcánica y periglaciar, pendientes locales < 2–5°, áreas continuas > 1000 km².',
        earth: 'Planicies sedimentarias o cuencas áridas, pendientes < 3°, extensión > 50 km².',
        rule: '1,0: pendiente < 3° en planicies extensas · 0,0: pendiente > 15° (tramo lineal).',
        evaluate: x => { const s30 = slope30(x), s = Number.isFinite(s30) ? s30 : x.features.pendiente_mediana
          if (!Number.isFinite(s)) return pending('Falta el DEM del recorte.')
          const d = x.earth?.dem, flat = covered(d) ? ` · mayor planicie < 5°: ${fmt(d.largest_flat5_km2, 0)} km²` : ''
          return {score: ramp(s, 15, 3), measured: `pendiente mediana ${fmt(s)}° (${Number.isFinite(s30) ? '30 m' : '2 km'})${flat}`, missing: null,
            caveat: Number.isFinite(s30) ? `Pendiente de ${demSource(x)}.` : SLOPE_CAVEAT} }},
      {id: 'radiation', name: 'Exposición a radiación', weight: .10,
        target: 'Atmósfera de CO₂ de 6–7 mbar, sin campo magnético; 0,20–0,30 Sv/año y UV alta.',
        earth: 'Altitud > 3500–4500 m s. n. m. (índice UV > 10).',
        rule: '1,0: altitud > 4000 m · 0,0: nivel del mar (tramo lineal).',
        evaluate: x => { const h = altitude(x); return Number.isFinite(h)
          ? {score: ramp(h, 0, 4000), measured: `altitud ${fmt(h, 0)} m`, missing: null, caveat: 'La regla usa la altitud como sustituto de la columna atmosférica; el índice UV no está integrado.'}
          : pending('Falta el DEM del recorte.') }},
      {id: 'refuge', name: 'Refugio subterráneo', weight: .10,
        target: 'Cráteres degradados y trincheras periglaciales con desniveles de 2–15 m y flancos de 5–20°.',
        earth: 'Depresiones, dolinas o escarpes bajos de 2–15 m con pendientes de 5–20°.',
        rule: '1,0: desniveles 2–15 m con pendientes 5–20° · 0,0: llanuras sin relieve protector.',
        evaluate: x => refugeCriterion(x, 'refuge_mars_frac', '2–15 m', '5–20°')},
    ],
  },
]

export function geoProfileFor(target: {name: string; body: 'luna' | 'marte'}) {
  return GEO_PROFILES.find(p => p.body === target.body && p.matches.test(target.name)) ?? null
}

/** Supermáscara del documento: NDVI < 0,1 · sin agua · sin zonas urbanas (1 = apto, 0 = descartado). */
/** Cobertura alternativa desde earth.json: WorldCover 2021 (agua, urbano, cultivo) + NDVI mediano de Sentinel-2. */
export function coverFromEarth(e?: GeoEarth): (Cover & {crop?: number | null}) | undefined {
  const wc = e?.wc, s2 = e?.s2
  if (!covered(wc)) return
  return {id: e!.id, valid_fraction: wc.valid, water: wc.water, built: wc.built, crop: wc.crop, vegetation: null,
    ndvi: covered(s2) && s2.ndvi ? s2.ndvi[1] : null}
}

export function superMask(cover?: Cover & {crop?: number | null}) {
  if (!cover) return {status: 'pending' as const, pass: null, detail: 'Sin datos de cobertura para este recorte.'}
  const checks = [
    {name: 'NDVI < 0,1', value: cover.ndvi, ok: cover.ndvi === null ? null : cover.ndvi < .1, shown: cover.ndvi === null ? 'sin dato' : fmt(cover.ndvi, 2)},
    {name: 'sin agua', value: cover.water, ok: cover.water === null ? null : cover.water < .01, shown: cover.water === null ? 'sin dato' : fmt(cover.water * 100) + ' %'},
    {name: 'sin zonas urbanas', value: cover.built, ok: cover.built === null ? null : cover.built < .01, shown: cover.built === null ? 'sin dato' : fmt(cover.built * 100) + ' %'},
    ...(cover.crop !== undefined ? [{name: 'sin cultivos', value: cover.crop, ok: cover.crop === null ? null : cover.crop < .01, shown: cover.crop === null ? 'sin dato' : fmt(cover.crop * 100) + ' %'}] : []),
  ]
  const failed = checks.filter(c => c.ok === false), unknown = checks.filter(c => c.ok === null)
  const pass = failed.length ? false : unknown.length ? null : true
  return {status: pass === null ? 'pending' as const : 'measured' as const, pass, checks,
    detail: failed.length ? 'Descartado por: ' + failed.map(c => c.name).join(', ') : unknown.length ? 'Incompleta: ' + unknown.map(c => c.name).join(', ') + ' sin dato.' : 'Apto en todas las capas.'}
}

/** Evalúa los 7 criterios. El índice parcial usa SOLO los criterios medidos y declara qué peso cubre. */
export function evaluateGeomechanics(profile: GeoProfile, x: GeoInput) {
  const results: GeoResult[] = profile.criteria.map(c => {
    const r = c.evaluate(x)
    return {id: c.id, name: c.name, weight: c.weight, target: c.target, earth: c.earth, rule: c.rule, status: r.score === null ? 'pending' : 'measured', ...r}
  })
  const measured = results.filter(r => r.status === 'measured')
  const evaluatedWeight = measured.reduce((s, r) => s + r.weight, 0)
  const partialIndex = evaluatedWeight > 0 ? measured.reduce((s, r) => s + r.weight * (r.score ?? 0), 0) / evaluatedWeight : null
  const mask = superMask(x.cover ?? coverFromEarth(x.earth))
  // Regla del documento: Mapa_Final = WLC × Super_Máscara. Descartado ⇒ 0; máscara incompleta ⇒ se informa.
  const finalIndex = partialIndex === null ? null : mask.pass === false ? 0 : partialIndex
  return {version: 'geomechanics/1', profile: profile.id, results, evaluatedWeight, partialIndex, finalIndex, mask,
    complete: evaluatedWeight >= .999,
    note: 'Índice parcial: promedio ponderado solo de los criterios medidos. No es el índice completo de 7 criterios ni certifica el ensayo.'}
}
