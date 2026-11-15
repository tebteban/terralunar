# CHANGELOG-DESIGN.md — Qué cambió tras la auditoría (2026-11-15)

Base: `develop` 0cfa83e · Informe: `AUDIT.md` · Dirección: `DESIGN.md` · Decisión: `docs/decisiones.md` D-019.
Capturas antes/después en `docs/audit/before/` y `docs/audit/after/` (mismo nombre de archivo = misma pantalla).

## 1. Bugs críticos y accesibilidad

| Cambio | Por qué | Dónde | Antes → Después |
|---|---|---|---|
| Fallback sin WebGL en Tierra, Luna, Marte y maquetas | Sin WebGL la app quedaba negra y React desmontaba todo | `web/src/webgl.ts`, `NoWebGL.tsx`, `MapView.tsx`, `MoonMap.tsx`, `MarsView.tsx`, `Compare3D.tsx` | test `webgl.spec` fallaba → pasa |
| Pantallas angostas (< 1024 px): pestañas `Ajustes · Mapa · Ranking`, barra lateral como panel, fichas como hoja inferior, selector de cuerpo compacto | Desborde horizontal (454 px en 390), ranking enterrado, ficha tapaba el selector en tablet | `App.tsx` (`panel`), `ZoneCard.tsx`, `MoonMap.tsx`, `MarsView.tsx`, `MoonGlobe.tsx`: `md:` → `lg:` | `before/03-explorar-390.png` → `after/03-explorar-390.png`, `after/03b-ranking-390.png`, `before/04-ficha-768.png` → `after/04-ficha-768.png` |
| Ficha entre 1024 y 1279 px empieza debajo del selector de cuerpo | A esos anchos la ficha de 420 px pisaba la navegación | `lg:top-[7.5rem] xl:top-6` en las tres fichas | — |
| Objetivos táctiles: segmentados a 40 px, chips de sitios 36 px, botones de lista 40 px, controles de MapLibre 36 px, enlaces "Editar/Restaurar" con área extendida | 23 controles medían 20–32 px | `App.tsx`, `CustomSearch.tsx`, `MoonMap.tsx`, `MarsView.tsx`, `index.css` (`.btn-sm`, `.maplibregl-ctrl-group button`) | `responsive.spec` fallaba en desktop → pasa |
| Contraste AA: HUD del comparador `white/30` → `mute` (2,7:1 → 7:1); chip MOLA `mars` sobre `mars/10` → `mars-ink` (2,9:1 → 4,9:1) | axe-core marcaba `color-contrast` en Marte | `Compare3D.tsx`, `MarsView.tsx`, token `--color-mars-ink` | `a11y.spec` Marte fallaba → pasa |
| Lectura de cámara deja de ser `<output>` (rol `status`) | Anunciaba coordenadas a lectores de pantalla en cada movimiento y chocaba con los avisos reales | `MapView.tsx`, `MarsView.tsx`, `MoonGlobe.tsx` | — |
| Favicon inline SVG, `meta description`, `theme-color`, Open Graph | 404 en cada carga; link de entrega sin descripción | `web/index.html` | consola: 1 error → 0 |
| Error de datos con "Reintentar" y "Volver al inicio" | Texto plano sin salida | `App.tsx` | — |

## 2. Tokens y componentes base

- `index.css` `@theme`: `mars-ink`, `moon`, `ok`, `warn`, `sim-mid`, `--font-hud` (JetBrains Mono), `--ease-out-expo`, `--ease-standard`, duraciones `press/state/panel`.
- Utilidades nuevas: `hud` (lectura de instrumento), `hud-frame` (esquinas de retícula en los lienzos 3D y paneles de aviso), `loading-bar`, `view-in`, `rise-in`, `row`.
- Botones: alto 44 px por defecto, `active:scale-[0.98]`; variante `.btn-sm` (40 px) para listas.
- `ConsoleIcon`: `external`, `close`, `back`, `rotate`, `target` reemplazan a `↗ ✕ ⟲ ←` en ficha, comparador, diálogo de método, barra lateral y selector.
- `LimitsCard`: códigos `LIM-01…04` en mono y etiqueta "Régimen no análogo" con borde punteado (sin fondo).
- Google Fonts: sale Inter (no se usaba), entra JetBrains Mono 400/500.

## 3. Jerarquía de datos

- `web/src/fmt.ts`: `num`, `meters`, `degrees`, `coord` (es-AR, hemisferio). Usado en ficha, Luna, Marte y comparador. Antes había tres formatos de coordenadas y mezcla de punto/coma.
- **Mapa**: leyenda de la rampa de similitud (40 · 70 · 90) y símbolo de análogo conocido (`MapView.tsx`).
- **Ranking**: gauge de 2 px bajo cada fila, relativo al primer puesto.
- **Sliders**: unidad de la variable al lado del nombre.
- **Ficha**: por variable, `nota · peso` y "la Luna pide …" (meseta del trapecio, `target()` ahora en `score.ts`); variables sin peso atenuadas; tooltip del radar con nota, meseta y fuente.
- **Comparador**: en la columna Tierra, `Δ` contra el objetivo con la tolerancia del método y punto `ok`/`warn` (`MOON_TOL` / `TOLERANCES`), en lugar de "(Luna: 6,8°)".

## 4. 3D, movimiento y carga

- `lazy()` para `Compare3D`, `MoonMap`, `MarsView` y `ZoneCard` con `Suspense` y placeholder "Cargando …" + barra. Chunk principal: **2.338 kB → 1.354 kB** (gzip 646 → 381 kB).
- `vite.config.ts` `optimizeDeps.include` para que el dev server no recargue la página al descubrir recharts/three a mitad de sesión.
- Cambio de cuerpo con `view-in` (opacidad + escala 0,985, 320 ms); fichas con `rise-in`.
- Portada: parallax de ±10 px de las estrellas con el puntero (solo mouse; nada con `prefers-reduced-motion`).
- Esquinas HUD (`hud-frame`) en los lienzos de Tierra, Luna, Marte y maquetas.
- Reduced motion verificado: 0 animaciones corriendo en portada y explorar con `prefers-reduced-motion: reduce`.

## 5. Pulido y limpieza

- `Workspace.tsx` borrado (sin uso, otro sistema de color, iframe a un archivo inexistente).
- Copy: "Arrastrá cada control…" → "El ranking se recalcula al mover cada control."; avisos de Luna con `role="status"`/`alert`.
- Docs: `docs/decisiones.md` D-019, `docs/roadmap.md`, `docs/arquitectura.md` (sección Pruebas), `docs/uso-de-ia.md`.

## 6. Tests

- Suite nueva en `web/e2e/` (`npm run test:e2e`): portada (3), personalizado (3), explorar (5), navegación (2 × 3 viewports), Luna y Marte (2), responsive (3 × 3 viewports, con capturas de regresión de portada y personalizado), a11y con axe-core (4), sin WebGL (1).
- Base (antes de los cambios): 24 pasan / 10 fallan (`docs/audit/e2e-baseline.log`).
- Después: ver `docs/audit/e2e-after.log` (resultado al pie de este archivo).

## 7. Pendientes recomendados (no entraron)

1. **Panel de validación** (% de análogos `test` en el 10 % superior) — el argumento de Validez. Datos ya en `known_analogs.geojson`.
2. **Valor real por variable en la ficha** ("−45 °C; la Luna pide −70 a −25"): necesita `values` en `zones.json` (anotado en `docs/datos-faltantes.md`).
3. **Estado en la URL** (preset, pesos, zona) para compartir la vista exacta en la presentación.
4. **Selector ES/EN** para el jurado global.
5. **`select` "Destino de misión"** con una sola opción: decidir en equipo si se reemplaza por un rótulo.
6. **Recortes del comparador pedidos dos veces** (MoonMap y Compare3D cargan el índice por separado): unificar en `localBuffer`.
7. **Ejes de escala y perfil topográfico** bajo cada maqueta 3D (DESIGN.md §5).
8. **Grano leve** sobre `space`/`rail`: descartado por riesgo en proyector; probar en la sala antes de decidir.

## 8. No verificado

- Cesium con token, Safari/iOS y dispositivo táctil físico.
- Lighthouse en producción (sin deploy todavía).
- La bajada de 6 MB de MOLA detallado desde Hugging Face.

## Resultado de la suite después de los cambios

- Tras mergear el trabajo del equipo (buscador científico, "Búsqueda global", logo con música): los tests de portada,
  navegación y Marte se adaptaron a ese comportamiento y se regeneraron las capturas de la portada. Los dos tests con
  WebGL pesado (ficha y Luna) llevan `test.slow()`. Última corrida: 33 tests, todos en verde entre la corrida completa y
  las repeticiones.

- Corrida completa final (`docs/audit/e2e-after.log`): **32 pasan, 1 falla por tiempo** (la ficha en desktop con dos
  workers y terreno 3D en software GL superó los 60 s; la app estaba bien: la captura muestra la ficha ya cerrada por
  el propio test). Se marcó `test.slow()` y vuelve a pasar sola. Las 10 fallas de la base quedaron resueltas.
- Unitarias: 6/6. `tsc -b` y `oxlint` sin avisos. Build: chunk principal 1.354 kB (gzip 381 kB).
- Consola: 0 errores propios en portada, explorar, ficha, Luna y comparador (se toleran avisos de MapLibre con
  proyección globo y del driver GL del headless).
- Reduced motion: 0 animaciones corriendo en portada y explorar.
