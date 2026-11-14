# Roadmap y recorrido de la aplicación

Dos partes: (1) **cómo se usa la app hoy**, paso a paso, y (2) **qué falta y en qué orden**.
Se actualiza cada vez que se termina o se agrega algo.

---

## 1. Recorrido práctico: cómo funciona TerraLunar

Imaginate que sos del equipo de un rover lunar y querés saber **dónde en la Tierra conviene probarlo**.

### Paso 1 — Abrir la app
`npm run dev` dentro de `web/` y entrar a http://localhost:5173 (o la URL de Vercel).
La app descarga dos archivos: `zones.json` (las zonas candidatas de la Tierra, cada una con un
puntaje de 0 a 1 por variable) y `profiles.json` (qué pide el sitio lunar y los pesos de cada prueba).

> Hoy `zones.json` es **falso (mock)**: 20 zonas con puntajes inventados. La app lo avisa abajo del panel.

### Paso 2 — Elegir el destino
En **Destino** está "Luna — polo sur (candidatos Artemis III)". Marte aparece como "próximamente".

### Paso 3 — Elegir el tipo de prueba
Tres botones: **Movilidad de rover**, **Excavación hielo/regolito**, **Cimientos de hábitat**.
Cada uno carga una receta de pesos distinta. Ejemplo: para un rover importan mucho la pendiente y la
rugosidad (30 % cada una); para excavar importan la nieve/hielo y el frío.

### Paso 4 — Ajustar los pesos
Cada slider es una variable (temperatura, vegetación, hielo, lluvia, suelo desnudo, pendiente,
rugosidad). El número a la derecha es **cuánto pesa en el puntaje final, en %**.
- Si movés un slider, el preset se desmarca y aparece **"Personalizado · Restaurar"**.
- Si ponés todo en 0, aparece un aviso: sin pesos el ranking no significa nada.

**Cómo se calcula** (como el promedio ponderado de una materia): cada zona tiene una "nota" de 0 a 1
por variable; la nota final es `Σ peso × nota / Σ pesos`, y se muestra sobre 100.

### Paso 5 — Leer el ranking
La lista se reordena en vivo. Cada fila muestra posición, nombre, país, si ya es un
**análogo conocido** (en celeste) y el puntaje /100. En el mapa, cada zona es un círculo: más grande
y más claro = más parecida.

### Paso 6 — Abrir la ficha de una zona
Clic en una fila o en el mapa. La cámara vuela a la zona en 3D y se abre la ficha con:
1. Puntaje y posición.
2. **Radar**: la nota de cada variable (la "huella" de la zona).
3. **Aporte de cada variable**: cuántos puntos suma cada una al total, ordenado de mayor a menor.
4. **Límites de la analogía** (siempre visible): gravedad, vacío, radiación y comunicaciones no se
   pueden copiar en la Tierra.
5. **Fuentes**: los datasets de donde sale cada variable.
6. Botón **Abrir en Worldview** para ver imágenes satelitales reales de la NASA de esa zona.

Desde la ficha se puede abrir el **comparador 3D**: el relieve de un sitio lunar (LOLA) al lado del
de la zona elegida, con métricas de relieve. **Cerrar ficha** vuelve a la vista de globo.

### Paso 7 — Ver la Luna
El selector **Tierra / Luna** (arriba a la izquierda del mapa) abre el visor 3D de la Luna (Cesium Moon). Pide un token
de Cesium ion la primera vez. Doble clic en la superficie para acercarse.

---

## 2. Qué falta (ordenado por prioridad)

Leyenda: ✅ hecho · 🔄 en curso · ⬜ pendiente. Entre paréntesis, el criterio del jurado que mejora.

### Arreglos de la demo (rama `develop`)
- ✅ Selector Tierra/Luna tapaba el puntaje de la ficha → el equipo lo movió a la izquierda (D-007) (Presentación)
- ✅ Preset seguía marcado al cambiar pesos → "Personalizado · Restaurar" (D-004) (Validez)
- ✅ Pesos en % real + aviso con todo en 0 (D-005, D-006) (Presentación)

### Siguientes
- ⬜ **Panel de validación**: % de los análogos `test` que caen en el 10 % superior, y esos sitios en
  el mapa. Datos ya en `known_analogs.geojson`. (Validez) ~2 h
- ⬜ **Advertencia de tipo de roca por zona**: el polo sur lunar es anortosita (tierras altas), no
  basalto. Holuhraun, Craters of the Moon, Black Point y Timanfaya son basalto. Necesita un campo
  nuevo en `zones.json` → coordinar con datos. (Validez) ~1 h
- ⬜ **Valor real al lado del puntaje** ("−45 °C; la Luna pide −70 a −25") y dibujo del trapecio
  difuso. Campo nuevo `values` en `zones.json`. (Validez, Presentación) ~1 h
- ⬜ **Token de Cesium en Vercel** (`VITE_CESIUM_ION_TOKEN`) para el visor 3D de la Luna. Los sitios
  Artemis III ya se ven en la vista "Polo sur lunar". (Impacto)
- ⬜ Filtro "solo candidatos nuevos" (zonas que no son análogos conocidos). (Creatividad)
- ⬜ Leyenda de colores del mapa. (Presentación)
- ⬜ Estado en la URL (preset, pesos, zona) para compartir. (Presentación)
- ⬜ Versión en inglés (selector ES/EN). (Presentación, jurado global)
- ⬜ Celular: pestañas Controles / Mapa / Ranking y ficha como panel inferior. (Presentación)
- ⬜ Aviso de datos mock más visible; aviso si el mapa base no carga.
- ✅ Diseño blanco y negro según `docs/DESIGN.md` (lo hizo el equipo)
- ✅ Comparador 3D Luna vs Tierra (D-008)
- ✅ Vista "Polo sur lunar": elegir un lugar en la Luna y ver las zonas terrestres parecidas (lo hizo el equipo)
- ⬜ Revisar el fondo decorativo (Júpiter/Saturno junto a la Tierra puede restar en Validez).
- ⬜ Limpieza: `Workspace.tsx` sin uso, `web/README.md` es la plantilla de Vite, bundle de 1,6 MB.

### Orden de recorte si falta tiempo (de `CLAUDE.md`)
Perfil Marte → zoom a 30 m → imágenes de detalle → tercer preset → diseño fino.
**Nunca se recorta:** validación con sitios reservados, límites de la analogía en cada ficha,
tiempo de presentación.
