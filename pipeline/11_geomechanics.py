"""Datos terrestres REALES para las consideraciones geomecánicas (D-023, docs/consideraciones-geomecanicas.md).

Para cada ventana candidata de 20 km (misma convención que 09_thermal_observations.py) mide, por capa:
  soil   SoilGrids 2.0 (ISRIC) densidad aparente bdod, 0-5/5-15/15-30/30-60 cm, 250 m          -> capacidad portante
  pzi    Permafrost Zonation Index (Gruber 2012, The Cryosphere 6:221), 1 km, 60S-90N            -> volátiles
  dem    NASADEM 30 m (NASA, 56S-60N) o Copernicus GLO-30 fuera de ese rango (Planetary Computer)  -> refugio, pendiente 30 m
  s2     Sentinel-2 L2A (ESA) NIR B08 y NDVI, escena con menos nubes 2024-2026 (Planetary Computer) -> composición, supermáscara
  modis  MODIS MOD11A2.061 (NASA) LST 8 días, 1 km, 12 compuestos de 2024 (2025 incompleto) (Planetary Computer)     -> oscilación diaria y estacional
  wc     ESA WorldCover 2021 v200, 10 m leído a 100 m (Planetary Computer)                        -> supermáscara (agua, urbano, cultivo)

Uso:  python 11_geomechanics.py --layers soil,pzi,dem,s2,modis,wc [--only id1,id2]
Salida: data/geomechanics/earth.json (se fusiona capa por capa; correr una capa no borra las otras).
No inventa: si una capa no cubre la ventana, el campo queda null con el motivo.
"""
import argparse, json, math, sys, time, urllib.request, urllib.parse
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from rasterio.enums import Resampling

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/geomechanics/earth.json'
STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1'
GDAL_ENV = dict(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', GDAL_HTTP_MAX_RETRY='4', GDAL_HTTP_RETRY_DELAY='2',
                CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif,.TIF,.vrt,.flt,.hdr', GDAL_HTTP_MULTIRANGE='YES',
                VSI_CACHE='TRUE', GDAL_CACHEMAX=512,
                GDAL_VRT_RAWRASTERBAND_ALLOWED_SOURCE='ALL')  # solo lo usa el VRT del PZI (binario plano remoto)
R_EARTH = 6371000.0

# ---------------------------------------------------------------- utilidades

def candidates():
    """Las mismas ventanas que ve la app: catálogo de comparación + regiones de descubrimiento."""
    out = {}
    for path in [ROOT / 'data/compare/index.json', *sorted((ROOT / 'data/discovery').rglob('pilot.json'))]:
        for p in json.loads(path.read_text(encoding='utf-8'))['items']:
            if p.get('body') == 'luna':
                continue
            out[p['id']] = dict(id=p['id'], name=p.get('name', p['id']), lat=p['lat'], lon=p['lon'])
    return list(out.values())

def bbox(lat, lon):
    dlat = math.degrees(10000 / R_EARTH); dlon = dlat / math.cos(math.radians(lat))
    return (lon - dlon, lat - dlat, lon + dlon, lat + dlat)

def http_json(url, data=None):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                         headers={'Content-Type': 'application/json', 'User-Agent': 'terralunar-pipeline'})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:  # red inestable o 429
            if attempt == 5: raise
            print('  reintento', attempt + 1, e, flush=True); time.sleep(3 * (attempt + 1))

_tokens = {}
def sign(href, collection=None):
    """Token SAS por cuenta/contenedor de Azure (algunas colecciones, como MODIS, viven en otra cuenta)."""
    u = urllib.parse.urlparse(href)
    key = u.netloc.split('.')[0] + '/' + u.path.strip('/').split('/')[0]
    tok = _tokens.get(key)
    if not tok or tok[1] < time.time():
        t = http_json(f'{STAC.replace("/stac/v1", "/sas/v1")}/token/{key}')
        _tokens[key] = tok = (t['token'], time.time() + 30 * 60)
    return '/vsicurl/' + href + ('&' if '?' in href else '?') + tok[0]

def search(collection, box, datetime_=None, query=None, sortby=None, limit=50):
    body = dict(collections=[collection], bbox=list(box), limit=limit)
    if datetime_: body['datetime'] = datetime_
    if query: body['query'] = query
    if sortby: body['sortby'] = sortby
    return http_json(STAC + '/search', body)['features']

_open = {}
def read_box(url, box, shape=None, resampling=Resampling.nearest):
    """Lee el recuadro lon/lat de un ráster remoto. Devuelve array enmascarado (o None si no se toca).
    Los VRT grandes (SoilGrids, PZI) se dejan abiertos: reabrirlos baja de nuevo su índice de teselas."""
    keep = url.endswith('.vrt')
    ds = _open.get(url) if keep else None
    if ds is None:
        ds = rasterio.open(url)
        if keep: _open[url] = ds
    try:
        b = transform_bounds('EPSG:4326', ds.crs, *box, densify_pts=21) if ds.crs and ds.crs.to_epsg() != 4326 else box
        w = from_bounds(*b, ds.transform)
        if w.col_off + w.width <= 0 or w.row_off + w.height <= 0 or w.col_off >= ds.width or w.row_off >= ds.height:
            return None
        kw = dict(window=w, masked=True, boundless=True, fill_value=ds.nodata if ds.nodata is not None else 0)
        if shape: kw.update(out_shape=shape, resampling=resampling)
        return ds.read(1, **kw)
    finally:
        if not keep: ds.close()

def stats(a, nd=3):
    v = np.asarray(a.compressed() if np.ma.isMaskedArray(a) else a[np.isfinite(a)], dtype=float)
    if not v.size: return None
    return [round(float(x), nd) for x in np.percentile(v, [10, 50, 90])]

# ---------------------------------------------------------------- capas

def layer_soil(c):
    """SoilGrids 2.0: bdod en cg/cm³ -> g/cm³. 0 o nodata = sin predicción (roca, hielo, agua, urbano)."""
    box, out = bbox(c['lat'], c['lon']), {}
    if box[1] < -60:  # el WCS responde 400 al sur de 60° S
        return dict(covered=False, reason='SoilGrids 2.0 no cubre la Antártida.')
    for d in ['0-5cm', '5-15cm', '15-30cm', '30-60cm']:
        url = ('https://maps.isric.org/mapserv?map=/map/bdod.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage'
               f'&COVERAGEID=bdod_{d}_mean&FORMAT=image/tiff&SUBSET=long({box[0]:.5f},{box[2]:.5f})&SUBSET=lat({box[1]:.5f},{box[3]:.5f})'
               '&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326')
        raw = None
        for attempt in range(4):
            try: raw = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'terralunar-pipeline'}), timeout=90).read(); break
            except Exception as e:
                if attempt == 3: raise
                time.sleep(5 * (attempt + 1))
        from rasterio.io import MemoryFile
        with MemoryFile(raw) as mf, mf.open() as ds: a = np.ma.masked_array(ds.read(1))
        a = np.ma.masked_less_equal(a.astype(float), 0) / 100.0
        out[d] = dict(g_cm3=stats(a, 2), valid=round(float(1 - np.ma.getmaskarray(a).mean()), 3))
    return dict(product='SoilGrids 2.0 bdod (mean, 250 m)', url='https://maps.isric.org/ (WCS bdod)',
                citation='Poggio et al. 2021, SOIL 7:217-240, doi:10.5194/soil-7-217-2021', depths=out)

# Binario plano de 3,1 GB (cabecera PZI.hdr: 43200 x 18000, xll -180, yll -60, celda 0.008333, float32 LSB).
# Se lee por rangos HTTP con un VRT "raw" que replica esa cabecera: no se baja el archivo entero.
PZI_HDR = dict(ncols=43200, nrows=18000, xll=-180.0, yll=-60.0, cell=0.008333)
def _pzi_vrt():
    import tempfile
    h = PZI_HDR; top = h['yll'] + h['nrows'] * h['cell']
    xml = f'''<VRTDataset rasterXSize="{h['ncols']}" rasterYSize="{h['nrows']}">
  <SRS>EPSG:4326</SRS><GeoTransform>{h['xll']}, {h['cell']}, 0, {top}, 0, -{h['cell']}</GeoTransform>
  <VRTRasterBand dataType="Float32" band="1" subClass="VRTRawRasterBand"><NoDataValue>-9999</NoDataValue>
    <SourceFilename relativetoVRT="0">/vsicurl/https://microsite.geo.uzh.ch/cryodata/pf_global/PZI.flt</SourceFilename>
    <ImageOffset>0</ImageOffset><PixelOffset>4</PixelOffset><LineOffset>{4 * h['ncols']}</LineOffset><ByteOrder>LSB</ByteOrder>
  </VRTRasterBand></VRTDataset>'''
    p = Path(tempfile.gettempdir()) / 'terralunar_pzi.vrt'; p.write_text(xml, encoding='utf-8'); return str(p)
PZI_URL = None
def layer_pzi(c):
    global PZI_URL
    PZI_URL = PZI_URL or _pzi_vrt()
    box = bbox(c['lat'], c['lon'])
    if box[1] < -60:
        return dict(covered=False, reason='El PZI cubre solo al norte de 60° S (no incluye la Antártida).')
    a = read_box(PZI_URL, box)
    if a is None: return dict(covered=False, reason='Fuera del ráster PZI.')
    a = np.ma.masked_less(a.astype(float), 0)
    v = a.compressed()
    return dict(covered=True, product='Global Permafrost Zonation Index (Gruber 2012), 30″ (~1 km)',
                url='https://microsite.geo.uzh.ch/cryodata/pf_global/', citation='Gruber 2012, The Cryosphere 6:221-233, doi:10.5194/tc-6-221-2012',
                mean=round(float(v.mean()), 3) if v.size else None, max=round(float(v.max()), 3) if v.size else None,
                frac_ge_01=round(float((v >= .1).mean()), 3) if v.size else None,
                frac_ge_05=round(float((v >= .5).mean()), 3) if v.size else None,
                frac_ge_09=round(float((v >= .9).mean()), 3) if v.size else None, pixels=int(v.size))

def dem_mosaic(box):
    lat = (box[1] + box[3]) / 2
    coll, asset = ('nasadem', 'elevation') if -56 <= box[1] and box[3] <= 60 else ('cop-dem-glo-30', 'data')
    items = search(coll, box)
    if not items: return None, coll
    from rasterio.merge import merge
    srcs = [rasterio.open(sign(it['assets'][asset]['href'], coll)) for it in items]
    try:
        arr, tr = merge(srcs, bounds=box, nodata=-32768)
    finally:
        for s in srcs: s.close()
    z = arr[0].astype(float); z[z <= -1000] = np.nan
    z[z == 0] = np.nan  # mar: ambos DEM lo rellenan con cota 0 exacta; no es planicie medible
    return (z, tr), coll

def layer_dem(c):
    """Pendiente a 30 m y 'refugio': píxeles de flanco con desnivel local (ventana 7x7 ≈ 210 m) dentro del rango."""
    from numpy.lib.stride_tricks import sliding_window_view
    from scipy import ndimage
    box = bbox(c['lat'], c['lon'])
    got, coll = dem_mosaic(box)
    if got is None: return dict(covered=False, reason=f'Sin teselas {coll} para la ventana.')
    z, tr = got
    dx = abs(tr.a) * 111320 * math.cos(math.radians(c['lat'])); dy = abs(tr.e) * 110540
    gy, gx = np.gradient(z, dy, dx)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    pad = np.pad(z, 3, mode='edge'); win = sliding_window_view(pad, (7, 7))
    relief = np.nanmax(win, axis=(2, 3)) - np.nanmin(win, axis=(2, 3))
    ok = np.isfinite(slope) & np.isfinite(relief)
    n = int(ok.sum())
    if n < .5 * z.size: return dict(covered=False, reason=f'{coll}: menos del 50 % de píxeles válidos.')
    s, r = slope[ok], relief[ok]
    def frac(m): return round(float(m.sum() / n), 4)
    flat5 = (slope < 5) & ok
    lab, k = ndimage.label(flat5)
    px_km2 = dx * dy / 1e6
    largest = float(np.bincount(lab.ravel())[1:].max() * px_km2) if k else 0.0
    return dict(covered=True, product='NASADEM HGT v001 (NASA/JPL), 1″' if coll == 'nasadem' else 'Copernicus DEM GLO-30 (ESA/Airbus), 1″',
                collection=coll, pixel_m=[round(dx, 1), round(dy, 1)], valid=round(n / z.size, 3),
                altitude_m=stats(z[np.isfinite(z)], 0), slope_deg=stats(s, 1),
                frac_slope_lt5=frac(s < 5), frac_slope_lt15=frac(s < 15), frac_slope_gt25=frac(s > 25),
                largest_flat5_km2=round(largest, 1),
                # Refugio Luna (Mons Mouton): desnivel 10-50 m y flanco 15-30°.
                refuge_moon_frac=frac((r >= 10) & (r <= 50) & (s >= 15) & (s <= 30)),
                # Refugio Marte (Arcadia): desnivel 2-15 m y flanco 5-20°.
                refuge_mars_frac=frac((r >= 2) & (r <= 15) & (s >= 5) & (s <= 20)),
                relief_window_m=round(7 * (dx + dy) / 2))

def s2_scale(item):
    base = str(item['properties'].get('s2:processing_baseline', '0'))
    return -1000 if base >= '04.00' else 0

def layer_s2(c):
    """NIR (B08) y NDVI de la escena más limpia; SCL descarta nubes, sombras, nieve y agua para el NIR del suelo."""
    box = bbox(c['lat'], c['lon']); shape = (200, 200)  # 100 m
    items = search('sentinel-2-l2a', box, '2024-01-01T00:00:00Z/2026-11-14T23:59:59Z',
                   query={'eo:cloud_cover': {'lt': 10}}, sortby=[{'field': 'eo:cloud_cover', 'direction': 'asc'}], limit=20)
    best = None
    for it in items[:6]:
        try:
            scl = read_box(sign(it['assets']['SCL']['href'], 'sentinel-2-l2a'), box, shape)
            if scl is None: continue
            scl = np.ma.filled(scl, 0)
            land = np.isin(scl, [4, 5, 7])  # vegetación, suelo desnudo, sin clasificar
            cov = float((scl > 0).mean())
            if best is None or land.mean() > best[1].mean():
                best = (it, land, scl, cov)
            if land.mean() >= .85: break
        except Exception as e:
            print('  s2 escena falló', it['id'], e, flush=True)
    if best is None or best[1].mean() < .3:
        return dict(covered=False, reason='Sin escena Sentinel-2 2024-2026 con < 10 % de nubes y ≥ 30 % de suelo despejado.')
    it, land, scl, cov = best
    off = s2_scale(it)
    def refl(b):
        a = read_box(sign(it['assets'][b]['href'], 'sentinel-2-l2a'), box, shape, Resampling.average)
        return (np.ma.filled(a, 0).astype(float) + off) / 10000.0
    nir, red = refl('B08'), refl('B04')
    ndvi = np.where(nir + red > 0, (nir - red) / np.maximum(nir + red, 1e-6), np.nan)
    m = land & np.isfinite(ndvi)
    n_ = int(m.sum())
    return dict(covered=True, product='Sentinel-2 L2A (ESA Copernicus), B08/B04/SCL leídos a 100 m', scene=it['id'],
                date=it['properties']['datetime'][:10], cloud=it['properties'].get('eo:cloud_cover'), boa_offset=off,
                land_frac=round(float(m.mean()), 3), water_frac=round(float((scl == 6).mean()), 3),
                snow_frac=round(float((scl == 11).mean()), 3), scene_coverage=round(cov, 3),
                nir=stats(nir[m]), ndvi=stats(ndvi[m]),
                frac_moon_nir=round(float(((nir >= .25) & (nir <= .40) & (ndvi < .05) & m).sum() / max(n_, 1)), 3),
                frac_mars_nir=round(float(((nir >= .15) & (nir <= .30) & (ndvi < .05) & m).sum() / max(n_, 1)), 3),
                frac_ndvi_gt04=round(float(((ndvi > .4) & m).sum() / max(n_, 1)), 3))

# Un compuesto de 8 días por mes (día del año del inicio: 1, 33, 57, ...; MOD11A2 arranca cada 8 días).
MODIS_YEAR = 2024  # 2025 tiene un hueco jul-nov en Planetary Computer (consultado 2026-11-15)
MODIS_DOYS = [1, 33, 57, 89, 121, 153, 185, 217, 249, 281, 305, 337]
SIN_R, TILE = 6371007.181, 1111950.5197665
def modis_tiles(box):
    out = set()
    for lon in (box[0], box[2]):
        for lat in (box[1], box[3]):
            x = SIN_R * math.radians(lon) * math.cos(math.radians(lat)); y = SIN_R * math.radians(lat)
            out.add((int((x + 18 * TILE) // TILE), int((9 * TILE - y) // TILE)))
    return sorted(out)

_modis_items, _modis_tiles = {}, {}
def modis_item(h, v, doy):
    key = (h, v, doy)
    if key not in _modis_items:
        # Búsqueda por punto central de la tesela, filtrada por h/v; solo Terra (pasada fija ~10:30 / ~22:30).
        y = 9 * TILE - (v + .5) * TILE; lat = math.degrees(y / SIN_R)
        x = (h + .5) * TILE - 18 * TILE; lon = math.degrees(x / (SIN_R * max(math.cos(math.radians(lat)), .05)))
        lon = max(-179.9, min(179.9, lon))
        d = datetime(MODIS_YEAR, 1, 1).toordinal() + doy - 1; day = datetime.fromordinal(d).date().isoformat()
        feats = search('modis-11A2-061', (lon - .01, lat - .01, lon + .01, lat + .01), f'{day}T00:00:00Z/{day}T23:59:59Z', limit=10)
        feats = [f for f in feats if f['id'].startswith(f'MOD11A2.A{MODIS_YEAR}{doy:03d}.h{h:02d}v{v:02d}.')]
        _modis_items[key] = feats[0] if feats else None
    return _modis_items[key]

def modis_tile(item, band):
    key = (item['id'], band)
    if key not in _modis_tiles:
        if len(_modis_tiles) > 60: _modis_tiles.pop(next(iter(_modis_tiles)))
        with rasterio.open(sign(item['assets'][band]['href'])) as ds:
            _modis_tiles[key] = (ds.read(1), ds.transform, ds.crs)
    return _modis_tiles[key]

def layer_modis(c):
    """MOD11A2 (Terra): 12 compuestos de 8 días de 2024, uno por mes. Día ~10:30 y noche ~22:30 hora solar local."""
    box = bbox(c['lat'], c['lon'])
    rows = []
    for doy in MODIS_DOYS:
        day, night, start = [], [], None
        for h, v in modis_tiles(box):
            it = modis_item(h, v, doy)
            if not it: continue
            start = it['properties']['start_datetime'][:10]
            for band, acc in [('LST_Day_1km', day), ('LST_Night_1km', night)]:
                arr, tr, crs = modis_tile(it, band)
                b = transform_bounds('EPSG:4326', crs, *box, densify_pts=21)
                w = from_bounds(*b, tr).round_offsets().round_lengths()
                r0, c0 = max(0, w.row_off), max(0, w.col_off)
                a = arr[r0:w.row_off + w.height, c0:w.col_off + w.width]
                acc.extend((a[a > 0].astype(float) * .02).tolist())  # escala 0,02 K; 0 = sin dato (nubes, noche polar)
        rows.append(dict(start=start, day_k=round(float(np.median(day)), 2) if len(day) >= 20 else None,
                         night_k=round(float(np.median(night)), 2) if len(night) >= 20 else None, n_day=len(day), n_night=len(night)))
    pairs = [r['day_k'] - r['night_k'] for r in rows if r['day_k'] and r['night_k']]
    days = [r['day_k'] for r in rows if r['day_k']]; nights = [r['night_k'] for r in rows if r['night_k']]
    return dict(product='MODIS MOD11A2.061 (NASA LP DAAC), LST 8 días, 1 km', year=MODIS_YEAR, composites=rows,
                diurnal_c=dict(median=round(float(np.median(pairs)), 1), max=round(float(max(pairs)), 1), months=len(pairs)) if pairs else None,
                seasonal_c=round(float(max(days) - min(nights)), 1) if days and nights else None,
                min_c=round(min(nights) - 273.15, 1) if nights else None, max_c=round(max(days) - 273.15, 1) if days else None)

def layer_wc(c):
    box = bbox(c['lat'], c['lon'])
    items = search('esa-worldcover', box, query={'esa_worldcover:product_version': {'eq': '2.0.0'}})
    if not items: return dict(covered=False, reason='Sin teselas WorldCover 2021.')
    acc = None
    for it in items:
        a = read_box(sign(it['assets']['map']['href'], 'esa-worldcover'), box, (200, 200))
        if a is None: continue
        a = np.ma.filled(a, 0)
        acc = a if acc is None else np.where(acc > 0, acc, a)
    if acc is None: return dict(covered=False, reason='Sin teselas WorldCover 2021.')
    valid = acc > 0; n = int(valid.sum())
    f = lambda code: round(float((acc == code).sum() / max(n, 1)), 4)
    return dict(covered=True, product='ESA WorldCover 2021 v200 (10 m, leído a 100 m)', valid=round(n / acc.size, 3),
                tree=f(10), shrub=f(20), grass=f(30), crop=f(40), built=f(50), bare=f(60), snow_ice=f(70), water=f(80), wetland=f(90))

LAYERS = dict(soil=layer_soil, pzi=layer_pzi, dem=layer_dem, s2=layer_s2, modis=layer_modis, wc=layer_wc)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--layers', default='soil,pzi,dem,s2,modis,wc'); ap.add_argument('--only', default='')
    ap.add_argument('--out', default=str(OUT), help='otro archivo para correr capas en paralelo; luego --merge')
    ap.add_argument('--merge', nargs='*', default=[], help='fusiona estos archivos parciales en data/geomechanics/earth.json')
    ap.add_argument('--shard', default='0/1', help='i/n: procesa solo una de n partes (para correr en paralelo)')
    ap.add_argument('--resume', action='store_true', help='saltea ventanas que ya tienen la capa en --out')
    args = ap.parse_args()
    if args.merge: return merge(args.merge)
    out = Path(args.out)
    layers = [l for l in args.layers.split(',') if l]
    for l in layers:
        if l not in LAYERS: raise SystemExit('Capa desconocida: ' + l)
    data = json.loads(out.read_text(encoding='utf-8')) if out.exists() else dict(version='geomechanics-earth/1', items={})
    cands = candidates()
    if args.only: cands = [c for c in cands if c['id'] in set(args.only.split(','))]
    si, sn = map(int, args.shard.split('/')); cands = cands[si * len(cands) // sn:(si + 1) * len(cands) // sn]
    with rasterio.Env(**GDAL_ENV):
        for layer in layers:
            t0 = time.time(); ok = 0
            for i, c in enumerate(cands):
                rec = data['items'].setdefault(c['id'], dict(id=c['id'], name=c['name'], lat=c['lat'], lon=c['lon']))
                if args.resume and isinstance(rec.get(layer), dict) and not str(rec[layer].get('reason', '')).startswith('Error'): continue
                try:
                    rec[layer] = LAYERS[layer](c); ok += 1
                except Exception as e:
                    rec[layer] = dict(covered=False, reason=f'Error de lectura: {type(e).__name__}: {str(e)[:160]}')
                print(f'[{layer}] {i + 1}/{len(cands)} {c["id"]}: {json.dumps(rec[layer], ensure_ascii=False)[:160]}', flush=True)
                if (i + 1) % 10 == 0: save(data, out)
            data.setdefault('runs', {})[layer] = dict(utc=datetime.now(timezone.utc).isoformat(timespec='seconds'), ok=ok, n=len(cands), seconds=round(time.time() - t0))
            save(data, out)

def merge(paths):
    data = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else dict(version='geomechanics-earth/1', items={})
    for p in paths:
        part = json.loads(Path(p).read_text(encoding='utf-8'))
        for k, rec in part['items'].items():
            data['items'].setdefault(k, {}).update(rec)
        data.setdefault('runs', {}).update(part.get('runs', {}))
    save(data, OUT)

def save(data, path=OUT):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
