"""Íconos de la portada: Luna y Marte vistos desde el espacio, dibujados con datos NASA reales.

Luna: mosaico LRO LROC (data/moon/globe_color.jpg, de 05_moon_globe.py).
Marte: relieve MOLA MEGDR (data/mars/mola32-*.dat), sombreado en tono terracota.
Salida: data/landing/moon.png y data/landing/mars.png (192 x 192, fondo transparente).
Uso: python pipeline/06_landing_icons.py
"""
import gzip
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "landing"
S = 192  # px


def disk(lat0, lon0):
    """lat/lon de cada píxel de una esfera vista de frente (proyección ortográfica) + máscara del disco."""
    y, x = np.mgrid[0:S, 0:S]
    u, v = (x + 0.5) / S * 2 - 1, 1 - (y + 0.5) / S * 2
    r2 = u * u + v * v
    inside = r2 <= 1
    w = np.sqrt(np.clip(1 - r2, 0, 1))
    p0, l0 = np.radians(lat0), np.radians(lon0)
    lat = np.arcsin(np.clip(v * np.cos(p0) + w * np.sin(p0), -1, 1))
    lon = l0 + np.arctan2(u, w * np.cos(p0) - v * np.sin(p0))
    shade = np.clip(0.35 + 0.75 * (w * 0.8 - u * 0.35 + v * 0.25), 0, 1.1)  # luz desde arriba a la izquierda
    return np.degrees(lat), (np.degrees(lon) + 180) % 360 - 180, inside, shade


def save(rgb, inside, name):
    alpha = (inside * 255).astype(np.uint8)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])).save(OUT / name, optimize=True)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)

    # Luna: mosaico equirectangular (izquierda = -180°); vista hacia el polo sur (lat -35°) para mostrar la región Artemis
    tex = np.asarray(Image.open(ROOT / "data" / "moon" / "globe_color.jpg").convert("RGB"), dtype=np.float32)
    lat, lon, inside, shade = disk(-35, 20)
    h, w = tex.shape[:2]
    px = ((lon + 180) / 360 * w).astype(int) % w
    py = np.clip(((90 - lat) / 180 * h).astype(int), 0, h - 1)
    save(tex[py, px] * shade[..., None] * 1.15, inside, "moon.png")

    # Marte: MOLA 32 px/° en 16 franjas big-endian (11520 x 360 c/u); vista sobre Valles Marineris
    grid = np.concatenate([np.frombuffer(gzip.open(ROOT / "data" / "mars" / f"mola32-{b}.dat").read(), dtype=">i2").reshape(360, 11520)
                           for b in range(16)])
    assert grid.shape == (5760, 11520)
    lat, lon, inside, shade = disk(-10, -70)
    gx = ((lon % 360) * 32).astype(int) % 11520  # MOLA: columna 0 = 0° E
    gy = np.clip(((90 - lat) * 32).astype(int), 0, 5759)
    z = grid[gy, gx].astype(np.float32)
    dzx, dzy = np.gradient(np.where(inside, z, np.nan))
    relief = np.nan_to_num(np.clip(1 - (dzx * 0.0012 - dzy * 0.0012), 0.8, 1.2), nan=1)  # sombreado del relieve
    tone = np.clip((z - z[inside].min()) / np.ptp(z[inside]), 0, 1)[..., None]
    base = np.array([150, 72, 46]) * (1 - tone) + np.array([214, 143, 101]) * tone  # bajo = óxido oscuro, alto = claro
    save(base * (shade * relief)[..., None], inside, "mars.png")
    print("íconos -> data/landing/moon.png, mars.png")
