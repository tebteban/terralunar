"""Texturas livianas para el globo lunar 3D de la web (NASA SVS CGI Moon Kit, dominio público).

Entrada (bajar a pipeline/raw/moon_kit/ desde https://svs.gsfc.nasa.gov/4720):
  lroc_color_poles_4k.tif  mosaico de color LRO LROC WAC, equirectangular 4096 x 2048
  ldem_4.tif               relieve LOLA en km (sobre 1737.4 km), equirectangular 1440 x 720
Salida (data/moon/): globe_color.jpg, globe_height.png (8 bits) y el bloque "globe" en index.json.
Uso: python pipeline/03_moon_map.py && python pipeline/05_moon_globe.py
"""
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "pipeline" / "raw" / "moon_kit"
OUT = ROOT / "data" / "moon"

if __name__ == "__main__":
    Image.MAX_IMAGE_PIXELS = None
    Image.open(RAW / "lroc_color_poles_4k.tif").convert("RGB").save(OUT / "globe_color.jpg", quality=82)
    h = np.asarray(Image.open(RAW / "ldem_4.tif"), dtype=np.float32)  # km
    lo, hi = float(h.min()), float(h.max())
    assert -12 < lo < 0 < hi < 12, (lo, hi)  # rango conocido del relieve lunar (~ -9 a +10 km)
    Image.fromarray(np.round((h - lo) / (hi - lo) * 255).astype(np.uint8)).save(OUT / "globe_height.png", optimize=True)
    # Relieve real del polo sur para la malla 3D: LOLA 80 m promediado a 800 m (bloques de 10 x 10), Int16 en metros
    spec = importlib.util.spec_from_file_location("cp", ROOT / "pipeline" / "02_compare_patches.py")
    cp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cp)
    k = 10
    z = np.memmap(cp.LOLA, dtype="<f4", mode="r", shape=(cp.LOLA_N, cp.LOLA_N))
    cap = z.reshape(cp.LOLA_N // k, k, cp.LOLA_N // k, k).mean(axis=(1, 3)) * 1000
    (OUT / "cap_dem.bin").write_bytes(np.round(cap).astype("<i2").tobytes())

    index = json.loads((OUT / "index.json").read_text(encoding="utf-8"))
    index["globe"] = {
        "cap_dem": "cap_dem.bin", "cap_n": cp.LOLA_N // k, "cap_block": k,
        "color": "globe_color.jpg", "height": "globe_height.png", "height_min_km": round(lo, 3), "height_max_km": round(hi, 3),
        "source": "NASA SVS CGI Moon Kit (LRO LROC WAC color, LOLA ldem_4)", "url": "https://svs.gsfc.nasa.gov/4720",
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"relieve {lo:.2f} a {hi:.2f} km")
