import {missionRequirements,missionStatus} from './missionCriteria.ts'
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
 {id:'rover',name:'Movilidad y navegación de rovers',dimensions:['terrain','operations'],use:'Preparar pruebas; requiere detalle y propiedades adecuados al vehículo.'},
 {id:'landing',name:'Aterrizaje y peligros del terreno',dimensions:['terrain','operations'],use:'Evaluar pendientes, bloques y huella del vehículo; requiere DEM de detalle y criterios específicos de la misión.'},
 {id:'excavation',name:'Excavación y materiales',dimensions:['geology','resources','operations'],use:'Ensayar excavación y manipulación de materiales.'},
 {id:'thermal',name:'Ensayos térmicos e iluminación',dimensions:['thermal'],use:'Seleccionar ciclos ambientales; requiere modelo térmico del instrumento.'},
 {id:'resources',name:'Exploración de hielo y recursos',dimensions:['resources','geology'],use:'Probar métodos de prospección.'},
 {id:'processes',name:'Procesos superficiales y atmosféricos',dimensions:['processes','geology','terrain'],use:'Estudiar erosión, sedimentación, alteración y transporte según el planeta.'},
 {id:'biology',name:'Habitabilidad y biofirmas',dimensions:['biology','geology','resources'],use:'Ensayar detección y muestreo; no implica presencia de vida planetaria.'},
 {id:'caves',name:'Exploración subterránea',dimensions:['subsurface','geology','operations'],use:'Preparar navegación y estudio del subsuelo.'},
 {id:'habitat',name:'Construcción y operaciones humanas',dimensions:['operations','terrain','thermal','geology'],use:'Ensayar infraestructura con validación geotécnica y condiciones de carga.'},
]
export function profileScope(id:string){const profile=PROFILES.find(p=>p.id===id);if(!profile)throw Error('Perfil desconocido');return {version:'analogy-scope/3',requirements:missionRequirements(id),assessment:missionStatus(id),profile,canRank:id==='regional',canScreen:true,plan:experimentPlan(id),dimensions:DIMENSIONS.filter(d=>profile.dimensions.includes(d.id)),limitations:['La gravedad terrestre no reproduce la lunar ni la marciana.','La atmósfera terrestre no reproduce el vacío lunar ni la atmósfera tenue marciana.','El relieve y el factor de vista del cielo no reproducen ni miden la dosis de radiación espacial.'],scope:'Búsqueda multirregional entre ventanas procesadas y catálogo mundial. Cobertura discontinua; no barrido exhaustivo del planeta.'}}

export const RELIEF_LABELS: Record<string,string> = {pendiente_mediana:'Pendiente mediana (°)',pendiente_p90:'Pendiente p90 (°)',rugosidad_m:'Rugosidad regional (m)',desnivel_m:'Desnivel (m)'}
const PLANS:Record<string,{question:string;measure:string;products:string;weights:number[]}> = {
 regional:{question:'¿Qué paisajes tienen un relieve comparable al objetivo?',measure:'Validar escala, cobertura, pendientes y variación del ranking con los pesos.',products:'LOLA / MOLA y DEM terrestre.',weights:[25,25,25,25]},
 rover:{question:'¿Dónde planificar recorridos en un contexto topográfico semejante?',measure:'Medir bloques, pendientes locales, granulometría, fricción y hundimiento para el vehículo.',products:'DEM e imágenes locales de detalle; ensayos de tracción y portancia.',weights:[20,35,35,10]},
 landing:{question:'¿Qué regiones sirven para diseñar ensayos de detección de peligros?',measure:'Medir bloques, pendientes a escala del vehículo y superficie continua dentro de la elipse.',products:'DEM e imágenes de alta resolución; requisitos del sistema de aterrizaje.',weights:[15,45,25,15]},
 excavation:{question:'¿Dónde organizar un muestreo de materiales en un contexto comparable?',measure:'Muestrear distribución granulométrica, cohesión, resistencia, abrasividad y contenido de hielo.',products:'Cartografía geológica, espectros y ensayos geotécnicos; recursos PDS.',weights:[25,25,25,25]},
 thermal:{question:'¿Qué candidatos topográficos conviene caracterizar térmicamente?',measure:'Comparar ciclos día/noche y estación con control de calidad, hora solar y modelo del instrumento.',products:'MOD11A1 terrestre; Diviner lunar; producto térmico marciano por seleccionar.',weights:[25,25,25,25]},
 resources:{question:'¿Dónde planificar prospección después de la preselección del paisaje?',measure:'Verificar composición, concentración, profundidad y estacionalidad del recurso.',products:'Productos criosféricos terrestres, PDS y cartografía de hielo SWIM para Marte.',weights:[25,25,25,25]},
 processes:{question:'¿Qué paisajes permiten formular hipótesis sobre procesos superficiales?',measure:'Comparar formas, materiales y evolución temporal. No atribuir viento atmosférico a la Luna.',products:'Imágenes multitemporales, geología y meteorología cuando corresponda.',weights:[15,20,35,30]},
 biology:{question:'¿Dónde diseñar muestreos ambientales tras estudiar el contexto físico?',measure:'Medir química, mineralogía, actividad biológica y controles de contaminación en campo.',products:'Muestras de campo y laboratorio; NDVI no demuestra habitabilidad ni biofirmas.',weights:[25,25,25,25]},
 caves:{question:'¿Qué regiones conviene revisar buscando estructuras subterráneas?',measure:'Confirmar entradas, continuidad, geometría interior y estabilidad con observación y geofísica.',products:'Inventarios de cavidades, imágenes locales y mediciones subsuperficiales.',weights:[25,25,25,25]},
 habitat:{question:'¿Dónde organizar una campaña de caracterización para ensayar infraestructura?',measure:'Medir portancia, asentamiento, geología, acceso y condiciones térmicas para las cargas del diseño.',products:'DEM, cartografía geológica, sondeos y pruebas geotécnicas.',weights:[25,35,20,20]},
}
export function experimentPlan(id:string){
 const p=PLANS[id];if(!p)throw Error('Ensayo desconocido')
 return {...p,scoreLabel:id==='regional'?'Similitud topográfica':'Similitud topográfica de contexto',requiresContextConsent:id!=='regional',stage:id==='regional'?'Comparación regional':'Evaluación del ensayo incompleta',weights:Object.fromEntries(Object.keys(RELIEF_LABELS).map((k,i)=>[k,p.weights[i]])),calibration:'Pesos exploratorios de demostración, no requisitos de ingeniería validados.'}
}
