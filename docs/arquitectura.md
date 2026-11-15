# Arquitectura de TerraLunar

Qué herramientas usamos, para qué sirve cada una y cómo se conectan.
**Este documento se actualiza cada vez que se agrega, quita o cambia una herramienta**, y el cambio se
explica en `docs/decisiones.md`.

## Vista general

La app es **estática**: no hay servidor propio ni base de datos. Funciona como una revista impresa con
una calculadora adentro: el pipeline de Python "imprime" los datos una vez (archivos JSON), y el
navegador los lee y hace las cuentas en vivo.

```
 Datos NASA (MODIS, GPM, NASADEM, LRO…)
          │  descarga (Earthdata / Planetary Computer STAC)
          ▼
 pipeline/  (Python)  ──►  data/zones.json, profiles.json, known_analogs.geojson, global_score.png
                                   │  Vite los sirve tal cual (publicDir = ../data)
                                   ▼
 web/  (React en el navegador)  ──►  ranking en memoria  S = Σ wᵢ·puntajeᵢ / Σ wᵢ
          │
          ├─ mapa base y relieve: servicios externos de teselas (ver abajo)
          └─ deploy estático en Vercel
```

## Frontend (`web/`)

| Herramienta | Versión | Para qué la usamos | Dónde |
|---|---|---|---|
| React | 19 | Interfaz (panel, ranking, ficha) | `web/src/*.tsx` |
| TypeScript | 7 | Tipos de los contratos de datos (`Zone`, `Profile`) para que un cambio en el JSON rompa al compilar y no en la demo | `web/src/score.ts` |
| Vite | 8 | Servidor de desarrollo y build. Sirve `data/` como carpeta pública | `web/vite.config.ts` |
| Tailwind CSS | 4 | Estilos con clases utilitarias. Colores como tokens (`ink`, `canvas`, `mute`, `elevated`…) definidos en `index.css` según `docs/DESIGN.md` | todo `web/src`, `index.css` |
| MapLibre GL JS | 6 | Globo 3D de la Tierra, polígonos de zonas, relieve al abrir una ficha | `web/src/MapView.tsx` |
| Recharts | 3 | Gráfico de radar de la ficha | `web/src/ZoneCard.tsx` |
| three.js | 0.187 | Comparador 3D de relieve y globo lunar 3D propio | `web/src/Compare3D.tsx`, `web/src/MoonGlobe.tsx` |
| geotiff | 3 | Leer por partes un archivo de relieve de Marte (COG) sin bajarlo entero | `web/src/Compare3D.tsx` |
| Cesium (CDN) | 1.129 | Visor 3D de la Luna **opcional**: solo si hay token; si no, se usa `MoonGlobe` | `web/src/MoonView.tsx` |
| oxlint | 1 | Linter (revisa errores comunes) | `npm run lint` |
| node:test | Node 22 | Tests del cálculo del puntaje | `web/test/score.test.ts` |

### Componentes

| Archivo | Responsabilidad |
|---|---|
| `App.tsx` | Carga los JSON, guarda el estado (preset, pesos, zona elegida, Tierra/Luna/Marte) y arma el panel lateral (oculto en Marte) |
| `score.ts` | Tipos de los contratos + `score`, `rank`, `presetWeights`. Es el "motor"; no depende de React |
| `MapView.tsx` | Globo MapLibre, capas de zonas y centroides, cámara al elegir zona |
| `ZoneCard.tsx` | Ficha: puntaje, radar, aporte por variable, **límites de la analogía**, fuentes, link a Worldview |
| `Compare3D.tsx` | Comparador 3D: relieve de un sitio lunar vs. la zona elegida (lee `data/compare/`) |
| `MoonMap.tsx` | Pestaña Luna: elige Cesium o el globo propio; clic en el polo sur → métricas de relieve y zonas terrestres parecidas |
| `MoonGlobe.tsx` | Globo lunar 3D con three.js (LRO + LOLA) y "tapa" con relieve real del polo sur |
| `MoonView.tsx` | Visor lunar Cesium; solo si hay token, con respaldo automático a los 25 s |
| `moonProj.ts` | Conversión píxel ↔ lat/lon de la proyección polar del mapa LOLA |
| `MarsView.tsx` | Pestaña Marte: globo MapLibre con relieve MOLA, imágenes Viking/THEMIS, panel de análisis |
| `marsData.ts` | Carga MOLA, calcula métricas de relieve en Marte y la similitud con recortes terrestres |
| `globeRotation.ts` | Rotación lenta y decorativa del globo en vista global (Tierra y Marte) |
| `localData.ts` | Caché en memoria de archivos binarios locales, para no bajarlos dos veces |
| `limits.ts` | Textos de los límites de la analogía para la Luna (`LIMITS`) y Marte (`MARS_LIMITS`) |
| `SpaceBackdrop.tsx` | Fondo decorativo de estrellas (`bodies={false}` lo deja sin planetas) |
| `Landing.tsx` | Portada: titular, opciones Luna / Marte / Personalizado (teclas 1-2-3), mejores 5 análogos y método. Exporta `TopBar` |
| `HalftoneMoon.tsx` | Luna en trama de puntos (canvas) con el brillo real de la textura LRO y los sitios del polo sur de `data/moon/index.json` |
| `LimitsCard.tsx` | Tarjeta obligatoria "Límites de la analogía" (Luna o Marte), usada en la ficha y en los paneles |
| `CustomSearch.tsx` | Búsqueda personalizada: variables por grupo, importancia Baja/Media/Alta, "lo que pide la Luna" con el trapecio difuso y vista previa del ranking en vivo |
| `Workspace.tsx` | **Sin uso** (navegación al explorador). Pendiente decidir si se conecta o se borra |

### Servicios externos que usa el navegador

| Servicio | Para qué | ¿Necesita key? |
|---|---|---|
| Carto `dark-matter` | Estilo del mapa base | No |
| Esri World Imagery | Imagen satelital del globo a zoom bajo | No |
| AWS Terrain Tiles (Mapzen, incluye NASA SRTM) | Relieve 3D visual (no se usa para medir) | No |
| Cesium ion — Cesium Moon | Superficie lunar 3D (opcional) | Sí (`VITE_CESIUM_ION_TOKEN`); sin token se usa el globo propio |
| NASA Mars Trek (WMTS) | Imágenes Viking y THEMIS de Marte desde zoom 2 | No |
| Hugging Face (copia del DEM MOLA/HRSC 200 m de USGS) | Relieve detallado del comparador de Marte; si falla, grilla de 2 km | No |
| NASA Worldview | Link externo desde la ficha | No |

Si alguno de estos no responde, esa capa no se ve (el resto de la app sigue funcionando).

## Datos (`pipeline/` → `data/`)

| Herramienta | Para qué |
|---|---|
| Python 3.11 | Lenguaje del pipeline |
| numpy, xarray, rioxarray, rasterio, scipy | Leer y operar grillas (rasters) |
| geopandas | Polígonos de zonas |
| pystac-client, planetary-computer, odc-stac | Buscar y bajar datos del catálogo STAC de Microsoft Planetary Computer |

Scripts actuales (uno por paso, numerados en orden):

| Script | Qué hace | Estado |
|---|---|---|
| `00_mock_data.py` | Genera `zones.json` FALSO de 20 zonas | En uso hasta tener datos reales |
| `01_known_analogs.py` | Convierte la capa USGS de análogos a GeoJSON con división fit/test fija | Listo |
| `03_moon_map.py` | Relieve sombreado LOLA del polo sur (320 m/px) y grilla de pendiente, rugosidad y desnivel (ventanas de 20 km) | Listo |
| `02_compare_patches.py` | Recortes de elevación (LOLA para la Luna, tiles de elevación para la Tierra) y métricas para el comparador | Listo |
| `04_mars_public.py` | Baja MOLA MEGDR 32 px/° (PDS) y lo parte en 16 bandas comprimidas en `data/mars/` | Listo |
| `05_moon_globe.py` | Texturas del globo lunar (NASA SVS CGI Moon Kit) y malla LOLA 800 m del polo sur | Listo |

### Contratos de datos (congelados el sábado 13:00: solo se **agregan** campos)

- `data/zones.json` — esquema en `data/zones.schema.json`.
- `data/profiles.json` — perfil por destino, con función difusa y pesos por preset.
- `data/known_analogs.geojson` — análogos USGS con `split: fit | test`.
- `data/compare/index.json` + `*.bin` — parches de elevación para el comparador 3D.
- `data/moon/index.json`, `metrics.bin`, `south_pole_hillshade.jpg` — mapa y métricas del polo sur lunar.
- `data/moon/globe_color.jpg`, `globe_height.png`, `cap_dem.bin` — globo lunar 3D.
- `data/mars/mola32-*.dat` (16 bandas, ~90 MB), `source.json`, `preview/` — relieve e imágenes base de
  Marte. **Ojo:** supera la regla de 10 MB de `CLAUDE.md` (ver D-009).
- `data/global_score.png` — pendiente.

## Ramas y deploy

- `main`: lo que está publicado / listo para presentar.
- `develop`: donde se integra el trabajo nuevo. Se revisa y se mergea a `main`.
- Deploy: Vercel, estático, desde `main`.

## Comandos

```bash
cd web && npm install      # dependencias
npm run dev                # http://localhost:5173
npm test                   # tests del puntaje
npm run lint               # linter
npm run build              # build de producción (chequea tipos)
```

## Historial de cambios de stack

| Fecha | Cambio | Motivo (detalle en decisiones.md) |
|---|---|---|
| 2026-11-14 | Stack inicial (React + Vite + TS + MapLibre + Recharts + Tailwind; Python) | D-001 |
| 2026-11-14 | Se agrega Cesium por CDN para la vista Luna | D-002 |
| 2026-11-14 | Se agrega la rama `develop` al flujo de trabajo | D-003 |
| 2026-11-14 | Se agrega three.js para el comparador 3D | D-008 |
| 2026-11-14 | Se agrega `geotiff` y servicios Mars Trek y Hugging Face para Marte | D-009 |
| 2026-11-14 | Globo lunar propio con three.js; Cesium pasa a opcional | D-010 |
| 2026-11-14 | Fuentes Archivo (títulos) y JetBrains Mono (lecturas técnicas) por Google Fonts, junto a Inter | D-011 |
| 2026-11-14 | Sistema de diseño aeroespacial (`docs/DESIGN.md`): Barlow Condensed + Barlow reemplazan a Inter, Archivo y JetBrains Mono | D-012 |
| 2026-11-14 | Sistema "TerraLunar Science Console": vuelven Inter y JetBrains Mono; nuevo `LimitsCard.tsx` | D-014 |
