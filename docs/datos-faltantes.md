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
**Actualizado 2026-11-15 (D-025):** `pipeline/11_geomechanics.py` consiguió datos reales para casi todo lo que
faltaba. Estado por ítem:
- ✅ **Granulometría y composición:** NIR (B08) y NDVI de Sentinel-2 L2A por ventana. **Sigue faltando:** la
  mineralogía (anortosita / basalto); el NIR no la identifica. Dato posible: ASTER (índices de sílice y máficos).
- ✅ **Capacidad portante:** densidad aparente SoilGrids 2.0 (0–60 cm). **Límite:** es una predicción a 250 m, no un
  ensayo; cohesión y ángulo de fricción no existen como capa global → ensayos de campo o bibliografía por sitio.
  SoilGrids no predice suelo sobre roca expuesta, hielo ni la Antártida: esas ventanas quedan pendientes.
- 🟡 **Volátiles:** probabilidad de permafrost (PZI, Gruber 2012). **Sigue faltando:** profundidad y % de hielo
  (ninguna capa global lo da), inventarios de glaciares de escombros (IANIGLA para Argentina) y la Antártida
  (el PZI llega hasta 60° S; McMurdo queda pendiente).
- ✅ **Refugio subterráneo:** NASADEM / Copernicus GLO-30 a 30 m. **Límite:** ve escarpes, no cuevas ni tubos de lava.
- ✅ **Oscilaciones térmicas:** serie MOD11A2 de 12 meses (2024). **Límite:** pasadas ~10:30 y ~22:30, subestima la
  amplitud diaria real.
- ❌ **Radiación, índice UV:** no conseguido (NASA OMI `OMUVBd` requiere login Earthdata). La regla ya puntúa con
  la altitud, así que no bloquea.
- ✅ **Supermáscara:** WorldCover 2021 (agua, urbano, cultivo) + NDVI Sentinel-2 donde la región no tenía cobertura.
- ✅ **Arcadia Planitia:** activado con el centro IAU (Feature 348). **Sigue faltando:** un área de aterrizaje
  concreta (el boletín HLS2 de 2019 muestra el área de estudio SWIM en figuras, sin coordenadas en el texto).
- ⚠️ **Contraste de cifras del documento:** Morgan et al. (NASA SWIM) **no respalda** "30–90 % de hielo en volumen"
  para Arcadia: dice que en el depósito grueso (15 a >100 m) "any ice must be at a low overall fraction", aunque
  infiere hielo cerca de la superficie. La dosis lunar medida (Chang'e-4, Zhang et al. 2020, *Science Advances*)
  es 1369 µSv/día ≈ 0,50 Sv/año, más que los 0,32–0,40 Sv/año del documento. Revisar con Civil.
- **Tramos intermedios de las reglas:** siguen provisorios (D-025 detalla cada uno). Validar con Civil.

## Validación (D-026)
- **Resultado actual:** con relieve solo, los análogos USGS `test` no superan al azar (6 % contra 10 % esperado para
  Mons Mouton). Para una validación con sentido falta la **lista curada de análogos de ensayo** (movilidad,
  excavación, hábitat) con cita por sitio, dividida fit/test antes de calcular. Le toca a Civil.
