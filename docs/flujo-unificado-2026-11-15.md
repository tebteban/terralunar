# Ejecución compartida y salida del catálogo simulado

Base: develop 4d00dbf. Alcance: puntos 1 y 2 de la auditoría. No se incorporan dimensiones científicas nuevas.

## Cambio

El recorrido principal deja de consumir zones.json y profiles.json. La portada conserva el diseño y su ejemplo de terrenos reales, pero corrige los textos que atribuían un cálculo climático a la aplicación. Las funciones antiguas y datos mock permanecen en el repositorio para no destruir trabajo previo; no alimentan App.

AnalysisRun guarda destino resuelto, coordenadas, alturas, ensayo, pesos, filtros, referencia física, candidatos completos, informes de cobertura y fecha. ScientificSearch entrega y restaura esa ejecución; App la conserva durante la sesión. Cambiar de vista, abrir una ficha, exportar o cerrar el comparador no vuelve a calcular ni cambia el destino. Editar y cancelar conserva el último análisis; ejecutar reemplaza la ejecución y limpia la selección anterior. No se promete persistencia tras recargar la página.

La ficha usa un radar de semejanza calculada, valores físicos de ambos sitios, pesos, aportes y procedencia. Las dimensiones no medidas se listan pendientes. Cobertura y geología siguen siendo filtro/contexto, no semejanza planetaria.

El comparador conserva las dos maquetas, cámara sincronizada y exageración. Recibe el mismo puntaje del ranking y las mismas alturas regionales. Para recortes lunares de catálogo carga detalle de 80 m cuando ambos lados lo tienen; en selecciones lunares libres puede usar la malla de 800 m y el DEM terrestre agregado a la misma escala. Las ventanas exploratorias conservan su grilla real de 2 km; no se inventa detalle. Marte conserva el detalle remoto ya existente para candidatos con archivo terrestre compatible. El detalle visual nunca reemplaza las métricas regionales del score.

## Límites

Los ensayos siguen en etapa de contexto topográfico. La búsqueda continúa limitada a la cobertura procesada. La validación científica de pesos y tolerancias sigue pendiente. No se modificó el mapa base terrestre ni se resolvieron sus limitaciones de imágenes en zoom alto. El ejemplo de portada conserva su comparación local clásica, separada de las ejecuciones multirregionales.

## Pruebas

Prueba unitaria nueva: datos locales reales → resolución de destino → ranking ponderado → comparador → serialización; incluye ventana exploratoria y rechazo de candidato ajeno/falta de alturas. Las 38 pruebas unitarias pasan. Prueba de navegador nueva verifica que el recorrido no solicita los JSON mock, conserva destino/puntaje, permite reabrir el resultado y no desborda a 390/768 px. No se afirma que todas las pruebas históricas de la interfaz anterior sigan vigentes; sus selectores y expectativas de ranking simulado requieren migración.

Autoría: OpenAI Codex. Sin push ni cambios del modelo científico multidimensional.

Verificación final: compilación y lint correctos; 38 pruebas unitarias. Recorrido lunar aprobado con dos lienzos y detalle de 80 m; continuidad marciana aprobada también con WebGL habilitado y dos lienzos. La prueba marciana bloquea servicios HTTPS externos para aislar los datos locales, por lo que no verifica la carga de texturas remotas. La espera previa era un selector que esperaba Luna/Tierra con mayúscula mientras el nombre accesible estaba en minúscula; se corrigieron los botones. No se atribuye esa espera a GPU ni capas externas. No se ejecutó la suite histórica completa.

## Paso 3 — Criterios por ensayo
Se incorpora missionCriteria.ts: requisitos específicos, evidencia necesaria, método propuesto y disponibilidad. No se asignan pesos científicos ni puntajes a datos no integrados. Los diez perfiles conservan sus requisitos en la exportación. Para ensayos distintos del regional, la búsqueda exige elegir explícitamente contexto topográfico, y ficha/resultados indican compatibilidad pendiente. Cambiar de ensayo reinicia esa elección. Las fórmulas/pesos anteriores quedan exclusivamente para relieve parcial. El siguiente paso es integrar pares de productos y validar métodos, no habilitar available sin mediciones. No es una evaluación de ingeniería certificada.
