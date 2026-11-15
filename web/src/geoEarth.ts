// Datos terrestres reales para las consideraciones geomecánicas (pipeline/11_geomechanics.py → data/geomechanics/earth.json).
// Cada capa puede faltar o venir con covered=false y el motivo: la ficha lo muestra como pendiente, nunca se inventa.
type P3 = [number, number, number] // percentiles 10, 50, 90
type Uncovered = {covered: false; reason: string}
export type SoilLayer = {product: string; url: string; citation: string; depths: Record<string, {g_cm3: P3 | null; valid: number} | null>}
export type PziLayer = Uncovered | {covered: true; product: string; url: string; citation: string; mean: number | null; max: number | null; frac_ge_01: number | null; frac_ge_05: number | null; frac_ge_09: number | null; pixels: number}
export type DemLayer = Uncovered | {covered: true; product: string; collection: string; valid: number; altitude_m: P3 | null; slope_deg: P3 | null
  frac_slope_lt5: number; frac_slope_lt15: number; frac_slope_gt25: number; largest_flat5_km2: number; refuge_moon_frac: number; refuge_mars_frac: number; relief_window_m: number}
export type S2Layer = Uncovered | {covered: true; product: string; scene: string; date: string; land_frac: number; water_frac: number; snow_frac: number
  nir: P3 | null; ndvi: P3 | null; frac_moon_nir: number; frac_mars_nir: number; frac_ndvi_gt04: number}
export type ModisLayer = {product: string; year: number; composites: {start: string | null; day_k: number | null; night_k: number | null}[]
  diurnal_c: {median: number; max: number; months: number} | null; seasonal_c: number | null; min_c: number | null; max_c: number | null; covered?: false; reason?: string}
export type WcLayer = Uncovered | {covered: true; product: string; valid: number; crop: number; built: number; water: number; snow_ice: number; bare: number; tree: number; shrub: number; grass: number; wetland: number}
export type GeoEarth = {id: string; lat: number; lon: number; soil?: SoilLayer | Uncovered; pzi?: PziLayer; dem?: DemLayer; s2?: S2Layer; modis?: ModisLayer; wc?: WcLayer}
export type GeoEarthManifest = {version: string; items: Record<string, GeoEarth>}

/** Busca la ventana por id y exige que el centro coincida (evita usar datos de otra ventana con el mismo id). */
export function geoEarthAt(manifest: GeoEarthManifest, id: string, lon: number, lat: number): GeoEarth | undefined {
  if (manifest?.version !== 'geomechanics-earth/1') return
  const item = manifest.items?.[id]
  if (!item || Math.abs(item.lon - lon) > 1e-6 || Math.abs(item.lat - lat) > 1e-6) return
  return item
}

export const covered = <T extends {covered?: boolean}>(l?: T): l is T & {covered: true} => !!l && l.covered === true
