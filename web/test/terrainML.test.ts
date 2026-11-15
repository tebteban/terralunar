import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {fitTerrain,classify} from '../src/terrainML.ts'
const row=(id:string,x:number)=>({id,features:{pendiente_mediana:x,pendiente_p90:x*2,rugosidad_m:x*10,desnivel_m:x*100}})
test('aprende grupos separados y reproduce el modelo',()=>{const rows=[row('a',1),row('b',2),row('c',20),row('d',21)];const model=fitTerrain(rows,2);assert.equal(classify(model,row('',1.5).features).group,1);assert.equal(classify(model,row('',20.5).features).group,2);assert.deepEqual(model,fitTerrain(rows,2));assert.equal(classify(model,row('',100).features).outsideTrainingRange,true)})
test('rechaza entradas inválidas, escala incompatible y clusters imposibles',()=>{assert.throws(()=>fitTerrain([row('a',NaN)],1));assert.throws(()=>fitTerrain([row('a',1),row('b',1)],2));const model=fitTerrain([row('a',1)],1);assert.throws(()=>classify({...model,cell_m:80},row('',1).features));assert.ok(Number.isFinite(classify(model,row('',1).features).distance))})
test('modelo real separa entrenamiento y evaluación y se serializa sin cambios',()=>{const model=JSON.parse(fs.readFileSync('../data/discovery/model.json','utf8'));const report=JSON.parse(fs.readFileSync('../data/discovery/ml-evaluation.json','utf8'));assert.equal(model.training_ids.length,18);assert.ok(report.heldout_ids.every((id:string)=>!model.training_ids.includes(id)));assert.equal(report.buffer_ids.length,6);assert.deepEqual(classify(model,row('',3).features),classify(JSON.parse(JSON.stringify(model)),row('',3).features))})
