// Engineering comparison contract. No unmeasured criterion receives a proxy score.
export const CRITERIA = {
 regionalTerrain: {name:'Relieve regional', evidence:'DEM de ambos cuerpos a escala común de 2 km', method:'Diferencias normalizadas por tolerancia', available:true},
 localTerrain: {name:'Pendientes locales y obstáculos', evidence:'DEM e imágenes a escala del vehículo, bloques y área continua', method:'Distribuciones y límites del vehículo', available:false},
 traction: {name:'Tracción y hundimiento', evidence:'Fricción, cohesión, granulometría, cargas y ensayos', method:'Comparación de propiedades bajo cargas definidas', available:false},
 composition: {name:'Composición y mineralogía', evidence:'Mediciones compatibles de materiales en objetivo y candidato', method:'Comparación de composición; no equivalencia por nombre geológico', available:false},
 grain: {name:'Granulometría y abrasividad', evidence:'Distribución de tamaños y ensayos de abrasión', method:'Comparación de distribuciones y propiedades', available:false},
 strength: {name:'Resistencia y excavabilidad', evidence:'Cohesión, densidad y resistencia medidas', method:'Diferencias según requisitos del equipo', available:false},
 thermalCycle: {name:'Ciclos de temperatura superficial', evidence:'Series con QC, estación, hora solar y cobertura', method:'Comparación de ciclos y distribuciones, no una media aislada', available:false},
 illumination: {name:'Iluminación y sombra', evidence:'Horizonte, geometría solar y duración sobre el período del ensayo', method:'Comparación de duración y secuencias', available:false},
 resource: {name:'Recurso, estado y profundidad', evidence:'Identidad, concentración, profundidad y persistencia observadas', method:'Comparación del mismo recurso y estado físico', available:false},
 processes: {name:'Mecanismo y evolución superficial', evidence:'Hipótesis de proceso y observaciones multitemporales', method:'Comparación de formas, cambios y tasas compatibles', available:false},
 chemistry: {name:'Química y contexto de habitabilidad', evidence:'Composición y condiciones ambientales documentadas', method:'Comparación del contexto requerido por el experimento', available:false},
 biosignatures: {name:'Evidencia biológica terrestre y protocolo', evidence:'Muestras, controles de contaminación y ensayo de detección', method:'Evaluación del protocolo; no inferencia de vida planetaria', available:false},
 cavity: {name:'Geometría y continuidad del subsuelo', evidence:'Entradas, dimensiones y levantamiento interior', method:'Comparación geométrica y restricciones de navegación', available:false},
 stability: {name:'Estabilidad y seguridad del subsuelo', evidence:'Geología estructural y ensayos geotécnicos', method:'Restricciones del ensayo con evidencia directa', available:false},
 bearing: {name:'Portancia y asentamiento', evidence:'Sondeos, cargas y mediciones geotécnicas', method:'Respuesta bajo cargas del diseño', available:false},
} as const
export type CriterionId=keyof typeof CRITERIA
const REQUIREMENTS:Record<string,CriterionId[]>={
 regional:['regionalTerrain'],rover:['regionalTerrain','localTerrain','traction'],landing:['localTerrain'],
 excavation:['composition','grain','strength'],thermal:['thermalCycle','illumination'],resources:['resource','composition'],
 processes:['processes','composition'],biology:['chemistry','biosignatures'],caves:['cavity','stability'],
 habitat:['localTerrain','bearing','composition','thermalCycle'],
}
export function missionRequirements(id:string){
 const keys=REQUIREMENTS[id];if(!keys)throw Error('Ensayo desconocido')
 return keys.map(key=>({id:key,...CRITERIA[key],required:true}))
}
export function missionStatus(id:string){
 const criteria=missionRequirements(id),missing=criteria.filter(c=>!c.available)
 return {version:'mission-criteria/1',status:missing.length?'incomplete':'available',criteria,missing:missing.map(c=>c.id),missionScore:null,scoreKind:'topographic-context',note:'Disponibilidad de criterios, no validación de aptitud. El índice del ensayo no se calcula con datos faltantes.'}
}
