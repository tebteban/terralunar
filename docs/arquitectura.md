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
| three.js | 0.187 | Comparador 3D de relieve Luna vs Tierra | `web/src/Compare3D.tsx` |
| Cesium (CDN) | 1.129 | Visor 3D opcional de la Luna (requiere token de Cesium ion) | `web/src/MoonView.tsx` |
| oxlint | 1 | Linter (revisa errores comunes) | `npm run lint` |
| node:test | Node 22 | Tests del cálculo del puntaje | `web/test/score.test.ts` |

### Componentes

| Archivo | Responsabilidad |
|---|---|
| `App.tsx` | Carga los JSON, guarda el estado (preset, pesos, zona elegida, Tierra/Luna) y arma el panel lateral |
| `score.ts` | Tipos de los contratos + `score`, `rank`, `presetWeights`. Es el "motor"; no depende de React |
| `MapView.tsx` | Globo MapLibre, capas de zonas y centroides, cámara al elegir zona |
| `ZoneCard.tsx` | Ficha: puntaje, radar, aporte por variable, **límites de la analogía**, fuentes, link a Worldview |
| `Compare3D.tsx` | Comparador 3D: relieve de un sitio lunar vs. la zona elegida (lee `data/compare/`) |
| `MoonMap.tsx` | Vista "Polo sur lunar": mapa LOLA con los sitios Artemis III; clic en un lugar → métricas de relieve y zonas terrestres parecidas |
| `limits.ts` | Textos de los límites de la analogía (compartidos por la ficha y otras vistas) |
| `MoonView.tsx` | Visor lunar Cesium, se carga solo si se elige "Luna" |
| `SpaceBackdrop.tsx` | Fondo decorativo de estrellas |
| `Workspace.tsx` | **Sin uso** (navegación al explorador). Pendiente decidir si se conecta o se borra |

### Servicios externos que usa el navegador

| Servicio | Para qué | ¿Necesita key? |
|---|---|---|
| Carto `dark-matter` | Estilo del mapa base | No |
| Esri World Imagery | Imagen satelital del globo a zoom bajo | No |
| AWS Terrain Tiles (Mapzen, incluye NASA SRTM) | Relieve 3D visual (no se usa para medir) | No |
| Cesium ion — Cesium Moon | Superficie lunar 3D | **Sí** (`VITE_CESIUM_ION_TOKEN` o pegado por el usuario) |
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

### Contratos de datos (congelados el sábado 13:00: solo se **agregan** campos)

- `data/zones.json` — esquema en `data/zones.schema.json`.
- `data/profiles.json` — perfil por destino, con función difusa y pesos por preset.
- `data/known_analogs.geojson` — análogos USGS con `split: fit | test`.
- `data/compare/index.json` + `*.bin` — parches de elevación para el comparador 3D.
- `data/moon/index.json`, `metrics.bin`, `south_pole_hillshade.jpg` — mapa y métricas del polo sur lunar.
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
