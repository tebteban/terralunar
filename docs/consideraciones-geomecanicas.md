# Clasificación de Arcadia Planitia (Marte) para encontrar análogos terrestres

Dimensiones: Granulometría y Composición, Capacidad Portante y Consolidación, Oscilaciones Térmicas, Presencia de Volátiles y Evaporitas, Morfología y Topografía Superficial, Exposición a Radiación y Refugio Subterráneo.

Clasificacion de la region de Marte: Arcadia Planitia para el Modelo SIG Global

Criterio 1: Granulometria y Composición  
Condicion Cuantitativa en Arcadia Planitia: Planicies volcánicas amazonicas cubiertas por polvo fino eolico con espesor de 1 a 3 metros, arenas basálticas, tamaño de grano medio D50 de 50 a 200 micrometros, y bloques rocosos escasos con abundancia superficial menor al 5%.  
Traduccion para el Modelo SIG Global: Provincias basálticas mundiales con firmas espectrales de rocas volcánicas y basaltos ricos en hierro, reflectancia en el infrarrojo cercano NIR de 0.15 a 0.30 y un indice de vegetación NDVI menor a 0.05.  
Regla de Normalización: 1.0 para suelos basálticos y desiertos sin vegetación con NIR de 0.15 a 0.30; 0.0 para suelos densamente vegetados con NDVI mayor a 0.4.

Criterio 2: Capacidad Portante y Consolidacion  
Condicion Cuantitativa en Arcadia Planitia: Densidad aparente superficial de 1.1 a 1.4 g/cm3 en los primeros centimetros, aumentando a 1.6 a 2.0 g/cm3 en profundidad. Cohesion superficial baja de 0.2 a 1.5 kPa y angulo de friccion interna de 30 a 40 grados. Zonas planas estables muy extensas que cubren mas del 80% de la region.  
Traduccion para el Modelo SIG Global: Planicies aluviales o desiertos planos con densidades de 1.5 a 2.0 g/cm3 y pendientes menores a 5 grados.  
Regla de Normalizacion: 1.0 para densidad aparente de 1.5 a 2.0 g/cm3 y pendiente menor a 5 grados; 0.0 para pendientes superiores a 15 grados o suelos blandos.

Criterio 3: Oscilaciones Termicas  
Condicion Cuantitativa en Arcadia Planitia: Planicie de latitud media-alta en Marte situada entre 35 y 50 grados Norte, registrando temperaturas superficiales diurnas y estacionales de 150 K a 270 K (-123 grados C a \-3 grados C). Amplitud termica diaria de 50 a 80 grados C.  
Traduccion para el Modelo SIG Global: Regiones terrestres aridas o frias con amplitud termica diaria o estacional superior a 30 a 50 grados C.  
Regla de Normalizacion: 1.0 para amplitud termica superior a 40 grados C en climas aridos o frios; 0.0 para climas isotermicos tropicales o marinos.

Criterio 4: Presencia de Volatiles y Evaporitas  
Condicion Cuantitativa en Arcadia Planitia: Superficie arida pero con presencia masiva de hielo de agua subsuperficial en exceso a profundidades muy reducidas de 0.5 a 3 metros, con concentraciones de volatiles del 30% al 90% por volumen en el subsuelo.  
Traduccion para el Modelo SIG Global: Zonas terrestres con permafrost continuo o discontinuo a menos de 1 a 3 metros de profundidad y coberturas de hielo o detritos del 20% al 80%.  
Regla de Normalizacion: 1.0 para permafrost subsuperficial a menos de 3 metros con 30% a 80% de contenido de hielo; 0.0 para zonas sin rastro de permafrost o volatiles.

Criterio 5: Morfologia y Topografia Superficial  
Condicion Cuantitativa en Arcadia Planitia: Planicie volcanica y periglaciar extensa con pendiente regional muy suave, altitudes de \-3,000 a \-4,000 metros bajo el datum areodesico, pendientes locales estrictamente menores a 2 a 5 grados y areas continuas amplias superiores a 1,000 km2.  
Traduccion para el Modelo SIG Global: Planicies sedimentarias o cuencas aridas amplias con pendientes menores a 3 grados y extension continua mayor a 50 km2.  
Regla de Normalizacion: 1.0 para pendientes menores a 3 grados en planicies extensas; 0.0 para relieves montañosos escarpados con pendientes superiores a 15 grados.

Criterio 6: Exposicion a Radiacion  
Condicion Cuantitativa en Arcadia Planitia: Entorno marciano de latitudes medias con atmosfera delgada de dioxido de carbono de 6 a 7 mbar y sin campo magnetico global, recibiendo una dosis de radiacion ionizante de 0.20 a 0.30 Sv/año (200 a 300 mSv/año) y alta radiacion UV directa.  
Traduccion para el Modelo SIG Global: Zonas terrestres de extrema altitud geografica por encima de los 3,500 a 4,500 metros sobre el nivel del mar con menor columna atmosferica e indice UV extremo mayor a 10\.  
Regla de Normalizacion: 1.0 para altitudes geograficas superiores a 4,000 metros s.n.m.; 0.0 para el nivel del mar con atmosfera densa.

Criterio 7: Refugio Subterraneo  
Condicion Cuantitativa en Arcadia Planitia: Planicie predominantemente plana con escasos accidentes naturales de gran altura, presencia de crateres de impacto degradados y trincheras periglaciales con desniveles locales de 2 a 15 metros y pendientes de flanco de 5 a 20 grados.  
Traduccion para el Modelo SIG Global: Depresiones menores, dolinas, taludes suaves o escarpes de baja altura con desniveles de 2 a 15 metros y pendientes de 5 a 20 grados.  
Regla de Normalizacion: 1.0 para desniveles de 2 a 15 metros con pendientes de 5 a 20 grados; 0.0 para llanuras totalmente planas sin ningun relieve protector.

# Cómo asignar los pesos porcentuales y las reglas de combinación para estos 7 criterios en la calculadora ráster del SIG.

Matriz de Ponderacion y Reglas de Combinacion para la Calculadora Raster del SIG

1. Pesos Porcentuales y Valores Decimales para los 7 Criterios  
* Morfologia y Topografia Superficial: 20% (Valor W: 0.20)  
* Presencia de Volatiles y Evaporitas: 20% (Valor W: 0.20)  
* Capacidad Portante y Consolidacion: 15% (Valor W: 0.15)  
* Granulometria y Composicion: 15% (Valor W: 0.15)  
* Oscilaciones Termicas: 10% (Valor W: 0.10)  
* Exposicion a Radiacion y Altitud: 10% (Valor W: 0.10)  
* Refugio Subterraneo y Estructuras: 10% (Valor W: 0.10)

* TOTAL: 100% (Valor W: 1.0)

2. Regla de Combinacion (Ecuacion para la Calculadora Raster)  
     
   Una vez normalizadas cada una de las 7 capas raster en una escala de 0.0 a 1.0 mediante funciones difusas basadas en los umbrales definidos, introduce la siguiente expresion en la calculadora raster de QGIS o ArcGIS Pro:  
   ( ("R\_Topografia\_Global" \* 0.20) \+ ("R\_Volatiles\_Global" \* 0.20) \+ ("R\_Portante\_Global" \* 0.15) \+ ("R\_Composicion\_Global" \* 0.15) \+ ("R\_Termica\_Global" \* 0.10) \+ ("R\_Radiacion\_Global" \* 0.10) \+ ("R\_Refugio\_Global" \* 0.10) ) \* "Super\_Mascara\_Global"  
     
3. Regla de Filtrado (Supermascara Global)  
     
   Para asegurar que el modelo elimine automaticamente zonas urbanas, cuerpos de agua y biomas terrestres incompatibles, la Super\_Mascara\_Global se calcula multiplicando tres capas binarias (1 \= apto, 0 \= descartado):  
     
   Super\_Mascara \= (NDVI \< 0.1) \* (Sin Cuerpos de Agua) \* (Sin Zonas Urbanas o Cultivos)

# Rangos de corte numéricos exactos y los umbrales de normalización (de 0.0 a 1.0) 

| Criterio de Evaluacion | Condicion Cuantitativa en Mons Mouton | Umbrales y Traduccion para el Modelo SIG | Regla de Normalizacion (Escala 0.0 a 1.0) |
| :---- | :---- | :---- | :---- |
| Granulometria y Composicion | Regolito maduro de tierras altas (anortositas/brechas), espesor de 2 a 15 m, tamaño de grano D50 de 40 a 100 um, bloques mayores a 0.5 m (5% \- 15%)  | Zonas con firmas espectrales de rocas intrusivas de tierras altas, reflectancia NIR de 0.25 a 0.40 y NDVI menor a 0.05  | 1.0 para suelos clasticos y tefra sin vegetacion con NIR de 0.25 a 0.40. 0.0 para suelos arcillosos densamente vegetados con NDVI mayor a 0.4  |
| Capacidad Portante y Consolidacion | Densidad aparente superficial de 1.1 a 1.3 g/cm3 (10-30 cm) y 1.5 a 1.8 g/cm3 en profundidad. Cohesion de 0.1 a 1.0 kPa y friccion de 35 a 45 grados  | Densidades aparentes de 1.4 a 1.8 g/cm3 en cimas, descartando laderas con pendientes superiores a 25 grados  | 1.0 para densidad aparente de 1.4 a 1.8 g/cm3 y pendiente menor a 15 grados. 0.0 para suelos pantanosos o laderas inestables con pendientes superiores a 25 grados  |
| Oscilaciones Termicas | Temperaturas diurnas de 100 K a 240 K (-173 C a \-33 C) y crateres en sombra de 40 K a 60 K (-213 C a \-233 C)  | Amplitud termica diaria o estacional superior a 25 C a 40 C, a menos de 2 a 5 km de gradientes hacia canones frios | 1.0 para amplitud termica superior a 30 C con proximidad a microclimas frios. 0.0 para climas isotermicos tropicales o marinos  |
| Presencia de Volatiles y Evaporitas | Superficie seca por insolacion pero con hielo subsuperficial de 0.5% a mas del 5% por peso en profundidad en flancos y escarpes  | Zonas de transicion de permafrost alpino o glaciares de escombros con coberturas de hielo y detritos del 10% al 50% | 1.0 para presencia de permafrost o glaciares de escombros con 10% a 50% de cobertura. 0.0 para zonas hiperaridas sin rastro de hielo subsuperficial  |
| Morfologia y Topografia Superficial | Meseta superior elevada de relieve suave de 15x15 km a 20x30 km, pendientes predominantes menores a 5 a 10 grados  | Altitud superior a 3000 metros sobre el nivel del mar, pendientes locales menores a 5 grados, area continua superior a 50 km2 y TPI positivo con curvatura absoluta menor a 0.01 | 1.0 para pendientes de 0 a 5 grados a altitud superior a 3000 metros s.n.m. 0.0 para pendientes abruptas superiores a 20 grados o tierras bajas  |
| Exposicion a Radiacion | Dosis de GCR estimada entre 0.32 y 0.40 Sv/año (320 \- 400 mSv/año) con radiacion UV directa  | Altitud geografica superior a 3800 a 4500 metros sobre el nivel del mar con indice UV extremo mayor a 11  | 1.0 para altitudes geograficas superiores a 4000 metros s.n.m. 0.0 para nivel del mar con maxima atenuacion atmosferica  |
| Refugio Subterraneo | Escarpes escalonados y taludes con desniveles verticales de 10 a 50 metros y pendientes de flanco de 15 a 30 grados  | Rupturas de pendiente y cantiles rocosos con desniveles de 10 a 50 metros y pendientes basales de 15 a 30 grados  | 1.0 para desniveles de 10 a 50 m con pendientes de 15 a 30 grados. 0.0 para planicies completamente planas sin accidentes de resguardo |

# Fuentes utilizadas para los datos

Para validar la data de la región marciana **Arcadia Planitia** con tu equipo, aquí tienes el listado completo de las fuentes oficiales, repositorios y publicaciones científicas que respaldan la caracterización, los parámetros cuantitativos y la modelización SIG:

### **Fuentes Oficiales y Enlaces de Validación (Arcadia Planitia)**

#### **1\. Mapas de Hielo Subsuperficial y Recursos (NASA / USGS / JPL)**

* **Fuente:** Modelos globales de distribución de hielo subsuperficial y mapas de tesoros de agua de la NASA basados en datos orbitales.

* **Enlaces directos:**  
  * [NASA's Treasure Map for Water Ice on Mars (NASA JPL)](https://www.nasa.gov/solar-system/nasas-treasure-map-for-water-ice-on-mars/)  
  * [NASA Science Mars Life Explorer \- Subsurface Ice Mapping](https://science.nasa.gov/wp-content/uploads/2023/10/mars-life-explorer.pdf)

* **Utilidad para la validación:** Permite corroborar los datos cuantitativos sobre la presencia de hielo superficial y subsuperficial a poca profundidad (0.5 a 3 metros) y las concentraciones de volátiles en las planicies del norte marciano.


#### **2\. Estudios Geomorfológicos y de Radar (SHARAD / MRO)**

* **Fuente:** Investigaciones científicas sobre el exceso de hielo (*excess ice*) y radar en Arcadia Planitia (Bramson et al., Morgan et al.).  
    
* **Enlace directo:** [NTRS \- Availability of Subsurface Water-Ice Resources in the Northern Mid-Latitudes of Mars](https://ntrs.nasa.gov/api/citations/20205008958/downloads/Morgan_etal_NA_Perspective_NATASTRON_19122833C%20.pdf)  
    
* **Utilidad para la validación:** Avala los espesores del regolito eólico, la morfología periglaciar (como polígonos de contracción térmica) y la estructura de los depósitos ricos en hielo en las latitudes medias del norte.


#### **3\. Talleres de Sitios de Aterrizaje Humano (NASA Human Landing Sites Study \- HLS2)**

* **Fuente:** Boletines y reportes técnicos del estudio de zonas de aterrizaje humano en Marte (HLS2).  
    
* **Enlace directo:** [NASA HLS2 Newsletter \- Arcadia Planitia Study Area](https://www.nasa.gov/wp-content/uploads/2015/06/hls2_newsletter_02-19_v19_tagged.pdf)  
    
* **Utilidad para la validación:** Sirve para contrastar las restricciones de ingeniería, capacidad portante, planitud de las planicies volcánicas y la proximidad a unidades geológicas con volátiles accesibles.


#### **4\. Nodo de Geociencias del Sistema de Datos Planetarios (PDS)**

* **Fuente:** Repositorios de datos ráster y altimétricos de la NASA para Marte.  
    
* **Enlace directo:** [NASA PDS Geoscience Node](https://pds-geosciences.wustl.edu/)  
    
* **Utilidad para la validación:** Permite descargar las mallas topográficas (MOLA) y los índices de reflectancia y polvo necesarios para calibrar los umbrales del modelo SIG global.

Cómo aplicar estas máscaras y filtros utilizando datos geográficos reales de la Puna argentina o el norte de Chile en QGIS (ejemplo)

Aplicar estas máscaras y filtros en **QGIS** (el software SIG libre estándar) utilizando datos reales de la **Puna argentina** (Salta, Jujuy, Catamarca) o el **norte de Chile** (Desierto de Atacama) es un proceso directo mediante herramientas de geoprocesamiento y álgebra de mapas.

Como los candidatos en Argentina entran estrictamente como **descubrimientos nuevos** al no existir ensayos previos documentados en la literatura formal, tu modelo SIG será la herramienta clave para hallarlos.

### **Paso 1: Descarga y Preparación de Datos Base para la Puna / Atacama**

Para una zona de estudio en la Puna o Atacama, necesitas cargar tres elementos principales en tu proyecto de QGIS:

1. **Modelo de Elevación Digital (DEM):** Puedes descargarlo gratis desde QGIS usando complementos como **OpenTopography** o **SRTM/Copernicus DEM** seleccionando un recuadro de la región altoandina (por ejemplo, el área del Salar de Atacama o la Puna de Salta).

2. **Imágenes Satelitales (Sentinel-2 o Landsat 8/9):** Se descargan desde el *USGS Earth Explorer* o mediante complementos de QGIS (como el *Semi-Automatic Classification Plugin* o *Microsoft Planetary Computer*). Necesitas las bandas del **Infrarrojo Cercano (NIR)** y el **Rojo (Red)** para calcular la vegetación.

3. **Capa de Cuerpos de Agua / Salares (Vectores):** Puedes integrarla mediante el complemento **QuickMapServices** (añadiendo capas de OpenStreetMap) o descargando los vectores oficiales de servicios geológicos (como SEGEMAR para Argentina o SERNAGEOMIN para Chile).

### **Paso 2: Generar la Máscara de Pendiente (Topografía Segura)**

El objetivo es aislar las planicies aptas y descartar laderas abruptas de montañas.

1. Ve al menú superior: **Raster \> Análisis \> Pendiente (Slope)**.

2. Selecciona tu DEM de la Puna como capa de entrada y ejecuta. El resultado será un mapa ráster donde cada píxel muestra los grados de inclinación.

3. Para convertir esto en una **máscara binaria (1 o 100% apto / 0 o descartado)**, usa la **Calculadora Ráster** (Raster \> Calculadora ráster):

   * *Fórmula:* ("slope@1" \<= 5\) \* 1  
       
   * *Explicación:* Esto le dice a QGIS: *"A los píxeles con 5 grados o menos de pendiente asígnales el valor 1 (apto); a todo lo demás, asigne 0 (descartado)"*. Guarda este resultado como Mascara\_Pendiente.  
     

### **Paso 3: Generar la Máscara de Vegetación (Filtro NDVI)**

Al buscar análogos extraterrestres, necesitas garantizar que la biosfera sea nula o extremadamente escasa (condición hiperárida o desierto frío de altura).

1. En la Calculadora Ráster, usa las bandas de tu imagen satelital para calcular el **NDVI** (Índice de Vegetación de Diferencia Normalizada):

   * *Fórmula:* (("NIR" \- "Red") / ("NIR" \+ "Red"))  
   * *(Sustituye "NIR" y "Red" por los números de banda correspondientes, por ejemplo, Banda 8 y Banda 4 en Sentinel-2).*

2. Una vez obtenido el ráster de NDVI, aplica un umbral estricto para eliminar cualquier rastro de vegetación altoandina arbustiva o vegas de altura:  
     
   * *Fórmula en la Calculadora Ráster:* ("NDVI@1" \< 0.1) \* 1  
       
   * *Explicación:* Todo lo que tenga un NDVI menor a 0.1 (suelo desnudo, salares, rocas desprovistas de vida) recibe un 1; cualquier rastro de vegetación recibe 0. Guarda el resultado como Mascara\_Sin\_Vegetacion.  
     

### **Paso 4: Máscara de Exclusión de Cuerpos de Agua y Salares Saturados**

Aunque los salares son excelentes análogos evaporíticos, los cuerpos de agua líquida profunda o los espejos de agua estacionales no sirven para emplazar bases directamente.

1. Si tienes una capa vectorial con los polígonos de los lagos o espejos de agua de la región, ve a **Vector \> Geoprocesamiento \> Diferencia** o rasteriza la capa vectorial con valor 0 para el agua y 1 para el resto del territorio (Herramientas de conversión \> Rasterizar).  
     
2. Obtendrás un ráster llamado Mascara\_Tierra\_Firme.

### 

### 

### **Paso 5: Multiplicar las Máscaras y Calcular la Idoneidad Final**

Aquí es donde aplicas la regla de combinación combinando las restricciones estrictas (las máscaras) con los pesos ponderados de idoneidad (como los 7 criterios que vimos para Arcadia Planitia).

1. Primero, multiplica todas tus máscaras binarias para crear una **Supermáscara de Viabilidad**:

2. Plaintext

```
Super_Mascara = "Mascara_Pendiente" * "Mascara_Sin_Vegetacion" * "Mascara_Tierra_Firme"
```

*(Cualquier píxel que en alguna de las tres máscaras haya dado* 0 *se anulará automáticamente y se volverá negro).*

2\. Segundo, multiplica tu mapa de idoneidad ponderado (el resultado del modelo multicriterio WLC) por esta Super\_Mascara:

3. Plaintext

```
Mapa_Final_Analogos = [Ecuación_WLC_Ponderada] * "Super_Mascara"
```

   

4. **El Resultado en QGIS:** Al ejecutar esta fórmula en la calculadora ráster, QGIS filtrará automáticamente todo el territorio de la Puna o Atacama, eliminando picos montañosos escarpados, zonas con vegetación y espejos de agua. Te devolverá un mapa de calor definitivo donde los valores más altos (hacia el 1.0) señalarán los **nuevos descubrimientos de análogos terrestres óptimos** listos para ser analizados en detalle por tu proyecto.

