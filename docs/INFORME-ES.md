# TerraLunar — Análogos terrestres para la exploración de la Luna y Marte

**Equipo: Q’Kodigo**  
**Desafío: Permanent Moon Base Locations and Mars**

Informe en español basado en el contenido presentado en la página global del proyecto.

## Enlaces de la entrega

- [Aplicación / prototipo](https://terralunar.vercel.app/)
- [Video de demostración presentado — Google Drive](https://drive.google.com/file/d/1i1exd-LTANsil_pLn8Y0zhMLzCU4yfFa/view)
- [Página del equipo en NASA Space Apps](https://www.spaceappschallenge.org/2026/find-a-team/qkodigo/)
- [Repositorio del proyecto](https://github.com/tebteban/terralunar)
- [Créditos, fuentes y herramientas: registro completo](CREDITOS.md)

Se presentó una demostración en video. Este informe no incluye una presentación de diapositivas. El enlace de Drive no es un enlace de YouTube ni certifica por sí solo el cumplimiento del formato solicitado para el pitch local.

## Resumen

TerraLunar es una aplicación web interactiva que permite identificar e investigar análogos topográficos terrestres para la exploración lunar y marciana. La persona selecciona un destino planetario y una región terrestre disponible, y compara características del terreno mediante un ranking explicable y vistas tridimensionales sincronizadas.

El prototipo utiliza datos de elevación lunares y marcianos de la NASA junto con elevaciones terrestres para comparar pendiente, rugosidad y desnivel a una escala de análisis común. Puede proponer ventanas de terreno fuera del catálogo de referencia consultado, ampliando la exploración más allá de una lista de análogos conocidos.

Cada comparación expone sus fuentes, mediciones y limitaciones. El puntaje representa semejanza topográfica bajo la configuración seleccionada, no seguridad de una misión ni equivalencia ambiental completa. TerraLunar ayuda a convertir datos planetarios en evidencia para decidir dónde realizar investigaciones de campo y posibles ensayos tecnológicos.

## El problema

Antes de probar tecnologías de exploración en la Luna o Marte, científicos e ingenieros necesitan ambientes terrestres adecuados. El parecido visual no basta: las características relevantes dependen del ensayo, de la evidencia disponible y de la escala espacial.

## Nuestra solución

TerraLunar conecta destinos planetarios con regiones candidatas de la Tierra. Permite seleccionar un objetivo, configurar una comparación disponible, inspeccionar candidatos ordenados y explorar los terrenos planetario y terrestre lado a lado.

## Funcionamiento del prototipo

El análisis implementado se centra en la analogía topográfica regional. Compara descriptores derivados de elevación, entre ellos pendiente, rugosidad y desnivel total, mediante diferencias normalizadas y pesos explícitos. Utiliza una escala común e informa las fuentes y resoluciones de los datos.

La búsqueda evalúa ventanas de terreno disponibles y preprocesadas. Puede identificar candidatos fuera del catálogo consultado, pero todavía no realiza una búsqueda continua y exhaustiva de cada lugar del planeta.

### Recorrido de uso

1. Seleccionar un destino lunar o marciano.
2. Elegir la comparación disponible y la región de búsqueda.
3. Ejecutar el análisis e inspeccionar el ranking de candidatos.
4. Abrir una región terrestre para revisar su ubicación y mediciones.
5. Comparar los dos recortes en 3D y consultar sus diferencias y fuentes.

## Exploración interactiva

Los mapas aportan contexto geográfico. La selección de un candidato permite consultar su ubicación, mediciones y evidencia. El comparador 3D sincronizado permite girar ambos recortes, inspeccionar sus diferencias y exportar información para continuar el análisis. La exageración vertical de visualización se identifica por separado de las mediciones analíticas.

## Datos y recursos de la NASA

- [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm): elevación lunar.
- [Mars Global Surveyor MOLA](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg032/): elevación marciana.
- [LRO Diviner](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm): evidencia térmica lunar disponible.
- [MODIS MOD11A1.061](https://doi.org/10.5067/MODIS/MOD11A1.061): observaciones de temperatura superficial terrestre.
- [NASA Mars Trek](https://trek.nasa.gov/mars/): imágenes Viking y THEMIS.
- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720): recursos de visualización lunar.
- [NASA Worldview](https://worldview.earthdata.nasa.gov/): exploración visual complementaria.

La elevación alimenta la comparación topográfica. La evidencia térmica y las imágenes tienen funciones distintas y no deben interpretarse como una validación ambiental integral. Las imágenes no reemplazan las mediciones de elevación.

## Fuentes complementarias

Copernicus Sentinel-2 y ESA WorldCover aportan evidencia de cobertura donde fue procesada. AWS Terrain Tiles proporciona elevación terrestre. SEGEMAR SIGAM y la cartografía del USGS aportan contexto geológico; el catálogo de análogos del USGS sirve como referencia. Esri World Imagery aporta imágenes terrestres. Los enlaces, atribuciones y archivos que documentan su uso se encuentran en el [registro de créditos](CREDITOS.md).

## Creatividad e impacto esperado

TerraLunar combina búsqueda de candidatos, puntajes transparentes, exploración geográfica e inspección sincronizada de terrenos. Además de consultar sitios establecidos, permite investigar otras ventanas y entender la evidencia de su clasificación.

Su impacto esperado es apoyar la selección inicial de lugares para investigar en campo y preparar ensayos de tecnologías de exploración.

## Tecnología

La aplicación combina React y TypeScript, cartografía interactiva con MapLibre, visualización tridimensional y procesamiento geoespacial con Python. El registro de créditos contiene las bibliotecas y herramientas empleadas.

## Alcance científico y limitaciones

La semejanza topográfica no demuestra equivalencia geológica, capacidad portante, condiciones térmicas, recursos o habitabilidad. El análisis regional tampoco resuelve rocas individuales ni certifica transitabilidad de rovers.

La Tierra no reproduce la gravedad lunar o marciana, el vacío lunar ni la atmósfera de Marte. Estas diferencias son parte de la interpretación de cualquier análogo.

Las extensiones previstas incluyen comparaciones geológicas, térmicas, de recursos y procesos superficiales con validación independiente. Aunque existen evidencias complementarias integradas, cada comparación completa requiere datos adecuados, un método definido y validación específica para el ensayo.

## Uso de inteligencia artificial

Se utilizó asistencia de OpenAI Codex y Claude para programación, depuración, investigación, diseño, documentación y preparación de la presentación. El uso de estas herramientas está declarado en el [registro de créditos](CREDITOS.md) y el [registro de uso de IA](uso-de-ia.md). La asistencia para desarrollar el software no implica que el puntaje mostrado sea una predicción de aptitud validada.
