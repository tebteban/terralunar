# TerraLunar — interfaz científica

Implementación sobre la aplicación existente, 2026-11-14. La especificación del usuario de dashboard científico prevalece sobre la guía anterior Uber y sobre los componentes de marketing de Linear. No se sustituyen mapas ni datos por imágenes estáticas.

## Sistema visual
Grafito #171C21, paneles #20272D, superficies #2B333A, texto #E7E9E7, secundario #98A3AA, selección ámbar #C69A54 y acciones técnicas #75C9D1. Instrument Sans con Inter/system-ui como alternativas. Paneles sólidos, bordes finos, radios 6–8 px. Se oculta el fondo espacial decorativo; se mantiene la interacción de los globos.

## Organización
- App.tsx: barra superior, configuración científica, visor central y resultados laterales. Mantiene pesos, presets, ranking y selección. Restablecimiento de pesos, fuentes/metodología en diálogo nativo y pantalla completa.
- PanelOutlet.tsx + panelContext.ts: los controles y resultados existentes de Luna y Marte se presentan en el panel lateral mediante portales, manteniendo su lógica y estado dentro de cada visor.
- ZoneCard.tsx: ficha dentro del panel de resultados, coordenadas, contribuciones, comparación y fuentes desplegables.
- MapView.tsx: controles de centrado/cenital, escala terrestre, coordenadas/zoom y ResizeObserver.
- MarsView.tsx: panel externo, coordenadas/zoom, centrado y ResizeObserver; conserva Viking/THEMIS, MOLA, exportación y comparación.
- MoonGlobe.tsx: elimina reserva de ancho de la antigua ficha, añade controles de zoom/norte/centrado y distancia al punto observado. MoonMap.tsx conserva selección y métricas LOLA y alternativa Cesium existente.
- Compare3D.tsx: comparación a pantalla completa sobre toda la aplicación.
- index.css e index.html: tokens, tipografía, layout y adaptación a tamaños de pantalla.

No se cambian score.ts, marsData.ts, las fórmulas, contratos de datos ni los pipelines.

## Semántica científica
El catálogo con pesos sigue usando puntajes mock y se identifica como demostración. Los pesos de ese catálogo NO se aplican a los rankings topográficos de Luna/Marte. La ficha planetaria conserva su método y fuentes. No se inventan perfiles marcianos de temperatura, hielo o construcción. El selector superior de objetivo cambia el cuerpo de exploración; los sitios concretos se eligen con los controles existentes de cada planeta. La cobertura analítica lunar sigue limitada al polo sur. El detalle de imagen no implica mayor resolución de análisis.

## Responsive y accesibilidad
Escritorio: 300 px / visor flexible / 370 px; pantallas mayores, 320/400 px. Medianas: configuración desplegable y resultados ocultables. Móvil: visor principal con configuración lateral y resultados inferiores. Scroll independiente de paneles, sin scroll horizontal. Etiquetas, foco visible, estados pressed/expanded, diálogo nativo de método con Escape y confinamiento de foco. Los motores ajustan el tamaño al cambiar el contenedor.

## Verificación
- TypeScript y Vite build correctos; lint sin avisos; seis pruebas de cálculo correctas.
- Chrome automatizado, 1920x1080: tres vistas renderizadas; sliders modifican el ranking; reset de pesos; selección de ficha terrestre; método abre/cierra con Escape; selección Mons Mouton; selección Jezero con seis resultados; selector Viking/THEMIS; comparador con dos canvas de relieve.
- Sin errores JavaScript en los recorridos comprobados. Sin desbordamiento horizontal a 1920x1080, 2560x1440, 1280x800 y 390x844. Capturas revisadas de escritorio, Luna, Marte, comparador y panel inferior móvil.
- Algunas solicitudes de teselas externas fallaron o fueron canceladas durante navegación; la disponibilidad y calidad remota no quedan garantizadas por esta validación.
- No verificado: Cesium autenticado (pruebas en navegador aislado sin credencial), pantalla completa del navegador en interacción manual, gestos en dispositivo táctil físico y totalidad de ubicaciones/capas remotas.

Quedan fuera de este rediseño: nuevas fuentes científicas, búsqueda global exhaustiva, ampliación de cobertura lunar y nuevos modelos de puntuación.
