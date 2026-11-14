"""Genera data/zones.json y data/known_analogs.geojson FALSOS (mock) para desarrollar la web.

Los puntajes son inventados a mano (plausibles, no medidos). Se reemplazan cuando el pipeline real
produzca los archivos. Uso: python pipeline/00_mock_data.py
"""
import json
import math
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
DIMS = ["lst", "ndvi", "nieve", "lluvia", "cobertura", "pendiente", "rugosidad"]
SOURCES = ["MODIS MOD11C3", "MODIS MOD13C2", "MODIS MOD10CM", "GPM IMERG", "MODIS MCD12C1", "NASADEM"]

# id, nombre, país, lon, lat, área km², ¿análogo conocido?, puntajes en el orden de DIMS
ZONES = [
    ("mcmurdo-dry-valleys", "Valles Secos de McMurdo", "Antártida", 161.8, -77.5, 4800, True, [1.0, 1.0, 0.45, 1.0, 0.95, 0.6, 0.7]),
    ("haughton-crater", "Cráter Haughton (Isla Devon)", "Canadá", -89.67, 75.38, 600, True, [0.85, 0.9, 0.35, 0.95, 0.85, 0.75, 0.8]),
    ("atacama-yungay", "Desierto de Atacama (Yungay)", "Chile", -70.0, -24.1, 3000, True, [0.15, 1.0, 0.0, 1.0, 1.0, 0.8, 0.6]),
    ("mauna-kea", "Mauna Kea", "EE.UU. (Hawái)", -155.47, 19.82, 300, True, [0.35, 0.8, 0.1, 0.4, 0.7, 0.55, 0.75]),
    ("barringer-crater", "Cráter Barringer", "EE.UU.", -111.02, 35.03, 50, True, [0.25, 0.85, 0.0, 0.85, 0.8, 0.65, 0.7]),
    ("black-point-lava", "Colada Black Point", "EE.UU.", -111.4, 35.68, 120, True, [0.25, 0.85, 0.0, 0.85, 0.85, 0.7, 0.9]),
    ("svalbard-bockfjorden", "Bockfjorden (Svalbard)", "Noruega", 13.9, 79.4, 400, True, [0.8, 0.75, 0.6, 0.6, 0.7, 0.45, 0.65]),
    ("holuhraun", "Holuhraun / Askja", "Islandia", -16.8, 64.85, 900, True, [0.6, 0.9, 0.4, 0.35, 0.9, 0.8, 0.9]),
    ("rio-tinto", "Río Tinto", "España", -6.6, 37.7, 200, True, [0.2, 0.45, 0.0, 0.55, 0.4, 0.5, 0.55]),
    ("death-valley", "Valle de la Muerte", "EE.UU.", -116.9, 36.5, 2500, True, [0.0, 0.95, 0.0, 1.0, 0.95, 0.75, 0.6]),
    ("craters-of-the-moon", "Craters of the Moon", "EE.UU.", -113.5, 43.4, 1600, True, [0.4, 0.7, 0.3, 0.75, 0.75, 0.8, 0.85]),
    ("lanzarote-timanfaya", "Timanfaya (Lanzarote)", "España", -13.78, 29.0, 50, True, [0.15, 0.9, 0.0, 0.95, 0.9, 0.7, 0.85]),
    ("pilbara", "Pilbara", "Australia", 118.0, -21.2, 5000, True, [0.0, 0.75, 0.0, 0.8, 0.7, 0.85, 0.5]),
    ("axel-heiberg", "Isla Axel Heiberg", "Canadá", -91.0, 79.4, 1200, True, [0.9, 0.85, 0.75, 0.9, 0.8, 0.4, 0.6]),
    ("campo-piedra-pomez", "Campo de Piedra Pómez (Puna)", "Argentina", -67.4, -26.6, 750, False, [0.35, 1.0, 0.05, 1.0, 1.0, 0.75, 0.8]),
    ("payunia", "La Payunia", "Argentina", -69.3, -36.4, 4500, False, [0.3, 0.7, 0.1, 0.8, 0.75, 0.85, 0.75]),
    ("ischigualasto", "Ischigualasto (Valle de la Luna)", "Argentina", -67.95, -30.15, 600, False, [0.1, 0.9, 0.0, 0.95, 0.9, 0.65, 0.7]),
    ("qaidam", "Cuenca de Qaidam", "China", 93.0, 37.8, 8000, False, [0.45, 0.95, 0.05, 0.95, 0.95, 0.9, 0.4]),
    ("wadi-rum", "Wadi Rum", "Jordania", 35.42, 29.57, 720, False, [0.0, 0.95, 0.0, 1.0, 0.95, 0.5, 0.65]),
    ("gobi-flaming-cliffs", "Gobi (Bayanzag)", "Mongolia", 103.7, 44.2, 2000, False, [0.35, 0.8, 0.15, 0.85, 0.8, 0.85, 0.55]),
]


def square(lon, lat, area_km2):
    # shortcut: cuadrado alrededor del centroide; el pipeline real entrega el polígono de verdad
    half = math.sqrt(area_km2) / 2
    dlat = half / 111.0
    dlon = half / (111.0 * math.cos(math.radians(lat)))
    ring = [[lon - dlon, lat - dlat], [lon + dlon, lat - dlat], [lon + dlon, lat + dlat], [lon - dlon, lat + dlat]]
    ring.append(ring[0])
    return {"type": "Polygon", "coordinates": [[[round(x, 4), round(y, 4)] for x, y in ring]]}


zones = []
for zid, name, country, lon, lat, area, known, scores in ZONES:
    assert len(scores) == len(DIMS) and all(0 <= s <= 1 for s in scores), zid
    zones.append({
        "id": zid, "name": name, "country": country, "centroid": [lon, lat],
        "polygon": square(lon, lat, area), "area_km2": area,
        "scores": dict(zip(DIMS, scores)), "known": known, "sources": SOURCES,
        "notes": "MOCK: puntajes inventados para desarrollo, no medidos.",
    })
assert len(zones) == 20 and len({z["id"] for z in zones}) == 20

# División fit/test FIJA (cada 3er análogo conocido va a test). La real se hace igual: antes de calcular.
known = [z for z in zones if z["known"]]
analogs = {"type": "FeatureCollection", "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": z["centroid"]},
     "properties": {"id": z["id"], "name": z["name"], "split": "test" if i % 3 == 2 else "fit", "source": "MOCK (reemplazar por USGS Known Terrestrial Analog Sites)"}}
    for i, z in enumerate(known)]}

(DATA / "zones.json").write_text(json.dumps(zones, ensure_ascii=False, indent=1), encoding="utf-8")
(DATA / "known_analogs.geojson").write_text(json.dumps(analogs, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(zones)} zonas, {len(known)} análogos conocidos ({sum(f['properties']['split'] == 'test' for f in analogs['features'])} en test)")
