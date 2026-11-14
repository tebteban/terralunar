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
