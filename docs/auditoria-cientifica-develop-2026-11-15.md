# Auditoría funcional y científica — TerraLunar

Fecha: 2026-11-15. Base: develop, commit 4d00dbf. Auditoría del código y artefactos locales; no certificación de aptitud de sitios ni revisión científica externa. No se aplicaron cambios funcionales. El trabajo anterior permanece en stash.

## Dictamen

La aplicación reúne una demostración multicriterio con valores simulados, dos comparadores planetarios de relieve y un buscador multirregional con DEM reales. No es todavía un buscador multidimensional global. La confusión principal viene de presentar estos motores dentro de un mismo recorrido sin mantener un contrato único de destino, ensayo y resultado.

Conservar: visores, comparador sincronizado, recortes reales, funciones WLC con tratamiento explícito de faltantes, máscaras con trazabilidad, exportación científica y pruebas matemáticas. No hace falta reemplazar todo ni entrenar una red neuronal desde cero.

## Hallazgos prioritarios

### P1 — El ranking terrestre principal y el radar usan datos simulados

App.tsx: DATOS_DE_PRUEBA=true; carga zones.json y profiles.json, usa profiles.luna y rank(zones,weights). pipeline/00_mock_data.py declara puntajes inventados y polígonos cuadrados sintéticos. ZoneCard dibuja esos puntajes en el radar. Los nombres de datasets son etiquetas de intención, no prueba de extracción de esos valores. La interfaz sí marca demostración: no es un fallo oculto, pero impide usar este recorrido como resultado científico.

Acción: conservar la presentación, sustituir su entrada por un resultado científico trazable. No apagar simplemente el banner.
Aceptación: cada eje del radar debe enlazar valor físico, unidad, fuente, calidad, escala y transformación; los faltantes no se dibujan como mediciones cero.

### P1 — Los tipos de ensayo no activan dimensiones nuevas

analogyScope.ts describe diez perfiles, pero experimentPlan devuelve únicamente cuatro pesos topográficos. Excavación, térmica, recursos, biología, cuevas y regional comparten [25,25,25,25]. Por tanto, con igual destino y filtros sus resultados son idénticos. Los paneles locales MoonMap/MarsView calculan matches con similitud uniforme, sin los pesos del ensayo; cambiar el selector no modifica ese ranking local. canScreen es verdadero en todos los perfiles.

Acción: separar similitud topográfica de evaluación del ensayo. No ordenar térmica o excavación como si el relieve fuese evidencia suficiente. Implementar criterios por perfil cuando existan pares de mediciones compatibles.
Aceptación: variar una medición térmica modifica el resultado térmico, no el geológico; ausencia de datos esenciales produce resultado incompleto, no el mismo ranking con otro título.

### P1 — Se pierde la ejecución al navegar a Tierra

ScientificSearch entrega a App solamente {zone,score} al mostrar el mapa y (id,zone,score) al seleccionar. Se pierden referencia calculada, pesos, filtros, aportes y evidencia. El estado interno de resultados desaparece al cerrar el diálogo. searchTarget no se actualiza al elegir otro destino dentro del buscador. App deshabilita el comparador cuando existe discovery y su ficha solo permite volver al buscador. El comparador clásico puede iniciar en su primer destino lunar, no necesariamente en el destino de la búsqueda científica.

Acción: persistir AnalysisRun completo en App o store; pasar la misma ejecución a lista, mapa, ficha, exportación y comparador. Mantener el comparador visual existente.
Aceptación: seleccionar destino A, ensayo B, candidato C y alternar vistas conserva A/B/C, huella, escala y puntaje; reabrir el buscador no pierde la ejecución.

### P1 — La búsqueda global es un conjunto finito preprocesado

loadCandidates lee un registro fijo. Hay 20 recortes terrestres de catálogo y 81 ventanas en seis regiones: Atacama 36; Hawái, Namib, Pilbara, Utah y Qaidam 9 cada una. El buscador no genera ventanas nuevas. pipeline/05_discovery.py sí genera grillas, pero requiere centro y tamaño, limita latitud a ±60°, longitud a ±170° y 2–12 ventanas por lado. No cubre automáticamente polos ni subsuelo.

La deduplicación separa ventanas exploratorias 30 km y excluye las situadas a menos de 30 km del catálogo. Esto aporta diversidad, no demuestra novedad bibliográfica. El filtro principal «nuevos» usa !known del catálogo simulado; no representa descubrimientos.

Acción: planificar teselas terrestres y procesarlas por etapas, registrar cobertura y fallos, usar catálogo para contraste y evaluación. Describir novedad como «fuera del catálogo consultado» hasta revisar antecedentes.
Aceptación: añadir una región procesada incorpora candidatos antes inexistentes sin escribir sus nombres o puntajes a mano.

### P1 — No hay validación independiente de compatibilidad

El bloque Validación de App cuenta conocidos del mock y está marcado demostración. known_analogs.geojson se genera como mock. validation.json es un diagnóstico de sensibilidad, no una validación de analogía. terrainML es k-means sobre cuatro variables de relieve; globalSearch lo muestra como contexto y no modifica el score. transfer-evaluation.json registra 6/9 ventanas de Hawái fuera del rango de entrenamiento de Atacama y declara ausencia de ground truth.

Acción: catálogo con fuentes, etiquetas por propósito y división espacial independiente; congelar pesos/tolerancias antes de evaluar. Medir recuperación, falsos positivos, cobertura y estabilidad. No usar «recupera Hawái» como única prueba ni interpretar grupos como probabilidad de aptitud.

### P2 — Contratos contradictorios para faltantes y pesos

score.ts convierte dimensiones ausentes en cero. scientificEngine.combine devuelve score=null cuando faltan criterios con peso, preservando cobertura e intervalo. MONS_WEIGHTS existe pero no se utiliza en los recorridos inspeccionados. Las funciones difusas de profiles.json se muestran como objetivos; el ranking principal consume scores ya preparados y no transforma observaciones físicas en tiempo real.

docs/criterios-civil.md recomienda redistribuir pesos de variables faltantes y propone altitud como proxy de radiación. Eso no debe alimentar un índice de compatibilidad integral: ocultaría dimensiones no medidas y no acreditaría un ambiente de radiación espacial. El propio analogyScope.ts advierte ese límite. Corregir la documentación antes de implementar tales reglas.

### P2 — Escalas y significado de los puntajes no son uniformes

El comparador lunar local usa métricas LOLA de 80 m y maquetas agregadas a 800 m. La búsqueda científica usa celdas de 2 km y ventanas de 20 km, también para Luna. MOON_TOL usa rugosidad 3 m; la comparación regional usa otras tolerancias. No interpretar diferencias de puntaje entre recorridos como contradicción física sin mostrar escala y método. El detalle marciano MOLA/HRSC de 200 m se obtiene de un archivo alojado por un tercero en Hugging Face: registrar procedencia primaria, versión y comprobar disponibilidad; no llamarlo descarga directa NASA.

### P2 — Estado visual y disponibilidad

MapView depende de un estilo CARTO remoto para inicializar capas. La imagen Esri tiene maxzoom=8 y se desvanece entre zoom 5 y 8: el cambio visual al acercarse está programado. El modelo MOLA carga 16 bandas y asigna una grilla de 11520×5760 int16 (~133 MB decimales), además de las estructuras de render. Hay riesgo de espera/memoria en equipos modestos. La ausencia de token no elimina las dependencias de red.

Acción: estados de carga por producto, errores recuperables, carga progresiva y políticas de caché. Separar resolución de imagen, resolución de malla y resolución del cálculo.

## Inventario de evidencia local

| Dimensión | Disponible hoy | Uso efectivo | Falta para comparación |
|---|---|---|---|
| Relieve | LOLA sur lunar; MOLA; 23 recortes del comparador (3 lunares, 20 terrestres); 81 ventanas adicionales | Cuatro métricas, ranking y mallas | Calibración, resolución efectiva y descriptores según ensayo |
| Cobertura | WorldCover 2021 y Sentinel-2 2026, Atacama/Hawái | Máscara opcional y detalles; no score planetario | Cobertura de más regiones y política por ensayo |
| Geología | 72 entidades SIGAM, escala 1:1.000.000, contexto argentino | Intersección con centro de ventana; información textual | Objetivo planetario, correspondencia de materiales, área cubierta, incertidumbre |
| Térmica | Un MOD11A1 HDF encontrado previamente en Downloads; no integrado al buscador | Ningún criterio térmico real en ranking | Ingesta/QC, series y productos planetarios compatibles |
| Iluminación | No perfil comparativo calculado | Descripción de alcance | Geometría solar, tiempo, horizonte y sombras |
| Hielo/recursos | Sin par de mediciones integrado | Descripción de perfil; nieve mock en catálogo | Producto específico, profundidad/estado/confianza |
| Procesos | Sin tasas o series comparables integradas | Descripción de perfil | Hipótesis física y observaciones temporales |
| Biología | Sin mediciones integradas | Descripción de perfil | Estudios terrestres y contexto objetivo; NDVI no es biofirma |
| Cuevas/subsuelo | Sin inventario/modelo comparativo | Descripción de perfil | Geometría y evidencia subsuperficial |
| Operaciones | Relieve regional como contexto | Preselección topográfica | Bloques, tracción, granulometría, portancia y requisitos de equipo |

Los 23 archivos binarios referidos por compare/index.json están presentes localmente. Esto no prueba su disponibilidad en un despliegue externo. Los manifiestos de cobertura están vinculados por hash al DEM. El muestreo de cobertura es aproximadamente a 200 m, no una máscara exhaustiva a 10 m. Sentinel acepta SCL 4/5/6: no extrapolar este procedimiento a un estudio de nieve/hielo sin cambiar el tratamiento de clases.

## Contrato propuesto antes de implementar

AnalysisRun debe contener: id/versiones; destino (cuerpo, coordenadas, huella); propósito; criterios y pesos; restricciones; productos/hashes; resolución nativa y de análisis; fechas/condiciones de observación; candidatos con geometría, mediciones, calidad, incertidumbre, semejanza por criterio, aportes, faltantes y limitaciones; métricas de validación separadas.

Observación: valor o distribución, unidad, método, producto y versión, huella, tiempo, resolución, fracción válida y estado (medido/inferido/faltante/no aplicable). No comparar categorías o magnitudes incompatibles. La calidad de evidencia no es semejanza física; mostrar ambas por separado.

No hay porcentaje universal de compatibilidad. Definir semejanza por criterio, combinar solo para una pregunta explícita y mantener incompleto el índice cuando falten requisitos esenciales. No usar una media topográfica para suplir térmica/materiales.

## Ensayo → datos → método → faltantes

| Ensayo | Dimensiones requeridas | Método propuesto | Situación |
|---|---|---|---|
| Paisaje regional | Relieve y formas | Distancias de características/distribuciones a escala común | Base implementada, tolerancias provisionales |
| Rover/aterrizaje | Relieve local, obstáculos y propiedades operativas | Semejanza de terreno + restricciones del vehículo | Solo contexto regional |
| Excavación | Materiales, granulometría, resistencia; recurso si aplica | Comparación de propiedades y composición | Sin pares medidos |
| Térmica | Temperatura y régimen de iluminación | Comparación de distribuciones/ciclos controlados por condiciones | No implementado |
| Recursos | Material, estado, profundidad y concentración | Comparación por recurso y calidad de evidencia | No implementado |
| Procesos | Formas, materiales y evolución | Descriptores de proceso y series temporales | No implementado |
| Habitabilidad | Química, mineralogía y evidencia terrestre | Comparación de contexto para ensayo de detección | No implementado |
| Cuevas | Geometría, geología y estabilidad | Comparación geométrica + requisitos operativos | No implementado |
| Hábitat | Mecánica, terreno, térmica y acceso | Criterios físicos y restricciones del diseño | Solo contexto regional |

## Orden de trabajo y criterios de cierre

1. Unificar ejecución y aislar demostración. Conservar el comparador y radar, conectándolos a la misma evidencia. Cierre: recorrido destino→ensayo→candidato→Tierra→3D conserva identidad y cálculo.
2. Elegir un ensayo y definir mediciones necesarias con revisión de ciencia. Integrar los pares de productos, no solo nombres de dimensiones. Cierre: prueba con valores conocidos, unidades/QC y faltantes controlados; fuentes accesibles.
3. Expandir candidatos mediante teselado reproducible, política de cobertura y procesamiento por lotes. Cierre: búsqueda descubre ventanas fuera de las listas actuales con trazabilidad y diversidad espacial.
4. Evaluar con referencias independientes por propósito y negativos. Cierre: informe reproducible de aciertos, fallos, sensibilidad y límites; no solamente tests de software.
5. Validar presentación y despliegue: disponibilidad de archivos, red lenta, móvil y equipo de demo. Cierre: flujo público verificable, sin referencias engañosas a compatibilidad integral.

## Verificación de esta auditoría

Compilación y lint aprobados. 37/37 pruebas unitarias aprobadas. Build principal ~1.405 MB sin comprimir y comparador ~634 kB; Vite advierte chunks grandes. Los tests comprueban implementación y algunos invariantes matemáticos, no validan científicamente pesos ni aptitud de sitios. Pruebas de navegador Luna/Marte solicitadas; resultado registrado por separado al finalizar. No se realizó validación de campo, revisión bibliográfica de novedad, auditoría de todos los productos remotos ni prueba completa de producción.

Resultado navegador: 2/2 pruebas desktop en Edge aprobadas (18,1 s), salida exitosa. Luna: selección Mons Mouton, cuatro métricas, seis candidatos y apertura del comparador. Marte: validación de latitud y selección Jezero con métricas MOLA. No se ejecutó toda la suite responsive ni se inspeccionó visualmente cada capa remota.

Autoría: auditoría asistida por OpenAI Codex, mediante lectura del repositorio, inventario local y ejecución de pruebas. Sin cambios funcionales ni push.
