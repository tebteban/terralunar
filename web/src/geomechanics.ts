// Consideraciones geomecánicas (docs/consideraciones-geomecanicas.md, equipo de Ingeniería Civil).
// Siete criterios por destino con su condición en el destino (bibliografía), su traducción a la Tierra,
// la regla 0–1 y el peso. REGLA DE VERACIDAD: un criterio solo recibe nota si el candidato terrestre
// tiene el dato medido; si falta, queda "pendiente" y no aporta. El documento fija los extremos de cada
// regla (1,0 y 0,0); entre ambos se usa un tramo lineal PROVISORIO, a validar por Civil.
import type {Cover} from './coverageMask.ts'
import type {ThermalEvidence} from './thermalEvidence.ts'
import type {Relief} from './marsData.ts'

export type GeoCriterionId = 'composition' | 'bearing' | 'thermal' | 'volatiles' | 'morphology' | 'radiation' | 'refuge'
export type GeoInput = {features: Relief; heights?: ArrayLike<number>; thermal?: ThermalEvidence; cover?: Cover}
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

/** Amplitud térmica de un día (MODIS): mediana de día menos mediana de noche, en °C. */
function thermalAmplitude(t?: ThermalEvidence) {
  const day = t?.day.kelvin?.[1], night = t?.night.kelvin?.[1]
  return day !== undefined && night !== undefined ? day - night : NaN
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
        evaluate: () => pending(COMMON_PENDING.composition)},
      {id: 'bearing', name: 'Capacidad portante y consolidación', weight: .15,
        target: 'Densidad 1,1–1,3 g/cm³ (10–30 cm) y 1,5–1,8 en profundidad; cohesión 0,1–1,0 kPa; fricción 35–45°.',
        earth: 'Densidad aparente 1,4–1,8 g/cm³ en cimas; descartar laderas > 25°.',
        rule: '1,0: densidad 1,4–1,8 y pendiente < 15° · 0,0: suelos pantanosos o pendiente > 25°.',
        evaluate: () => pending(COMMON_PENDING.bearing)},
      {id: 'thermal', name: 'Oscilaciones térmicas', weight: .10,
        target: 'Superficie diurna 100–240 K (−173 a −33 °C); cráteres en sombra 40–60 K.',
        earth: 'Amplitud térmica diaria o estacional > 25–40 °C.',
        rule: '1,0: amplitud > 30 °C · 0,0: climas isotérmicos (tramo lineal 0 → 30 °C).',
        evaluate: x => { const a = thermalAmplitude(x.thermal); return Number.isFinite(a)
          ? {score: ramp(a, 0, 30), measured: `amplitud ${fmt(a)} °C`, missing: null, caveat: THERMAL_CAVEAT}
          : pending('Este recorte no tiene temperatura de día y de noche (MODIS) integrada.') }},
      {id: 'volatiles', name: 'Volátiles y evaporitas', weight: .20,
        target: 'Hielo subsuperficial de 0,5 % a más de 5 % en peso en flancos y escarpes.',
        earth: 'Permafrost alpino o glaciares de escombros con 10–50 % de cobertura de hielo y detritos.',
        rule: '1,0: permafrost o glaciares de escombros 10–50 % · 0,0: hiperárido sin hielo subsuperficial.',
        evaluate: () => pending(COMMON_PENDING.volatiles)},
      {id: 'morphology', name: 'Morfología y topografía', weight: .20,
        target: 'Meseta elevada de relieve suave (15×15 a 20×30 km), pendientes < 5–10°.',
        earth: 'Altitud > 3000 m s. n. m., pendientes < 5°, área continua > 50 km².',
        rule: '1,0: pendiente 0–5° y altitud > 3000 m · 0,0: pendiente > 20° o tierras bajas (tramos lineales; nota = la menor de ambas).',
        evaluate: x => { const h = altitude(x), s = x.features.pendiente_mediana
          if (!Number.isFinite(h) || !Number.isFinite(s)) return pending('Falta el DEM del recorte.')
          return {score: Math.min(ramp(s, 20, 5), ramp(h, 0, 3000)), measured: `pendiente mediana ${fmt(s)}° · altitud ${fmt(h, 0)} m`, missing: null, caveat: SLOPE_CAVEAT} }},
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
        evaluate: () => pending(COMMON_PENDING.refuge)},
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
        evaluate: () => pending(COMMON_PENDING.composition)},
      {id: 'bearing', name: 'Capacidad portante y consolidación', weight: .15,
        target: 'Densidad 1,1–1,4 g/cm³ en superficie y 1,6–2,0 en profundidad; cohesión 0,2–1,5 kPa; fricción 30–40°.',
        earth: 'Planicies aluviales o desiertos planos, densidad 1,5–2,0 g/cm³ y pendiente < 5°.',
        rule: '1,0: densidad 1,5–2,0 y pendiente < 5° · 0,0: pendiente > 15° o suelos blandos.',
        evaluate: () => pending(COMMON_PENDING.bearing)},
      {id: 'thermal', name: 'Oscilaciones térmicas', weight: .10,
        target: 'Superficie 150–270 K (−123 a −3 °C), amplitud diaria 50–80 °C.',
        earth: 'Regiones áridas o frías con amplitud diaria o estacional > 30–50 °C.',
        rule: '1,0: amplitud > 40 °C · 0,0: climas isotérmicos (tramo lineal 0 → 40 °C).',
        evaluate: x => { const a = thermalAmplitude(x.thermal); return Number.isFinite(a)
          ? {score: ramp(a, 0, 40), measured: `amplitud ${fmt(a)} °C`, missing: null, caveat: THERMAL_CAVEAT}
          : pending('Este recorte no tiene temperatura de día y de noche (MODIS) integrada.') }},
      {id: 'volatiles', name: 'Volátiles y evaporitas', weight: .20,
        target: 'Hielo subsuperficial en exceso a 0,5–3 m, 30–90 % en volumen.',
        earth: 'Permafrost continuo o discontinuo a < 1–3 m con 20–80 % de hielo o detritos.',
        rule: '1,0: permafrost a < 3 m con 30–80 % de hielo · 0,0: sin permafrost ni volátiles.',
        evaluate: () => pending(COMMON_PENDING.volatiles)},
      {id: 'morphology', name: 'Morfología y topografía', weight: .20,
        target: 'Planicie volcánica y periglaciar, pendientes locales < 2–5°, áreas continuas > 1000 km².',
        earth: 'Planicies sedimentarias o cuencas áridas, pendientes < 3°, extensión > 50 km².',
        rule: '1,0: pendiente < 3° en planicies extensas · 0,0: pendiente > 15° (tramo lineal).',
        evaluate: x => { const s = x.features.pendiente_mediana; return Number.isFinite(s)
          ? {score: ramp(s, 15, 3), measured: `pendiente mediana ${fmt(s)}°`, missing: null, caveat: SLOPE_CAVEAT}
          : pending('Falta el DEM del recorte.') }},
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
        evaluate: () => pending(COMMON_PENDING.refuge)},
    ],
  },
]

export function geoProfileFor(target: {name: string; body: 'luna' | 'marte'}) {
  return GEO_PROFILES.find(p => p.body === target.body && p.matches.test(target.name)) ?? null
}

/** Supermáscara del documento: NDVI < 0,1 · sin agua · sin zonas urbanas (1 = apto, 0 = descartado). */
export function superMask(cover?: Cover) {
  if (!cover) return {status: 'pending' as const, pass: null, detail: 'Sin datos de cobertura para este recorte.'}
  const checks = [
    {name: 'NDVI < 0,1', value: cover.ndvi, ok: cover.ndvi === null ? null : cover.ndvi < .1, shown: cover.ndvi === null ? 'sin dato' : fmt(cover.ndvi, 2)},
    {name: 'sin agua', value: cover.water, ok: cover.water === null ? null : cover.water < .01, shown: cover.water === null ? 'sin dato' : fmt(cover.water * 100) + ' %'},
    {name: 'sin zonas urbanas', value: cover.built, ok: cover.built === null ? null : cover.built < .01, shown: cover.built === null ? 'sin dato' : fmt(cover.built * 100) + ' %'},
  ]
  const failed = checks.filter(c => c.ok === false), unknown = checks.filter(c => c.ok === null)
  const pass = failed.length ? false : unknown.length ? null : true
  return {status: pass === null ? 'pending' as const : 'measured' as const, pass, checks,
    detail: failed.length ? 'Descartado por: ' + failed.map(c => c.name).join(', ') : unknown.length ? 'Incompleta: ' + unknown.map(c => c.name).join(', ') + ' sin dato.' : 'Apto en las tres capas.'}
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
  const mask = superMask(x.cover)
  // Regla del documento: Mapa_Final = WLC × Super_Máscara. Descartado ⇒ 0; máscara incompleta ⇒ se informa.
  const finalIndex = partialIndex === null ? null : mask.pass === false ? 0 : partialIndex
  return {version: 'geomechanics/1', profile: profile.id, results, evaluatedWeight, partialIndex, finalIndex, mask,
    complete: evaluatedWeight >= .999,
    note: 'Índice parcial: promedio ponderado solo de los criterios medidos. No es el índice completo de 7 criterios ni certifica el ensayo.'}
}
