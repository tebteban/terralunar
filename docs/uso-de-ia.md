# Uso de IA

Registro de todo texto o código generado con IA (requisito de la NASA: qué herramienta, dónde, cómo).

| Fecha | Herramienta | Qué se generó | Revisado por |
|---|---|---|---|
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Scaffold de `web/` (Vite + React + TS + Tailwind), componentes del mapa (MapLibre), sliders, ranking y ficha con radar (Recharts) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | `pipeline/00_mock_data.py` y los datos FALSOS `data/zones.json`, `data/known_analogs.geojson` (puntajes inventados) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | `data/profiles.json`: umbrales difusos y pesos de presets PROVISORIOS para la Luna | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Textos de la ficha: aviso de límites de la analogía | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | `docs/fuentes.md`: relevamiento de productos consultando NASA CMR, Planetary Computer STAC, PDS Geosciences y USGS | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | `pipeline/01_known_analogs.py` (lector de shapefile y división fit/test) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | `docs/analogos-referencia.md`: borrador de 14 análogos de ensayo con fuentes (búsqueda web), pendiente de revisión de Civil | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Botón "Abrir en Worldview" en la ficha (`web/src/ZoneCard.tsx`) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Vista 3D del terreno al abrir una ficha (MapLibre terrain + sombreado) en `web/src/MapView.tsx` | — |
| 2026-11-14 | OpenAI Codex | Integración del atlas global como vista independiente y navegación entre perfiles de misión y exploración por punto | — |
| 2026-11-14 | OpenAI Codex | Retiro de la navegación al explorador; globo terrestre MapLibre con imágenes por teselas, transición al mapa original y botón Ver planeta | — |
| 2026-11-14 | OpenAI Codex | Fondo espacial decorativo en CSS: estrellas, banda galáctica y cuerpos estilizados; desvanecimiento con zoom y movimiento reducido | — |
| 2026-11-14 | OpenAI Codex | Visor lunar opcional Cesium Moon con selector Tierra/Luna y token de sesión | — |
| 2026-11-14 | OpenAI Codex | Vuelo lunar inclinado al hacer doble clic y persistencia local del token de Cesium | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Comparador 3D Luna vs Tierra: `pipeline/02_compare_patches.py` (recortes LOLA y tiles de elevación, métricas) y `web/src/Compare3D.tsx` (three.js) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Aplicación de docs/DESIGN.md a la web: tokens de color, Inter, pills, cards y límites en card negra | — |
| 2026-11-14 | OpenAI Codex | Cámara lunar con vuelo inclinado al acercarse y selección del terreno 3D real | — |
| 2026-11-14 | OpenAI Codex | Encuadre lunar inclinado y más amplio para visualizar el relieve en contexto | — |
| 2026-11-14 | OpenAI Codex | Zoom lunar con vuelos progresivos al cursor, inclinación gradual hasta 60°, orientación como Tierra y botón Ver planeta; conserva teselas de relieve lunar | — |
| 2026-11-14 | OpenAI Codex | Suavizado del zoom lunar por fotogramas con amortiguación temporal, anclaje central estable, orientación conservada e interrupción inmediata al arrastrar; build y lint verificados | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Vista "Polo sur lunar": `pipeline/03_moon_map.py` (mapa LOLA y grilla de métricas) y `web/src/MoonMap.tsx` (clic en la Luna → lugares parecidos en la Tierra); panel y comparador en variante oscura | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Análisis de la web en el navegador y propuestas de mejora; en `web/src/App.tsx`: preset "Personalizado" con "Restaurar", pesos en % real y aviso con pesos en 0 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Borradores de `docs/decisiones.md`, `docs/roadmap.md` y `docs/arquitectura.md` | — |
| 2026-11-14 | OpenAI Codex | Marte MapLibre sin token con MOLA público, extracción regional, ranking exploratorio y comparador Marte/Tierra; documentación y pruebas numéricas | — |
| 2026-11-14 | OpenAI Codex | Capas públicas NASA Mars Trek Viking y THEMIS reproyectadas a MapLibre sobre relieve MOLA, con selector y atribución | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Globo lunar 3D (`web/src/MoonGlobe.tsx`, three.js) y `pipeline/05_moon_globe.py`; reemplaza el mapa plano del polo sur | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Fusión de la Luna: pestaña única con Cesium de Eze (si hay token) o globo propio three.js (sin token), clic en el polo sur → panel de análisis; `web/src/moonProj.ts` | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Zoom del globo lunar: hacia el cursor, proporcional a la altura, vuelos por la curva de la Luna y puntos de sitios de tamaño fijo (`web/src/MoonGlobe.tsx`) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Cámara del globo lunar estilo mapa (igual que la de Eze): zoom al centro, inclinación 0°–60° entre 800 y 45 km, arrastre que desplaza, clic derecho gira, botón Ver planeta | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Relieve 3D real del polo sur en el globo lunar (malla LOLA a 800 m, cámara y marcas sobre el terreno) | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Unificación Tierra/Luna/Marte: inclinación automática al hacer zoom en la Tierra, panel de Marte con el formato de la Luna y límites de la analogía de Marte (`web/src/limits.ts`), comparador 3D Luna o Marte desde la ficha terrestre (franjas MOLA bajo demanda en `web/src/marsData.ts`) y desde el panel lunar (LOLA a 800 m) | — |
| 2026-11-14 | OpenAI Codex | Comparador marciano con recortes visuales MOLA/HRSC a 200 m, lectura parcial COG y remuestreo terrestre; métricas originales conservadas | — |
| 2026-11-14 | OpenAI Codex | Selector marciano limitado a Viking y THEMIS, cambio de visibilidad sin fundido entre teselas y selección conservada durante la carga | — |
| 2026-11-14 | OpenAI Codex | Carga progresiva de Marte: imágenes antes de MOLA, cuatro descargas simultáneas y selección protegida contra respuestas obsoletas. Luna: visor independiente de métricas y reutilización en memoria de binarios. Build, lint y seis pruebas correctos; tiempos visuales pendientes de medición. |
| 2026-11-14 | OpenAI Codex | Vista global local Viking/THEMIS bajo teselas remotas, detalle desde zoom 2, caché compartida limitada a 96 imágenes y liberación de bitmaps ante errores. Descargas originales NASA registradas en data/mars/preview/sources.json. Build, lint y seis pruebas correctos. |
| 2026-11-14 | OpenAI Codex | Rotación lenta compartida de Tierra y Marte en vista global, con arranque suave, pausa durante interacción y vuelos, reanudación tras seis segundos, desactivación al acercarse y respeto de movimiento reducido. Build y lint correctos. |
| 2026-11-14 | OpenAI Codex | Eliminado selector y formulario de token lunar. Cesium usa credencial existente; si falta, falla o excede 25 s de inicialización, alternativa local LRO/LOLA automática, identificada en pantalla. No se elimina la autenticación requerida por Cesium ion. |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Actualización de `docs/roadmap.md`, `docs/decisiones.md` (D-009, D-010) y `docs/arquitectura.md` con Marte y el globo lunar 3D | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Portada animada y búsqueda personalizada: `web/src/Landing.tsx`, `web/src/CustomSearch.tsx`, navegación por pantallas en `web/src/App.tsx`, animaciones en `web/src/index.css`; D-011 y roadmap | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Rediseño de portada y búsqueda personalizada: Luna en trama de puntos con textura LRO (`web/src/HalftoneMoon.tsx`), barra de pasos, vista previa del ranking en vivo, tipografías Archivo y JetBrains Mono | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) + skill `design-md` | Cambio de sistema de diseño al estilo aeroespacial: `docs/DESIGN.md` (copiado de VoltAgent/awesome-design-md, MIT, con sección de adaptación), tokens en `web/src/index.css`, portada en bandas, Personalizado y panel lateral de Explorar | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Portada mínima: título animado letra por letra, tres opciones en tarjetas horizontales y Luna de fondo como horizonte (`web/src/Landing.tsx`, `web/src/index.css`, `web/src/HalftoneMoon.tsx`); D-013 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Adaptación de todas las pantallas al sistema "TerraLunar Science Console" del equipo (tokens, banner de datos, barra lateral, ficha, paneles Luna/Marte, comparador, `LimitsCard.tsx`); `docs/DESIGN.md` con sección de adaptación; D-014 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Diagnóstico con Chrome por CDP y arreglo de contextos WebGL sin liberar (`Compare3D.tsx`, `MoonGlobe.tsx`), paneles que achicaban botones y precedencia de clases de botón; D-015 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Comparador 3D rehecho según la maqueta (visor de alto fijo, retícula, índice de relieve) y `web/src/moonRelief.ts` compartido con el panel lunar | — |
| 2026-11-14 | OpenAI Codex | Rediseño científico de interfaz existente: barra superior, configuración, visor y resultados; portales para paneles planetarios; controles, responsive y accesibilidad; conservación de motores y cálculos. Build/lint/6 pruebas y recorridos Chrome de tres planetas, ranking y comparador; ver docs/REDESIGN.md. |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Mezcla del rediseño de Eze (main, c891b87) con develop: se conserva Science Console y se integran diálogo "Fuentes y método", pantalla completa, restablecer pesos, resumen de Luna/Marte en la barra lateral, controles de cámara (mapa, globo lunar, Marte), comparador a pantalla completa y coordenadas en la ficha; D-016 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) + skill `ui-ux-pro-max` | Ajuste orgánico y suave del diseño: tokens de color, radios, sombras, transiciones, foco visible y tipografía Plus Jakarta Sans (`web/src/index.css`, `web/index.html`); banner discreto y contraste de rótulos; D-017 | — |
| 2026-11-14 | Claude Code (Claude Opus 5.5) | Portada: opciones sin cajas con entrada deslizada, resalte al pasar el cursor y atenuación de las demás (`web/src/Landing.tsx`, `web/src/index.css`); D-018 | — |
| 2026-11-14 | OpenAI Codex | Implementación visual basada en las cuatro pantallas y DESIGN.md del ZIP Stitch del usuario; navegación negra, fichas blancas, Inter/JetBrains Mono, radar y comparador. Conserva datos y motores, sin copiar cifras ficticias de la maqueta. Ver docs/REDESIGN.md. |
| 2026-11-14 | OpenAI Codex | Reparación de integración develop: seis conflictos resueltos, navegación/portada de develop conservadas, comparación científica, ML y cobertura reconectados; build/lint/22 pruebas y filtro Chrome verificados. |
| 2026-11-14 | OpenAI Codex | Integración de selección planetaria, segunda región Hawái, Sentinel-2 reciente con calibración XML/QA, contexto geológico puntual y evaluación de transferencia del ML. Datos faltantes conservados explícitos; ver flujo-integrado.md. |
| 2026-11-14 | OpenAI Codex | Registro extensible de regiones, filtro de área por coordenadas, WorldCover dinámico para Hawái, Sentinel multifecha regional y estado de consulta sin resultados exportable. |
| 2026-11-14 | OpenAI Codex | Paginación STAC acotada y verificable, consulta sin descarga, pruebas de cursores, deduplicación y truncamiento; conserva datos procesados. |
| 2026-11-15 | Claude Code (Claude Fable 5.1) + skills `impeccable`, `ui-ux-pro-max`, Playwright MCP | Auditoría de diseño y UX (`AUDIT.md`), dirección de arte (`DESIGN.md`), suite e2e (`web/e2e/`, `web/playwright.config.ts`), layout por pestañas en pantallas angostas, fallback sin WebGL (`webgl.ts`, `NoWebGL.tsx`), formato de datos (`fmt.ts`), leyenda del mapa, Δ con tolerancia en el comparador, tokens e íconos (`index.css`, `ConsoleIcon.tsx`), carga diferida de visores; `CHANGELOG-DESIGN.md`; D-019 | — |
| 2026-11-15 | OpenAI Codex | Auditoría de navegación Luna/Marte, destinos, perfiles de ensayo, huellas de recortes terrestres y pruebas de regresión | — |

| 2026-11-15 | OpenAI Codex | Revisión de merge c396da6 en develop, SurfacePanel compartido, Luna local sin token, formato y caché del comparador |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Panel lateral de Tierra rediseñado: tarjeta Objetivo con lo que pide la Luna, pesos con barra apilada y 5 niveles, ranking top 5 con filtros (Todos/Conocidos/Nuevos/Argentina) y tarjeta de Validación (`web/src/App.tsx`, `SHORT` en `score.ts`) | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Portada: íconos de Luna y Marte renderizados con datos reales (`pipeline/06_landing_icons.py`: LRO LROC y MOLA), globo de líneas, secciones Cómo funciona, cifras (calculadas de los datos), ejemplo Mons Mouton ↔ McMurdo con botón al comparador y pie con el equipo | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Panel lateral ocultable con barra izquierda en Luna, Marte y búsqueda personalizada (`web/src/App.tsx`, `web/src/index.css`); D-020 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Ficha de Luna y Marte como pestaña flotante desplegable (`web/src/SurfacePanel.tsx`, `MoonMap.tsx`, `MarsView.tsx`); D-021 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Recentrado del globo lunar según la ficha plegada o desplegada (`SurfacePanel` controlado, `MoonGlobe panelOpen`); D-021 | — |

| 2026-11-15 | OpenAI Codex | AnalysisRun compartido, ficha con evidencia real, retiro del mock del recorrido principal, continuidad con comparador 3D y pruebas de integración |

| 2026-11-15 | OpenAI Codex | Paso 3: requisitos por ensayo, separación de contexto topográfico y compatibilidad pendiente, pruebas unitarias y de navegador |
| 2026-11-15 | OpenAI Codex | Ingestión MOD11A1 HDF real con QC, proyección, percentiles día/noche, evidencia en ficha y exportación; pruebas. Paso 4 parcial: sin índice térmico ni series planetarias integradas. |

| 2026-11-15 | OpenAI Codex | Adaptación de D-020 y D-021 al flujo de ejecución científica y evidencia MODIS | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Panel izquierdo ocultable y ficha flotante también en la Tierra, sobre el flujo unificado (`web/src/App.tsx`); D-020/D-021 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Fondo orgánico continuo de la portada con manchas difusas en movimiento, grano y viñeta (`web/src/OrganicBackdrop.tsx`, `Landing.tsx`, `index.css`); D-022 | — |
| 2026-11-15 | OpenAI Codex | Ingestión de unidades USGS para nueve destinos y franjas térmicas LRO Diviner; cruce con MODIS por hora solar y evidencia en ficha y exportación. | — |
| 2026-11-15 | OpenAI Codex | 75 ventanas DEM en Tassili, Lut y Chihuahua; vista inicial de candidatos fuera del catálogo y exclusión por proximidad también en búsquedas regionales. | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Mapa y ranking con el mismo filtro (`App.tsx`, `ScientificSearch.tsx`); suite e2e actualizada al flujo vigente (`web/e2e/`); búsqueda regional que usa solo el índice del catálogo (`globalSearch.ts`, `marsData.ts`); D-023 (atlas fuera de la entrega); README de `web/` | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Traducción a código del documento de consideraciones geomecánicas de Civil: `web/src/geomechanics.ts`, `GeomechanicsCard.tsx`, pruebas `web/test/geomechanics.test.ts`; datos faltantes y D-024. El contenido técnico (criterios, umbrales, pesos, fuentes) es del equipo | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Comparador 3D más rápido en Marte: COG en bloques de 1 MB abierto una vez por sesión y una sola malla terrestre en vez del catálogo (`Compare3D.tsx`, `marsData.ts`) | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Exportación desde el comparador 3D: datos de la comparación en JSON y modelos STL/OBJ de cada relieve (`terrainExport.ts`, `Compare3D.tsx`, tests) | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | STL con base sólida; búsqueda de análogos que se cierra al terminar y rediseño de la ventana (`ScientificSearch.tsx`, `AnalogyScope.tsx`, `index.css`, e2e); D-025 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Atlas auxiliar de vuelta en `data/explorador/` con su archivo de datos; D-026 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Comparador 3D con relieve terrestre real a 80 m para cualquier candidato (tiles AWS Terrarium, `earthTerrain.ts`) y mallas sin suavizar (`terrainExport.ts`, `Compare3D.tsx`, tests) | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Búsqueda de los datos faltantes de la ficha geomecánica: `pipeline/11_geomechanics.py` (SoilGrids, PZI, NASADEM/Copernicus, Sentinel-2, MODIS, WorldCover), `data/geomechanics/earth.json`, `web/src/geoEarth.ts`, criterios con datos reales en `geomechanics.ts`, Arcadia Planitia en `marsData.ts`, pruebas; contraste de cifras con Morgan et al. y Zhang et al.; D-027 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Panel de validación con análogos USGS reservados: `pipeline/12_validation.py`, `web/src/validation.ts`, `ValidationPanel.tsx`, función compartida `reliefScore` en `globalSearch.ts`, pruebas `web/test/validation.test.ts`; D-028 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Calibración de tolerancias con datos reales (`pipeline/13_calibrate_tolerances.ts`, `data/validation/calibration.json`, `TOLERANCES` en `marsData.ts`), regla de umbral 0 "no informativa" en `validation.ts`/`ValidationPanel.tsx`, borrado de datos mock; D-029, D-030 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Interfaz en inglés por defecto con botón EN/ES (`web/src/i18n.ts`, `i18n-en.json` con las traducciones al inglés, `LanguageToggle.tsx`, `fmt.ts` según idioma, `e2e/i18n.spec.ts`); guiones de video (`docs/guiones-video.md`); D-031 | — |
| 2026-11-15 | Claude Code (Claude Opus 5.5) | Se quita el reproductor de música del logo del equipo (`TeamMusic.tsx` y `data/musica/` borrados; el logo queda como imagen fija en `Landing.tsx`) | — |
