# Datos faltantes

Cosas que la app necesita y todavía no existen. Se anotan acá en vez de inventarlas.

- **Todo `data/zones.json` es MOCK.** Puntajes inventados a mano; los reemplaza el pipeline real.
- **Polígonos de zonas:** el mock usa un cuadrado del área indicada alrededor del centroide.
- **Lista de análogos de referencia para validar:** `data/known_analogs.geojson` ya tiene la capa USGS real (192 sitios, división fit/test por hash del nombre: 137/55), pero son casi todos cráteres de impacto y no incluye los análogos de ensayo clásicos (Atacama, Mauna Kea, Valles Secos, Death Valley, Lanzarote, Holuhraun). Falta una lista curada de análogos de ensayo para movilidad/excavación/hábitat, con cita por sitio (programas de análogos de NASA, ESA, papers), dividida fit/test ANTES de calcular. Le toca a Civil.
- **Umbrales difusos (`a, b, c, d`) y pesos de presets en `profiles.json`:** provisorios. Validar con el de civil y el ingeniero aeroespacial; idealmente derivados de LRO Diviner (temperatura) y LOLA (pendiente/rugosidad) de los sitios Artemis III.
- **Litología (anortosita, tierras altas):** no hay dimensión todavía. Falta un dataset geológico global.
- **`data/global_score.png`** y sus 4 esquinas lon/lat: no existe aún; la web no lo muestra.
- **Relieve 3D:** hoy usa AWS Terrain Tiles (Mapzen, mezcla de fuentes que incluye NASA SRTM) solo como imagen. Pendiente: generar el relieve de los candidatos desde nuestro NASADEM 30 m para que lo que se ve y lo que se mide salgan del mismo dato. Agregar AWS Terrain Tiles a la lista de recursos de la entrega.
- **Capa USGS de análogos:** no cubre la Antártida (llega hasta −34,7°): McMurdo y otros análogos polares hay que citarlos de otra fuente (paper o programa de análogos de NASA).
- **Polígonos/coordenadas de las 9 regiones Artemis III:** no hay archivo oficial; sacarlas del anuncio de NASA o de un paper.
- **NASADEM no cubre más allá de 56° S / 60° N:** McMurdo, Haughton, Svalbard, Axel Heiberg y Holuhraun (Islandia) necesitan Copernicus GLO-30 para pendiente.
- **Comparador 3D, lado Tierra:** usa AWS Terrain Tiles; pasar a NASADEM (o Copernicus fuera de 56° S–60° N) para que el número sea 100 % NASA. Las zonas costeras tienen el mar aplanado a 0.
- **Polígonos de aterrizaje Artemis III:** el comparador usa centros IAU de los accidentes (Mons Mouton, Mons Malapert) y un punto de un estudio (Nobile Rim 2). Si aparece la fuente oficial, reemplazar.
- **Búsqueda desde la Luna:** compara solo contra las zonas de `zones.json` (hoy 20 mock). Cuando el pipeline extraiga ~200 candidatas, correr `02_compare_patches.py` para sus métricas. Tolerancias del parecido (pendiente 5°, p90 8°, rugosidad 3 m, desnivel 1000 m) son provisorias: validar con Civil.
- **Perfil Marte:** no existe (es lo primero que se recorta).

## Consideraciones geomecánicas (D-024, documento de Civil `docs/consideraciones-geomecanicas.md`)
Criterios que hoy quedan **pendientes** en la ficha porque falta el dato terrestre (no se inventa nota):
- **Granulometría y composición (15 %):** reflectancia NIR del recorte (Sentinel-2 banda 8 o Landsat 8/9), ya
  que la regla pide NIR 0,25–0,40 (Luna) o 0,15–0,30 (Marte) además del NDVI.
- **Capacidad portante (15 %):** densidad aparente del suelo (p. ej. SoilGrids `bdod`, 250 m) o ensayos de campo.
- **Volátiles y evaporitas (20 %):** mapa de permafrost / glaciares de escombros con profundidad y % de hielo
  (p. ej. ESA CCI Permafrost; inventarios de glaciares de escombros de la Puna/Andes).
- **Refugio subterráneo (10 %):** DEM de 30 m (NASADEM / Copernicus GLO-30) por candidato para medir desniveles
  de 2–50 m y pendientes de flanco; con celdas de 2 km no se resuelven.
- **Oscilaciones térmicas:** hoy se usa una sola fecha MODIS (día − noche). La regla pide amplitud diaria o
  estacional: falta una serie temporal.
- **Radiación:** se usa la altitud, como indica la regla; el índice UV no está integrado.
- **Supermáscara:** depende de la capa de cobertura; donde falta agua, NDVI o zonas urbanas, la máscara se
  informa como incompleta.
- **Arcadia Planitia:** el perfil está cargado, pero el sitio no está entre los destinos de Marte de la app.
  Faltan las coordenadas del área de estudio (p. ej. del boletín NASA HLS2) y su recorte MOLA para activarlo.
- **Tramos intermedios de las reglas:** el documento fija los extremos (1,0 y 0,0); los tramos lineales entre
  ellos son provisorios. Validar con Civil.

