import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const data=JSON.parse(fs.readFileSync('../data/discovery/recent-2026.json','utf8'))
test('observaciones 2026 trazables y sin credenciales persistidas',()=>{assert.equal(data.pilot_sha256,createHash('sha256').update(fs.readFileSync('../data/discovery/pilot.json')).digest('hex'));assert.equal(data.items.length,36);assert.ok(data.sources.length>0);assert.equal(data.failures.length,0);for(const s of data.sources){assert.ok(s.datetime.startsWith('2026-'));assert.ok(s.quantification>0);assert.ok(Object.keys(s.band_offsets).length>0);for(const url of Object.values(s.assets) as string[])assert.equal(url.includes('?'),false)}})
test('NDVI incompleto se conserva desconocido y no inventa construido',()=>{for(const r of data.items){assert.equal(r.built,null);assert.ok(r.valid_fraction>=0&&r.valid_fraction<=1);if(r.valid_fraction===0){assert.equal(r.ndvi,null);assert.equal(r.water,null)}else{assert.ok(r.ndvi>=-1&&r.ndvi<=1);assert.ok(r.dates.every((d:string)=>d.startsWith('2026-')))}}})
