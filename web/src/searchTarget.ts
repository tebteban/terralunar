import {metrics,type Relief} from './marsData.ts'
export type SearchTarget={name:string;body:'luna'|'marte';lat:number;lon:number;features:Relief;source:string;cell_m:2000;window_km:20}
export async function lunarTarget(line:number,sample:number,lat:number,lon:number):Promise<SearchTarget>{
 if(![line,sample,lat,lon].every(Number.isFinite))throw Error('Coordenadas inválidas')
 const r=await fetch('/moon/index.json');if(!r.ok)throw Error('Índice lunar no disponible');const index=await r.json();const g=index.globe
 const res=await fetch('/moon/'+g.cap_dem);if(!res.ok)throw Error('DEM lunar no disponible');const buffer=await res.arrayBuffer();if(buffer.byteLength!==g.cap_n*g.cap_n*2)throw Error('DEM incompleto')
 const view=new DataView(buffer),n=g.cap_n,step=index.lola_res_m*g.cap_block,cx=(sample+.5)/g.cap_block-.5,cy=(line+.5)/g.cap_block-.5,h=new Float32Array(100)
 const read=(x:number,y:number)=>{if(x<0||y<0||x>=n||y>=n)throw Error('Ventana fuera de cobertura lunar');return view.getInt16((y*n+x)*2,true)}
 for(let y=0;y<10;y++)for(let x=0;x<10;x++){let sum=0;for(let j=0;j<5;j++)for(let i=0;i<5;i++){const px=cx+((x-4.5)*2000+(i-2)*400)/step,py=cy+((y-4.5)*2000+(j-2)*400)/step;const ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;sum+=read(ix,iy)*(1-fx)*(1-fy)+read(ix+1,iy)*fx*(1-fy)+read(ix,iy+1)*(1-fx)*fy+read(ix+1,iy+1)*fx*fy}h[y*10+x]=sum/25}
 return {name:'Región lunar elegida',body:'luna',lat,lon,features:metrics(h),source:'LOLA casquete sur, DEM agregado ~800 m; interpolación y media a 2 km; no datos globales',cell_m:2000,window_km:20}
}

