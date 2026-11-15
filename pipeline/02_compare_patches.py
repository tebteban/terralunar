"""Recortes de relieve Luna vs Tierra, del MISMO tamaño (20 x 20 km) y resolución (80 m), para el comparador 3D.

Luna:  LOLA GDR polar `ldem_80s_80m_float.img` (NASA PDS Geosciences), bajar a pipeline/raw/lola/ con su .lbl.
Tierra: AWS Terrain Tiles (terrarium, z12 ~38 m, incluye NASA SRTM), remuestreado a 80 m.
        shortcut: fuente visual; pasar a NASADEM/Copernicus cuando el pipeline los tenga.
Salida: data/compare/index.json + un .bin por recorte (Uint16 little-endian, metros sobre el mínimo del recorte).
Uso: python pipeline/02_compare_patches.py
"""
import io
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "compare"
LOLA = ROOT / "pipeline" / "raw" / "lola" / "ldem_80s_80m_float.img"
SIZE_KM, RES_M = 20, 80
N = SIZE_KM * 1000 // RES_M  # 250 celdas por lado

# Sitios lunares: centro del accidente según el nomenclátor IAU (no es el polígono de aterrizaje de NASA),
# salvo Nobile Rim 2, que es el punto óptimo propuesto en un estudio publicado.
MOON_SITES = [
    {"id": "luna-mons-mouton", "name": "Mons Mouton (meseta)", "lat": -84.6, "lon": 31.0,
     "ref": "IAU Gazetteer of Planetary Nomenclature, Feature 16070", "url": "https://planetarynames.wr.usgs.gov/Feature/16070"},
    {"id": "luna-mons-malapert", "name": "Mons Malapert (macizo)", "lat": -85.98, "lon": 358.33,
     "ref": "IAU Gazetteer of Planetary Nomenclature, Feature 16338", "url": "https://planetarynames.wr.usgs.gov/Feature/16338"},
    {"id": "luna-nobile-rim-2", "name": "Nobile Rim 2 (punto óptimo de un estudio)", "lat": -84.20156, "lon": 60.69989,
     "ref": "Estudio MCDM de sitios Artemis III (ResearchGate 385942633)",
     "url": "https://www.researchgate.net/publication/385942633_Evaluating_potential_landing_sites_for_the_Artemis_III_mission_using_a_multi-criteria_decision_making_approach"},
]


# ---------- Luna: LOLA polar estereográfica (esfera R = 1737.4 km, polo sur, 7600 x 7600, 80 m/px) ----------
R_MOON, LOLA_N, LOLA_OFF = 1737400.0, 7600, 3799.5


def lola_pixel(lat, lon):
    rho = 2 * R_MOON * math.tan(math.pi / 4 + math.radians(lat) / 2)
    x, y = rho * math.sin(math.radians(lon)), rho * math.cos(math.radians(lon))
    return LOLA_OFF - y / RES_M, LOLA_OFF + x / RES_M  # (línea, muestra); orientación verificada con Shackleton


def moon_patch(grid, lat, lon):
    line, sample = lola_pixel(lat, lon)
    l0, s0 = int(round(line)) - N // 2, int(round(sample)) - N // 2
    assert 0 <= l0 and l0 + N <= LOLA_N and 0 <= s0 and s0 + N <= LOLA_N, "fuera de la grilla LOLA"
    return grid[l0:l0 + N, s0:s0 + N].astype(np.float64) * 1000.0  # km -> m


# ---------- Tierra: tiles terrarium en Web Mercator ----------
Z = 12
_tiles: dict = {}


def tile(x, y):
    if (x, y) not in _tiles:
        cache = ROOT / "pipeline" / "raw" / "terrarium" / f"{Z}_{x}_{y}.png"
        if not cache.exists():
            cache.parent.mkdir(parents=True, exist_ok=True)
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"
            cache.write_bytes(urllib.request.urlopen(url, timeout=60).read())
        rgb = np.asarray(Image.open(cache).convert("RGB"), dtype=np.float64)
        _tiles[(x, y)] = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
    return _tiles[(x, y)]


def earth_patch(lat0, lon0):
    off = (np.arange(N) - (N - 1) / 2) * RES_M
    dy, dx = np.meshgrid(-off, off, indexing="ij")  # fila 0 = norte
    lat = lat0 + dy / 111320.0
    lon = lon0 + dx / (111320.0 * math.cos(math.radians(lat0)))
    n = 2 ** Z * 256
    px = (lon + 180) / 360 * n
    py = (1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / math.pi) / 2 * n
    x0, y0 = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - x0, py - y0

    def at(xx, yy):
        out = np.empty(xx.shape)
        for (tx, ty) in {(a, b) for a, b in zip((xx // 256).ravel(), (yy // 256).ravel())}:
            m = (xx // 256 == tx) & (yy // 256 == ty)
            out[m] = tile(tx, ty)[yy[m] % 256, xx[m] % 256]
        return out

    z = (at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy)
         + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy)
    # shortcut: "mar" = más de 150 m bajo el nivel del mar (deja tierra baja como Death Valley, -86 m);
    # con NASADEM usar su máscara de agua
    sea = z < -150
    return np.where(sea, 0, z), float(sea.mean())


# ---------- Métricas (mismo método en ambos cuerpos) ----------
def box_mean(a, k=5):
    p = np.pad(a, k // 2, mode="edge")
    c = np.cumsum(np.cumsum(np.pad(p, ((1, 0), (1, 0))), 0), 1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def metrics(z):
    gy, gx = np.gradient(z, RES_M)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    # quita la tendencia local en ventanas de 400 m; sin el borde de 2 celdas, donde el promedio queda sesgado
    resid = (z - box_mean(z, 5))[2:-2, 2:-2]
    return {
        "pendiente_mediana": round(float(np.median(slope)), 1),
        "pendiente_p90": round(float(np.percentile(slope, 90)), 1),
        "rugosidad_m": round(float(resid.std()), 1),
        "desnivel_m": round(float(z.max() - z.min()), 0),
    }


def save(pid, z):
    zmin = float(z.min())
    rel = np.clip(np.round(z - zmin), 0, 65535).astype("<u2")
    (OUT / f"{pid}.bin").write_bytes(rel.tobytes())
    return zmin


def selftest():
    # plano inclinado 10 %: pendiente ~5.7° y rugosidad ~0 (prueba técnica que pide el Brief)
    x = np.arange(N) * RES_M
    m = metrics(np.tile(x * 0.1, (N, 1)))
    assert abs(m["pendiente_mediana"] - 5.7) < 0.1 and m["rugosidad_m"] < 0.5, m


if __name__ == "__main__":
    selftest()
    OUT.mkdir(parents=True, exist_ok=True)
    grid = np.memmap(LOLA, dtype="<f4", mode="r", shape=(LOLA_N, LOLA_N))
    # Verificación de orientación: el centro de Shackleton (IAU -89.67, 129.78) debe estar >2 km por debajo de su borde
    sh = moon_patch(grid, -89.67, 129.78)
    assert sh[N // 2, N // 2] < np.percentile(sh, 95) - 2000, "orientación LOLA incorrecta"

    only = set(sys.argv[1:])  # ids a regenerar; sin argumentos, todo
    old = json.loads((OUT / "index.json").read_text(encoding="utf-8"))["items"] if only else []
    items = []
    for s in MOON_SITES:
        if only and s["id"] not in only:
            continue
        z = moon_patch(grid, s["lat"], s["lon"])
        items.append({**s, "body": "luna", "file": f"{s['id']}.bin", "min_m": save(s["id"], z), **metrics(z),
                      "source": "LRO LOLA GDR ldem_80s_80m (NASA PDS)"})
    for zone in json.loads((ROOT / "data" / "earth_sites.json").read_text(encoding="utf-8"))["sites"]:  # nombres y coordenadas reales
        if only and zone["id"] not in only:
            continue
        lon, lat = zone["centroid"]
        z, water = earth_patch(lat, lon)
        items.append({"id": zone["id"], "name": zone["name"], "lat": lat, "lon": lon, "body": "tierra",
                      "file": f"{zone['id']}.bin", "min_m": save(zone["id"], z), "agua": round(water, 2), **metrics(z),
                      "source": "AWS Terrain Tiles z12 (Mapzen; incl. NASA SRTM)"})
        print(zone["id"], items[-1]["pendiente_mediana"], items[-1]["rugosidad_m"])
    new_ids = {i["id"] for i in items}
    items = [i if i["id"] not in new_ids else next(n for n in items if n["id"] == i["id"]) for i in old] +         [i for i in items if i["id"] not in {o["id"] for o in old}] if only else items
    (OUT / "index.json").write_text(json.dumps({"size_km": SIZE_KM, "res_m": RES_M, "n": N, "items": items},
                                               ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} recortes -> data/compare/")
