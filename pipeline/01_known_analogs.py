"""Convierte la capa USGS "Known Terrestrial Analog Sites" (shapefile) en data/known_analogs.geojson
con la división fit/test FIJA.

Fuente: Hunter, M.H., 2020, USGS data release, https://doi.org/10.5066/P9J72921 (dominio público).
Bajar TerrestrialAnalogs.shp y .dbf desde ScienceBase (a mano: el sitio frena scripts) a pipeline/raw/usgs_analogs/.
Uso: python pipeline/01_known_analogs.py

División fit/test: por hash del nombre (30 % a test). No depende del orden ni de una semilla y queda
fijada ANTES de calcular cualquier puntaje. No cambiarla después de ver resultados.
Solo librería estándar: el shapefile de puntos es simple de leer.
"""
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "pipeline" / "raw" / "usgs_analogs"
OUT = ROOT / "data" / "known_analogs.geojson"
TEST_SHARE = 3  # de cada 10


def read_points(shp: Path):
    data = shp.read_bytes()
    assert struct.unpack(">i", data[:4])[0] == 9994, "no es un .shp"
    assert struct.unpack("<i", data[32:36])[0] == 1, "se esperaba un shapefile de puntos"
    pos, pts = 100, []
    while pos < len(data):
        length = struct.unpack(">i", data[pos + 4:pos + 8])[0] * 2  # largo en palabras de 16 bits
        shape_type, x, y = struct.unpack("<idd", data[pos + 8:pos + 28])
        pts.append(None if shape_type == 0 else (x, y))
        pos += 8 + length
    return pts


def read_dbf(dbf: Path, encoding="utf-8"):
    data = dbf.read_bytes()
    n, header_len, rec_len = struct.unpack("<IHH", data[4:12])
    fields, pos = [], 32
    while data[pos] != 0x0D:
        name = data[pos:pos + 11].split(b"\0")[0].decode("ascii")
        fields.append((name, data[pos + 16]))
        pos += 32
    rows = []
    for i in range(n):
        rec = data[header_len + i * rec_len: header_len + (i + 1) * rec_len]
        if rec[:1] == b"*":  # registro borrado
            rows.append(None)
            continue
        row, off = {}, 1
        for name, size in fields:
            row[name] = rec[off:off + size].decode(encoding, errors="replace").strip()
            off += size
        rows.append(row)
    return rows


R = 6378137.0  # radio de la esfera de Web Mercator (EPSG:3857)


def to_lonlat(x: float, y: float, mercator: bool):
    if not mercator:
        return x, y
    return math.degrees(x / R), math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2)


def is_mercator(raw: Path, pts) -> bool:
    prj = raw / "TerrestrialAnalogs.prj"
    if prj.exists():
        return "Mercator" in prj.read_text(errors="replace")
    # shortcut: sin .prj se deduce por magnitud (metros >> 180); bajar el .prj para confirmarlo
    return any(p and abs(p[0]) > 180 for p in pts)


def split_for(name: str) -> str:
    return "test" if int(hashlib.sha1(name.encode()).hexdigest(), 16) % 10 < TEST_SHARE else "fit"


if __name__ == "__main__":
    pts = read_points(RAW / "TerrestrialAnalogs.shp")
    rows = read_dbf(RAW / "TerrestrialAnalogs.dbf")
    assert len(pts) == len(rows), f"shp tiene {len(pts)} puntos y dbf {len(rows)} filas"
    mercator = is_mercator(RAW, pts)
    features = []
    for p, r in zip(pts, rows):
        if p is None or r is None:
            continue
        lon, lat = to_lonlat(*p, mercator)
        # caja publicada por ScienceBase para esta capa (en grados), con margen de redondeo
        assert -156.7 <= lon <= 172.1 and -34.8 <= lat <= 75.8, (r.get("Name"), lon, lat)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
            "properties": {
                "name": r.get("Name", ""), "analog_type": r.get("AnalogType", ""),
                "body": r.get("AnalogBody", ""), "split": split_for(r.get("Name", "")),
                "source": "USGS Known Terrestrial Analog Sites (doi:10.5066/P9J72921)",
            },
        })
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=1), encoding="utf-8")
    test = sum(f["properties"]["split"] == "test" for f in features)
    print(f"{len(features)} análogos -> {OUT.relative_to(ROOT)} ({len(features) - test} fit / {test} test)")
