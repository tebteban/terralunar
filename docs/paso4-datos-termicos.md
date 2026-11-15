# Paso 4 — integración de observaciones térmicas (parcial)
Se incorporó MOD11A1.061 real, granule A2025216.h11v11 del 2025-08-04.
No es un producto de 2026. Resultado: 38 ventanas terrestres con día y noche.

## Procedimiento reproducible
Instalar pyhdf y numpy en pipeline/.thermal-deps (directorio ignorado).
Definir PYTHONPATH=pipeline/.thermal-deps y ejecutar:
python pipeline/09_thermal_observations.py "<ruta al granule MOD11A1 HDF>"

El script interpreta la proyección sinusoidal y escala del archivo, selecciona
centros de píxeles nativos dentro de ventanas de 20 km, exige cobertura completa
del recorte por la tesela y aplica QC=0 (las cuatro clases de calidad óptimas).
Reporta P10/mediana/P90 espaciales en K y rango de hora solar por separado para
día/noche, fracción válida, fecha, resolución, granule y SHA-256.
No interpolamos nubes ni datos ausentes. Los percentiles no son extremos diarios.
No calcula amplitud a partir de píxeles diferentes ni llama ciclo a dos pasadas.

Fuente: https://doi.org/10.5067/MODIS/MOD11A1.061
Decodificación: https://lpdaac.usgs.gov/documents/715/MOD11_User_Guide_V61.pdf

## Integración
data/thermal/modis-observations.json contiene el producto derivado pequeño.
loadCandidates adjunta evidencia solo si ID y coordenadas coinciden.
La ficha muestra valores, fecha y límites; exportar la ejecución conserva la
evidencia con su procedencia. La ausencia de producto no bloquea el relieve.
No se modifican pesos ni índices por esta observación aislada.

## Pendiente para completar el paso 4
- Series terrestres multifecha y estacionales, más regiones y cobertura temporal.
- Extraer series lunares Diviner y productos térmicos marcianos, con geometría,
  hora solar, incertidumbre y escala compatibles.
- Definir y validar comparación térmica por ensayo antes de habilitar su puntaje.
- Composición/mineralogía, recursos y demás dimensiones aún requieren parejas de
  datos observables; SIGAM es contexto, no composición o portancia medida.
- Validar con análogos reservados y sensibilidad de pesos; esto aún no demuestra
  descubrimiento científico de un nuevo análogo.

## Verificación
Compilación y lint; 41 pruebas TS, 2 pruebas Python y recorrido Chrome específico
con datos locales reales (los servidores de imágenes externos bloqueados).
No se declara validada la suite histórica completa ni una analogía térmica.
