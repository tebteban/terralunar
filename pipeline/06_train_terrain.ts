import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {metrics} from '../web/src/marsData.ts'
import {fitTerrain,classify,FEATURES} from '../web/src/terrainML.ts'
const path=new URL('../data/discovery/pilot.json',import.meta.url),raw=fs.readFileSync(path),pilot=JSON.parse(raw.toString())
if(pilot.cell_m!==2000||pilot.window_km!==20)throw Error('Escala incompatible')
const rows=pilot.items.filter(p=>p.coverage===1).map(p=>({id:p.id,row:p.row,features:metrics(new Float32Array(p.heights))}))
// Southern three rows fit; one full row buffer; northern two rows held out.
const train=rows.filter(p=>p.row<=2),heldout=rows.filter(p=>p.row>=4)
if(train.length<12||heldout.length<6)throw Error('División espacial insuficiente')
const model=fitTerrain(train,3);model.data_sha256=createHash('sha256').update(raw).digest('hex')
const evaluate=rows=>rows.reduce((s,r)=>s+classify(model,r.features).distance**2,0)/rows.length
const baseline=heldout.reduce((s,r)=>s+FEATURES.reduce((t,k,j)=>t+((r.features[k]-model.mean[j])/model.scale[j])**2,0),0)/heldout.length
const report={version:model.version,features:FEATURES,train_ids:train.map(r=>r.id),heldout_ids:heldout.map(r=>r.id),buffer_ids:rows.filter(r=>r.row===3).map(r=>r.id),k:3,k_selection:'Fixed exploratory choice; not tuned on held-out data',train_quantization_mse:evaluate(train),heldout_quantization_mse:evaluate(heldout),one_center_heldout_mse:baseline,heldout_outside_training_ranges:heldout.filter(r=>classify(model,r.features).outsideTrainingRange).length,groups:model.centers.map((c,i)=>({group:i+1,count:train.filter(r=>classify(model,r.features).group===i+1).length,physical_center:Object.fromEntries(FEATURES.map((k,j)=>[k,c[j]*model.scale[j]+model.mean[j]]))})),limits:'Quantization error is not predictive accuracy or analog relevance. Single regional split, 36 windows, correlated slope features; no evidence of improvement over WLC ranking.'}
fs.writeFileSync(new URL('../data/discovery/model.json',import.meta.url),JSON.stringify(model,null,2));fs.writeFileSync(new URL('../data/discovery/ml-evaluation.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
