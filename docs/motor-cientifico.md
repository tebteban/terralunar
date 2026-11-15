# Motor científico: primera fase funcional

Implementado el 2026-11-14. Versión physical-wlc/1.0.0. No hay entrenamiento ni modelo de IA en esta fase.

## Auditoría y alcance

Se verificaron código y archivos del repositorio, la especificación adjunta y las fórmulas provistas. Los PDF anteriores de evaluación y entregables NO se releen en esta fase; no se atribuyen requisitos nuevos a esos documentos.

Disponibles: recortes binarios de 20 km, índice con procedencia, tres regiones lunares LOLA y recortes terrestres AWS Terrain Tiles; bandas globales MOLA de Marte. Las imágenes Viking/THEMIS son visuales y no aportan elevaciones. El catálogo zones.json conserva puntajes de demostración y no se utiliza para calcular esta nueva similitud. El directorio pipeline/raw actualmente contiene mars; no asumir que todos los originales mencionados en scripts se encuentran descargados.

No se encontraron capas analíticas integradas para capacidad portante, granulometría, minerales, dosis de radiación, volátiles o temperatura en este nuevo motor. Tampoco hay entrenamiento supervisado ni cobertura terrestre mundial procesada.

## Implementación

Botón Comparación científica: objetivos lunares locales y seis marcianos. Agrega bloques 25×25 de recortes a 80 m a celdas de 2 km; Marte reutiliza muestreo MOLA existente. Ventana 20 km, diez celdas por lado. Calcula pendientes mediana/p90, desviación de residuos respecto a media local 3×3 y desnivel. No compara cotas absolutas entre datums planetarios. Estas métricas regionales no resuelven obstáculos de rover. La resolución nominal no garantiza igual resolución efectiva entre sensores.

Para cada variable: s=max(0,1-|x-t|/tau). Índice=100 sum(w*s)/sum(w). Tolerancias iniciales: 5 grados, 8 grados, 200 m y 1000 m, respectivamente. Son parámetros exploratorios heredados, no umbrales de seguridad ni tolerancias calibradas. Mediana y p90 están correlacionadas; revisar redundancia antes de validar pesos. Puede ajustar pesos, ver aportes, localizar un recorte en el visor y exportar JSON con parámetros y versión. La ficha histórica del visor sigue perteneciendo al catálogo de demostración: no confundir sus puntajes con el cálculo exportado.

## Corrección de la WLC propuesta

Su vector 20/20/15/15/15/15 queda registrado como hipótesis del usuario. El cálculo admite valores nulos, cobertura ponderada y límites matemáticos de puntuación; no renormaliza los criterios ausentes. Los límites no son intervalos de confianza. Restricción desconocida impide emitir score; exclusión se informa separada de falta de datos.

Expresión conceptual correcta para una máscara 0/1:

```
(0.20*C_portante_norm + 0.20*C_volatiles_norm +
 0.15*C_granulometria_norm + 0.15*C_termico_norm +
 0.15*C_topografia_norm + 0.15*C_radiacion_norm) * Slope_Mask
```

Si se usa la pendiente directamente, la máscara es (pendiente <= umbral_documentado). No usar (Slope_Mask <= 1): acepta tanto cero como uno. En QGIS utilizar nombres de banda correspondientes, por ejemplo "Slope_Mask@1"; ArcGIS requiere su sintaxis Raster. Alinear CRS, extensión, pixel, NoData y unidades antes de aplicar álgebra. NoData permanece desconocido, no apto por defecto.

Beneficio/costo expresa preferencia operativa. Similitud requiere función centrada en el valor o distribución objetivo. Una región llana no es necesariamente análoga a una región accidentada. Fijar rangos con referencias físicas externas al conjunto consultado; no recomputar min/max por búsqueda. El motor rechaza intervalos degenerados.

## Geología: cómo incorporarla

1. Luna: unidades del mapa USGS 1:5 millones para contexto regional; no interpretar su escala como información geotécnica de parcela. Añadir espectros M3 cuando haya cobertura y calidad suficientes, con procesamiento y bibliotecas minerales documentados.
2. Marte: mapa geológico regional USGS y productos CRISM para hipótesis mineralógicas. THEMIS térmico no equivale automáticamente a composición mineral.
3. Tierra: unidades SIGAM/SEGEMAR para Argentina; servicios geológicos nacionales para otras regiones. Imágenes Sentinel-2 para cobertura/afloramientos candidatos, no como confirmación de mineralogía o granulometría. Usar espectrometría y muestras de campo cuando el objetivo requiera composición.
4. Definir vocabulario común: procesos (volcánico, impacto, sedimentario), clases minerales/fracciones, alteración, material suelto/roca y sus incertidumbres. No comparar códigos de unidades de mapas distintos como números ordinales. Comparar proporciones observadas con una distancia de distribuciones, manteniendo los componentes no medidos ausentes.
5. Portancia: ensayos geotécnicos, densidad, cohesión, fricción, humedad, confinamiento y condición de carga. Una litología no determina estos valores. Granulometría requiere distribución medida y escala de observación compatible. Evaporitas terrestres no demuestran equivalencia al hielo lunar. SVF es apertura del horizonte, no dosis de radiación ionizante: separar geometría, iluminación y dosimetría.
6. Los datos calculan similitudes; los pesos expresan necesidades del ensayo. Elicitarlos con expertos, registrar versión y estudiar sensibilidad. La geología por sí sola no determina los pesos.

Fuentes consultadas/propuestas (no afirmar descarga):
- https://astrogeology.usgs.gov/search/map/Moon/Geology/Unified_Geologic_Map_of_the_Moon_GIS_v2/
- https://pds-geosciences.wustl.edu/missions/mro/crism.htm
- https://crismtypespectra.rsl.wustl.edu/
- https://sigam.segemar.gov.ar/
- https://pds-geosciences.wustl.edu/missions/lro/diviner.htm

## Descubrimiento y ML: siguiente fase

Este piloto compara recortes existentes; NO descubre sitios fuera del catálogo. Para ello: procesar mosaicos terrestres en ventanas no solapadas con tamaño físico constante, controlar agua/NoData, generar catálogo de features por celda y almacenar bbox, CRS, datum, resolución nativa/efectiva, fecha, URI, checksum, algoritmo, versión y cobertura. Separar restricciones de acceso del parecido físico. No llamar inédita una región simplemente porque no figura en nuestro catálogo.

La primera búsqueda debe ejecutarse en un área acotada y publicar extensión realmente procesada. Mantener división espacial de desarrollo/validación y análogos conocidos reservados; medir recuperación top-k, sensibilidad a escala y pesos, estabilidad, cobertura y tiempo. Actualmente no se midió recuperación científica ni precisión predictiva.

WLC explicable es la línea base. Distancia euclídea escalada penaliza diferencias grandes; Mahalanobis exige covarianza estable y suficiente muestra; coseno descarta magnitud relevante. Distancias entre distribuciones de pendientes/materiales son una ampliación útil. PCA reduce redundancia pero necesita validación; clustering explora familias, Isolation Forest detecta anomalías, ninguno certifica analogía. Siamese/contrastivo requiere pares etiquetados por expertos independientes: no entrenar contra nuestros propios puntajes como verdad.

Entrenar offline únicamente con datos suficientes y comparar contra la línea base en regiones retenidas. Si mejora, exportar modelo, normalizadores y manifiesto versionado. ONNX Runtime Web con WASM es una opción de despliegue; evaluar WebGPU como aceleración y medir tamaño/latencia/compatibilidad. TensorFlow.js corresponde si el modelo y pipeline lo justifican. No agregar ambos runtimes ni LLM para cuatro operaciones aritméticas. Un Worker puede ejecutar búsquedas extensas sin bloquear mapas; el catálogo actual es pequeño y no requiere un runtime de inferencia.

## Validación

Pruebas automatizadas de rangos, máscara de suma completa, NoData, restricciones desconocidas, sensibilidad de pesos y función de similitud. Ejecutar npm test, npm run build, npm run lint desde web. Estos tests verifican implementación; no constituyen validación científica ni evaluación geotécnica. Quedan pendientes análisis de resolución, benchmark espacial, nuevas regiones y validación mineralógica.
