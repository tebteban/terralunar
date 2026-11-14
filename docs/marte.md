# Marte sin credenciales

La pestaña Marte 3D usa MapLibre (mismo motor de Tierra), relieve raster-dem generado en el navegador y MOLA MEGDR 32 px/°. No usa Cesium ni tokens. Fuente: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html

`python pipeline/04_mars_public.py` descarga MEGT90N000FB y su etiqueta. Guarda el original ignorado en pipeline/raw/mars y 16 bandas gzip con extensión .dat en data/mars; la extensión evita que el servidor descomprima automáticamente antes de DecompressionStream. Son aproximadamente 96 MB de descarga total y 133 MB de grilla en memoria. source.json conserva el SHA256 del original. La carga inicial puede ser lenta y no es apropiada para dispositivos de poca memoria.

El relieve se renderiza con compensación del radio terrestre asumido por MapLibre: alturas ×6371008.8/3396000 únicamente en el visor. La exageración visual es independiente. No es una ortofoto y no se agregan detalles ficticios. La vista plana es cenital; el globo conserva la proyección adaptativa de MapLibre. El mapa limita los polos a Mercator, pero la extracción por coordenadas admite ±90°.

Al seleccionar un punto se extrae una ventana local de 20 km, con 10×10 celdas de 2 km. Para Marte, cada celda promedia 25 muestras bilineales del MOLA sobre coordenadas geodésicas esféricas. Para Tierra, se promedian bloques 25×25 de los recortes existentes a 80 m. La resolución nominal MOLA es 1853 m; contiene interpolaciones, con huecos originales de observación de hasta 12 km según su etiqueta. Igualar celdas no iguala los sensores ni elimina esos sesgos.

Métricas: pendiente por diferencias centrales, mediana y percentil 90 de las pendientes interiores; desviación estándar del residuo de media móvil 3×3 (6 km) sin bordes; rango de alturas entre centros de celda. Tolerancias exploratorias no calibradas: 5°, 8°, 200 m y 1000 m. Se promedian cuatro ajustes max(0,1-diferencia/tolerancia). No es probabilidad ni validación de un sitio para una base. Se excluyen del catálogo los recortes con agua aplanada detectada por el pipeline previo; esa máscara es heurística.

El catálogo terrestre es limitado, no una búsqueda exhaustiva del planeta. El comparador presenta ambas superficies a igual escala e iluminación y exageración ×2. Los recortes provienen de celdas centradas: los centros extremos están separados 18 km y se dibujan sobre un soporte de 20 km; esa diferencia visual no interviene en las métricas.

Luna y el ranking mock original permanecen disponibles; se oculta ese panel en Marte para no mezclar puntajes. Las pestañas Marte/Tierra no convierten el ranking original en uno marciano. La comparación de Marte se abre desde su propio panel.

Comprobaciones: build y lint; pruebas de plano inclinado, terreno plano, periodicidad longitudinal y offsets polares. Pendiente: calibración científica con análogos reservados y fuentes de mayor resolución para movilidad local.

## Imágenes Mars Trek

El selector ofrece Viking MDIM 2.1 en color (232 m nominales), THEMIS IR diurno (100 m nominales) . Las teselas públicas WMTS de NASA están en equirectangular, 2×1 al nivel 0; el protocolo local las reproyecta a Web Mercator para MapLibre por filas, sin token. La capa de imagen es visual: las métricas conservan MOLA 32 px/grado y no se vuelven más precisas al elegir THEMIS. El detalle depende del producto y la cobertura; la carga requiere conexión y disponibilidad de NASA. La proyección Mercator no incluye los polos extremos.

Capacidades: https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml y https://trek.nasa.gov/tiles/Mars/EQ/Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly/1.0.0/WMTSCapabilities.xml

## Comparador visual detallado

El comparador descarga por rangos un recorte del modelo global MOLA/HRSC de USGS a 200 m, desde una copia COG comunitaria en Hugging Face. La Tierra se promedia desde 80 m a 200 m. Las métricas y el ranking se mantienen en la grilla regional de 2 km; la maqueta detallada es únicamente visual. Si falla la descarga o se elige una región cercana al polo o al corte de longitud, se muestra la grilla regional y un aviso. La copia externa requiere conexión y su disponibilidad es independiente de NASA. Fuente original: https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m. Copia: https://huggingface.co/datasets/Biscut4Biscuit/mola-hrsc-baseline-cog.

Carga visual: las cuatro teselas originales de nivel 0 de Viking y THEMIS se incluyen en data/mars/preview (procedencia en sources.json). Se reproyectan con el mismo método que el detalle y permanecen debajo de él. Desde zoom 2 se carga detalle de NASA Mars Trek. La base es de baja resolución y exclusivamente visual: no cambia MOLA ni las métricas. Caché de imágenes en memoria limitada a 96 entradas; se pierde al recargar la página.
