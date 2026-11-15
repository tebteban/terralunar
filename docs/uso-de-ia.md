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
| 2026-11-14 | OpenAI Codex | Reparación de integración develop: seis conflictos resueltos, navegación/portada de develop conservadas, comparación científica, ML y cobertura reconectados; build/lint/22 pruebas y filtro Chrome verificados. |
| 2026-11-14 | OpenAI Codex | Integración de selección planetaria, segunda región Hawái, Sentinel-2 reciente con calibración XML/QA, contexto geológico puntual y evaluación de transferencia del ML. Datos faltantes conservados explícitos; ver flujo-integrado.md. |
| 2026-11-14 | OpenAI Codex | Registro extensible de regiones, filtro de área por coordenadas, WorldCover dinámico para Hawái, Sentinel multifecha regional y estado de consulta sin resultados exportable. |
