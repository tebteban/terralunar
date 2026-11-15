# AUDIT.md — Auditoría de diseño, UX y calidad de TerraLunar

Fecha: 2026-11-15 · Rama `develop` (0cfa83e) · Herramientas: Playwright (Chromium 159), axe-core, inspección de código,
detector Impeccable (`.impeccable/config.json`), criterios de ui-ux-pro-max y Emil Kowalski.
Capturas "antes": `docs/audit/before/` (desktop 1440, tablet 768, mobile 390). Log de la suite base: `docs/audit/e2e-baseline.log`.

## 1. Resumen ejecutivo

TerraLunar ya tiene un lenguaje visual propio y bastante maduro en desktop: fondo espacial sobrio, fichas de papel
cálido sobre consola oscura, pills, cifras tabulares y la tarjeta obligatoria "Límites de la analogía" en todas las
vistas. La portada y el comparador 3D son los puntos más fuertes. Los problemas reales están en **mobile/tablet
(roto)**, **robustez (sin fallback WebGL, bundle único de 2,3 MB)**, **detalles de instrumento en los datos**
(unidades, estados de carga, leyenda del mapa) y **restos de dos sistemas de diseño** (Tailwind `slate`/`amber` en
`Workspace.tsx`, blanco puro `#000/#fff` en el radar, HUD con `white/30` por debajo de AA).

| Área | Puntaje | Resumen |
|---|---|---|
| 1. Identidad y coherencia | 7/10 | Un solo lenguaje en desktop; residuos (`Workspace.tsx`, radar negro puro, pills de distinto alto). |
| 2. Detector "hecha con IA" | 7/10 | Sin gradientes violeta ni glass gratuito. Quedan: flechas `↗ ✕ ⟲ ←` como íconos de texto, cards idénticas en el ranking, sombras difusas en todas las cards. |
| 3. Jerarquía y datos | 6/10 | El puntaje principal se ve en 3 s. Faltan: leyenda de color del mapa, unidades visibles en sliders, estados de carga del 3D, "qué pide la Luna" en la ficha. |
| 4. Tipografía, color, espacio | 7/10 | Una sola familia bien usada. Contraste AA casi en todo; falla en HUD del comparador (`white/30` = 2,7:1) y chip "MOLA" (2,9:1). |
| 5. Movimiento y detalles | 7/10 | Portada coreografiada y con `prefers-reduced-motion`. Falta transición entre pantallas, feedback de carga, y los globos no avisan que están cargando. |
| 6. UX y accesibilidad | 5/10 | Mobile: desborde horizontal, ranking enterrado, ficha tapa el globo. Tablet: ficha tapa el selector de cuerpo. 23 controles < 44 px. |
| 7. Performance percibida | 5/10 | `index.js` 2,34 MB (646 kB gzip) en un solo chunk; three + maplibre + recharts + geotiff cargan aunque solo se vea la portada. Sin favicon (404). Mars pick tarda > 6 s en frío sin indicador claro. |

## 2. Qué está mal (bugs e inconsistencias)

Severidad: 🔴 crítico · 🟠 alto · 🟡 medio · 🟢 bajo

| Sev | Hallazgo | Evidencia |
|---|---|---|
| 🔴 | **Mobile (390): desborde horizontal.** `scrollWidth` 454 px en un viewport de 390. El selector de cuerpo (`← Inicio · Tierra · Luna · Marte · Comparador 3D`) no entra y empuja la página. | `docs/audit/before/03-explorar-390.png`; `web/src/App.tsx:252` (`nav absolute left-4 … flex`) |
| 🔴 | **Mobile: el ranking queda enterrado.** La barra lateral mide 291 px de alto con 2164 px de contenido; el usuario ve solo el título y el desplegable. El mapa ocupa 506 px. No hay pestañas Controles/Mapa/Ranking (pendiente en `docs/roadmap.md`). | `03-explorar-390.png`, `04-ficha-390.png`; `App.tsx:138` (`md:flex-row`, sin layout mobile) |
| 🔴 | **Sin fallback WebGL.** Si el navegador no tiene WebGL (VM del jurado, GPU bloqueada), `new MapLibre` y `new THREE.WebGLRenderer` lanzan y la vista queda negra; nadie explica qué pasó. | `MapView.tsx:70`, `MoonGlobe.tsx:64`, `Compare3D.tsx:36`, `MarsView.tsx:114`; test `e2e/webgl.spec.ts` (falla en la base) |
| 🟠 | **Tablet (768): la ficha tapa el selector de cuerpo.** La ficha mide 420 px fijos y el `main` 378 px: cubre `Tierra/Luna/Marte`. Playwright no pudo clicar "Luna" con la ficha abierta ("subtree intercepts pointer events"). | `04-ficha-768.png`; `ZoneCard.tsx:48` (`md:w-[420px]`) |
| 🟠 | **Bundle único de 2,34 MB (646 kB gzip).** three.js, MapLibre, Recharts y geotiff se bajan para ver la portada. Vite avisa "chunks larger than 500 kB". | salida de `npm run build` |
| 🟠 | **23 controles por debajo de 44 px** (presets 32 px, importancia 28 px, "Editar" 20 px, selector de cuerpo 32 px, botones de mapa 29 px). En táctil es fácil errar. | medición DOM en 1440/390; `App.tsx:160,254`, `CustomSearch.tsx:155` |
| 🟠 | **Contraste por debajo de AA** en texto informativo: HUD del comparador `text-white/30` (2,69:1) y `text-white/45` (4,52:1 justo); chip "MOLA" `text-mars` sobre `bg-mars/10` (2,90:1). | cálculo WCAG sobre tokens; `Compare3D.tsx:288,298`, `MarsView.tsx:203` |
| 🟡 | **`favicon.ico` 404** en todas las cargas: único error de consola propio. | consola Playwright; `web/index.html` sin `<link rel="icon">` |
| 🟡 | **`Workspace.tsx` sin uso y con otro sistema** (`slate-950`, `amber-400`), referencia a `explorador/atlas.html` que no existe en `data/`. | `web/src/Workspace.tsx`; `docs/roadmap.md` "Limpieza" |
| 🟡 | **Luna en mobile: la ficha tapa el globo entero** (`max-h-[60%]` sobre un `main` de 506 px deja ~200 px de Luna). | `05-luna-390.png`; `MoonMap.tsx:131` |
| 🟡 | **Marte: elegir un sitio tarda > 6 s en frío** (16 tiles MOLA) y el único feedback es un chip de estado chico abajo a la izquierda; la ficha sigue diciendo "Elegí un lugar". | `09-marte-pick-1440.png`; red: `mars/mola32-*.dat` |
| 🟡 | **Recortes del comparador se piden dos veces** (`compare/*.bin` ×2: MoonMap y Compare3D cargan el índice cada uno; StrictMode duplica en dev). | lista de red; `MoonMap.tsx:50`, `Compare3D.tsx:150` |
| 🟡 | **Sin `<meta name="description">`, `theme-color` ni Open Graph**: el link de la entrega se verá sin descripción ni imagen. | `web/index.html` |
| 🟢 | El `select` "Destino de misión" tiene una sola opción válida y otra deshabilitada: parece un control y no lo es. | `App.tsx:149`; `docs/roadmap.md` lo menciona |
| 🟢 | Avisos de MapLibre en consola (`calculateFogMatrix is not supported on globe projection`): ruido de terceros, no nuestro. | consola |
| 🟢 | `MarsView.tsx` tiene 8 líneas de más de 300 caracteres: difícil de revisar y de mergear. | `wc`/`awk` |

## 3. Detector "hecha con IA" (Impeccable)

Lo que **no** hay (bien): gradientes violeta/azul, glassmorphism decorativo, emojis como íconos, tipografía default,
hero con tres cards idénticas con ícono-título-texto (la portada las resolvió sin caja, D-018).

Patrones que quedan y su alternativa con carácter:

| Patrón | Dónde | Alternativa |
|---|---|---|
| Flechas y símbolos de texto como íconos (`↗`, `✕`, `⟲`, `←`, `+`/`−`) | `ZoneCard.tsx:114`, `Compare3D.tsx:253,327`, `App.tsx:253`, `MarsView.tsx:239` | Un set SVG único de trazo 1,5 px (ya existe `ConsoleIcon.tsx` y `Chevron`): extenderlo con `external`, `close`, `rotate`, `back`. |
| Sombra difusa en todas las cards (`shadow-card`, `shadow-limits`, `shadow-float`) | `index.css` tokens | Profundidad por luz: borde hairline superior más claro + sombra corta; sombra larga solo en lo que flota (ficha, comparador). |
| Lista de ranking con 20 filas idénticas | `App.tsx:198` | Barra de puntaje embebida como "gauge" fino y marca del top-3: los datos diferencian las filas, no la decoración. |
| Radar negro puro `#000` sobre papel | `ZoneCard.tsx:73` | Usar los tokens (`ink`, `pressed`) y marcar la meseta "lo que pide la Luna" como anillo de referencia. |
| Etiqueta "RÉGIMEN NO ANÁLOGO" como pill genérica | `LimitsCard.tsx:7` | Mantenerla pero como marca de instrumento: código `LIM-01…04`, borde a rayas, sin fondo. |
| Copy que explica la interfaz ("Arrastrá cada control: el ranking se recalcula en el momento") | `App.tsx:184` | Mostrar en el control el valor y su efecto (`Δ ranking`) en vez de contarlo. |

## 4. Jerarquía y tratamiento de los datos

**Qué se entiende en 3 s, por pantalla**

- Portada: nombre y las tres entradas. ✅
- Explorar: el **86** del primer puesto y el globo. ✅ Pero el color de los puntos (pizarra → ámbar → crema) no tiene leyenda: el usuario no sabe que el color es el puntaje. ❌
- Ficha: el 86/100 grande, luego el radar. ✅ Falta el **valor real** y "lo que pide la Luna" por variable (está en Personalizado pero no en la ficha). ❌
- Luna: 4 métricas en cards del mismo peso; no se destaca cuál explica el parecido. 🟡
- Comparador: "MISMA ESCALA" y las dos maquetas. ✅ Las métricas de la Tierra traen la Luna entre paréntesis; falta el **delta** y la tolerancia. 🟡

**Formato de números**

- Coordenadas: la ficha usa 4 decimales con punto (`64.8500°, -16.8000°`), la Luna 2 decimales con `E` (`-84.60°, 31.0° E`), Marte 3 decimales. Tres formatos distintos. Unificar: `64,8500° N · 16,8000° O` con hemisferio y coma decimal (es-AR) en todas.
- Aporte al puntaje: `+34.3 ptos` con punto decimal mientras Luna usa coma (`6,8°`). Unificar a `toLocaleString('es-AR')`.
- Sliders: muestran `%` del peso pero no la unidad ni el rango de la variable (`°C`, `mm/año`).
- `tabular-nums` está activo en `body` ✅.

**Estados**

- Cargando: "Cargando datos…" en texto plano gris; los globos no tienen placeholder (aparecen de golpe). Mars tiene chip de estado; Luna no.
- Vacío: Personalizado lo resuelve bien ("Elegí al menos una variable"). ✅
- Error: textos planos (`No se pudieron cargar los datos: …`) sin acción de reintento.
- Fuera de rango: Marte valida latitud ✅; pesos en 0 tienen alerta ✅.
- Desactualizado/mock: banner superior + "puntaje de demostración" en ficha ✅ (bien resuelto).

**Gráficos**

- Radar: etiquetas cortas (TEMP, VEG…) en 10,5 px gris `#615e58` sobre papel: 5,7:1 ✅. Sin tooltip ni anillo de referencia.
- Barras de aporte: legibles; las barras de `+0.0 ptos` se muestran igual que las demás (ruido). Mejor atenuarlas o colapsarlas.
- Mapa: sin leyenda de color ni escala del puntaje. La atribución de MapLibre en mobile ocupa 3 líneas sobre el globo.

## 5. Tipografía, color y espacio

- Una sola familia (Plus Jakarta Sans) con `tnum`; `font-mono` apunta a la misma familia (D-017). Funciona, pero las etiquetas en mayúsculas con tracking y los números grandes perderían poco y ganarían carácter de instrumento con una mono real **solo** en coordenadas, códigos y HUD (JetBrains Mono ya figura en `docs/DESIGN.md`).
- Escala: títulos 26/32 px, cuerpo 13–16 px, micro 10–11 px. Hay seis tamaños distintos de micro-etiqueta (`text-[10px]`, `text-[11px]`, `text-xs`, `label-mono`, `micro-cap`, `font-mono text-[11px]`). Consolidar en dos.
- Contraste (tokens): `mute` sobre `rail` 6,96:1 ✅ · `body` sobre `canvas` 5,72:1 ✅ · `mute/80` 4,86:1 ✅ · `white/45` 4,52:1 (límite) · `white/30` 2,69:1 ❌ · chip Marte 2,90:1 ❌.
- Modo oscuro: es la base ✅. Las fichas claras ("papel") son el contrapunto y funcionan como "hoja de instrumento".
- Espaciado: gutters 24/32 px consistentes; radios 22 px (cards) y píldora. En el comparador los paneles usan `rounded-2xl` + `rounded-xl` + `rounded` (3 radios en una vista).

## 6. Movimiento y detalles (Emil Kowalski)

- Portada: coreografía letra por letra + opciones con `cubic-bezier(.16,1,.3,1)`, `prefers-reduced-motion` respetado (CSS y `matchMedia` en `HalftoneMoon`, `globeRotation`, `MoonView`). ✅
- Entre pantallas (Inicio → Personalizado → Explorar) el cambio es un corte seco: no hay continuidad.
- Hover/press: botones `-translate-y-px` en hover, sin estado `active` diferenciado salvo volver a 0. Las filas del ranking cambian solo el fondo; la seleccionada no "se levanta".
- Los sliders son nativos con `accent-color`: correctos, sin feedback del valor al arrastrar fuera del número.
- El globo terrestre rota solo y se inclina al hacer zoom (bien pensado). El cambio Tierra→Luna→Marte desmonta y monta sin transición ni placeholder: parpadeo negro de 1–3 s.
- Nada bloquea la lectura de datos. ✅

## 7. UX y accesibilidad

- Roles y nombres: `nav aria-label="Cuerpo visualizado"`, `aria-pressed` en segmentados, `role="alert"` en pesos 0, `<dialog>` nativo con Escape, `output` para la cámara. ✅
- Foco visible en toda la app (`:focus-visible` con anillo) ✅; en la portada el foco se ve como la tarjeta resaltada ✅ (`01c-landing-focus-1440.png`).
- Teclado: atajos 1/2/3 en la portada; el globo no es operable por teclado (esperable); el `select` de destino es decorativo.
- Áreas táctiles: ver §2 (23 controles < 44 px).
- Alt/aria: lienzos con `aria-label` ✅; íconos `aria-hidden` ✅.
- Errores: validación de latitud en Marte ✅; errores de red en texto sin reintento.
- axe-core: ver `docs/audit/e2e-baseline.log` (sección a11y) para las violaciones exactas de la base.

## 8. Performance percibida

| Métrica | Valor | Comentario |
|---|---|---|
| `index.js` | 2.338 kB (646 kB gzip) | Un solo chunk: three, MapLibre, Recharts, geotiff y la app. |
| `index.css` | 118 kB (19 kB gzip) | Incluye MapLibre CSS. |
| Worker MapLibre | 520 kB | Se baja aunque el usuario quede en la portada. |
| `loadEventEnd` portada (dev) | 439 ms | Local; en Vercel dependerá del chunk único. |
| Fuentes | Google Fonts (Plus Jakarta + Inter) | Inter se carga y no se usa (solo fallback). |
| Datos Marte | 16 tiles `mola32-*.dat` al elegir un punto | Sin barra de progreso. |
| Recortes 3D | 20 `.bin` ×2 | Doble pedido evitable. |

No se midió LCP/CLS con Lighthouse en producción (no hay deploy aún). La portada no tiene CLS visible: la fuente
carga con `display=swap` y el título cambia de tracking por animación, no por reflow.

## 9. Qué se puede mejorar (lo existente, más pulido)

1. **Formato único de datos** (`fmt.ts`): coordenadas con hemisferio y coma decimal, números con `es-AR`, unidades siempre visibles.
2. **Leyenda del mapa**: rampa pizarra→ámbar→crema con 3 marcas (40 · 70 · 90) y símbolo de "análogo conocido".
3. **Ficha**: valor real + "la Luna pide" por variable (ya hay `fuzzy` en `profiles.json`; el valor real falta en `zones.json` → `docs/datos-faltantes.md`).
4. **Comparador**: columna de Δ con color por tolerancia (dentro/fuera) en vez de "(Luna: 6,8°)" entre paréntesis.
5. **Íconos SVG únicos** en lugar de `↗ ✕ ⟲ ←`.
6. **Micro-tipografía**: dos estilos de etiqueta (label 11 px tracking 0,07em / micro 10 px) y una mono real para coordenadas y HUD.
7. **Estados**: skeleton/placeholder de los globos ("Cargando LOLA…"), reintento en errores de red.
8. **Mobile**: pestañas `Controles · Mapa · Ranking`, ficha como hoja inferior arrastrable, selector de cuerpo compacto.

## 10. Qué se puede agregar

- **Panel de validación** (roadmap): % de análogos `test` en el 10 % superior + sus puntos en el mapa. Es el argumento de "Validez" para el jurado.
- **Estado en la URL** (preset, pesos, zona) para compartir una vista exacta en la presentación.
- **Comparación lado a lado de dos zonas terrestres** (radar superpuesto).
- **Tooltip del radar** con valor, meseta difusa y fuente.
- **Sparkline de "qué tan lejos de la meseta"** por variable en la ficha (mini-trapecio ya existe en Personalizado: reutilizarlo).
- **Selector ES/EN** (jurado global).

## 11. Cómo llevarlo al siguiente nivel (tema espacial + 3D)

- **Cabecera HUD de misión**: una línea de 32 px con retícula fina, coordenadas de la cámara, escala, cuerpo activo y fuente de datos en mono. Reemplaza al banner de "Datos de prueba" y a la nav flotante: un solo instrumento.
- **Transición orbital entre cuerpos**: al pasar Tierra → Luna → Marte, el fondo estrellado se mantiene y el globo saliente se aleja (scale 0,92 + fade 300 ms) mientras entra el nuevo. Barato (CSS) y da continuidad.
- **Portada con profundidad**: estrellas en 2 capas con parallax leve al mover el mouse (`transform` sobre dos `div`), Luna de medios tonos como horizonte (ya está). Con `reduced-motion`, estático.
- **Maquetas 3D con escala y norte**: ejes de 5 km, flecha de norte y perfil topográfico de la diagonal bajo cada maqueta (SVG de 60 px, datos ya en memoria).
- **Marcas de escala en el globo lunar**: anillo de 80° S etiquetado, meridiano 0° y puntos Artemis con código IAU.
- **Grano leve** (`noise` SVG al 3 %) solo en superficies oscuras grandes para sacar la sensación de "fondo plano de app".

## 12. Plan de implementación priorizado (impacto × esfuerzo)

| # | Bloque | Impacto | Esfuerzo | Fase |
|---|---|---|---|---|
| 1 | Fallback WebGL en los 4 motores + favicon + meta | Alto | Bajo | 5.1 |
| 2 | Mobile: sin desborde, pestañas Controles/Mapa/Ranking, ficha como hoja inferior; tablet: ficha no tapa la nav | Alto | Medio | 5.1 |
| 3 | Áreas táctiles ≥ 40–44 px y contrastes AA en HUD/chips | Alto | Bajo | 5.1 |
| 4 | Tokens centralizados: motion, label/micro, mono real, iconos SVG | Medio | Bajo | 5.2 |
| 5 | `fmt.ts` + leyenda del mapa + Δ en comparador + barras de aporte atenuadas | Alto | Medio | 5.3 |
| 6 | Code-splitting (lazy de Compare3D, MoonMap, MarsView, Recharts) | Alto | Bajo | 5.4 |
| 7 | Transición entre cuerpos + placeholders de carga + HUD de cámara unificado | Medio | Medio | 5.4 |
| 8 | Copy, estados vacíos/error con reintento, limpieza (`Workspace.tsx`, Inter) | Medio | Bajo | 5.5 |
| 9 | Panel de validación, URL compartible, ES/EN | Alto | Alto | pendiente (roadmap) |

## 13. Lo que no se pudo verificar

- Cesium con token (no hay token en el entorno): la vista de alta resolución queda sin probar.
- Dispositivo táctil físico y Safari/iOS (solo Chromium headless y Chromium de Playwright MCP).
- Lighthouse en producción (sin deploy).
- La bajada de 6 MB de MOLA detallado desde Hugging Face en el comparador de Marte (depende de red externa).
