"""Mapa del polo sur lunar + grilla de métricas de relieve para buscar análogos desde la Luna.

Entrada: LOLA `ldem_80s_80m_float.img` en pipeline/raw/lola/ (ver 02_compare_patches.py).
Salida (data/moon/):
  south_pole_hillshade.jpg  relieve sombreado 1900 x 1900 (320 m/px), estereográfica polar, arriba = lon 0°
  metrics.bin               Uint16 LE [4][W][W]: pendiente mediana x10, p90 x10, rugosidad x10 (m), desnivel (m)
  index.json                geometría de la grilla, escalas, sitios IAU y fuentes
Cada celda de la grilla es una ventana de 20 x 20 km (igual que el comparador), con paso de 4 km.
Uso: python pipeline/03_moon_map.py
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("cp", ROOT / "pipeline" / "02_compare_patches.py")
cp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cp)

OUT = ROOT / "data" / "moon"
BLOCK = 50          # 50 px x 80 m = 4 km (paso de la grilla)
WIN = cp.N // BLOCK  # 5 bloques = 20 km (ventana)
BINS = 180          # histograma de pendiente en pasos de 0.5°

# Accidentes que dan nombre a las regiones candidatas de Artemis III (centros IAU) + Nobile Rim 2 (estudio)
SITES = [
    ("Mons Mouton", -84.6, 31.0, 16070), ("Mons Malapert", -85.98, 358.33, 16338), ("Haworth", -87.45, 354.83, 14502),
    ("Nobile", -85.2752, 53.2725, 4321), ("de Gerlache", -88.4849, 271.6553, 1439), ("Slater", -88.0792, 111.2881, 15325),
    ("Shackleton", -89.67, 129.78, 5450), ("Cabeus B", -82.2587, 305.4154, 8058),
]


def window_sum(blocks):
    """Suma de ventanas de WIN x WIN bloques (tabla de sumas acumuladas)."""
    c = np.cumsum(np.cumsum(np.pad(blocks, ((1, 0), (1, 0)) + ((0, 0),) * (blocks.ndim - 2)), 0), 1)
    return c[WIN:, WIN:] - c[:-WIN, WIN:] - c[WIN:, :-WIN] + c[:-WIN, :-WIN]


def window_max(blocks):
    w = blocks.shape[0] - WIN + 1
    return np.max([blocks[i:i + w, j:j + w] for i in range(WIN) for j in range(WIN)], axis=0)


def percentile_from_hist(h, q):
    c = np.cumsum(h, axis=-1)
    return (np.argmax(c >= q * c[..., -1:], axis=-1) + 0.5) / 2  # centro del bin de 0.5°


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    n, b = cp.LOLA_N, cp.LOLA_N // BLOCK
    z = np.memmap(cp.LOLA, dtype="<f4", mode="r", shape=(n, n)).astype(np.float32) * 1000  # m

    # Relieve sombreado para el mapa (promedio 4 x 4 -> 320 m/px; sol desde el noroeste de la imagen, 35°)
    zs = z.reshape(n // 4, 4, n // 4, 4).mean(axis=(1, 3))
    gy, gx = np.gradient(zs, 320.0)
    az, alt = np.radians(315), np.radians(35)
    slope_s, aspect = np.arctan(2 * np.hypot(gx, gy)), np.arctan2(-gx, gy)  # relieve x2 solo para el dibujo
    shade = np.sin(alt) * np.cos(slope_s) + np.cos(alt) * np.sin(slope_s) * np.cos(az - aspect)
    lo, hi = np.percentile(shade, [1, 99])  # estirar contraste
    Image.fromarray((np.clip((shade - lo) / (hi - lo), 0, 1) * 235 + 10).astype(np.uint8)).save(OUT / "south_pole_hillshade.jpg", quality=85)
    del zs, gy, gx, slope_s, aspect, shade

    # Pendiente: histograma por bloque de 4 km -> mediana y p90 por ventana de 20 km
    gy, gx = np.gradient(z, float(cp.RES_M))
    sbin = np.minimum((np.degrees(np.arctan(np.hypot(gx, gy))) * 2).astype(np.int32), BINS - 1)
    del gx, gy
    bid = (np.arange(n)[:, None] // BLOCK) * b + np.arange(n)[None, :] // BLOCK
    hist = np.bincount((bid * BINS + sbin).ravel(), minlength=b * b * BINS).reshape(b, b, BINS)
    del sbin, bid
    wh = window_sum(hist)
    p50, p90 = percentile_from_hist(wh, 0.5), percentile_from_hist(wh, 0.9)

    # Rugosidad: desvío del residuo tras quitar la media móvil de 400 m (mismo criterio que el comparador)
    resid = (z - cp.box_mean(z.astype(np.float64), 5)).astype(np.float32)
    s1 = resid.reshape(b, BLOCK, b, BLOCK).sum(axis=(1, 3), dtype=np.float64)
    s2 = (resid.astype(np.float64) ** 2).reshape(b, BLOCK, b, BLOCK).sum(axis=(1, 3))
    del resid
    cnt = (WIN * BLOCK) ** 2
    rough = np.sqrt(np.maximum(window_sum(s2) / cnt - (window_sum(s1) / cnt) ** 2, 0))

    # Desnivel: máximo - mínimo por ventana
    zb = z.reshape(b, BLOCK, b, BLOCK)
    relief = window_max(zb.max(axis=(1, 3))) + window_max(-zb.min(axis=(1, 3)))

    grid = np.stack([p50 * 10, p90 * 10, rough * 10, relief])
    (OUT / "metrics.bin").write_bytes(np.clip(np.round(grid), 0, 65535).astype("<u2").tobytes())

    # Autoverificación: la grilla tiene que coincidir con el cálculo exacto del comparador en Mons Mouton
    ref = cp.metrics(cp.moon_patch(np.memmap(cp.LOLA, dtype="<f4", mode="r", shape=(n, n)), -84.6, 31.0))  # espera km
    line, sample = cp.lola_pixel(-84.6, 31.0)
    i, j = round((line - cp.N / 2) / BLOCK), round((sample - cp.N / 2) / BLOCK)
    assert abs(p50[i, j] - ref["pendiente_mediana"]) < 1.0 and abs(p90[i, j] - ref["pendiente_p90"]) < 1.5, (p50[i, j], p90[i, j], ref)

    w = grid.shape[1]
    sites = []
    for name, lat, lon, fid in SITES:
        line, sample = cp.lola_pixel(lat, lon)
        sites.append({"name": name, "lat": lat, "lon": lon, "line": round(line, 1), "sample": round(sample, 1),
                      "ref": f"IAU Gazetteer, Feature {fid}", "url": f"https://planetarynames.wr.usgs.gov/Feature/{fid}"})
    index = {
        "image": "south_pole_hillshade.jpg", "image_px": n // 4, "lola_px": n, "lola_res_m": cp.RES_M,
        "lola_offset": cp.LOLA_OFF, "radius_m": cp.R_MOON,
        "grid": {"file": "metrics.bin", "w": w, "first_center_px": cp.N / 2, "stride_px": BLOCK,
                 "layers": ["pendiente_mediana", "pendiente_p90", "rugosidad_m", "desnivel_m"], "scale": [10, 10, 10, 1]},
        "window_km": cp.SIZE_KM, "stride_km": BLOCK * cp.RES_M / 1000,
        "sites": sites,
        "source": "LRO LOLA GDR ldem_80s_80m_float (NASA PDS Geosciences)",
        "notes": "Pendiente por histograma de 0.5°; rugosidad incluye bordes de ventana. Estereográfica polar: arriba = lon 0°, derecha = lon 90°E.",
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"grilla {w}x{w}; Mons Mouton grilla {p50[i, j]:.1f}/{p90[i, j]:.1f} vs exacto {ref['pendiente_mediana']}/{ref['pendiente_p90']}")
