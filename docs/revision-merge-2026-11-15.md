# Revisión del merge y formato común

Base revisada: c396da6. Al empezar, main apuntaba al mismo commit que origin/develop; no existía develop local. Se creó develop siguiendo origin/develop sin descartar commits.

El merge conserva datos multirregionales (101 recortes), motor físico y auditoría de diseño. No se encontraron marcadores de conflicto en web/src. La auditoría adjunta describe 32 pruebas e2e aprobadas y una por tiempo; no acredita una corrida completa posterior en verde. La suite previa también contiene textos de la interfaz anterior a la integración (Personalizado, encabezados lunares).

Cambios: SurfacePanel compartido por Tierra, Luna y Marte; ficha científica dentro del lienzo en lugar de fixed sobre toda la página; márgenes superiores consistentes para no tapar la navegación. Formato es-AR compartido en resultados y comparador. Exageración vertical disponible también para recortes lunares del catálogo. Caché de buffers compartida en comparador y recortes lunares.

La Luna usa siempre MoonGlobe con DEM LOLA local. No lee tokens de Cesium ni alterna de motor según localStorage. Esto no convierte el DEM local en el servicio de alta resolución de Cesium; se conserva su resolución y cobertura reales.

Validación: build, lint y 37 pruebas unitarias pasan. Dos pruebas e2e nuevas aprobadas en Edge: Luna con token obsoleto → comparador → recorte terrestre, y layout marciano a 390/768/1100/1440 px sin desborde ni superposición con navegación. No se afirma que la suite histórica completa esté validada tras el merge.
