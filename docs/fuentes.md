# Fuentes de datos — catálogo verificado

Relevado el **sáb. 14/11/2026** consultando directamente los catálogos (NASA CMR, Microsoft Planetary Computer STAC, PDS Geosciences, USGS). ✅ = existe y el link respondió ese día.

## Recursos oficiales del desafío (pestaña Recursos, leída el 14/11)

Para premios globales hay que usar **al menos uno de los recursos NASA**. Cómo los cubrimos:

| Recurso oficial | Grupo | ¿Lo usamos? | Con qué producto concreto |
|---|---|---|---|
| [NASA Earthdata Search](https://search.earthdata.nasa.gov/) | NASA · Tierra | ✅ núcleo | MOD11C3, MOD13C2, MOD10CM, MCD12C1, GPM IMERG, NASADEM (todos se buscan y bajan por Earthdata) |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | NASA · Tierra | ✅ | Botón "Abrir en Worldview" en cada ficha |
| [NASA PDS](https://pds.nasa.gov/) | NASA · Luna y Marte | ✅ | vía PDS Geosciences (LOLA, Diviner) |
| [LRO en PDS Geosciences](https://pds-geosciences.wustl.edu/missions/lro/) | NASA · Luna | ✅ perfil Luna | LOLA GDR polares (`ldem_80s_40m`) |
| [LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm) | NASA · Luna | ✅ perfil Luna | Polar Resource Products (`dlre_prp_south.tab`) |
| [RCM — CSA](https://donnees-data.asc-csa.gc.ca/en/dataset/rcm) | Agencia asociada (Canadá) | ⏳ prioridad 3 | radar, opcional |
| [RADARSAT-1 — CSA](https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1) | Agencia asociada (Canadá) | ⏳ prioridad 3 | radar, opcional |
| [Tutorial SAR en Python — CSA](https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial) | Agencia asociada (Canadá) | ⏳ | si entra radar |
| [Copernicus Data Space](https://dataspace.copernicus.eu/) | Agencia asociada (ESA) | ✅ | Copernicus DEM GLO-30 (polos), Sentinel-2 |
| [ESA Open Science Catalogue](https://opensciencedata.esa.int/) | Agencia asociada (ESA) | — | solo búsqueda |
| [JAXA G-Portal](https://gportal.jaxa.jp/gpr/index/index) | Agencia asociada (JAXA) | ✅ alternativa | ALOS AW3D30 (lo bajamos por Planetary Computer) |

**Conclusión:** la elegibilidad está cubierta con holgura. Earthdata + PDS/LRO + Worldview son recursos NASA oficiales y forman el núcleo del cálculo (suma en Relevancia). En la entrega, citar el recurso oficial **y** el producto exacto (con DOI).

## Resumen: qué se baja de dónde

| Dimensión | Producto | Resolución | Dónde | ¿Login? | Cómo bajarlo por código |
|---|---|---|---|---|---|
| Temperatura (`lst`) | MOD11C3 v061 — LST mensual | 0,05° (~5,5 km) | LP DAAC (cloud) | Sí, Earthdata | `earthaccess` o CMR-STAC `LPCLOUD` |
| Vegetación (`ndvi`) | MOD13C2 v061 — NDVI mensual | 0,05° | LP DAAC (cloud) | Sí | ídem |
| Nieve (`nieve`) | MOD10CM v61 — nieve mensual | 0,05° | NSIDC (cloud) | Sí | `earthaccess` |
| Cobertura (`cobertura`) | MCD12C1 v061 — cobertura anual | 0,05° | LP DAAC (cloud) | Sí | ídem |
| Lluvia (`lluvia`) | GPM_3IMERGM V07 — lluvia mensual | 0,1° | GES DISC (cloud) | Sí | `earthaccess` |
| Pendiente / rugosidad | NASADEM_HGT v001 | 1″ (~30 m) | **Planetary Computer** `nasadem` | **No** | `pystac-client` + `planetary-computer` + `odc-stac` |
| Pendiente lista | NASADEM_SC v001 (pendiente y curvatura ya calculadas) | 1″ | LP DAAC | Sí | `earthaccess` |
| DEM alternativo 1 | Copernicus DEM GLO-30 | 30 m | Planetary Computer `cop-dem-glo-30` | No | igual que NASADEM |
| DEM alternativo 2 | ALOS World 3D-30m | 30 m | Planetary Computer `alos-dem` | No | igual que NASADEM |

**Hallazgo clave:** los 4 productos MODIS de 0,05° que propone el CLAUDE.md **no están en Planetary Computer** (ahí solo hay versiones diarias/8 días de 500 m–1 km, mucho más pesadas). Se bajan de Earthdata con login. Lo más simple es la librería oficial de NASA **`earthaccess`** (sugerencia: agregarla a `pipeline/requirements.txt`; maneja el login sola):

```python
import earthaccess
earthaccess.login()  # pide usuario/clave de Earthdata la 1ª vez; no guardar credenciales en el repo
granulos = earthaccess.search_data(short_name="MOD11C3", version="061", temporal=("2023-01-01", "2023-12-31"))
earthaccess.download(granulos, "pipeline/raw/MOD11C3")  # 12 archivos globales; raw/ va al .gitignore
```

En cambio NASADEM, Copernicus y ALOS salen de Planetary Computer **sin login** y con el mismo código: eso permite la prueba de sensibilidad a la fuente que pide el Brief (cambiar `nasadem` por `cop-dem-glo-30` y comparar).

## Tierra — fichas y links

- **MOD11C3 v061** ✅ — temperatura de la superficie, promedio mensual, global. Ojo: viene en Kelvin × 0,02 (factor de escala). DOI <https://doi.org/10.5067/MODIS/MOD11C3.061> · [Earthdata Search](https://search.earthdata.nasa.gov/search/granules?p=C2565788897-LPCLOUD)
- **MOD13C2 v061** ✅ — NDVI ("verdor") mensual. DOI <https://doi.org/10.5067/MODIS/MOD13C2.061> · [Earthdata Search](https://search.earthdata.nasa.gov/search/granules?p=C2565788914-LPCLOUD)
- **MOD10CM v61** ✅ — % de nieve mensual. [Earthdata Search](https://search.earthdata.nasa.gov/search/granules?p=C3050353608-NSIDC_CPRD)
- **MCD12C1 v061** ✅ — tipo de cobertura por año (la clase "barren" = suelo desnudo). DOI <https://doi.org/10.5067/MODIS/MCD12C1.061> · [Earthdata Search](https://search.earthdata.nasa.gov/search/granules?p=C2484078896-LPCLOUD)
- **GPM IMERG Final mensual V07 (GPM_3IMERGM)** ✅ — lluvia mensual 0,1°. [Directorio](https://cmr.earthdata.nasa.gov/virtual-directory/collections/C2723754851-GES_DISC/temporal). En Planetary Computer solo está la versión de media hora (`gpm-imerg-hhr`): no conviene.
- **NASADEM_HGT v001** ✅ — alturas a ~30 m, cubre de 56° S a 60° N (**no cubre Antártida ni el Ártico alto**: McMurdo, Haughton, Svalbard, Axel Heiberg e Islandia (Holuhraun, 64,9° N) quedan sin pendiente NASADEM; para esos usar Copernicus GLO-30). DOI <https://doi.org/10.5067/MEASURES/NASADEM/NASADEM_HGT.001> · [Planetary Computer](https://planetarycomputer.microsoft.com/dataset/nasadem)
- **NASADEM_SC v001** ✅ — pendiente ya calculada por NASA a 30 m (ahorra un paso). DOI <https://doi.org/10.5067/MEASURES/NASADEM/NASADEM_SC.001>
- **Copernicus DEM GLO-30** ✅ (ESA, agencia asociada) — [Planetary Computer](https://planetarycomputer.microsoft.com/dataset/cop-dem-glo-30). Es modelo de *superficie*: incluye vegetación/edificios.
- **ALOS AW3D30** ✅ (JAXA, agencia asociada) — [Planetary Computer](https://planetarycomputer.microsoft.com/dataset/alos-dem).
- **Sentinel-2 L2A** ✅ (imágenes de detalle de candidatos) — Planetary Computer `sentinel-2-l2a`. **Sentinel-1 RTC** ✅ (radar, prioridad 3) — `sentinel-1-rtc`.
- **Worldview** — solo para mirar, no para calcular: <https://worldview.earthdata.nasa.gov/>. Cada ficha de la web tiene un botón que abre Worldview sobre la zona con capas equivalentes a nuestras dimensiones (temperatura 8 días, NDVI mensual, nieve mensual, relieve ASTER; color real visible). El "!" amarillo en Worldview = la capa es más gruesa que el zoom (se ve pixelada), no falta de datos.
- **SEGEMAR SIGAM** ✅ (geología de candidatos argentinos): <https://sigam.segemar.gov.ar/>

## Análogos conocidos (validación)

- **USGS — Known Terrestrial Analog Sites for Planetary Science** ✅ — capa de **puntos** con campos `Name`, `AnalogType`, `Lat`, `Lon`, `AnalogBody` (sirve filtrar `AnalogBody` = Moon/Mars). DOI <https://doi.org/10.5066/P9J72921>
  - Ficha: <https://www.sciencebase.gov/catalog/item/5f88940b82cebb8c13d912ee> (Hunter, 2020; dominio público). Archivo: `TerrestrialAnalogs.zip` (shapefile de puntos, ~120 KB). También publicado como servicio ArcGIS y WFS.
  - ⚠️ Cobertura: latitudes de **−34,7° a 75,7°** → **no incluye la Antártida** (McMurdo no está) ni el sur de Argentina/Chile. Los cráteres vienen de la Earth Impact Database, así que hay muchos cráteres.
  - 🚩 **Contenido real (revisado):** de los 192 sitios, **190 son cráteres de impacto**, 1 campo de dunas y 1 erupción volcánica. El campo `AnalogBody` está vacío en 191 (solo 1 dice "Mars"); **ninguno marcado como Luna**. No están Atacama, Mauna Kea, Valles Secos, Death Valley, Lanzarote ni Holuhraun; sí Haughton y Barringer. → Sirve para validar un perfil de *cráteres*, **no** para validar movilidad/hábitat en el polo sur lunar. Ver `datos-faltantes.md`.
  - ⚠️ Son **192 sitios** y las coordenadas del shapefile vienen en **Web Mercator (metros)**, no en grados: `pipeline/01_known_analogs.py` las convierte. El servicio ArcGIS enlazado tiene **solo 4 sitios**: no usarlo.
  - ⚠️ El propio USGS aclara: *"for identification of research areas, not for analysis"*. Sirve para validar el ranking, no como dato de entrada del puntaje.
  - Desde scripts, ScienceBase puede frenar con verificación anti-bots: si pasa, bajarlo desde el navegador. Convertir a `data/known_analogs.geojson` y hacer la división `fit`/`test` con semilla fija ANTES de calcular.

## Luna — polo sur (perfil objetivo)

- **LOLA GDR polares** ✅ — alturas del polo sur. Carpeta: <https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/>
  - Los sitios Artemis III están a menos de ~6° del polo, así que alcanza con **`ldem_80s_40m`** (80–90° S a 40 m/píxel; versión float de 924 MB, en `float_img/`) o **`ldem_85s_20m_float`** (85–90° S a 20 m, 920 MB). Para pruebas rápidas: `ldem_80s_80m_float` (231 MB). Cada `.img` tiene su `.lbl` (la "etiqueta" que GDAL necesita para leerlo: bajar los dos).
- **Diviner — Polar Resource Products** ✅ — temperaturas del polo (máximas, mínimas, estabilidad del hielo). Archivo `dlre_prp_south.tab` (605 MB) en <https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/>. Hay también productos acumulados (`data_derived_pcp/`).
- **Coordenadas de las 9 regiones Artemis III:** no hay un archivo oficial con los polígonos; hay que sacarlas del anuncio de NASA (oct. 2024) o de un paper. Pendiente en `datos-faltantes.md`.

- **Nomenclátor IAU de la Luna (USGS)** ✅ — coordenadas oficiales de los accidentes que dan nombre a las regiones Artemis III (Mons Mouton 16070, Mons Malapert 16338, Haworth 14502, Nobile 4321, de Gerlache 1439, Slater 15325, Shackleton 5450, Cabeus B 8058): <https://planetarynames.wr.usgs.gov/>. Son **centros de accidentes**, no los polígonos de aterrizaje de NASA (NASA no publicó coordenadas de las regiones).
- **Comparador 3D** (`pipeline/02_compare_patches.py` → `data/compare/`): recortes de 20 × 20 km a 80 m. Luna = `ldem_80s_80m_float` (LOLA); Tierra = AWS Terrain Tiles z12 (incluye NASA SRTM). Pendiente, pendiente p90, rugosidad (desvío residual tras quitar la media de 400 m) y desnivel, con el mismo código para ambos cuerpos.

- **Mapa del polo sur lunar** (`pipeline/03_moon_map.py` → `data/moon/`): relieve sombreado de LOLA a 320 m/px y grilla de métricas (ventanas de 20 km cada 4 km). Al hacer clic en la Luna, la web busca las zonas de la Tierra con relieve más parecido usando las mismas métricas del comparador.

- **Globo lunar 3D** (`pipeline/05_moon_globe.py` → `data/moon/globe_*`): NASA SVS CGI Moon Kit (<https://svs.gsfc.nasa.gov/4720>, dominio público): mosaico de color LRO LROC WAC `lroc_color_poles_4k.tif` y relieve LOLA `ldem_4.tif`. Sobre el polo sur va una malla con relieve real: LOLA `ldem_80s_80m` promediado a 800 m (`data/moon/cap_dem.bin`, exagerado ×1,5) con el mapa detallado de `03_moon_map.py` encima.

## Marte (si entra)

- **HiRISE DTM Jezero** `DTEEC_002387_1985_003798_1985_A01` ✅ — <https://www.uahirise.org/dtm/dtm.php?ID=DTEEC_002387_1985_003798_1985_A01>. Guía para abrirlo: <https://www.uahirise.org/dtm/howto.php>
- MOLA y SWIM: no relevados todavía.

## Problema de red (para todo el equipo)

Desde la red de la sede, algunos sitios dan error de certificado SSL (`spaceappschallenge.org`, clonar de GitHub). Los servidores de datos de NASA respondieron bien. Si un script de descarga falla por certificado: **no desactivar la verificación**; probar con otra red (datos del celular) o pedirle al organizador el certificado de la red.

## Cómo seguir sin perderse

1. ~~Pegar la lista de Recursos~~ ✅ hecho (tabla de arriba).
2. Info 2: `earthaccess.login()` con su cuenta Earthdata y bajar **un mes** de MOD11C3 para probar (Fase 0).
3. Mientras tanto, NASADEM desde Planetary Computer no necesita login: se puede empezar ya con pendiente/rugosidad de 2–3 zonas.
4. Bajar a mano la capa USGS y hacer la división fit/test.

## Diseño y tipografías (no son datos)

| Recurso | Uso | Licencia |
|---|---|---|
| Sistema "TerraLunar Science Console" (equipo) | `docs/DESIGN.md` (D-014) | propio |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — análisis de estilo aeroespacial | Sistema anterior, D-012 (reemplazado) | MIT |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (Google Fonts) | Letra de toda la app (D-017; antes Inter + JetBrains Mono) | SIL Open Font License |
| NASA SVS CGI Moon Kit (`data/moon/globe_color.jpg`) | Luna en puntos de la portada (`web/src/HalftoneMoon.tsx`) | Dominio público NASA |

## Consideraciones geomecánicas (D-024)

Criterios y umbrales: documento del equipo de Civil (`docs/consideraciones-geomecanicas.md`). Fuentes que cita:

| Fuente | Uso |
|---|---|
| [NASA's Treasure Map for Water Ice on Mars (JPL)](https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/) | Hielo subsuperficial en Arcadia Planitia |
| [Morgan et al., Availability of Subsurface Water-Ice Resources (NTRS)](https://ntrs.nasa.gov/api/citations/20205008958/downloads/Morgan_etal_NA_Perspective_NATASTRON_19122833C%20.pdf) | Exceso de hielo, regolito y morfología periglaciar |
| [NASA HLS2 Newsletter · Arcadia Planitia](https://www.nasa.gov/wp-content/uploads/2015/06/hls2_newsletter_02-19_v19_tagged.pdf) | Restricciones de ingeniería y portancia |
| [NASA PDS Geosciences Node](https://pds-geosciences.wustl.edu/) | MOLA / LOLA para calibrar umbrales |


## Datos terrestres para la ficha geomecánica (D-025, `pipeline/11_geomechanics.py`)
| Fuente | Uso | Acceso |
|---|---|---|
| [NASADEM HGT v001](https://planetarycomputer.microsoft.com/dataset/nasadem) (NASA/JPL) | pendiente 30 m, refugio, morfología (56° S–60° N) | Planetary Computer, sin login |
| [MODIS MOD11A2.061](https://planetarycomputer.microsoft.com/dataset/modis-11A2-061) (NASA LP DAAC) | amplitud térmica diaria y estacional, 2024 | Planetary Computer, sin login |
| [Copernicus DEM GLO-30](https://planetarycomputer.microsoft.com/dataset/cop-dem-glo-30) (ESA) | igual que NASADEM fuera de su cobertura | Planetary Computer |
| [Sentinel-2 L2A](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a) (ESA) | NIR B08 y NDVI | Planetary Computer |
| [ESA WorldCover 2021 v200](https://planetarycomputer.microsoft.com/dataset/esa-worldcover) | supermáscara (agua, urbano, cultivo) | Planetary Computer |
| [SoilGrids 2.0 `bdod`](https://www.isric.org/explore/soilgrids) (ISRIC; Poggio et al. 2021, doi:10.5194/soil-7-217-2021) | densidad aparente del suelo | WCS `maps.isric.org`, sin login |
| [Global Permafrost Zonation Index](https://microsite.geo.uzh.ch/cryodata/pf_global/) (Gruber 2012, doi:10.5194/tc-6-221-2012) | probabilidad de permafrost | binario de 3,1 GB leído por rangos HTTP |
| [IAU Gazetteer, Arcadia Planitia (Feature 348)](https://planetarynames.wr.usgs.gov/Feature/348) | centro del destino Arcadia | web |
| Zhang et al. 2020, *Science Advances* 6:eaaz1334 | dosis en la superficie lunar (contraste del documento de Civil) | paper |
