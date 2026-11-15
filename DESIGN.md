# DESIGN.md — TerraLunar · "Consola de misión Luna–Marte"

Evolución del sistema vigente (`docs/DESIGN.md`, Science Console + ajuste orgánico D-017/D-018). No lo reemplaza:
conserva la consola oscura, las fichas de papel cálido, las pills y la regla "color solo en los datos", y le suma el
vocabulario de instrumento que el tema espacial y el 3D piden. Los tokens viven en `web/src/index.css` (`@theme`).

## 1. Concepto

**Una consola de misión que compara mundos.** La pantalla es un panel de control: a la izquierda los instrumentos
(pesos, ranking), al centro el cuerpo celeste en 3D, a la derecha la "hoja de instrumento" (ficha de papel) con la
lectura precisa. Todo lo que es dato se lee como lectura de instrumento: unidad visible, cifras tabulares,
etiqueta pequeña en mayúsculas, fuente citada. Todo lo que es estructura es silencioso: negro profundo, líneas finas,
sin color.

Tres reglas que no se negocian:
1. **El color es información.** Ámbar/crema = similitud; terracota = Marte; gris frío = Luna. Nada más tiene color.
2. **Cada número lleva su unidad y su fuente**, y se formatea en es-AR (coma decimal, punto de miles).
3. **Los límites de la analogía se ven siempre**: tarjeta oscura en toda ficha y en el comparador.

## 2. Paleta

Base (sin cambios de valor, con rol explícito):

| Token | Valor | Rol |
|---|---|---|
| `space` | `#0b0c10` | Fondo del lienzo 3D y de la app. Negro con azul de noche. |
| `rail` | `#121318` | Barra lateral y controles flotantes. |
| `obsidian` | `#1a1b20` | Tarjeta de límites, paneles del comparador. |
| `elevated` | `#23242b` | Hover de superficies oscuras, selección en listas. |
| `hairline` | `#25262d` | Bordes sobre oscuro. |
| `ink` | `#16161a` | Texto sobre papel; botón primario. |
| `canvas` | `#f3f1ec` | Papel: fichas, diálogo, texto sobre oscuro. Blanco hueso (regolito iluminado). |
| `canvas-soft` / `softer` / `pressed` | `#e8e5df` / `#eeebe5` / `#ddd9d1` | Niveles del papel. |
| `body` | `#615e58` | Texto secundario sobre papel (5,7:1). |
| `mute` | `#a39e95` | Texto secundario sobre oscuro (7,0:1). |

Acentos de dato (nuevos nombres, mismos valores que ya se usaban sueltos):

| Token | Valor | Uso |
|---|---|---|
| `sim-low` → `sim-mid` → `sim-high` | `#1e293b` → `#d97706` → `#fef3c7` | Rampa de similitud 0,4 · 0,7 · 0,9 (mapa, leyenda, gauges). |
| `data` | `#d4973f` | Punto de estado, marca de "dato de prueba", acento del ámbar fuera del mapa. |
| `mars` | `#c4704f` | Solo Marte: chip, punto del selector, maqueta. Texto sobre oscuro ✅ (5,1:1); sobre papel usar `mars-ink` `#8f4a2f`. |
| `moon` | `#c8cad0` | Solo Luna: chip y marca de la maqueta (gris frío). |
| `ok` / `warn` | `#7cc39a` / `#e0a24a` | Δ dentro/fuera de tolerancia en el comparador. Solo texto e indicadores de 6 px. |

Regla de contraste: todo texto ≥ 4,5:1; texto de HUD ≥ 4,5:1 (`mute`, nunca `white/30`); decorativo ≤ 3:1 solo si `aria-hidden`.

## 3. Tipografía

- **Display y texto:** Plus Jakarta Sans (ya cargada). Títulos 600–650, `tracking -0.025em`.
- **Instrumento:** JetBrains Mono para coordenadas, códigos (`LIM-01`, `IAU`), HUD de cámara y fuentes de datos.
  Se carga con `display=swap` y cae a `ui-monospace`. Se usa **solo** ahí: los números grandes de puntaje siguen en
  Jakarta con `tnum` (más legibles a 42 px).
- Escala fija:

| Estilo | Tamaño/alto | Uso |
|---|---|---|
| `display-xl` | 52–124 px / 1 | Nombre en la portada |
| `h1` | 26/34 · 32/40 | Título de pantalla |
| `h2` | 24/32 | Título de ficha |
| `h3` | 18/28 | Subtítulo de sección |
| `metric-xl` | 42/1 `tnum` | Puntaje principal |
| `metric-lg` | 22/28 `tnum` | Métricas de card |
| `body` | 14/20 · 16/24 | Texto |
| `small` | 13/18 | Texto secundario |
| `label` | 11/16, 600, mayúsculas, tracking 0,07em | Etiqueta de campo |
| `micro` | 10/14, 600, mayúsculas, tracking 0,08em | Fuente/unidad bajo una métrica |
| `hud` | 11/16 mono, tracking 0,04em | Coordenadas, HUD, códigos |

Dos estilos de etiqueta (`label`, `micro`) reemplazan a los seis que había.

## 4. Lenguaje visual

- **Líneas finas tipo HUD:** bordes de 1 px `hairline` sobre oscuro, `pressed/70` sobre papel. Esquinas de retícula
  (4 trazos en L) en los lienzos 3D para marcar "esto es un instrumento".
- **Retículas y marcas de escala:** barra de escala en los globos, anillo 80° S en la Luna, ejes de 5 km en las maquetas.
- **Coordenadas siempre con hemisferio:** `77,50° S · 161,80° E` (mono).
- **Profundidad con luz, no con sombra genérica:** las superficies oscuras tienen un borde superior 1 px
  `white/8` (luz rasante) y sombra corta; la sombra larga (`shadow-card`) queda solo en lo que flota sobre el lienzo
  (ficha, diálogo, comparador).
- **Grano leve:** ruido SVG al 3 % sobre `space` y `rail` (fondo `data:` URI de 1 kB). Desactivado en `print` y si
  `prefers-reduced-transparency`.
- **Radios:** 22 px tarjetas/paneles, 12 px celdas internas, píldora para controles. Tres, no más.
- **Íconos:** un set SVG de trazo 1,5 px (`ConsoleIcon`): `external`, `close`, `back`, `rotate`, `expand`,
  `catalog`, `terrain`, `limits`, `orbit`. Sin flechas tipográficas.

## 5. 3D

Lo que ya existe se conserva y se afina (no se agrega librería nueva):

- **Tierra (MapLibre globo):** rotación lenta, inclinación automática con el zoom, relieve 3D al elegir zona. Se suma
  leyenda de similitud y esquinas HUD.
- **Luna (three.js):** polo sur con relieve LOLA real. Se suma placeholder de carga ("Cargando LOLA…") y el aviso de
  fallback.
- **Marte (MapLibre):** relieve MOLA + Viking/THEMIS. Se suma progreso de carga de tiles.
- **Comparador (three.js):** dos maquetas sincronizadas. Se suma ejes de escala y Δ por métrica.
- **Portada:** Luna de medios tonos (canvas 2D) + estrellas; parallax leve de 2 capas con el mouse.
- **Fallback:** si `WebGL` no está (`canvas.getContext('webgl')` nulo), cada lienzo muestra un panel con el nombre del
  dato, qué se necesita y un enlace a Worldview/Trek. La app sigue usable (ranking, fichas, método).
- **Reduced motion:** sin rotación automática, sin parallax, sin coreografía de entrada; transiciones de 0 ms.
- **Mobile:** `devicePixelRatio` tope 2, texturas ya reducidas; la Luna se monta solo cuando la pestaña "Mapa" está
  visible.

## 6. Datos como instrumentos

- **Número grande + unidad chica a la derecha + micro-fuente debajo** (`86 /100`, `LOLA · ventana 20 km`).
- **Gauge lineal de 3 px** bajo cada fila del ranking y en el aporte por variable; el color de la rampa solo en el mapa
  y la leyenda, el gauge en `ink`/`canvas`.
- **Δ con tolerancia** en el comparador: `3,9° · Δ −2,9° · tol 5°` con punto `ok`/`warn`.
- **Estados:** cargando (texto mono + barra indeterminada de 2 px), vacío (frase + acción), error (frase + "Reintentar"),
  mock (banner y sufijo "demostración"), fuera de rango (aviso `role="alert"`).
- **Tooltips** del radar: nombre completo, nota 0–1, "la Luna pide …", fuente.

## 7. Movimiento

- Easing de la casa: `cubic-bezier(.16, 1, .3, 1)` (salida) para entradas y hover; `cubic-bezier(.22, .61, .36, 1)`
  para cambios de estado. Duraciones: 120 ms (press), 200 ms (hover/estado), 320 ms (entrada de panel), 600–900 ms
  (coreografía de portada, cámara).
- **Coreografía de entrada:** portada ya resuelta. Pantallas internas: barra lateral y ficha entran con `rise` 320 ms
  escalonado 60 ms. Nunca más de 3 elementos en secuencia.
- **Cambio de cuerpo:** el saliente hace `scale(.96)` + fade 240 ms; el entrante aparece con fade 320 ms. El fondo
  estrellado no se toca.
- **Micro-interacciones:** botones `translateY(-1px)` en hover y `scale(.98)` en press; filas del ranking se elevan
  1 px y la seleccionada queda en papel; los sliders muestran el valor en el pulgar al arrastrar (CSS `:active`).
- **Nada anima números durante el arrastre de sliders** (la lectura manda).
- `prefers-reduced-motion`: todo lo anterior a 0 ms, salvo opacidad.

## 8. Qué no cambia

Cálculo, contratos de datos (`zones.json`, `profiles.json`), textos científicos, la estructura de pantallas
(Inicio → Personalizado → Explorar), la tarjeta de límites, el stack. Este documento solo dirige la superficie.
