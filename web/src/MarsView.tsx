import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibre, NavigationControl, Marker, addProtocol, removeProtocol, type GeoJSONSource } from 'maplibre-gl'
import Compare3D, { type CompareIndex } from './Compare3D.tsx'
import SpaceBackdrop from './SpaceBackdrop.tsx'
import { elevation, earthPatches, loadMars, marsPatch, offset, similarity, type Patch } from './marsData.ts'

const SITES = [
  {name:'Olympus Mons',lon:-133.8,lat:18.65}, {name:'Valles Marineris',lon:-60,lat:-13},
  {name:'Jezero',lon:77.58,lat:18.44}, {name:'Gale',lon:137.4,lat:-4.6},
  {name:'Elysium Planitia',lon:135.6,lat:4.5}, {name:'Hellas Planitia',lon:70,lat:-42.4},
]
const labels = [['pendiente_mediana','Pendiente mediana','°'],['pendiente_p90','Pendiente p90','°'],['rugosidad_m','Rugosidad a 6 km','m'],['desnivel_m','Desnivel','m']] as const
const SOURCE = '<a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html">NASA MGS MOLA · topografía sombreada</a>'
let protocolCount = 0
export default function MarsView({onPickEarth}: {onPickEarth:(id:string)=>void}) {
  const container=useRef<HTMLDivElement>(null), scene=useRef<HTMLDivElement>(null), map=useRef<MapLibre|null>(null)
  const choose=useRef<(lon:number,lat:number)=>void>(()=>{})
  const [status,setStatus]=useState('Cargando topografía NASA MOLA…'),[error,setError]=useState('')
  const [pick,setPick]=useState<Patch|null>(null),[earth,setEarth]=useState<Patch[]>([])
  const [compare,setCompare]=useState<string|null>(null),[flat,setFlat]=useState(false)
  const [coordinates,setCoordinates]=useState({lon:'77.58',lat:'18.44'})
  const [imagery,setImagery]=useState<'viking'|'themis'|'relieve'>('viking')
  const [exaggeration,setExaggeration]=useState(1.5)
  const flatRef=useRef(false),exagRef=useRef(1.5)
  useEffect(()=>{
    let disposed=false
    let m: MapLibre|undefined
    const protocol=`marsdem${++protocolCount}`
    let installed=false
    const imageryProtocol=`marstrek${++protocolCount}`
    let imageryInstalled=false
    loadMars().then(grid=>{
      if(disposed || !container.current) return
      // MapLibre assumes Earth's radius: compensate ONLY the rendered height, never the measurements.
      addProtocol(protocol,async ({url},abort)=>{
        const parts=url.split('/'), z=Number(parts[3]),x=Number(parts[4]),y=Number(parts[5])
        const tileSize=256, scale=2**z
        const canvas=document.createElement('canvas'); canvas.width=canvas.height=tileSize
        const ctx=canvas.getContext('2d')!
        const pixels=ctx.createImageData(tileSize,tileSize)
        for(let j=0;j<tileSize;j++) {
          const lat=Math.atan(Math.sinh(Math.PI*(1-2*(y+(j+.5)/tileSize)/scale)))*180/Math.PI
          for(let i=0;i<tileSize;i++) {
            const lon=(x+(i+.5)/tileSize)/scale*360-180
            const h=elevation(grid,lon,lat)*(6371008.8/3396000)
            const value=Math.round((h+30000)*10), k=(j*tileSize+i)*4
            pixels.data[k]=(value>>16)&255; pixels.data[k+1]=(value>>8)&255; pixels.data[k+2]=value&255; pixels.data[k+3]=255
          }
        }
        if(abort.signal.aborted) throw new DOMException('Aborted','AbortError')
        ctx.putImageData(pixels,0,0)
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo generar el relieve')),'image/png'))
        return {data:await blob.arrayBuffer()}
      })
      installed=true
      // NASA WMTS uses EPSG:4326 (2×1 tiles at level zero), MapLibre uses Web Mercator.
      // Reproject each image row rather than treating the two grids as interchangeable.
      addProtocol(imageryProtocol,async ({url},abort)=>{
        const parts=url.split('/'), layer=parts[2] as 'viking'|'themis', z=Number(parts[3]),x=Number(parts[4]),y=Number(parts[5])
        const levels={viking:7,themis:8}, names={viking:'Mars_Viking_MDIM21_ClrMosaic_global_232m',themis:'Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly'}, extensions={viking:'jpg',themis:'png'}
        const level=Math.min(Math.max(z-1,0),levels[layer]), rows=2**level, columns=rows*2, n=2**z
        const latAt=(py:number)=>Math.atan(Math.sinh(Math.PI*(1-2*(y+py/256)/n)))*180/Math.PI
        const startX=x/n*columns*256, endX=(x+1)/n*columns*256
        const minCol=Math.floor(startX/256),maxCol=Math.min(columns-1,Math.floor((endX-1e-8)/256))
        const minRow=Math.max(0,Math.floor((90-latAt(0))/180*rows)), maxRow=Math.min(rows-1,Math.floor((90-latAt(256))/180*rows))
        const images=new Map<string,ImageBitmap>()
        await Promise.all(Array.from({length:maxRow-minRow+1},(_,j)=>Array.from({length:maxCol-minCol+1},async(_,i)=>{
          const r=minRow+j,c=minCol+i
          const source=`https://trek.nasa.gov/tiles/Mars/EQ/${names[layer]}/1.0.0/default/default028mm/${level}/${r}/${c}.${extensions[layer]}`
          const response=await fetch(source,{signal:abort.signal})
          if(!response.ok) throw new Error(`NASA Mars Trek: ${response.status}`)
          images.set(`${r}/${c}`,await createImageBitmap(await response.blob()))
        })).flat())
        const canvas=document.createElement('canvas');canvas.width=canvas.height=256
        const ctx=canvas.getContext('2d')!
        for(let py=0;py<256;py++) {
          const sourceY=(90-latAt(py+.5))/180*rows*256
          const r=Math.max(0,Math.min(rows-1,Math.floor(sourceY/256))),sy=Math.max(0,Math.min(255,Math.floor(sourceY-r*256)))
          for(let c=minCol;c<=maxCol;c++){
            const left=Math.max(startX,c*256),right=Math.min(endX,(c+1)*256), image=images.get(`${r}/${c}`)
            if(image&&right>left)ctx.drawImage(image,left-c*256,sy,right-left,1,(left-startX)/(endX-startX)*256,py,(right-left)/(endX-startX)*256,1)
          }
        }
        images.forEach(image=>image.close())
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo reproyectar Mars Trek')),'image/png'))
        return {data:await blob.arrayBuffer()}
      })
      imageryInstalled=true
      m=new MapLibre({container:container.current,center:[0,10],zoom:.5,maxZoom:10,canvasContextAttributes:{antialias:true},style:{version:8,sources:{},layers:[{id:'base',type:'background',paint:{'background-color':'#9d6046'}}]}})
      map.current=m
      m.addControl(new NavigationControl(),'bottom-right')
      m.on('error',()=>{if(!disposed)setError('No se pudo dibujar una capa del mapa. Recargá para reintentar.')})
      const pickAt=(lon:number,lat:number)=>{
        if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90) {setError('Ingresá una latitud entre −90 y 90°.');return}
        const wrapped=((lon+180)%360+360)%360-180
        setError(''); setPick(marsPatch(grid,wrapped,lat));setCoordinates({lon:wrapped.toFixed(3),lat:lat.toFixed(3)})
        if(!m?.getSource('selection'))return
        const corners=[offset(wrapped,lat,-10000,10000),offset(wrapped,lat,10000,10000),offset(wrapped,lat,10000,-10000),offset(wrapped,lat,-10000,-10000)]
        // Keep the ring continuous at ±180°.
        const ring=corners.map(([l,p])=>[wrapped+((l-wrapped+540)%360)-180,p]);ring.push(ring[0])
        ;(m.getSource('selection') as GeoJSONSource).setData({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}})
        m.flyTo({center:[wrapped,Math.max(-85,Math.min(85,lat))],zoom:7.5,pitch:flatRef.current?0:60,bearing:m.getBearing(),speed:1.4,padding:{top:60,bottom:60,left:40,right:window.innerWidth>=1100?400:40}})
      }
      choose.current=pickAt
      m.on('load',()=>{
        if(!m)return
        m.setProjection({type:'globe'})
        for(const id of ['terrain','shade'])m.addSource(id,{type:'raster-dem',tiles:[`${protocol}://tiles/{z}/{x}/{y}`],tileSize:256,maxzoom:6,encoding:'custom',redFactor:6553.6,greenFactor:25.6,blueFactor:.1,baseShift:30000,attribution:SOURCE})
        for(const id of ['viking','themis']) {
          m.addSource(id,{type:'raster',tiles:[`${imageryProtocol}://${id}/{z}/{x}/{y}`],tileSize:256,maxzoom:id==='viking'?8:9,attribution:'Imágenes: <a href="https://trek.nasa.gov/mars/">NASA Mars Trek</a> · Viking / THEMIS'})
          m.addLayer({id,source:id,type:'raster',layout:{visibility:id==='viking'?'visible':'none'}})
        }
        m.addLayer({id:'shade',type:'hillshade',source:'shade',paint:{'hillshade-shadow-color':'#2b1715','hillshade-highlight-color':'#edbb8b','hillshade-accent-color':'#6a3224','hillshade-exaggeration':.35}})
        // Keep the globe at planetary scale; activate the terrain mesh only for the approach.
        m.addSource('selection',{type:'geojson',data:{type:'FeatureCollection',features:[]}})
        m.addLayer({id:'selection-fill',type:'fill',source:'selection',paint:{'fill-color':'#ffcf70','fill-opacity':.12}})
        m.addLayer({id:'selection-line',type:'line',source:'selection',paint:{'line-color':'#ffdf99','line-width':2}})
        for(const s of SITES){
          const el=document.createElement('button');el.textContent='● '+s.name;el.className='rounded-full bg-black/80 px-3 py-1 text-xs text-white';el.type='button'
          el.onclick=e=>{e.stopPropagation();pickAt(s.lon,s.lat)}
          new Marker({element:el}).setLngLat([s.lon,s.lat]).addTo(m)
        }
        setStatus('')
      })
      m.on('click',e=>pickAt(e.lngLat.lng,e.lngLat.lat))
      let autoPitch=false
      m.on('zoomend',()=>{
        if(!m||autoPitch||flatRef.current)return
        const pitch=Math.max(0,Math.min(60,(m.getZoom()-3)*15))
        if(Math.abs(m.getPitch()-pitch)>3){autoPitch=true;m.easeTo({pitch,duration:700});m.once('moveend',()=>{autoPitch=false})}
      })
      let terrainActive=false
      m.on('zoom',()=>{
        if(!m)return
        scene.current?.style.setProperty('--space-opacity',String(Math.max(0,Math.min(1,(3-m.getZoom())/1.6))))
        const local=m.getZoom()>4
        if(m.getSource('terrain')&&local!==terrainActive){terrainActive=local;m.setTerrain(local?{source:'terrain',exaggeration:exagRef.current}:null)}
      })
    }).catch(e=>{if(!disposed){setError(String(e));setStatus('')}})
    earthPatches().then(e=>{if(!disposed)setEarth(e)}).catch(e=>{if(!disposed)setError(String(e))})
    return()=>{disposed=true;choose.current=()=>{};m?.remove();map.current=null;if(installed)removeProtocol(protocol);if(imageryInstalled)removeProtocol(imageryProtocol)}
  },[])
  const matches=useMemo(()=>pick?earth.map(e=>({e,score:similarity(pick,e)})).sort((a,b)=>b.score-a.score):[],[pick,earth])
  const supplied=useMemo<CompareIndex|undefined>(()=>pick?{size_km:20,res_m:2000,n:10,items:[pick,...earth]}:undefined,[pick,earth])
  const control='rounded-full bg-canvas px-4 py-2 text-sm text-ink shadow-float hover:bg-canvas-soft'
  return <div ref={scene} className="space-scene relative h-full w-full overflow-hidden bg-slate-950">
    <SpaceBackdrop/><div ref={container} className="relative h-full w-full" aria-label="Marte 3D, topografía NASA MOLA"/>
    <div className="absolute left-4 top-4 flex gap-2">
      <button className={control} onClick={()=>{setPick(null);map.current?.flyTo({center:[0,10],zoom:.5,pitch:0,bearing:0,duration:1800,padding:0})}}>Ver planeta</button>
      <button className={control} onClick={()=>{const next=!flat;setFlat(next);flatRef.current=next;map.current?.easeTo({pitch:next?0:60,duration:800})}}>{flat?'Vista 3D':'Vista cenital'}</button>
    </div>
    {(status||error)&&<p role="status" className="absolute left-4 top-28 max-w-sm rounded-xl bg-canvas p-4 text-sm text-ink">{error||status}</p>}
    <aside className="absolute right-3 bottom-3 z-10 max-h-[50%] w-[min(380px,calc(100%-24px))] overflow-y-auto rounded-2xl bg-canvas p-5 text-ink shadow-card xl:top-28 xl:max-h-none">
      <h2 className="text-xl font-bold">{pick?'Región de Marte seleccionada':'Explorar Marte'}</h2>
      <p className="mt-2 text-sm">Elegí un punto para extraer 20 × 20 km y comparar su relieve con el catálogo terrestre.</p>
      <div className="my-3 flex flex-wrap gap-2">{SITES.map(s=><button key={s.name} className="rounded-full bg-canvas-soft px-3 py-1 text-xs" onClick={()=>choose.current(s.lon,s.lat)}>{s.name}</button>)}</div>
      <form className="flex gap-2" onSubmit={e=>{e.preventDefault();choose.current(Number(coordinates.lon),Number(coordinates.lat))}}>
        <input aria-label="Longitud marciana" className="w-24 rounded bg-canvas-soft p-2" type="number" step="any" required value={coordinates.lon} onChange={e=>setCoordinates({...coordinates,lon:e.target.value})}/>
        <input aria-label="Latitud marciana" className="w-24 rounded bg-canvas-soft p-2" type="number" min="-90" max="90" step="any" required value={coordinates.lat} onChange={e=>setCoordinates({...coordinates,lat:e.target.value})}/>
        <button className="rounded bg-ink px-3 text-canvas">Ir</button>
      </form>
      <label className="my-4 block text-xs">Capa de superficie
        <select value={imagery} className="mt-2 w-full rounded bg-canvas-soft p-2 text-sm" onChange={e=>{const v=e.target.value as typeof imagery;setImagery(v);for(const id of ['viking','themis'])if(map.current?.getLayer(id))map.current.setLayoutProperty(id,'visibility',v===id?'visible':'none')}}>
          <option value="viking">Viking · mosaico en color</option><option value="themis">THEMIS · infrarrojo diurno</option><option value="relieve">Solo relieve MOLA</option>
        </select>
      </label>
      <label className="my-4 block text-xs">Exageración visual ×{exaggeration}<input className="mt-2 w-full" type="range" min="1" max="3" step=".25" value={exaggeration} onChange={e=>{const v=Number(e.target.value);setExaggeration(v);exagRef.current=v;if(map.current?.getSource('terrain')&&map.current.getZoom()>4)map.current.setTerrain({source:'terrain',exaggeration:v})}}/></label>
      {pick&&<>
        <p className="text-sm">{pick.lat.toFixed(3)}°, {pick.lon.toFixed(3)}° · 20 × 20 km</p>
        {Math.abs(pick.lat)>85&&<p className="my-2 text-xs">Recorte polar calculado; el mapa Mercator no representa el casquete más allá de ±85°.</p>}
        <dl className="my-3 grid grid-cols-2 gap-2">{labels.map(([k,label,unit])=><div key={k} className="rounded-lg bg-canvas-soft p-2"><dt className="text-xs">{label}</dt><dd className="font-bold">{pick[k].toFixed(1)} {unit}</dd></div>)}</dl>
        <h3 className="font-bold">Candidatos del catálogo ({matches.length})</h3>
        {matches.map(({e,score})=><div key={e.id} className="border-b border-black/10 py-3"><div className="flex justify-between gap-2 text-sm"><span>{e.name}</span><strong>{Math.round(score*100)}/100</strong></div><div className="mt-2 flex gap-3 text-xs"><button className="underline" onClick={()=>setCompare(e.id)}>Comparar recortes 3D</button><button className="underline" onClick={()=>onPickEarth(e.id)}>Ver en la Tierra</button></div></div>)}
        <button className="my-3 text-sm underline" onClick={()=>{const blob=new Blob([JSON.stringify({region:{lat:pick.lat,lon:pick.lon,size_km:20,res_m:2000},source:pick.source,metrics:Object.fromEntries(labels.map(([k])=>[k,pick[k]])),matches:matches.map(({e,score})=>({id:e.id,name:e.name,score}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='terralunar-marte.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}>Exportar comparación JSON</button>
      </>}
      <p className="mt-4 text-xs leading-5">Las imágenes Viking o THEMIS son capas visuales de NASA Mars Trek. La topografía y las métricas provienen de MOLA. Muestreo nominal 1,85 km; hay interpolación y huecos de observación en el producto original. Comparación regional a 2 km por celda: no resuelve rocas, suelo ni transitabilidad de rovers. Ambas maquetas usan la misma escala.</p>
      <p className="mt-2 text-xs leading-5">Ranking exploratorio entre recortes disponibles, no búsqueda mundial exhaustiva. Ajuste por diferencias con tolerancias provisorias: 5° (mediana), 8° (p90), 200 m (rugosidad a 6 km), 1000 m (desnivel). No incluye temperatura, composición, hielo ni habitabilidad. Las zonas con mar aplanado del catálogo se excluyen.</p>
      <a className="mt-3 block text-xs underline" href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer">Fuente y documentación NASA PDS MOLA</a>
    </aside>
    {compare&&supplied&&<Compare3D zoneId={compare} supplied={supplied} onClose={()=>setCompare(null)}/>}
  </div>
}
