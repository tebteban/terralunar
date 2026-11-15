# TerraLunar — Data Sources, Tools & Credits

**Team Q’Kodigo · NASA Space Apps project resource register**

This page identifies the external data, software, and creative resources used in TerraLunar. Resource names are clickable links. Repository evidence links point to the associated processing code or data records.

Elevation data support the topographic comparison. Temperature observations, geology, and land cover provide supporting evidence or filters where available; they do not establish comprehensive mission suitability. Attribution does not replace each provider’s license or terms of use.

## NASA Data & Resources

| Resource | Use in TerraLunar | Repository evidence |
| --- | --- | --- |
| [LRO LOLA — Lunar elevation](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | Lunar terrain patches and elevation measurements. | [Terrain patch index](../data/compare/index.json) |
| [MGS MOLA MEG032 — Martian elevation](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg032/) | Martian elevation processing. | [Mars processing script](../pipeline/04_mars_public.py) |
| [LRO Diviner — Lunar surface temperature](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | Supporting lunar thermal observations from PCP products. | [Observations, product links and hashes](../data/planetary/observations.json) |
| [MODIS MOD11A1 Version 6.1 — Land surface temperature](https://doi.org/10.5067/MODIS/MOD11A1.061) | Terrestrial surface temperature observations, with quality filtering. | [Granule, quality criteria and hash](../data/thermal/modis-observations.json) |
| [NASA Mars Trek — Viking and THEMIS imagery](https://trek.nasa.gov/mars/) | Imagery layers in the Mars viewer. | [Mars viewer](../web/src/MarsView.tsx) |
| [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | Lunar imagery and elevation for visualization. | [Lunar globe processing](../pipeline/05_moon_globe.py) |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | External visual exploration of Earth observation imagery. | [Sources dialog and Worldview link](../web/src/MethodDialog.tsx) |

## Space Agency Partners & Other Data

| Resource | Use in TerraLunar | Repository evidence |
| --- | --- | --- |
| [Copernicus Sentinel-2 L2A via Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a) | Land-cover observations in processed regions. | [Scenes and provenance](../data/discovery/recent-2026.json) |
| [ESA WorldCover](https://esa-worldcover.org/en) | Land cover, 2021 v200. | [Coverage records and attribution](../data/discovery/coverage.json) |
| [AWS Open Data / Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) | Terrestrial elevation for visualization and terrain patches. This is a composite source, not exclusively a NASA product. | [Earth map implementation](../web/src/MapView.tsx) |
| [SEGEMAR SIGAM](https://sigam.segemar.gov.ar/) | Regional geological context in Argentina. | [Layer, scale and hash](../data/discovery/geology-source.json) |
| [USGS — Unified Geologic Map of the Moon](https://doi.org/10.3133/sim3316) | Lunar geological context. | [Planetary processing](../pipeline/10_planetary_observations.py) |
| [USGS — Geologic Map of Mars](https://pubs.usgs.gov/sim/3292/) | Martian geological context. | [Planetary processing](../pipeline/10_planetary_observations.py) |
| [USGS — Known Terrestrial Analog Sites](https://doi.org/10.5066/P9J72921) | Reference catalog; it does not certify candidates or independently validate the model. | [Reference catalog processing](../pipeline/01_known_analogs.py) |
| [IAU / USGS Gazetteer of Planetary Nomenclature](https://planetarynames.wr.usgs.gov/) | Planetary feature names and coordinates. | [Feature references](../data/compare/index.json) |
| [Esri World Imagery](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) | Terrestrial imagery. | [Earth map implementation](../web/src/MapView.tsx) |
| [CARTO Basemaps](https://carto.com/basemaps/) | Terrestrial basemap styling and services. | [Earth map implementation](../web/src/MapView.tsx) |
| [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | Underlying basemap data. | [CARTO basemap used by the Earth viewer](../web/src/MapView.tsx) |

**Required source acknowledgments**

- ESA WorldCover: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium.
- Esri imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community. Preserve the service’s applicable imagery attributions.
- Basemap data: © OpenStreetMap contributors; CARTO basemap credits remain applicable.

## Software & Design Resources

Dependencies and versions are recorded in [web/package.json](../web/package.json) and its lockfile. Components remain subject to their respective licenses.

| Tool or resource | Role |
| --- | --- |
| [React](https://react.dev/) | User interface. |
| [TypeScript](https://www.typescriptlang.org/) | Application development. |
| [Vite](https://vite.dev/) | Development server and build tooling. |
| [MapLibre GL JS](https://maplibre.org/) | Interactive mapping. |
| [Three.js](https://threejs.org/) | 3D terrain comparison. |
| [GeoTIFF.js](https://geotiffjs.github.io/) | Raster data reading. |
| [Recharts](https://recharts.org/) | Data charts. |
| [Tailwind CSS](https://tailwindcss.com/) | Interface styling. |
| [Python](https://www.python.org/) | Data processing scripts. |
| [NumPy](https://numpy.org/) | Numerical processing. |
| [Rasterio](https://rasterio.readthedocs.io/) | Raster processing. |
| [PyProj](https://pyproj4.github.io/pyproj/) | Coordinate transformations. |
| [Pillow](https://python-pillow.github.io/) | Image processing. |
| [Playwright](https://playwright.dev/) | Browser tests and demonstration capture. |
| [axe-core](https://github.com/dequelabs/axe-core) | Automated accessibility checks. |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) | Static code analysis. |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Typeface, SIL Open Font License. |
| [VoltAgent awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | Consulted design references, MIT license. |
| [CesiumJS](https://cesium.com/platform/cesiumjs/) | Optional/earlier lunar viewer integration; not required by the local terrain comparator. |

## AI Assistance & Presentation Production

[OpenAI Codex](https://openai.com/codex/) and [Claude](https://claude.ai/) assisted with programming, debugging, research, design, documentation, and presentation preparation. See the [AI assistance log](uso-de-ia.md). Using AI development assistance does not automatically make the compatibility calculation a trained predictive model.

The video preview was composed from real application recordings using [Playwright](https://playwright.dev/) and [FFmpeg](https://ffmpeg.org/), with AI assistance for scripting and editing. No Higgsfield-generated voiceover was produced for that preview. The Q’Kodigo logo was supplied by the team; this register does not certify third-party rights to supplied materials.

## Scope of This Register

RCM, RADARSAT, JAXA/ALOS, and other explored products are not claimed here as calculation inputs without integration evidence. Downloading or consulting a resource does not establish that it contributes to a result.

Citing commercial music does not grant permission to use it. Any public release must use audio with the appropriate permissions.

