# Registro de decisiones

Cada decisión importante queda anotada acá: **qué** se decidió, **por qué**, **cómo** se implementó y
qué alternativas se descartaron. Sirve para no volver a discutir lo mismo y para explicarle al
jurado (y a nosotros mismos el domingo a la noche) por qué la app es como es.

Formato: una entrada nueva arriba de todo, con número correlativo. Si una decisión se reemplaza, no se
borra: se marca como **Reemplazada por D-XXX**.

---

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
