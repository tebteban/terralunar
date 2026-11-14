# Análogos de referencia para validar — BORRADOR para revisión de Civil

**Estado:** borrador armado con IA (Claude Code) a partir de búsquedas web el 14/11/2026. **Civil tiene que revisarlo** antes de usarlo; después se convierte a GeoJSON. Las coordenadas son **aproximadas** (nivel de sitio, no de punto exacto): verificar cada una en Worldview antes de congelar.

## Para qué sirve

Es el "examen" del ranking: lugares donde **ya se ensayó** algo para la Luna. Si el método funciona, los sitios de `test` deberían quedar arriba en el ranking **del preset que corresponde** (un sitio de excavación se evalúa con el preset `excavacion`, no con `movilidad`).

La capa USGS (`data/known_analogs.geojson`) no sirve para esto: son casi todos cráteres. Ver `fuentes.md`.

## División fit/test

Misma regla que `pipeline/01_known_analogs.py`: hash SHA-1 del nombre (columna "Nombre clave"), 30 % a `test`. Ya está calculada abajo y **no se cambia después de ver resultados**. Si Civil agrega o saca sitios, la regla decide sola el grupo del sitio nuevo.

## Lista

| # | Nombre clave | Lugar | Lon, Lat (aprox.) | Preset | Qué se ensayó | Split | Fuente |
|---|---|---|---|---|---|---|---|
| 1 | Black Point Lava Flow | Arizona, EE.UU. | −111.43, 35.70 | movilidad (+hábitat) | Desert RATS: rover presurizado (LER), 2 tripulantes 14 días dentro del rover; D-RATS 2022 para Artemis | fit | [NASA D-RATS 2022 Test Report](https://ntrs.nasa.gov/api/citations/20230017073/downloads/D-RATS%202022%20Test%20Report%20Final.pdf) · [Phys.org 2009](https://phys.org/news/2009-09-nasa-lunar-robotics-arizona.html) |
| 2 | Cinder Lake Crater Field | Flagstaff, Arizona | −111.47, 35.30 | movilidad | Campo de cráteres artificiales (1967) que copia una zona lunar; entrenamiento Apollo con rover "Grover" y navegación | **test** | [Apollo program training](https://en.wikipedia.org/wiki/Apollo_program_training) · [NAU Special Collections](https://library.nau.edu/speccoll/exhibits/daysofarchives/lunar.html) |
| 3 | Moses Lake Sand Dunes | Washington, EE.UU. | −119.33, 47.05 | movilidad | Ensayos lunares 2008 de rovers, robots exploradores, carga y trajes en dunas | **test** | [Astronomy.com 2008](https://www.astronomy.com/space-exploration/nasa-tests-lunar-robots-and-spacesuits-on-earthly-moonscape/) |
| 4 | Haughton Crater | Isla Devon, Canadá | −89.68, 75.38 | movilidad | Rovers K10 (NASA Ames) simulando misión lunar (2007); cráter de ~20 km, tamaño similar a Shackleton (~19 km, polo sur lunar) | fit | [NTRS 20110008151](https://ntrs.nasa.gov/api/citations/20110008151/downloads/20110008151.pdf) · [CMU 2009](https://publications.ri.cmu.edu/storage/publications/pub_files/2009/3/2498-analogs.pdf) |
| 5 | PISCES Mauna Kea | Hawái, EE.UU. | −155.46, 19.76 | excavación | Ensayo ISRU 2010: RESOLVE (prototipo para polos lunares) perforó tefra y detectó hidrógeno/agua; extracción de oxígeno | **test** | [NTRS 20100033667](https://ntrs.nasa.gov/citations/20100033667) · [NTRS 20110001573](https://ntrs.nasa.gov/api/citations/20110001573/downloads/20110001573.pdf) |
| 6 | Yungay (Atacama) | Chile | −70.01, −24.08 | excavación | ARADS (2015–2019): rover KREX-2 con taladro de 2 m y brazo de muestras | fit | [NASA Astrobiology](https://astrobiology.nasa.gov/news/nasa-tests-life-detection-drill-in-the-atacama-desert/) · [Phys.org 2017](https://m.phys.org/news/2017-03-mars-rover-drilling-life-chile.html) |
| 7 | McMurdo / Ross Island | Antártida | 166.67, −77.85 | excavación | IceBreaker: perforación autónoma a 1 m en tefra cementada con hielo "análogo lunar" (fuente secundaria: blog) | fit | [Blog NASA Ames](https://blogs.nasa.gov/mission-ames/tag/dry-valleys) |
| 8 | HI-SEAS Mauna Loa | Hawái, EE.UU. | −155.487, 19.602 | hábitat | Hábitat de simulación de misiones largas, sitio "tipo Marte y Luna" | fit | [hi-seas.org](https://www.hi-seas.org/about-hi-seas) |
| 9 | Askja | Islandia | −16.75, 65.05 | geología (EVA) | Entrenamiento geológico de astronautas Apollo (1965 y 1967) | fit | [Apollo program training](https://en.wikipedia.org/wiki/Apollo_program_training) · [Exploration Museum](https://www.explorationmuseum.com/astronaut-training/) |
| 10 | Sudbury | Ontario, Canadá | −81.00, 46.60 | geología (EVA) | Travesía simulada de Apollo 16 (1971) y entrenamiento de Apollo 17; brechas de impacto | **test** | [CBC](https://amp.cbc.ca/news/canada/sudbury/apollo-asronauts-trained-sudbury-50-years-ago-1.6096556) · [Frontiers 2023](https://www.frontiersin.org/journals/astronomy-and-space-sciences/articles/10.3389/fspas.2023.1186173/text) |
| 11 | Lanzarote (Caldera Blanca) | Canarias, España | −13.70, 29.06 | geología (EVA) | Curso ESA PANGAEA de geología para astronautas (NASA, ESA, JAXA) | fit | [ESA — What is PANGAEA](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/CAVES_and_PANGAEA/What_is_PANGAEA) |
| 12 | Ries Crater | Baviera, Alemania | 10.57, 48.88 | geología (EVA) | Etapa del curso PANGAEA (cráter de impacto) | **test** | [ESA 2026](https://www.esa.int/ESA_Multimedia/Images/2026/09/Space_explorers_in_the_land_of_volcanoes) |
| 13 | Craters of the Moon (Kings Bowl) | Idaho, EE.UU. | −113.21, 42.94 | geología (EVA) | FINESSE (NASA SSERVI, 2014–2015): casi todo tipo de rasgo volcánico lunar presente | **test** | [NTRS 20190031834](https://ntrs.nasa.gov/api/citations/20190031834/downloads/20190031834.pdf) |
| 14 | Flakstadoy (Lofoten) | Noruega | 13.20, 68.10 | geología (EVA) | PANGAEA desde 2022: **análogo de la corteza primaria lunar (anortosita)** | fit | [IAC 2024](https://iafastro.directory/iac/paper/id/86963/abstract-pdf/IAC-24,B3,IP,10,x86963.brief.pdf) |

## Lo que tiene que decidir Civil

1. **¿Cada sitio va en el preset correcto?** Sobre todo Black Point (movilidad y también hábitat: la tripulación vivió en el rover).
2. **Hábitat tiene un solo sitio y queda sin `test`.** Faltan análogos de hábitat/cimientos con fuente.
3. **"Geología (EVA)" no es uno de nuestros presets.** Sirven para contar la historia y, si se suma una dimensión de composición, Lofoten (anortosita) es el más relevante para el polo sur lunar.
4. **Cobertura de datos:** Haughton, Askja, Lofoten y McMurdo están fuera de NASADEM (56° S–60° N) → usar Copernicus GLO-30 para su pendiente.
5. **Son pocos sitios:** con 1 o 2 en `test` por preset, un porcentaje engaña. Reportar **la posición de cada sitio de `test`** (como pide el Brief), no solo "% en el 10 % superior".
6. Ningún sitio argentino tiene ensayos documentados que hayamos encontrado: los candidatos argentinos van como **hallazgos nuevos**, no como referencia.
