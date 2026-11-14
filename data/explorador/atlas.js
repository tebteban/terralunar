const el = id => document.getElementById(id);
const c = el("globo"), ctx = c.getContext("2d");
const datasets = window.globalTerrain;
const rad = Math.PI/180;
let body="marte", heading=77, tilt=19, chosen, pins=[], drag, frame, zoom=1;
const cols=2880, rows=1440;
function sample(b,lat,lon) {
  const x=Math.floor((((lon+180)%360+360)%360)/360*cols);
  const y=Math.max(0,Math.min(rows-1,Math.floor((90-lat)/180*rows)));
  return datasets[b].grid[y*cols+x];
}
function inverse(x,y) {
  const z=Math.sqrt(Math.max(0,1-x*x-y*y)), t=tilt*rad;
  return [Math.asin(y*Math.cos(t)+z*Math.sin(t))/rad,
    heading+Math.atan2(x,z*Math.cos(t)-y*Math.sin(t))/rad];
}
function project(lat,lon) {
  const a=lat*rad,d=(lon-heading)*rad,t=tilt*rad;
  return [Math.cos(a)*Math.sin(d), Math.sin(a)*Math.cos(t)-Math.cos(a)*Math.cos(d)*Math.sin(t),
    Math.sin(a)*Math.sin(t)+Math.cos(a)*Math.cos(d)*Math.cos(t)];
}
function draw() {
  const scale=Math.min(1,900/c.clientWidth,760/c.clientHeight);
  const w=c.width=Math.round(c.clientWidth*scale), h=c.height=Math.round(c.clientHeight*scale), r=Math.min(w,h)*.46*zoom;
  if(!w||!h)return;
  const img=ctx.createImageData(w,h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(i-w/2)/r,y=(h/2-j)/r;
    if(x*x+y*y>1)continue;
    const [lat,lon]=inverse(x,y),z=sample(body,lat,lon);
    const neighbor=sample(body,lat+.125,lon-.125);
    const shade=Math.max(.42,Math.min(1.25,.78-.18*x+.15*y+(z-neighbor)/2200));
    const t=Math.max(0,Math.min(1,(z+(body==="tierra"?0:6500))/(body==="tierra"?6000:16000)));
    const color=body==="tierra"?(z<=0?[27,76,118]:[75+153*t,112+95*t,65+130*t]):
      body==="marte"?[126+112*t,62+96*t,39+90*t]:[105+125*t,107+123*t,111+120*t];
    const p=4*(j*w+i);img.data[p]=color[0]*shade;img.data[p+1]=color[1]*shade;img.data[p+2]=color[2]*shade;img.data[p+3]=255;
  }
  ctx.putImageData(img,0,0);
  const markers=body==="tierra"?pins:chosen?.body===body?[chosen]:[];
  markers.forEach(p=>{
    const [x,y,z]=project(p.lat,p.lon);if(z<=0)return;
    ctx.beginPath();ctx.arc(w/2+x*r,h/2-y*r,5,0,2*Math.PI);ctx.fillStyle="#ffc26a";ctx.fill();
    ctx.strokeStyle="#17202a";ctx.lineWidth=2;ctx.stroke();
  });
  frame={w,h,r};
}
let pending=false;
function repaint(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;draw();});}}
let flight=0;
function flyTo(lat,lon){
  cancelAnimationFrame(flight);
  const start=performance.now(), from=[tilt,heading,zoom];
  const turn=((lon-from[1]+180)%360+360)%360-180;
  const duration=matchMedia("(prefers-reduced-motion: reduce)").matches?0:700;
  function tick(now){
    const t=duration?Math.min(1,(now-start)/duration):1;
    const eased=t*t*(3-2*t);
    tilt=from[0]+(lat-from[0])*eased;
    heading=from[1]+turn*eased;
    zoom=from[2]+(1.5-from[2])*eased;
    repaint();
    if(t<1)flight=requestAnimationFrame(tick);
  }
  flight=requestAnimationFrame(tick);
}
function destination(lat,lon,dist,bearing){
  const a=lat*rad,b=lon*rad;
  const p=Math.asin(Math.sin(a)*Math.cos(dist)+Math.cos(a)*Math.sin(dist)*Math.cos(bearing));
  return [p/rad,(b+Math.atan2(Math.sin(bearing)*Math.sin(dist)*Math.cos(a),Math.cos(dist)-Math.sin(a)*Math.sin(p)))/rad];
}
function profile(b,lat,lon,km) {
  const z=sample(b,lat,lon), v=[], r=datasets[b].radius;
  if(z===-32768 || (b==="tierra"&&z<=0))return null;
  for(let i=0;i<8;i++){
    const p=destination(lat,lon,km/2/r,i*Math.PI/4), x=sample(b,...p);
    if(x===-32768 || (b==="tierra"&&x<=0))return null;
    v.push(x-z);
  }
  const mean=v.reduce((a,b)=>a+b,0)/v.length;
  return [Math.atan(Math.max(...v.map(Math.abs))/(km*500))/rad,Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length)];
}
function search(){
  if(!chosen)return;
  const out=el("results");out.replaceChildren();el("detalle").textContent="";
  const km=+el("escala").value,p=profile(chosen.body,chosen.lat,chosen.lon,km);
  pins=[];
  el("objetivo").textContent=chosen.body+" · "+chosen.lat.toFixed(2)+"°, "+chosen.lon.toFixed(2)+"°";
  if(!p){el("estado").textContent="El entorno tiene píxeles sin datos.";repaint();return;}
  const candidates=[];
  for(let lat=-89.5;lat<90;lat+=.5){
    const step=.5/Math.max(.02,Math.cos(lat*rad));
    for(let lon=-180;lon<180;lon+=step){
      const q=profile("tierra",lat,lon,km);if(!q)continue;
      const loss=Math.hypot((q[0]-p[0])/5,(q[1]-p[1])/300);
      candidates.push({lat,lon,q,loss});
    }
  }
  candidates.sort((a,b)=>a.loss-b.loss);
  for(const a of candidates){
    if(pins.some(b=>Math.sin(a.lat*rad)*Math.sin(b.lat*rad)+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.cos((a.lon-b.lon)*rad)>Math.cos(1*rad)))continue;
    pins.push(a);if(pins.length===8)break;
  }
  el("estado").textContent=candidates.length.toLocaleString("es")+" ventanas terrestres evaluadas";
  for(const [i,a] of pins.entries()){
    const b=document.createElement("button");b.textContent=(i+1)+". "+a.lat.toFixed(3)+"°, "+a.lon.toFixed(3)+"°";
    b.onclick=()=>{
      if(body!=="tierra"){body="tierra";heading=a.lon;tilt=a.lat;zoom=.85;}
      flyTo(a.lat,a.lon);
      const d=el("detalle");d.textContent="Pendiente radial máxima: "+a.q[0].toFixed(2)+"° · objetivo "+p[0].toFixed(2)+"°. Dispersión del relieve: "+a.q[1].toFixed(0)+" m · objetivo "+p[1].toFixed(0)+" m.";
      const link=document.createElement("a");link.href="https://www.openstreetmap.org/?mlat="+a.lat+"&mlon="+a.lon+"#map=9/"+a.lat+"/"+a.lon;link.target="_blank";link.rel="noopener";link.textContent="Ver lugar en OpenStreetMap";d.append(document.createElement("br"),link);
    };out.append(b);
  }
  repaint();
}
function init(){
  for(const b of Object.values(datasets)){
    const raw=atob(b.values), bytes=Uint8Array.from(raw,x=>x.charCodeAt(0));b.grid=new Int16Array(bytes.buffer);
  }
  for(const id of ["marte","luna","tierra"])el(id).onclick=()=>{cancelAnimationFrame(flight);body=id;heading=id==="marte"?77:0;tilt=id==="marte"?19:0;zoom=1;repaint();};
  el("norte").onclick=()=>{cancelAnimationFrame(flight);heading=0;tilt=0;zoom=1;repaint();};
  el("escala").onchange=search;
  c.onpointerdown=e=>{cancelAnimationFrame(flight);drag={x:e.clientX,y:e.clientY,heading,tilt};c.setPointerCapture(e.pointerId);};
  c.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;
    heading=drag.heading-dx*.32/zoom;tilt=Math.max(-90,Math.min(90,drag.tilt+dy*.32/zoom));repaint();};
  c.onpointerup=e=>{const moved=drag?.moved;drag=null;if(moved||body==="tierra"||!frame)return;
    const b=c.getBoundingClientRect(),{w,h,r}=frame;
    const x=((e.clientX-b.left)/b.width*w-w/2)/r,y=(h/2-(e.clientY-b.top)/b.height*h)/r;
    if(x*x+y*y>1)return;const [lat,lon]=inverse(x,y);
    chosen={lat,lon:((lon+540)%360)-180,body};search();};
  c.onpointercancel=()=>{drag=null;};
  c.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(.75,Math.min(8,zoom*Math.exp(-e.deltaY*.001)));repaint();},{passive:false});
  new ResizeObserver(repaint).observe(c);
  repaint();
}
if(datasets)init();else el("estado").textContent="Falta generar los datos del atlas global.";
