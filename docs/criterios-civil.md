# Criterios de Civil → qué podemos medir

Fuente: "Consideraciones geomecánicas y otros…" (versión 3, 14/11/2026). Lo nuevo respecto de la versión anterior: perfiles de **Arcadia Planitia** (Marte), **Haworth** y **Malapert Massif** (Luna) con 7 criterios y pesos propios, y un procedimiento de máscaras en QGIS.

> ⚠️ El texto parece salido de un chatbot (cierra con "decime… y te paso las referencias"). Hay que **declararlo en `uso-de-ia.md`** (qué herramienta usó Civil) y **buscar fuente** para los números que se citen en la presentación (p. ej. "Malapert iluminado hasta 75 % del año", "Haworth a 40–50 K").

## Los 7 criterios contra nuestros datos

| Criterio de Civil | Dimensión nuestra | ¿Tenemos el dato? |
|---|---|---|
| Volátiles y evaporitas (hielo, permafrost) | `nieve` (MOD10CM) + `lst` | Parcial: nieve visible, no permafrost. Para Argentina: **Inventario Nacional de Glaciares (IANIGLA)**, incluye glaciares de escombros |
| Morfología y topografía | `pendiente`, `rugosidad`, desnivel | ✅ Sí (NASADEM / LOLA / MOLA, comparador) |
| Capacidad portante | — | ❌ No hay dato global (cohesión, densidad aparente): solo campo o informes SEGEMAR |
| Oscilaciones térmicas | `lst` | Parcial: hoy usamos la media; **MOD11 trae día y noche → se puede agregar amplitud térmica** |
| Granulometría y composición | `cobertura` (suelo desnudo) | ❌ No hay litología global. SEGEMAR/SIGAM para candidatos argentinos |
| Exposición a radiación | — | Proxy posible: **altitud** (> 3.500–4.000 m), sale del DEM que ya usamos |
| Refugio / excavabilidad | — | ❌ No hay dato |

## Pesos por sitio (Civil) traducidos a lo medible

| Criterio | Haworth | Malapert | Arcadia (Marte) | Medible hoy |
|---|---|---|---|---|
| Volátiles | 30 % | 5 % | 25 % | parcial |
| Topografía | 20 % | 30 % | 20 % | ✅ |
| Capacidad portante | 10 % | 25 % | 15 % | ❌ |
| Térmica | 15 % | 10 % | 10 % | parcial |
| Composición | 5 % | 15 % | 15 % | ❌ |
| Radiación | 10 % | 10 % | 10 % | proxy altitud |
| Excavabilidad | 10 % | 5 % | 5 % | ❌ |
| **Peso sin dato** | **25 %** | **45 %** | **35 %** | |

**Consecuencia:** con los datos actuales, en Malapert casi la mitad del puntaje no se puede medir. Hay que **redistribuir los pesos entre lo medible y decirlo en la ficha** ("no medido"), no rellenar con valores inventados.

## Umbrales concretos que aporta (para `profiles.json`)

- **Pendiente:** 1,0 entre 0° y 5°, baja lineal a 0 en 25° → hoy usamos `b=2, c=12, d=25`; Civil propone `c=5`. Arcadia: < 1–2°. Malapert (meseta): < 5–10°. Haworth (paredes): 15–30°.
- **NDVI:** máscara < 0,1 → coincide con nuestro trapecio (`c=0.08, d=0.2`).
- **Altitud** (proxy de radiación UV): > 3.500–4.000 m.
- **Máscaras excluyentes:** pendiente ≤ 5° (aterrizaje), NDVI < 0,1, cuerpos de agua → encajan con el pipeline (`× máscara` después de la suma ponderada).

## Lo que choca con nuestro método

- Su validación ("meter los 7 análogos conocidos y que den > 85–90 %") **ajusta y evalúa con los mismos sitios**. Nosotros reservamos `test` antes de calcular (`analogos-referencia.md`): el 85–90 % sirve como meta, pero medido solo sobre `test`.
- Para Arcadia Planitia no tenemos sitio cargado en Marte (los de Eze son Olympus, Valles, Jezero, Gale, Elysium, Hellas): falta su coordenada IAU.
