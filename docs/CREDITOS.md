# TerraLunar — Créditos, datos y herramientas

Equipo Q’Kodigo. Registro de recursos para la presentación de NASA Space Apps.

Los datos de elevación alimentan la comparación topográfica. Las observaciones térmicas, la geología y la cobertura aportan evidencia o filtros donde están disponibles; no constituyen una validación integral de aptitud para una misión. Las atribuciones no sustituyen las licencias de cada proveedor.

## Datos y recursos NASA

| Recurso | Uso |
|---|---|
| [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | Elevación lunar y recortes de relieve; ver `data/compare/index.json`. |
| [MGS MOLA MEG032](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg032/) | Elevación marciana; `pipeline/04_mars_public.py`. |
| [LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | Evidencia térmica lunar PCP; productos y hashes en `data/planetary/observations.json`. |
| [MODIS MOD11A1.061](https://doi.org/10.5067/MODIS/MOD11A1.061) | Temperatura superficial terrestre; gránulo, calidad y hash en `data/thermal/modis-observations.json`. |
| [NASA Mars Trek](https://trek.nasa.gov/mars/) | Imágenes Viking y THEMIS del visor marciano. |
| [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | Textura lunar y elevación para visualización. |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Exploración visual externa de las regiones terrestres. |

## Otras fuentes de datos y cartografía

| Recurso | Uso |
|---|---|
| [Copernicus Sentinel-2 L2A / Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a) | Observaciones de cobertura en regiones procesadas; escenas y procedencia en `data/discovery/recent-2026.json`. |
| [ESA WorldCover](https://esa-worldcover.org/en) | Cobertura 2021 v200; `data/discovery/coverage.json`. © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. |
| [AWS Open Data / Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) | Elevación terrestre para visualización y recortes. Fuente compuesta; no se atribuye todo el producto exclusivamente a NASA. |
| [SEGEMAR SIGAM](https://sigam.segemar.gov.ar/) | Contexto geológico argentino; capa, escala y hash en `data/discovery/geology-source.json`. |
| [USGS — Unified Geologic Map of the Moon](https://doi.org/10.3133/sim3316) | Contexto geológico lunar. |
| [USGS — Geologic Map of Mars](https://pubs.usgs.gov/sim/3292/) | Contexto geológico marciano. |
| [USGS — Known Terrestrial Analog Sites](https://doi.org/10.5066/P9J72921) | Catálogo de referencia; no certifica candidatos ni constituye por sí solo validación científica. |
| [IAU / USGS Gazetteer](https://planetarynames.wr.usgs.gov/) | Nombres y coordenadas de accidentes planetarios. |
| [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) | Imágenes terrestres. Esri, Maxar, Earthstar Geographics y GIS User Community; conservar atribuciones del servicio. |
| [CARTO Basemaps](https://carto.com/basemaps/) | Mapa base terrestre. |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Datos del mapa base; © OpenStreetMap contributors. |

## Software y diseño

Dependencias y versiones en [web/package.json](../web/package.json) y su archivo de bloqueo. Las licencias de los componentes permanecen bajo sus respectivos autores.

- [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/): aplicación web y compilación.
- [MapLibre GL JS](https://maplibre.org/), [Three.js](https://threejs.org/), [GeoTIFF.js](https://geotiffjs.github.io/), [Recharts](https://recharts.org/): mapas, relieve, lectura ráster y gráficos.
- [Tailwind CSS](https://tailwindcss.com/): estilos.
- [Python](https://www.python.org/), [NumPy](https://numpy.org/), [Rasterio](https://rasterio.readthedocs.io/), [PyProj](https://pyproj4.github.io/pyproj/), [Pillow](https://python-pillow.github.io/): procesamiento de datos e imágenes.
- [Playwright](https://playwright.dev/), [axe-core](https://github.com/dequelabs/axe-core), [Oxlint](https://oxc.rs/docs/guide/usage/linter): pruebas y revisión automatizada.
- [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans): tipografía, SIL Open Font License.
- [VoltAgent awesome-design-md](https://github.com/VoltAgent/awesome-design-md): referencias de diseño consultadas, MIT.
- [CesiumJS](https://cesium.com/platform/cesiumjs/): integración opcional/previa del visor lunar; no es requisito del comparador local.

## Asistencia de inteligencia artificial y presentación

[OpenAI Codex](https://openai.com/codex/) y [Claude](https://claude.ai/) se utilizaron como asistencia para programación, depuración, investigación, diseño, documentación y preparación de la presentación. Véase también [registro de uso de IA](uso-de-ia.md). Esta asistencia no convierte automáticamente el cálculo de compatibilidad en un modelo predictivo entrenado.

La previsualización de video se compuso a partir de grabaciones reales de la aplicación mediante [Playwright](https://playwright.dev/) y [FFmpeg](https://ffmpeg.org/), con asistencia de IA en el guion y montaje. No se generó locución con Higgsfield para esa previsualización. El logo Q’Kodigo fue proporcionado por el equipo; este registro no certifica derechos de terceros sobre materiales aportados.

## Alcance de esta declaración

RCM, RADARSAT, JAXA/ALOS y otros productos explorados no se declaran aquí como entradas del cálculo sin evidencia de integración. Descargar o consultar un recurso no significa que participe en el resultado. La música comercial no queda autorizada por citarla: cualquier versión pública debe usar audio con los permisos correspondientes.
