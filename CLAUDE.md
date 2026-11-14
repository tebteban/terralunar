# TerraLunar — contexto del proyecto (NASA Space Apps Challenge 2026)

Poné este archivo en la raíz del repo. Claude Code lo lee solo al arrancar.

## Quién soy y cómo trabajar conmigo
- Soy Esteban, estudiante de 3er año de Ing. en Informática, desarrollador web fullstack. Sé React y web. NO sé de datos geoespaciales ni de ciencia planetaria: explicame los términos técnicos en lenguaje simple, de a poco, con analogías.
- Equipo "q´kodigo": 3 de informática (uno es el de datos), 1 de civil (ciencia del análogo), una mentora (ing. en computación, revisa) y un ingeniero aeroespacial para consultas puntuales.
- Evento: sábado 14/11 9:00 a domingo 15/11 23:59. Cierre interno: domingo 22:00. Sede Santiago del Estero.

## El desafío
"Identificar ubicaciones en la Tierra que sean análogas a las ubicaciones de las bases permanentes en la Luna y en Marte."
Producto: **TerraLunar**, una web app donde el usuario elige un sitio destino (Luna como principal; Marte opcional) y un tipo de prueba (movilidad de rover, excavación de hielo/regolito, cimientos de hábitat), ajusta pesos con sliders y ve en vivo un ranking de zonas de la Tierra por parecido. Cada zona tiene una ficha con el aporte de cada variable, fuentes y los límites de la analogía (gravedad, vacío, radiación y comunicaciones no se pueden copiar).

## Reglas de la NASA (siempre vigentes)
- 5 criterios, de 1 a 5: Impacto, Creatividad, Validez, Relevancia (datos NASA como núcleo) y Presentación.
- Usar al menos un dataset NASA del desafío. Listar todos los datos, código, textos e imágenes usados.
- Declarar el uso de IA (qué herramienta, dónde, cómo). No usar logos ni marca NASA en nada generado.
- Sin nombres, voces ni imágenes de menores de 18 años.
- Entrega global: resumen 50–200 palabras, detalles, UN link público de demo (máx. 7 láminas en inglés o video de 30 s con subtítulos en inglés).
- Entrega local (Jurado SDE): video de hasta 2 min en español + link al proyecto.
- Documentos completos de criterios en el Project de Claude.ai "nasa space app challenge".

## Stack (decidido, no se discute)
- Frontend: React + Vite + TypeScript, MapLibre GL JS (mapa), Recharts (radar), Tailwind. Deploy estático en Vercel. SIN backend y SIN base de datos.
- Datos: Python 3.11 en `pipeline/` (numpy, xarray, rioxarray, rasterio, scipy, geopandas, pystac-client, planetary-computer, odc-stac).
- El navegador carga 3 archivos y calcula el ranking en memoria.

## Estructura del repo
```
web/        app React
pipeline/   scripts Python, uno por capa (01_lst.py, ...)
data/       zones.json, profiles.json, global_score.png, known_analogs.geojson, zones.schema.json
docs/       notas, wireframe, fuentes
```
Todo archivo de más de 10 MB va a `.gitignore` y a una carpeta compartida.

## Contratos de datos (se congelan sábado 13:00; después solo se AGREGAN campos, nunca se renombran)
`data/zones.json`: lista de zonas con
`id, name, country, centroid [lon,lat], polygon (GeoJSON), area_km2, scores {dimensión: 0..1}, known (bool), sources [..], notes`.

`data/profiles.json`: por sitio destino (Luna, Marte), para cada dimensión: `name, dataset, fuzzy {type: "trapezoid", a, b, c, d}` y pesos por preset de prueba (`movilidad`, `excavacion`, `habitat`).

`data/global_score.png`: imagen del mapa global de similitud con sus 4 esquinas en lon/lat.

## Método (resumen)
- Cada variable se convierte a un puntaje de 0 a 1 con una función difusa (qué tan bien cumple el valor lo que pide el sitio lunar). Luego se combina con pesos: S = Σ w_i · puntaje_i.
- Suavizado en ventanas de ~25 km. Se extraen ~200 zonas candidatas como polígonos.
- Terreno a 30 m (NASADEM, pendiente y rugosidad) SOLO en zonas candidatas.
- Validación: lista de análogos conocidos (USGS) dividida en `fit` y `test` ANTES de calcular. Se ajusta con `fit`; la métrica es el % de `test` que cae en el 10% superior. No se cambia la división después de ver resultados.

## Datos NASA y fuentes
MODIS MOD11C3 (temperatura, 0,05°), MOD13C2 (NDVI), MOD10CM (nieve), MCD12C1 (cobertura), GPM IMERG (lluvia), NASADEM (altura 30 m), LRO LOLA/Diviner y MOLA (Luna/Marte), SWIM (hielo en Marte), USGS Known Terrestrial Analog Sites. Acceso con cuenta Earthdata y Microsoft Planetary Computer (STAC). Sitios candidatos de Artemis III: los 9 del polo sur lunar (Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton, Nobile Rim 1 y 2, de Gerlache Rim 2, Slater Plain). El polo sur lunar son tierras altas (anortosita), no basalto de mares.

## Forma de trabajar
1. Primero la web contra un `zones.json` FALSO de 20 zonas. El frontend no espera a los datos reales.
2. Commits chicos y frecuentes en `develop`. Cuando un bloque está terminado se revisa y se mergea a `main` (lo que se publica). Un commit roto se arregla en el siguiente. Cada decisión se anota en `docs/decisiones.md`, el avance en `docs/roadmap.md` y los cambios de herramientas en `docs/arquitectura.md`.
3. Cada vez que algo necesite un dato que no existe, anotarlo en `docs/datos-faltantes.md` en vez de inventarlo.
4. Qué se recorta si falta tiempo, en este orden: perfil Marte, zoom a 30 m, imágenes de detalle, tercer preset, diseño fino. Nunca se recorta: validación con sitios reservados, límites de la analogía en cada ficha, tiempo de presentación.
5. No entra en la v1: machine learning, bases de datos, autenticación, backend.
6. Todo texto o código generado con IA se anota en `docs/uso-de-ia.md` (herramienta + qué se generó).
