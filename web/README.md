# TerraLunar — web

Busca lugares de la Tierra cuyo **relieve** se parece al de un destino en la Luna (polo sur) o en Marte.
Proyecto del equipo q´kodigo para el NASA Space Apps Challenge 2026.

App estática (React + Vite + TypeScript, MapLibre, Tailwind). No tiene backend: el navegador
descarga los recortes de elevación y calcula el ranking en memoria.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (node --test)
npm run test:e2e   # Playwright: desktop, tablet, mobile y sin WebGL (levanta vite en 5174)
npm run build      # salida estática en dist/
```

Vite publica la carpeta `../data` tal cual (`publicDir`). Todo lo que la app necesita está en Git;
un clon limpio compila y funciona sin archivos extra.
También publica el atlas auxiliar en `/explorador/atlas.html` (D-026). La salida pesa unos 170 MB:
sobre todo franjas MOLA de Marte (92 MB), música (35 MB) y el atlas (33 MB).

## Desplegar

Deploy estático en Vercel con raíz `web/`, comando `npm run build` y salida `dist/`.
Antes de publicar: compilar desde un clon limpio y revisar en una ventana de incógnito los globos,
una búsqueda completa, la ficha de un recorte y los archivos exportados (JSON y GeoJSON).

## Cómo se calcula el puntaje

1. El destino (Luna o Marte) y cada candidato terrestre se reducen a una **ventana de 20 × 20 km**
   con celdas de 2 km.
2. En cada ventana se miden cuatro variables de relieve: pendiente mediana, pendiente p90,
   rugosidad (desvío respecto de la media local) y desnivel. No se comparan alturas absolutas.
3. Cada variable da un parecido `s = max(0, 1 − |x − destino| / tolerancia)`, con tolerancias de
   5°, 8°, 200 m y 1000 m.
4. El puntaje es `100 · Σ(peso · s) / Σ(peso)`. El usuario ajusta los pesos y ve el aporte de cada variable.
5. Los candidatos explorados a menos de 30 km de un sitio del catálogo de referencia se excluyen
   (se informan como "cerca de referencia"), para separar lo nuevo de lo ya conocido.

El puntaje mide **parecido topográfico regional**. No mide aptitud para un ensayo concreto
(movilidad a escala de rover, materiales, temperatura, iluminación, hielo).

## Datos por región

| Fuente | Qué aporta |
|---|---|
| NASA LRO **LOLA** | Relieve lunar del polo sur (Mons Mouton, Mons Malapert, Nobile Rim 2 y punto libre) |
| NASA MGS **MOLA** | Relieve marciano (Jezero, Gale, Olympus Mons, Valles Marineris, Elysium, Hellas) |
| Catálogo de referencia | Recortes terrestres a 80 m de análogos conocidos (`data/compare/`) |
| AWS Terrain Tiles z10 | Relieve de las 9 regiones exploradas (`data/discovery/`) |
| ESA WorldCover 2021 / Sentinel-2 2026 | Agua, vegetación y urbanización: solo Atacama y Hawái |
| USGS (unidades geológicas) | Geología del centro del recorte: solo Atacama |
| NASA MODIS LST | Temperatura superficial terrestre como evidencia en la ficha; no cambia el puntaje |

Regiones exploradas: Atacama (36 ventanas), Hawái, Namib, Pilbara, Utah y Qaidam (9 cada una),
Tassili, Lut y Chihuahua (25 cada una). Es un **muestreo discreto**, no un barrido mundial.

Fuentes completas y uso de IA: [`docs/fuentes.md`](../docs/fuentes.md) y [`docs/uso-de-ia.md`](../docs/uso-de-ia.md).

## Limitaciones

- Solo relieve a 2 km: no ve obstáculos a escala de vehículo.
- La máscara de agua, vegetación y urbanización viene desactivada y existe solo en 2 de 9 regiones.
- Los candidatos fuera del catálogo necesitan revisión independiente (imágenes, cartografía) antes
  de llamarlos análogos.
- Gravedad, vacío, radiación y comunicaciones no se pueden copiar en la Tierra; cada ficha lo aclara.
