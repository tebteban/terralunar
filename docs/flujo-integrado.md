# Estado de integración del flujo científico

## Entregado en esta fase

- Fusión develop cerrada en b7df476; navegación y motores conservados.
- Botón «Buscar análogos de esta región» desde selección de Luna y Marte. Luna: DEM del casquete sur ~800m, interpolación/media a 2km; ventana fuera de cobertura rechazada. No reutiliza métricas lunares de 80m como si fueran de 2km. Marte reutiliza recorte de 2km existente. Exportación incluye objetivo, coordenadas, fuente y escala.
- Dos regiones terrestres reales: Atacama 36 ventanas, Hawái 9. Procesador acepta --region para no sobrescribir el piloto. Hawái no tiene aún cobertura ni modelo local: se informa desconocido. No es búsqueda mundial ni admite cualquier AOI desde UI todavía.
- Sentinel-2 L2A reciente: script 08_recent_sentinel.py consulta octubre–14 noviembre de 2026. Selecciona última escena por tile con nubosidad de escena <30%. No es garantía de ausencia de nubes local; usa SCL 4/5/6. Descarga rangos GeoTIFF públicos con firma temporal automática, no guarda tokens. Lee cuantificación y BOA_ADD_OFFSET del XML de producto. NDVI de reflectancias corregidas, mediana y p90 por ventana; filtros NDVI usan p90. Muestreo aproximado ~200m mediante overviews: NO máscara exhaustiva nativa 10m. Puede perder elementos pequeños; no valida estacionalidad ni incertidumbre. Devuelve cobertura válida y fechas de observaciones; huecos no se rellenan con supuestos.
- SCL 4 se usa como indicador de vegetación y SCL 6 como agua observada. Estas clases NO son equivalentes metodológicamente a WorldCover y sus fracciones no deben usarse como detección de cambios 2021–2026. Construido permanece WorldCover 2021, explícito en UI/exportación; nunca se etiqueta todo como 2026. Sentinel no distingue edificios con el NDVI.
- Geología por centro del candidato: unión espacial con polígonos/multipolígonos y huecos SIGAM 1:1M. Unidades/edad/tipo de roca mostrados como contexto puntual; no representan toda la ventana ni equivalencia lunar.
- Evaluación regional independiente: modelo de Atacama congelado aplicado a 9 ventanas de Hawái. 6/9 fuera de algún rango de entrenamiento; no confirma capacidad de generalización. Resultado en transfer-evaluation.json. No hay etiquetas independientes de aptitud para comparar precisión con WLC.

## Reproducir

Node: pipeline/09_evaluate_transfer.ts; web npm test/build/lint. Python 3.12: instalar rasterio y pyproj en pipeline/.deps (ignorado por Git), ejecutar pipeline/08_recent_sentinel.py. Script de terreno requiere numpy/Pillow. El cutoff temporal es explícito, modificarlo para nueva campaña y conservar artefactos versionados. No ejecutar varias instalaciones concurrentes.

## Verificaciones y límites pendientes

Chrome: selección Mons Mouton desde Luna -> cálculo; selección Jezero desde Marte -> cálculo; datos recientes en UI; cambio a Hawái. Tests incluyen escala lunar/plano y rechazo de bordes, huecos y multipolígonos, además de motores/filtros previos. Compilación y lint.

Todavía no terminado: cobertura mundial, selección arbitraria de AOI terrestre en UI, superficie lunar fuera del casquete, temperatura/iluminación, recursos/hielo, procesos atmosféricos, biología, subsuelo, capacidad portante, equivalencia mineralógica planetaria, datos urbanos 2026 y validación científica de relevancia. Los perfiles siguen deshabilitados sin mediciones: estos cambios no los habilitan artificialmente. No se afirma «todo listo» ni IA predictiva validada.

Las pruebas automatizadas demuestran integridad y funcionamiento; no aptitud de campo. Un resultado sin máscara habilitada puede incluir agua/vegetación o urbanización; conservar perfil y política exportados para reproducibilidad.

Resultado final Sentinel: seis escenas procesadas sin fallos de descarga; observaciones válidas 10/13 noviembre 2026 en 34/36 ventanas, 9/36 con cobertura >=99%. Las demás no cumplen automáticamente el filtro. 26 pruebas pasan. No se completó un mosaico multitemporal para rellenar nubes; eso requiere ampliar fechas/escenas y conservar sesgo temporal explícito.
