# Registro de decisiones

Cada decisión importante queda anotada acá: **qué** se decidió, **por qué**, **cómo** se implementó y
qué alternativas se descartaron. Sirve para no volver a discutir lo mismo y para explicarle al
jurado (y a nosotros mismos el domingo a la noche) por qué la app es como es.

Formato: una entrada nueva arriba de todo, con número correlativo. Si una decisión se reemplaza, no se
borra: se marca como **Reemplazada por D-XXX**.

---

## D-026 — Panel de validación con análogos USGS reservados
- **Fecha:** 2026-11-15 · **Estado:** vigente (CLAUDE.md: la validación "nunca se recorta").
- **Qué:** `pipeline/12_validation.py` mide el relieve de los 192 análogos USGS (división fit 137 / test 55 hecha
  por hash del nombre antes de calcular, sin tocar) y de 300 ventanas de tierra al azar (semilla 20261115, entre
  56° S y 60° N, ≥ 90 % tierra), con el mismo muestreo que los candidatos. `web/src/validation.ts` los puntúa con
  la misma función del ranking (`reliefScore`, ahora compartida) y `ValidationPanel.tsx` lo muestra debajo de los
  resultados de la búsqueda, recalculado con el destino y los pesos elegidos.
- **Reglas fijadas antes de ver resultados:** métrica = % de sitios `test` con semejanza ≥ percentil 90 del fondo
  al azar (azar puro ≈ 10 %); se descartan ventanas con < 50 % de tierra; `fit` se muestra aparte y no es la
  métrica; se informa la probabilidad binomial de obtener ese acierto por azar.
- **Resultado (pesos iguales, primera corrida, sin ajustar nada):** Mons Mouton 3 de 54 sitios `test` (6 %,
  probabilidad por azar 92 %); Mons Malapert y Nobile Rim 2, 1 de 54 (2 %). **El relieve solo no distingue a los
  análogos USGS mejor que el azar.** Lectura: casi todos son cráteres de impacto terrestres, erosionados y de
  relieve suave a 2 km, que son análogos del *proceso* de impacto, no de la *forma* de una meseta o un macizo del
  polo sur. No se cambian umbrales, pesos ni división para "mejorar" el número.
- **Límite declarado:** la lista USGS es casi toda de cráteres de impacto: valida "parecido a un análogo planetario
  conocido", no aptitud para un ensayo concreto. Falta la lista curada de análogos de ensayo (datos faltantes).

## D-025 — Datos terrestres reales para los criterios geomecánicos pendientes
- **Fecha:** 2026-11-15 · **Estado:** vigente (pedido de Esteban: completar `docs/datos-faltantes.md` con datos reales).
- **Qué:** `pipeline/11_geomechanics.py` mide, para las 176 ventanas de 20 km que usa la app, seis capas reales
  y las deja en `data/geomechanics/earth.json` (~0,5 MB):
  | Criterio | Dato | Fuente |
  |---|---|---|
  | Portancia | densidad aparente 0–5, 5–15, 15–30, 30–60 cm | SoilGrids 2.0 `bdod` (ISRIC, 250 m, WCS) |
  | Volátiles | fracción con permafrost probable (PZI ≥ 0,5) | Global Permafrost Zonation Index (Gruber 2012, 1 km) |
  | Refugio, morfología, portancia | pendiente a 30 m, mayor planicie < 5°, % de flancos con desnivel en rango | NASADEM (56° S–60° N) o Copernicus GLO-30 (fuera) |
  | Composición | NIR (B08) y NDVI medianos de la escena más limpia 2024–2026 | Sentinel-2 L2A |
  | Oscilación térmica | amplitud día−noche mensual y estacional, 12 compuestos | MODIS MOD11A2.061 Terra, 2024 |
  | Supermáscara | % de agua, urbano y cultivo | ESA WorldCover 2021 v200 |
- **Cómo se puntúa:** `geomechanics.ts` usa esos datos solo si la capa cubre la ventana; si no, el criterio sigue
  "Pendiente" con el motivo de la fuente (p. ej. "el PZI no cubre la Antártida"). Tramos provisorios, a validar
  por Civil: composición = mín(NIR en rango con caída lineal de 0,10 fuera; NDVI 0,4→0,05); portancia = mín(densidad
  en rango con caída de 0,3 g/cm³; pendiente 30 m); volátiles = fracción PZI ≥ 0,5 (1,0 desde 10 % Luna, 50 % Marte);
  refugio = 1,0 desde el 2 % de la ventana con desnivel 10–50 m y flanco 15–30° (Luna) o 2–15 m y 5–20° (Marte),
  medido en ventanas de 7×7 píxeles (~210 m). La supermáscara agrega "sin cultivos" (lo pide el documento).
- **Arcadia Planitia:** activado como destino de Marte con el centro oficial IAU (Feature 348: 46,66° N, 192,00° E).
  Es el centro nominal de una planicie de ~2200 km, no un sitio de aterrizaje propuesto.
- **Por qué MODIS 2024 y no 2025:** en Planetary Computer, 2025 tiene un hueco de julio a noviembre (consultado hoy).
- **Qué no se hizo:** índice UV (NASA OMI requiere login Earthdata; la regla ya usa la altitud), inventarios de
  glaciares de escombros, contenido de hielo y profundidad del permafrost (no existen como capa global).

## D-024 — Consideraciones geomecánicas de Civil, aplicadas solo con datos medidos
- **Fecha:** 2026-11-15 · **Estado:** vigente (pedido de Esteban; documento del equipo de Civil).
- **Qué:** `docs/consideraciones-geomecanicas.md` define 7 criterios con pesos (morfología 20 %, volátiles
  20 %, portancia 15 %, composición 15 %, térmica 10 %, radiación 10 %, refugio 10 %), reglas de 0 a 1 y una
  supermáscara (NDVI < 0,1 · sin agua · sin zonas urbanas) para Mons Mouton y Arcadia Planitia.
- **Cómo:** `web/src/geomechanics.ts` traduce el documento a código y `GeomechanicsCard.tsx` lo muestra en la
  ficha de cada candidato terrestre. **Regla de veracidad:** un criterio solo recibe nota si el candidato tiene
  el dato medido; si no, queda "Pendiente" con el dato que falta. El índice geomecánico es **parcial**: promedio
  ponderado de los criterios medidos, siempre con el % del peso que cubre, multiplicado por la supermáscara
  (descartado ⇒ 0). Hoy se miden: morfología (pendiente y altitud del DEM a 2 km), radiación (altitud) y
  oscilación térmica (MODIS día − noche, una fecha), hasta 40 % del peso. Los tramos entre los extremos del
  documento son lineales y provisorios.
- **Qué no se hizo:** no se mezcla con el ranking de relieve (sigue siendo semejanza topográfica); no se
  aplican los umbrales de Mons Mouton a otros sitios (Malapert, Nobile, Jezero…): esos destinos muestran que no
  tienen perfil. Arcadia Planitia queda cargado pero inactivo hasta tener coordenadas y recorte MOLA.
- **Pruebas:** `web/test/geomechanics.test.ts` (5 casos); la suite unitaria completa pasa (46).

## D-023 — El atlas auxiliar sale de la entrega pública

**Qué:** `data/explorador/` (atlas.html + atlas.js) se movió a `docs/explorador/`.
**Por qué:** Vite publica todo `data/`, pero el atlas depende de `global-terreno.js` (33 MB, ignorado por
Git y sin script que lo genere). Un clon limpio publicaba una página rota. La app ya no enlaza al atlas
desde el 14/11. **Cómo:** `git mv` y ruta actualizada en `.gitignore`; el README de la carpeta explica cómo
abrirlo localmente. **Descartado:** subir el archivo de 33 MB al deploy (pesa más que toda la app y no se usa).

---

## D-022 — Fondo de la portada sobrio y orgánico, continuo y con formas difusas en movimiento
- **Fecha:** 2026-11-15 · **Estado:** vigente (pedido de Esteban: sobrio, estético, natural y legible).
- **Problema:** la portada tenía un fondo (estrellas + Luna en puntos) y, más abajo, un bloque negro
  con un degradé para tapar el corte: se notaba la costura.
- **Cómo:** `web/src/OrganicBackdrop.tsx`, fijo detrás de todo el recorrido (sin costuras). Capas: cielo
  con estrellas, tres manchas de luz difusa que derivan muy lento (48–66 s; arena, pizarra y terracota,
  colores apagados y de bajo contraste), grano fino tipo película (SVG `feTurbulence`) y viñeta suave
  que oscurece el centro para que el texto se lea. La Luna en puntos (LRO) queda como horizonte, más
  tenue y fundida arriba y abajo. Se quitaron el bloque negro y el degradé. Solo se anima `transform`;
  con "reducir movimiento" todo queda quieto.
- **Formas abstractas:** se eligieron manchas difusas y lentas en vez de figuras nítidas o rápidas, que
  distraerían de las opciones y bajarían la legibilidad.

## D-021 — Ficha de Luna y Marte como pestaña flotante desplegable
- **Fecha:** 2026-11-15 · **Estado:** vigente (pedido de Esteban).
- **Cómo:** `SurfacePanel` acepta `collapsible`. En Luna y Marte la ficha arranca plegada como una
  pestaña flotante ("Ficha de la Luna · Tocá para desplegar", arriba a la derecha; abajo en celular).
  Al tocarla se despliega la ficha completa, con "Minimizar" fijo arriba. Cuando el usuario elige un
  punto en el globo, la ficha se despliega sola (`openSignal`) para que vea los resultados. La ficha de
  la Tierra no cambia: se abre al elegir una zona.
- **Recentrado:** el estado de la ficha vive en `MoonMap`/`MarsView` (modo controlado de `SurfacePanel`).
  El globo lunar reserva el lugar de la ficha solo si está desplegada (`MoonGlobe panelOpen`); plegada,
  usa todo el ancho y los controles +/−/N/◎ pasan al borde derecho.
- **Límites de la analogía:** siguen dentro de la ficha; plegarla es una elección del usuario y la ficha
  se abre sola al haber resultados, así que los límites se ven junto a cada resultado.

- **Ampliación (2026-11-15, después del flujo unificado de Eze):** también la Tierra. El panel izquierdo
  se puede ocultar en todas las vistas (la barra dice "Tierra" o "Búsqueda personalizada"), y la ficha
  "Ficha y candidatos terrestres" es pestaña flotante: se despliega sola al ejecutar un análisis nuevo o
  al elegir un candidato, para que los resultados no queden escondidos (`web/src/App.tsx`).

## D-020 — Panel lateral ocultable en Luna, Marte y búsqueda personalizada
- **Fecha:** 2026-11-15 · **Estado:** vigente (pedido de Esteban).
- **Por qué:** en Luna y Marte el panel lateral solo muestra un resumen fijo, y en la búsqueda
  personalizada ocupa lugar que puede aprovechar el globo o el mapa. El usuario decide si lo ve.
- **Cómo:** en escritorio (`lg`), botón "Ocultar panel" arriba del panel; oculto, queda una barra fina
  a la izquierda con "›" y el texto vertical "Mostrar panel · Luna/Marte/Búsqueda personalizada". La
  preferencia se guarda en `localStorage` (`terralunar.panel-oculto`). Al volver, el panel entra
  deslizándose (`.panel-in`, respeta "reducir movimiento"). Mapas y globos se reajustan solos
  (ResizeObserver). En el catálogo terrestre con preset el panel queda fijo; en celular siguen las
  pestañas Ajustes · Mapa · Ranking. Código en `web/src/App.tsx`.

## D-019 — Auditoría de diseño: consola de misión, mobile por pestañas, fallback WebGL y suite e2e
- **Fecha:** 2026-11-15 · **Estado:** vigente. Informe en `AUDIT.md`, dirección de arte en `DESIGN.md` (raíz), cambios en `CHANGELOG-DESIGN.md`.
- **Por qué:** el recorrido con Playwright mostró que en celular la página desbordaba (454 px en 390), el ranking
  quedaba enterrado, en tablet la ficha tapaba el selector de cuerpo y sin WebGL la app quedaba negra. Además había
  23 controles de menos de 44 px, dos textos por debajo de AA y tres formatos distintos de coordenadas.
- **Cómo:**
  - **Pantallas angostas (< 1024 px):** pestañas `Ajustes · Mapa · Ranking` arriba; la barra lateral se abre como
    panel sobre el mapa y las fichas (Tierra, Luna, Marte) son hojas inferiores que dejan ver el globo. El layout
    lado a lado pasa de `md` a `lg`; entre 1024 y 1279 la ficha empieza debajo del selector de cuerpo.
  - **Sin WebGL:** `web/src/webgl.ts` detecta una vez; cada visor (Tierra, Luna, Marte, maquetas) muestra `NoWebGL`
    con un enlace a Worldview/Trek y el resto de la app sigue usable.
  - **Datos como instrumento:** `web/src/fmt.ts` (es-AR, hemisferio en coordenadas, metros enteros o con un decimal),
    leyenda de similitud en el mapa, gauge en cada fila del ranking, "nota · peso · la Luna pide" por variable en la
    ficha y Δ con tolerancia (punto ok/warn) en el comparador.
  - **Tokens nuevos** en `index.css`: `mars-ink`, `moon`, `ok`, `warn`, `sim-mid`, fuente `hud` (JetBrains Mono solo
    para coordenadas/códigos/HUD), easings y duraciones; utilidades `hud`, `hud-frame`, `loading-bar`, `view-in`,
    `rise-in`, `row`. Íconos SVG (`ConsoleIcon`) en lugar de `↗ ✕ ⟲ ←`.
  - **Carga:** `Compare3D`, `MoonMap`, `MarsView` y `ZoneCard` con `lazy()`; el chunk principal baja de 2,34 MB.
  - **Suite e2e** (`web/e2e`, `npm run test:e2e`): 34 pruebas en desktop/tablet/mobile + proyecto sin WebGL, axe-core.
- **Descartado:** grano/ruido de fondo (riesgo de verse sucio en proyector), forzar 44 px en los controles
  segmentados (quedan en 40 px dentro de contenedores de 48), reemplazar el `select` de destino (se decide con el equipo).

## D-018 — Portada: opciones sin cajas, con entrada deslizada y resalte al pasar el cursor
- **Fecha:** 2026-11-14 · **Estado:** vigente (pedido de Esteban: más sofisticado, sacar los bloques).
- **Cómo:** las tres opciones (Luna, Marte, Personalizado) dejaron de ser tarjetas. Son columnas
  separadas por líneas finas que se dibujan de arriba hacia abajo; cada opción entra deslizándose y
  enfocándose (escalonadas, después del título). Al pasar el cursor o con foco de teclado: la opción
  sube 6 px, el planeta crece y gira con un halo suave, se dibuja una línea bajo el nombre, aparece
  "Explorar →" y las otras dos se atenúan. En celular son una lista con flecha. Estilos `.option-*` en
  `web/src/index.css`; con "reducir movimiento" no hay animaciones.
- **De paso:** la Luna de fondo bajó y su borde superior se desvanece (máscara) para no quedar detrás del
  texto; se quitó la línea "También con las teclas 1 · 2 · 3" (los atajos siguen funcionando).

## D-017 — Ajuste orgánico y suave del sistema Science Console
- **Fecha:** 2026-11-14 · **Estado:** vigente (pedido de Esteban: "más orgánico, minimalista y suave").
- **Cómo se eligió:** skill de diseño `ui-ux-pro-max`. Su recomendación general (estilo suizo con paleta
  celeste clara) no encajaba; se combinaron sus estilos "Soft UI Evolution" (sombras suaves en capas,
  transiciones de 200–300 ms, foco visible) y "Organic" (radios de 16–24 px, sombra natural difusa,
  tonos terrosos) sobre el lienzo espacial oscuro, y la tipografía "Friendly SaaS" (Plus Jakarta Sans).
- **Qué cambió (casi todo en tokens de `web/src/index.css`):** sin blanco ni negro puros (papel
  `#F3F1EC`, tinta `#16161A`), grises cálidos tipo regolito, terracota de Marte apagado, tarjetas de
  22 px, sombras difusas, bordes casi invisibles, transición por defecto de 250 ms, foco visible suave,
  estrellas más tenues, botones que se elevan 1 px al pasar el mouse. Una sola letra: Plus Jakarta Sans;
  lo que iba en monoespaciada usa la misma letra con cifras tabulares (el token `--font-mono` apunta a
  ella). Banner de datos discreto en lugar de franja negra. Rótulos chicos sobre tarjetas claras pasan a
  `text-body` para cumplir contraste 4,5:1.
- **Se mantiene:** estructura, pantallas, escala de color de similitud del mapa, tarjeta oscura de
  límites siempre visible.

## D-016 — Mezcla del rediseño de Eze (`main`, c891b87) con `develop`
- **Fecha:** 2026-11-14 · **Estado:** vigente. Pedido de Esteban: mezclar las dos versiones.
- **Situación:** en paralelo, Eze subió a `main` otro rediseño ("interfaz a medias", con Codex, ver
  `docs/REDESIGN.md`): paleta grafito/ámbar/celeste, barra superior, riel de íconos y paneles de
  Luna/Marte movidos por portales a una columna de resultados. Chocaba con 9 archivos de `develop`.
- **Base:** la versión de `develop` (portada, Personalizado, sistema Science Console de D-014).
- **Se integró de Eze, con el estilo de D-014:** diálogo "Fuentes y método" (`MethodDialog.tsx`, sus
  textos), pantalla completa (`ConsoleIcon.tsx`), botón "Comparador 3D" en el selector de cuerpo,
  resumen del cuerpo en la barra lateral para Luna y Marte (los pesos del catálogo no se aplican ahí),
  aviso "los pesos solo afectan el ranking terrestre", escala métrica / lectura de cámara / aviso de
  capa / "Centrar selección" / "Cenital-oblicua" en el mapa, +/−/N/◎ y distancia en el globo lunar,
  lectura de cámara y "Centrar selección" en Marte, reajuste con ResizeObserver, zoom inicial 1,4,
  comparador a pantalla completa, coordenadas y "puntaje de demostración" en la ficha, y el método de
  Marte en un desplegable.
- **No se integró:** su paleta y CSS, la columna de resultados con portales (`PanelOutlet.tsx` y
  `panelContext.ts` se borraron) y los "Límites de la analogía" plegables: según `CLAUDE.md` los límites
  nunca se recortan y quedan siempre visibles. Tampoco el texto "relieve polar ×1,5" de la distancia
  lunar, porque no está verificado.
- **De paso:** `develop` local seguía a `origin/main`; ahora sigue a `origin/develop`.

## D-015 — Liberar los contextos WebGL al cerrar escenas 3D
- **Fecha:** 2026-11-14 · **Estado:** vigente (arreglo).
- **Problema:** Chrome mantiene unos 16 contextos WebGL activos; al pasarse apaga los más viejos y esas
  vistas (mapa, globo lunar, maquetas) quedan en negro. El comparador creaba 2 contextos nuevos cada vez
  que se abría y cada vez que se movía la exageración, y nunca los liberaba (`renderer.dispose()` solo
  libera memoria, no el contexto).
- **Cómo:** `renderer.forceContextLoss()` después de `dispose()` en `Compare3D.tsx` y `MoonGlobe.tsx`.
- **De paso:** los paneles con scroll (`ZoneCard`, `MoonMap`, `MarsView`) ya no achican a sus hijos
  (`[&>*]:shrink-0`; el botón "Comparar relieve 3D" quedaba aplastado) y las clases de botón pasaron a
  `@layer components` para que los tamaños de cada uso (h-8, text-xs) se respeten.
- **Comparador rehecho según la maqueta del equipo:** cada visor 3D tiene alto fijo (288–384 px) y la
  pantalla se desplaza; antes el visor ocupaba "lo que sobraba" y en ventanas chicas quedaba con alto 0
  (no se veía nada). Suma retícula y coordenadas sobre el visor, franja "misma escala" con grilla y
  celda reales, y un índice "Parecido de relieve /100" con la MISMA fórmula y tolerancias que el panel de
  origen (`moonRelief.ts` para la Luna, `marsData.similarity` para Marte).
- **Ojo:** el disco C: estaba al 100 % de uso; sin espacio, el navegador y Vite pueden fallar al
  cargar imágenes. Liberar espacio antes de la demo.

## D-014 — Sistema de diseño "TerraLunar Science Console" en toda la app
- **Fecha:** 2026-11-14 · **Estado:** vigente (propuesto por el equipo con maquetas). Reemplaza el
  sistema aeroespacial de D-012; mantiene la estructura de la portada de D-013.
- **Por qué:** el equipo armó un sistema propio pensado para jurados y científicos: cromo monocromo,
  números en monoespaciada para leer datos rápido, tarjetas blancas sobre el lienzo oscuro y la
  tarjeta "Límites de la analogía" como componente obligatorio y bien visible (Validez, Presentación).
- **Cómo:** `docs/DESIGN.md` es el sistema del equipo con una sección final de adaptación. Tokens en
  `web/src/index.css` (Inter + JetBrains Mono, `space` `#050508`, `rail` `#111111`, `obsidian`, `mars`,
  escala de similitud pizarra → ámbar → crema, sombras de tarjeta) y clases `btn-primary`,
  `btn-secondary`, `btn-ghost`, `chip-dark`, `limits-card`. Pantallas: banner "Datos de prueba" con las
  fuentes reales (`App.tsx`), barra lateral `#111111` con ranking en tarjetas, selector Tierra/Luna/Marte
  con punto terracota en Marte, ficha (`ZoneCard.tsx`) y paneles de Luna (`MoonMap.tsx`) y Marte
  (`MarsView.tsx`) como tarjetas blancas con métricas en monoespaciada, comparador (`Compare3D.tsx`)
  con paneles oscuros y nuevo `LimitsCard.tsx` compartido. El mapa usa la escala de color del sistema.
  El fondo de los mapas ya no tiene planetas decorativos.
- **Lo que no se tomó de las maquetas:** valores inventados ("DEM 0,5 m", "Hurst", "FID", porcentajes),
  "TELEMETRY ONLINE", ícono de usuario, menú con secciones que no existen, la insignia con el nombre de
  la agencia (regla del desafío) e imágenes generadas. Se cambió también un detalle propio: la etiqueta
  "Sitio Artemis III" en el panel lunar no se usa porque Shackleton está en la lista y no es candidato.

## D-013 — Portada mínima: nombre al centro y tres opciones en fila
- **Fecha:** 2026-11-14 · **Estado:** vigente (pedido del equipo). Actualiza la portada de D-012.
- **Por qué:** que la página sea intuitiva es un requisito. La portada en bandas tenía demasiado
  contenido; el usuario tiene que entender con poco que puede elegir Luna, Marte o Personalizado.
- **Cómo:** `web/src/Landing.tsx` muestra solo el nombre TERRALUNAR en el centro (cada letra entra
  subiendo y enfocándose mientras el espaciado se cierra), una frase y "¿Qué querés explorar?" con tres
  tarjetas en fila: ícono, nombre, una línea de explicación y "Elegir". En celular las tarjetas se
  apilan. La Luna en puntos (LRO) asoma desde abajo, tenue (42 %), como horizonte y sin rótulos
  (`HalftoneMoon annotate={false}`). Teclas 1, 2 y 3 siguen funcionando.
- **Se sacó de la portada:** el ranking de los 5 mejores y la franja del método. El ranking está a un
  clic (Luna) y la vista previa en Personalizado; los límites de la analogía siguen en cada ficha.

## D-012 — Nuevo sistema de diseño: estilo aeroespacial (reemplaza al inspirado en Uber)
- **Fecha:** 2026-11-14 · **Estado:** vigente (elegido por el equipo). Actualiza el diseño de D-011.
- **Por qué:** la portada se veía básica. Se probó la librería de sistemas de diseño de Claude Code
  (`design-md`, VoltAgent/awesome-design-md, licencia MIT) y se eligió el estilo aeroespacial entre
  tres propuestas (aeroespacial, xAI, IBM Carbon): es el que mejor encaja con el tema y con la Luna en
  puntos. Es una interpretación de estilo, sin logos, nombres ni textos de esa empresa.
- **Cómo:** `docs/DESIGN.md` se reemplazó por ese sistema, con una sección final "Adaptación para
  TerraLunar". Los tokens están en `web/src/index.css`: letra Barlow Condensed (títulos en mayúsculas)
  y Barlow (texto), utilidades `display`, `micro-cap`, `button-cap` y `.btn-ghost` (píldora con
  contorno). Sin sombras (los tokens de sombra ahora dibujan un borde de 1px) y sin acentos. La portada
  pasó a bandas: la Luna grande saliéndose por la derecha con el titular encima, el ranking de rover y
  el método. Personalizado y el panel lateral de Explorar usan filas con líneas finas.
- **Excepción:** el ámbar del mapa se mantiene porque codifica el puntaje (es dato, no decoración).
- **Pendiente:** los paneles sobre el mapa (ficha, Luna, Marte, comparador) heredan letra y bordes,
  pero no se rediseñaron uno por uno.
- **Descartado:** Inter + Archivo + JetBrains Mono de la versión anterior (el sistema no usa letra
  monoespaciada) y las tarjetas blancas con sombra.

## D-011 — Tres pantallas: Inicio → Personalizado → Explorar
- **Fecha:** 2026-11-14 · **Estado:** vigente (pedido del equipo)
- **Por qué:** la app abría directo en el mapa con todos los controles juntos. Una portada que
  presenta TerraLunar y pregunta "¿para qué destino buscás?" ordena la primera impresión (Presentación)
  y deja elegir una búsqueda simple con pocas variables, más fácil de explicar al jurado.
- **Cómo:** `web/src/Landing.tsx` es la portada: titular, opciones Luna / Marte / Personalizado (también
  con las teclas 1, 2 y 3) y los 5 mejores análogos para rover. La pieza central es `HalftoneMoon.tsx`:
  la Luna dibujada en puntos con el brillo **real** de la textura LRO, vista desde 62° S para que se vea
  el polo sur con sus sitios. Se eligió en vez de planetas dibujados con CSS porque usa datos NASA de
  verdad y cuenta la idea de la app en una imagen. `web/src/CustomSearch.tsx` arma la búsqueda: se
  eligen variables y una importancia Baja/Media/Alta = peso 1/2/3 (las no elegidas pesan 0); cada
  variable muestra "lo que pide la Luna" (la meseta del trapecio difuso) y a la derecha se ve el
  ranking en vivo. Títulos en Archivo ancha y lecturas técnicas en JetBrains Mono; el resto sigue
  `docs/DESIGN.md` (blanco y negro, botones píldora) y el ámbar de las zonas del mapa. `App.tsx` maneja la pantalla actual y la
  guarda en la URL (`#personalizado`, `#explorar`, `#marte`) para que funcione el botón "atrás".
  En Explorar, con búsqueda personalizada el panel muestra solo esas variables y un enlace "Editar";
  elegir un preset vuelve a las 7 variables. La barra Tierra/Luna/Marte suma "← Inicio".
- **Límites:** Personalizado solo tiene perfil de Luna; Marte no tiene variables calibradas y se
  muestra como no disponible. La portada no usa datos, así que se ve aunque los JSON tarden.
- **Descartado:** un límite fijo de 3 variables (el "3" queda como sugerencia, no como regla) y una
  librería de rutas (con 3 pantallas alcanza con el `#` de la URL).

## D-010 — Luna: globo 3D propio, Cesium solo si hay token
- **Fecha:** 2026-11-14 · **Estado:** vigente (equipo, commits `2c2ee93` y `5d04948`). Actualiza D-002.
- **Por qué:** sin token de Cesium la vista Luna era un callejón sin salida para el jurado. Además
  pedirle un token al usuario es raro en una demo.
- **Cómo:** `web/src/MoonGlobe.tsx` dibuja la Luna con three.js usando texturas del NASA SVS CGI Moon Kit
  (`pipeline/05_moon_globe.py`) y una malla LOLA a 800 m sobre el polo sur. `MoonView.tsx` (Cesium) se
  usa solo si existe el token. Si falla o tarda más de 25 s, se pasa al globo propio y se avisa. Se
  quitó el formulario para pegar el token.

## D-009 — Marte con MapLibre y MOLA público, sin token
- **Fecha:** 2026-11-14 · **Estado:** vigente, exploratorio (equipo, commits `a587816` a `5d04948`)
- **Por qué:** el perfil Marte era opcional (primero en la lista de recortes), pero sumar un segundo
  destino da Impacto y Creatividad. Se hizo sin credenciales para que funcione en cualquier deploy.
- **Cómo:** `pipeline/04_mars_public.py` baja la grilla MOLA MEGDR de 32 px/° (PDS) y la parte en 16
  bandas comprimidas (`data/mars/mola32-*.dat`). `web/src/MarsView.tsx` la muestra con el mismo motor
  que la Tierra (MapLibre) y suma imágenes Viking y THEMIS de NASA Mars Trek. `marsData.ts` calcula
  pendiente, rugosidad y desnivel en ventanas de 20 km y las compara con recortes terrestres. El
  comparador detallado baja relieve MOLA/HRSC de 200 m de una copia en Hugging Face con la librería
  `geotiff`. Detalle completo en `docs/marte.md`.
- **Límites:** tolerancias sin calibrar ("no es probabilidad ni validación"), carga inicial de ~90 MB,
  y la copia de Hugging Face no depende de NASA.
- **Pendiente:** los ~92 MB en `data/mars/` chocan con la regla de `CLAUDE.md` (más de 10 MB va
  afuera de git). Hay que decidirlo en equipo.

## D-008 — Comparador 3D Luna vs Tierra con three.js
- **Fecha:** 2026-11-14 · **Estado:** vigente (lo agregó el equipo en `main`, commit `fc9e81c`)
- **Por qué:** ver lado a lado el relieve de un sitio lunar (LOLA) y el de la zona terrestre hace
  tangible el "se parece" del puntaje.
- **Cómo:** `pipeline/02_compare_patches.py` recorta parches de elevación y los guarda en
  `data/compare/*.bin` + `index.json`; `web/src/Compare3D.tsx` los dibuja con three.js. Se abre
  desde la ficha.

## D-007 — Selector Tierra/Luna: no se oculta, se movió a la izquierda
- **Fecha:** 2026-11-14 · **Estado:** **Reemplazada** por el cambio del equipo (commit `555bf9d`)
- **Por qué:** el selector tapaba el puntaje de la ficha. Yo lo había resuelto ocultándolo con la
  ficha abierta; en paralelo el equipo lo movió a `left-4 top-16`, fuera de la ficha, que es mejor
  porque sigue disponible. Al juntar las ramas se dejó la solución del equipo.

## D-006 — Avisar cuando todos los pesos están en 0
- **Fecha:** 2026-11-14 · **Estado:** vigente
- **Por qué:** con todos los sliders en 0 el puntaje de todas las zonas es 0 y el ranking queda en un
  orden arbitrario, sin que la pantalla lo diga.
- **Cómo:** en `web/src/App.tsx`, si la suma de pesos es 0 se muestra un aviso en rojo
  (`role="alert"`, lo leen los lectores de pantalla) debajo de los sliders.

## D-005 — Los pesos se muestran como porcentaje real del puntaje
- **Fecha:** 2026-11-14 · **Estado:** vigente
- **Por qué:** el texto decía "se reparten en proporción" pero cada slider mostraba su valor crudo.
  Al bajar un slider los números sumaban 70 y no se entendía cuánto pesaba cada variable de verdad.
- **Cómo:** el número de cada slider ahora es `peso / suma de pesos × 100` y termina en "%".
  Es exactamente lo que usa la fórmula (`score.ts` divide por Σw), así que lo que se ve y lo que se
  calcula coinciden. Por redondeo la suma puede dar 99 o 101.
- **Descartado:** forzar que los sliders sumen 100 moviendo los otros automáticamente. Es más
  difícil de usar (mover uno cambia todos) y no aporta nada al cálculo.

## D-004 — Preset "Personalizado" y botón "Restaurar"
- **Fecha:** 2026-11-14 · **Estado:** vigente
- **Por qué:** al mover un slider, el botón del tipo de prueba (p. ej. "Movilidad de rover") seguía
  marcado aunque los pesos ya no fueran los de ese preset. Eso engaña: en una captura o en el video
  parece que el ranking es el del preset y no lo es.
- **Cómo:** `isCustom` se **calcula** comparando los pesos actuales con los del preset elegido
  (no es un estado aparte, así nunca se desincroniza). Si difieren, ningún botón queda marcado y
  aparece "Personalizado (basado en «…») · Restaurar", que vuelve a cargar los pesos del preset.

## D-003 — Rama `develop` para el trabajo nuevo
- **Fecha:** 2026-11-14 · **Estado:** vigente (cambia la regla "commits en `main`" de `CLAUDE.md`)
- **Por qué:** pedido de Esteban. Queremos revisar los cambios antes de que lleguen a `main`, que es
  lo que se publica en Vercel y lo que verá el jurado. Un error en `main` el domingo a la noche es
  caro; en `develop` no.
- **Cómo:** `develop` sale de `main`. Se trabaja y se sube a `develop`; cuando un bloque está
  terminado se revisa (diff + probar la app) y se mergea a `main`.
- **Consecuencia:** `CLAUDE.md` se actualizó para reflejar el flujo.

## D-002 — Visor lunar con Cesium cargado por CDN
- **Fecha:** 2026-11-14 · **Estado:** **Actualizada por D-010** (Cesium pasó a ser opcional)
- **Por qué:** mostrar la superficie lunar real (datos LRO) le da contexto al usuario: "contra esto
  comparamos". Cesium Moon ya trae esos datos listos en 3D.
- **Cómo:** `MoonView.tsx` carga Cesium desde jsDelivr solo cuando se elige "Luna", así no engorda la
  carga inicial. Necesita un token de Cesium ion.
- **Pendiente:** sin token es un callejón sin salida para el jurado. Hay que configurar
  `VITE_CESIUM_ION_TOKEN` en Vercel (ver roadmap).

## D-001 — App estática que calcula el ranking en el navegador
- **Fecha:** 2026-11-14 · **Estado:** vigente (decisión de equipo, ver `CLAUDE.md`)
- **Por qué:** en 39 horas no hay tiempo para mantener un servidor. Con ~200 zonas el cálculo
  (una suma ponderada) es instantáneo en el navegador, así que los sliders responden en vivo.
- **Cómo:** el pipeline de Python deja los JSON en `data/`; Vite los sirve como archivos estáticos;
  `score.ts` hace `S = Σ wᵢ·puntajeᵢ / Σ wᵢ`. Deploy estático en Vercel.
- **Descartado:** backend o base de datos (fuera de la v1), machine learning (fuera de la v1).


## Revisión Luna/Marte — 2026-11-15
Ver en Tierra transmite coordenadas, huella de muestreo de 20 km y puntaje calculado, sin reutilizar polígonos ni puntajes mock. La geometría replica earth_patch del pipeline (111320 m/grado, corrección coseno). Ambos visores usan el motor WLC para los mismos cuatro descriptores; no se equiparan tolerancias de rugosidad a 80 m y 2 km. La búsqueda científica es la ruta de escala común a 2 km. Perfiles de ensayo compartidos; aterrizaje separado de movilidad. Solo topografía regional puede emitir ranking con los datos actuales. Destinos de Marte seleccionables, sin afirmar aprobación para bases. Selección lunar informa el centro de la grilla realmente utilizado.


## Formato compartido tras el merge
Las fichas planetarias y terrestres comparten SurfacePanel. La Luna usa siempre datos LOLA locales sin selección implícita por token. Ver revision-merge-2026-11-15.md.
