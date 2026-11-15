import fs from 'node:fs'
import {metrics} from '../web/src/marsData.ts'
import {classify} from '../web/src/terrainML.ts'
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'))
const model=read('../data/discovery/model.json'),region=read('../data/discovery/hawaii/pilot.json')
const rows=region.items.map(p=>({id:p.id,lat:p.lat,lon:p.lon,...classify(model,metrics(new Float32Array(p.heights)))}))
const report={purpose:'Independent geographic transfer diagnostic; no suitability labels',training_region:'Atacama',evaluation_region:'Hawaii',model_version:model.version,model_refit:false,windows:rows.length,outside_training_range:rows.filter(p=>p.outsideTrainingRange).length,mean_distance:rows.reduce((s,p)=>s+p.distance,0)/rows.length,rows,conclusion:'No ground truth for analog relevance. Do not claim improved discovery or global validity from clustering distances.'}
fs.writeFileSync(new URL('../data/discovery/transfer-evaluation.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
