import {missionRequirements,missionStatus} from '../src/missionCriteria.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import {DIMENSIONS,PROFILES,profileScope} from '../src/analogyScope.ts'
test('todos los ejes del desafío están representados por perfiles',()=>{assert.equal(DIMENSIONS.length,8);for(const d of DIMENSIONS)assert.ok(PROFILES.some(p=>p.dimensions.includes(d.id)))})
test('no emite ranking de aptitud usando solamente relieve',()=>{assert.equal(profileScope('regional').canRank,true);for(const p of PROFILES.filter(p=>p.id!=='regional'))assert.equal(profileScope(p.id).canRank,false);assert.throws(()=>profileScope('inventado'));assert.equal(profileScope('rover').dimensions.some(d=>!d.available),true)})


test('cada ensayo ofrece un plan y una preselección explícitamente topográfica',()=>{
 for(const p of PROFILES){const scope=profileScope(p.id);assert.equal(scope.canScreen,true);assert.ok(scope.plan.measure.length>20);assert.equal(Object.values(scope.plan.weights).reduce((a,b)=>a+b,0),100);if(p.id!=='regional'){assert.match(scope.plan.scoreLabel,/contexto/);assert.equal(scope.canRank,false)}}
})

test('cada ensayo exige sus mediciones y no sustituye térmica ni materiales por relieve',()=>{
 assert.deepEqual(missionRequirements('thermal').map(c=>c.id),['thermalCycle','illumination'])
 assert.deepEqual(missionRequirements('excavation').map(c=>c.id),['composition','grain','strength'])
 assert.ok(missionRequirements('habitat').some(c=>c.id==='bearing'))
 for(const p of PROFILES){const s=missionStatus(p.id);assert.equal(s.missionScore,null);if(p.id!=='regional'){assert.equal(s.status,'incomplete');assert.ok(s.missing.length>0);assert.equal(profileScope(p.id).plan.requiresContextConsent,true)}}
 assert.throws(()=>missionRequirements('inventado'))
})
