"""Validación con sitios reservados (CLAUDE.md: "nunca se recorta").

Mide el relieve de los análogos USGS (división fit/test ya fijada en known_analogs.geojson por hash del nombre,
ANTES de calcular) y de un fondo de puntos de tierra al azar, con el MISMO muestreo que los candidatos
(05_discovery.py: AWS Terrain Tiles z10, ventana de 20 km, muestras de 200 m -> medias de 2 km, 10x10).
La web puntúa todo en vivo con el mismo motor del ranking y compara:
  % de análogos test por encima del percentil 90 del fondo al azar  (azar puro = ~10 %).

python pipeline/12_validation.py [--background 300] [--seed 20261115]
Salida: data/validation/usgs-holdout.json
"""
import argparse, hashlib, io, json, math, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
R = 6371008.8
Z = 10
CACHE = ROOT / 'pipeline/raw/discovery'
_tiles = {}

def tile(tx, ty):
    key = (int(tx), int(ty))
    if key not in _tiles:
        path = CACHE / f'{Z}_{key[0]}_{key[1]}.png'
        if not path.exists():
            url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{key[0]}/{key[1]}.png'
            for attempt in range(3):
                try:
                    raw = urllib.request.urlopen(url, timeout=25).read(); Image.open(io.BytesIO(raw)).load()
                    path.write_bytes(raw); break
                except Exception:
                    if attempt == 2: raise
                    time.sleep(2)
        rgb = np.asarray(Image.open(path).convert('RGB'), dtype=float)
        _tiles[key] = rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768
    return _tiles[key]

def sample(lon, lat):
    """Igual que 05_discovery.py: interpolación bilineal sobre teselas Web Mercator z10."""
    scale = 256 * 2 ** Z
    px = (lon + 180) / 360 * scale - .5
    py = (1 - np.arcsinh(np.tan(np.radians(lat))) / np.pi) / 2 * scale - .5
    x = np.floor(px).astype(int); y = np.floor(py).astype(int); fx = px - x; fy = py - y
    def at(xx, yy):
        out = np.empty(xx.shape)
        xx = xx % scale  # cruce del antimeridiano
        for tx, ty in set(zip((xx // 256).ravel(), (yy // 256).ravel())):
            m = (xx // 256 == tx) & (yy // 256 == ty); out[m] = tile(tx, ty)[yy[m] % 256, xx[m] % 256]
        return out
    return at(x, y) * (1 - fx) * (1 - fy) + at(x + 1, y) * fx * (1 - fy) + at(x, y + 1) * (1 - fx) * fy + at(x + 1, y + 1) * fx * fy

def window(lon0, lat0):
    """Ventana de 20 km centrada en (lon0, lat0): 100x100 muestras de 200 m -> 10x10 medias de 2 km."""
    xx, yy = np.meshgrid(-10000 + (np.arange(100) + .5) * 200, 10000 - (np.arange(100) + .5) * 200)
    lon = lon0 + np.degrees(xx / (R * math.cos(math.radians(lat0)))); lat = lat0 + np.degrees(yy / R)
    h = sample(lon, lat)
    if not np.isfinite(h).all() or np.any(h <= -32767): raise ValueError('NoData')
    return h, h.reshape(10, 10, 10, 10).mean(axis=(1, 3))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--background', type=int, default=300); ap.add_argument('--seed', type=int, default=20261115)
    a = ap.parse_args(); CACHE.mkdir(parents=True, exist_ok=True); t0 = time.time()
    gj = json.loads((ROOT / 'data/known_analogs.geojson').read_text(encoding='utf-8'))
    sites, failures = [], []
    for f in gj['features']:
        lon, lat = f['geometry']['coordinates'][:2]; p = f['properties']
        if abs(lat) > 84: failures.append({'name': p['name'], 'error': 'fuera de Web Mercator'}); continue
        try:
            fine, coarse = window(lon, lat)
            sites.append(dict(name=p['name'], split=p['split'], type=p.get('analog_type', ''), lon=lon, lat=lat,
                              land=round(float((fine > 0).mean()), 3), heights=[round(float(v), 1) for v in coarse.ravel()]))
            print('sitio', p['name'], 'OK', flush=True)
        except Exception as e:
            failures.append({'name': p['name'], 'error': str(e)})
    # Fondo: puntos uniformes en área sobre la Tierra entre 56° S y 60° N (cobertura de los candidatos),
    # aceptados solo si la ventana es tierra (≥ 90 % de las muestras sobre el nivel del mar).
    rng = np.random.default_rng(a.seed); background = []; tries = 0
    lo, hi = math.sin(math.radians(-56)), math.sin(math.radians(60))
    while len(background) < a.background and tries < a.background * 20:
        tries += 1
        lat = math.degrees(math.asin(rng.uniform(lo, hi))); lon = rng.uniform(-180, 180)
        if sample(np.array([lon]), np.array([lat]))[0] <= 0: continue  # descarte rápido: mar en el centro
        try: fine, coarse = window(lon, lat)
        except Exception: continue
        if (fine > 0).mean() < .9: continue
        background.append(dict(lon=round(lon, 4), lat=round(lat, 4), heights=[round(float(v), 1) for v in coarse.ravel()]))
        print('fondo', len(background), flush=True)
    out = dict(version='validation-holdout/1', generated_utc=datetime.now(timezone.utc).isoformat(timespec='seconds'),
               method='Análogos USGS (fit/test fijado por hash del nombre antes de calcular) y fondo de tierra al azar, medidos igual que los candidatos: AWS Terrain Tiles z10, ventana 20 km, 200 m -> 2 km.',
               source='USGS Known Terrestrial Analog Sites (doi:10.5066/P9J72921); AWS Terrain Tiles (Mapzen, incl. NASA SRTM)',
               seed=a.seed, background_tries=tries, cell_m=2000, window_km=20, sites=sites, background=background, failures=failures,
               elapsed_s=round(time.time() - t0))
    dest = ROOT / 'data/validation/usgs-holdout.json'; dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in out.items()}, ensure_ascii=False))

if __name__ == '__main__':
    main()
