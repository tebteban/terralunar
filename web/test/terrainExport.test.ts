import test from 'node:test'
import assert from 'node:assert/strict'
import {terrainFile,terrainGeometry,withBase} from '../src/terrainExport.ts'

const n=32,h=Float32Array.from({length:n*n},(_,i)=>Math.floor(i/n)) // sube 1 m por fila hacia el sur

test('la malla conserva escala, exageración y centro',()=>{
 const g=terrainGeometry(h,n,20000,2);g.computeBoundingBox()
 const b=g.boundingBox!
 assert.equal(b.max.x-b.min.x,20000);assert.equal(b.max.y-b.min.y,(n-1)*2);assert.ok(Math.abs(b.max.y+b.min.y)<1e-6)
 assert.throws(()=>terrainGeometry(h,n+1,20000,2))
})
test('la base cierra un sólido estanco con caras hacia afuera',()=>{
 const g=withBase(terrainGeometry(h,n,20000,3).rotateX(Math.PI/2),20000),p=g.attributes.position,idx=g.index!.array
 const edges=new Set<string>();let volume=0
 for(let t=0;t<idx.length;t+=3){
  const [a,b,c]=[idx[t],idx[t+1],idx[t+2]]
  for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=u+'>'+v;assert.ok(!edges.has(k),'arista repetida '+k);edges.add(k)}
  const [ax,ay,az,bx,by,bz,cx,cy,cz]=[a,b,c].flatMap(i=>[p.getX(i),p.getY(i),p.getZ(i)])
  volume+=(ax*(by*cz-bz*cy)-ay*(bx*cz-bz*cx)+az*(bx*cy-by*cx))/6
 }
 for(const k of edges){const [u,v]=k.split('>');assert.ok(edges.has(v+'>'+u),'borde abierto '+k)}
 assert.ok(volume>0)
 g.computeBoundingBox();assert.ok(Math.abs(g.boundingBox!.min.z-((-(n-1)/2)*3-400))<1e-3)
})
test('STL binario con base y OBJ como superficie, Z hacia arriba y norte en +Y',()=>{
 const stl=terrainFile(h,n,20000,1,'stl','Prueba') as DataView
 assert.equal(stl.byteLength,84+50*(2*(n-1)**2+12*(n-1)))
 const obj=terrainFile(h,n,20000,1,'obj','Prueba') as string
 assert.match(obj,/^o Prueba$/m);assert.equal(obj.match(/^v /gm)!.length,n*n)
 const v=obj.match(/^v .+$/gm)!.map(l=>l.split(' ').slice(1).map(Number))
 const north=v.filter(p=>p[1]===10000),south=v.filter(p=>p[1]===-10000)
 assert.ok(north[0][2]<south[0][2]) // la fila norte (índice 0) es la más baja
})
