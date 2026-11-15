# Aprendizaje automático experimental de terreno

Primera implementación: K-means no supervisado, 3 grupos exploratorios. Aprende centroides de cuatro características físicas (pendiente mediana y p90, rugosidad residual y desnivel); no usa puntajes WLC, coordenadas ni etiquetas de aptitud como variables de entrenamiento. No es una red neuronal ni un predictor de éxito de misiones.

Entrenamiento offline: `node pipeline/06_train_terrain.ts` desde la raíz. Requiere Node con soporte TypeScript nativo. Reutiliza el cálculo de features del navegador para evitar diferencias de implementación. Guarda `data/discovery/model.json` (normalización, centroides, rangos, IDs, hash del manifiesto y escala) y `ml-evaluation.json`.

18 ventanas meridionales de entrenamiento, 6 de separación (20 km de franja), 12 septentrionales retenidas. Normalización media/desviación aprendida SOLO en entrenamiento. K=3 fijado como experimento, no elegido por resultado del conjunto retenido. Lloyd con hasta 100 iteraciones y 10 inicios deterministas de puntos alejados; se elige menor inercia de entrenamiento. Identificadores de grupo ordenados por pendiente del centro para reproducibilidad, no clases geológicas. Pendientes correlacionadas pueden sobreponderar esa dimensión.

Resultados: error cuadrático medio de cuantización estandarizada 0,823 en entrenamiento y 2,134 en evaluación; un único centro medio tiene 8,122 en evaluación. Más centros pueden representar mejor las muestras: esto NO demuestra mejor ranking, precisión predictiva ni analogía científica. Cuatro de las doce ventanas retenidas exceden algún rango de entrenamiento. Un grupo contiene solo dos ejemplos de entrenamiento. Muestra pequeña, una sola región y una sola división espacial; no hay validación mundial.

En Comparación científica, el piloto muestra grupo aprendido y distancia estandarizada al centro por candidato, permite filtrar los representantes por grupo y señala valores fuera de rango. El objetivo lunar/marciano se asigna descriptivamente a los grupos terrestres; es transferencia entre dominios NO validada. Estar dentro de los rangos tampoco garantiza pertenencia a la distribución. No se reordena el ranking WLC ni se excluyen candidatos por ML; el filtro actúa sobre los representantes espaciales ya seleccionados, no sobre todas las ventanas.

Inferencia local sin dependencias pesadas: carga JSON y calcula distancias. El navegador verifica SHA256 del manifiesto antes de usar el modelo: cambiar los datos requiere reentrenar. Si falta modelo o es incompatible, mantiene el comparador físico y muestra el motivo. Exportación conserva el modelo y asignaciones. No hay tokens ni servicios externos de IA.

Pruebas: separación de grupos en datos controlados, determinismo, entradas inválidas, varianza cero, centroides imposibles, escala incompatible, serialización e IDs de partición. Ampliaciones necesarias: regiones independientes, múltiples particiones espaciales, estabilidad ante inicialización/remuestreo, redundancia de features, resolución, utilidad de los grupos para recuperación de análogos con evaluación experta. No se debe afirmar que mejora WLC hasta medirlo con etiquetas independientes.

Referencia del método y limitaciones (documentación consultada; implementación propia, no uso de sklearn): https://scikit-learn.org/stable/modules/clustering.html#k-means
