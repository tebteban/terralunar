export const DIMENSIONS = [
 {id:'terrain',name:'Terreno y topografía',available:true,missing:'Obstáculos, bloques y relieve a escala de rover.',source:'LOLA, MOLA y Terrain Tiles integrados; cálculo regional a 2 km.'},
 {id:'geology',name:'Geología, mineralogía y materiales',available:false,missing:'Unidades compatibles, espectros, composición y muestras.',source:'Propuestos: SIGAM, mapas USGS, CRISM y M3.'},
 {id:'thermal',name:'Temperatura, iluminación y extremos',available:false,missing:'Series con calidad, estación y hora solar; geometría de iluminación.',source:'Propuestos: MOD11A1, Diviner y productos marcianos por seleccionar.'},
 {id:'resources',name:'Agua, hielo, permafrost y recursos',available:false,missing:'Distinguir observación e inferencia, profundidad y estacionalidad.',source:'Propuestos: colecciones criosféricas Earthdata y recursos planetarios PDS.'},
 {id:'processes',name:'Polvo, viento, erosión y procesos',available:false,missing:'Mecanismos, escalas y tasas; procesos actuales versus antiguos. La Luna no tiene viento atmosférico.',source:'Propuestos: aerosoles, imágenes multitemporales y meteorología.'},
 {id:'biology',name:'Biología, habitabilidad y biofirmas',available:false,missing:'Observaciones biológicas, química y contexto. NDVI no identifica extremófilos.',source:'Requiere datos de campo y laboratorio documentados.'},
 {id:'subsurface',name:'Cuevas, tubos de lava y subsuelo',available:false,missing:'Entradas, continuidad, dimensiones, estabilidad y mediciones subsuperficiales.',source:'Propuestos: inventarios, imágenes planetarias y geofísica.'},
 {id:'operations',name:'Operaciones robóticas y humanas',available:false,missing:'Tracción, portancia, granulometría, navegación, comunicaciones y acceso.',source:'Requiere ensayos y requisitos del equipo; DEM no acredita aptitud operacional.'},
] as const
export const PROFILES=[
 {id:'regional',name:'Analogía topográfica regional',dimensions:['terrain'],use:'Preseleccionar paisajes para investigación de campo y planificación regional.'},
 {id:'rover',name:'Movilidad, navegación y aterrizaje',dimensions:['terrain','operations'],use:'Preparar pruebas; requiere detalle y propiedades adecuados al vehículo.'},
 {id:'excavation',name:'Excavación y materiales',dimensions:['geology','resources','operations'],use:'Ensayar excavación y manipulación de materiales.'},
 {id:'thermal',name:'Ensayos térmicos e iluminación',dimensions:['thermal'],use:'Seleccionar ciclos ambientales; requiere modelo térmico del instrumento.'},
 {id:'resources',name:'Exploración de hielo y recursos',dimensions:['resources','geology'],use:'Probar métodos de prospección.'},
 {id:'processes',name:'Procesos superficiales y atmosféricos',dimensions:['processes','geology','terrain'],use:'Estudiar erosión, sedimentación, alteración y transporte según el planeta.'},
 {id:'biology',name:'Habitabilidad y biofirmas',dimensions:['biology','geology','resources'],use:'Ensayar detección y muestreo; no implica presencia de vida planetaria.'},
 {id:'caves',name:'Exploración subterránea',dimensions:['subsurface','geology','operations'],use:'Preparar navegación y estudio del subsuelo.'},
 {id:'habitat',name:'Construcción y operaciones humanas',dimensions:['operations','terrain','thermal','geology'],use:'Ensayar infraestructura con validación geotécnica y condiciones de carga.'},
]
export function profileScope(id:string){const profile=PROFILES.find(p=>p.id===id);if(!profile)throw Error('Perfil desconocido');return {version:'analogy-scope/1',profile,canRank:id==='regional',dimensions:DIMENSIONS.filter(d=>profile.dimensions.includes(d.id)),limitations:['La gravedad terrestre no reproduce la lunar ni la marciana.','La atmósfera terrestre no reproduce el vacío lunar ni la atmósfera tenue marciana.','El relieve y el factor de vista del cielo no reproducen ni miden la dosis de radiación espacial.'],scope:'Piloto terrestre regional; ML limitado al relieve. Sin cobertura global.'}}
