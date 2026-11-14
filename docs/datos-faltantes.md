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
- **Perfil Marte:** no existe (es lo primero que se recorta).
