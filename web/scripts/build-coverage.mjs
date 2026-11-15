import {fromUrl} from 'geotiff';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const region=process.argv[2]??'pilot';if(!/^[a-z0-9_-]+$/.test(region))throw Error('Invalid region');
const root=new URL('../../',import.meta.url),base=region==='pilot'?'data/discovery/':`data/discovery/${region}/`,raw=fs.readFileSync(new URL(base+'pilot.json',root)),pilot=JSON.parse(raw),opened=new Map();const items=[],failures=[];
function tileId(lat,lon){const y=Math.floor(lat/3)*3,x=Math.floor(lon/3)*3;return `${y<0?'S':'N'}${String(Math.abs(y)).padStart(2,'0')}${x<0?'W':'E'}${String(Math.abs(x)).padStart(3,'0')}`}
async function get(lat,lon){const tile=tileId(lat,lon);if(!opened.has(tile)){const url=`https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${tile}_Map.tif`;const tiff=await fromUrl(url);opened.set(tile,{image:await tiff.getImage(),url})}return opened.get(tile)}
for(const p of pilot.items){try{
const ring=p.polygon.coordinates[0],west=Math.min(...ring.map(x=>x[0])),east=Math.max(...ring.map(x=>x[0])),south=Math.min(...ring.map(x=>x[1])),north=Math.max(...ring.map(x=>x[1]));
const counts={},samples=new Map();let total=0;
for(let y=0;y<100;y++)for(let x=0;x<100;x++){const lon=west+(x+.5)*(east-west)/100,lat=north-(y+.5)*(north-south)/100,key=tileId(lat,lon);if(!samples.has(key))samples.set(key,[]);samples.get(key).push([lon,lat])}
for(const pts of samples.values()){
const {image}=await get(pts[0][1],pts[0][0]);const [ox,oy]=image.getOrigin(),[rx,ry]=image.getResolution();const pixels=pts.map(([x,y])=>[Math.floor((x-ox)/rx),Math.floor((y-oy)/ry)]);
const x0=Math.min(...pixels.map(p=>p[0])),x1=Math.max(...pixels.map(p=>p[0]))+1,y0=Math.min(...pixels.map(p=>p[1])),y1=Math.max(...pixels.map(p=>p[1]))+1;
// Read native categorical values, but sample only a regular 100x100 grid (not all pixels).
const raster=await image.readRasters({window:[x0,y0,x1,y1],interleave:true});for(const [x,y] of pixels){const v=raster[(y-y0)*(x1-x0)+x-x0];counts[v]=(counts[v]||0)+1;total++}
}
const valid=total-(counts[0]||0),fraction=codes=>valid?codes.reduce((s,c)=>s+(counts[c]||0),0)/valid:null;
items.push({id:p.id,samples:total,valid_fraction:valid/total,water:fraction([80]),built:fraction([50]),vegetation:fraction([10,20,30,40,90,95,100]),bare:fraction([60]),snow_ice:fraction([70]),ndvi:null,classes:counts});console.log(p.id+' OK')
}catch(e){failures.push({id:p.id,error:String(e)});console.log(p.id+' ERROR '+e.message)}}
const output={version:'cover-2',pilot_sha256:createHash('sha256').update(raw).digest('hex'),product:'ESA WorldCover 2021 v200',year:2021,native_resolution_m:10,method:'Native categorical values at regular 100x100 sample points per window (~200m). Not exhaustive; small features may be missed.',attribution:'© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium',sources:[...opened.values()].map(v=>v.url),created:new Date().toISOString(),items,failures};fs.writeFileSync(new URL(base+'coverage.json',root),JSON.stringify(output,null,2));console.log(JSON.stringify({processed:items.length,failures}));if(!items.length)process.exitCode=1;
