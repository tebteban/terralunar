"""Reproducible regional pilot; no candidate coordinates selected by ranking.
python pipeline/05_discovery.py --lat -24 --lon -68 --cells 6
Spherical local equirectangular grid, 20 km windows, 200 m samples -> 2 km means.
"""
import argparse, hashlib, io, json, math, time, urllib.request
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
R=6371008.8

def main():
 p=argparse.ArgumentParser();p.add_argument('--lat',type=float,default=-24);p.add_argument('--lon',type=float,default=-68);p.add_argument('--cells',type=int,default=6);a=p.parse_args()
 if not (-60<a.lat<60 and -170<a.lon<170 and 2<=a.cells<=12):raise ValueError('Piloto: latitud ±60°, longitud ±170°, 2–12 ventanas por lado')
 out=ROOT/'data/discovery';out.mkdir(exist_ok=True);cache=ROOT/'pipeline/raw/discovery';cache.mkdir(parents=True,exist_ok=True)
 start=time.time();tiles={};provenance={};items=[];failures=[];z=10
 def coords(x,y):return a.lon+np.degrees(x/(R*math.cos(math.radians(a.lat)))),a.lat+np.degrees(y/R)
 def tile(tx,ty):
  key=(int(tx),int(ty))
  if key not in tiles:
   path=cache/f'{z}_{key[0]}_{key[1]}.png';url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{key[0]}/{key[1]}.png'
   if not path.exists():
    last=None
    for attempt in range(3):
     try:
      raw=urllib.request.urlopen(url,timeout=25).read();im=Image.open(io.BytesIO(raw));im.load()
      if im.size!=(256,256):raise ValueError('Tamaño de tile inválido')
      path.write_bytes(raw);break
     except Exception as e:last=e
    else:raise last
   raw=path.read_bytes();im=Image.open(io.BytesIO(raw))
   if im.size!=(256,256):raise ValueError('Tile incompleto')
   rgb=np.asarray(im.convert('RGB'),dtype=float);tiles[key]=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
   provenance[path.name]={'url':url,'sha256':hashlib.sha256(raw).hexdigest()}
  return tiles[key]
 def sample(lon,lat):
  scale=256*2**z;px=(lon+180)/360*scale-.5;py=(1-np.arcsinh(np.tan(np.radians(lat)))/np.pi)/2*scale-.5
  x=np.floor(px).astype(int);y=np.floor(py).astype(int);fx=px-x;fy=py-y
  def at(xx,yy):
   result=np.empty(xx.shape)
   for tx,ty in set(zip((xx//256).ravel(),(yy//256).ravel())):
    mask=(xx//256==tx)&(yy//256==ty);result[mask]=tile(tx,ty)[yy[mask]%256,xx[mask]%256]
   return result
  return at(x,y)*(1-fx)*(1-fy)+at(x+1,y)*fx*(1-fy)+at(x,y+1)*(1-fx)*fy+at(x+1,y+1)*fx*fy
 for row in range(a.cells):
  for col in range(a.cells):
   ident=f'pilot-{row}-{col}';x0=(col-a.cells/2)*20000;y0=(row-a.cells/2)*20000
   try:
    xx,yy=np.meshgrid(x0+(np.arange(100)+.5)*200,y0+20000-(np.arange(100)+.5)*200);lon,lat=coords(xx,yy);h=sample(lon,lat)
    if not np.isfinite(h).all() or np.any(h<=-32767):raise ValueError('NoData o elevación inválida')
    coarse=h.reshape(10,10,10,10).mean(axis=(1,3));center=coords(x0+10000,y0+10000)
    ring=[list(coords(x,y)) for x,y in [(x0,y0),(x0+20000,y0),(x0+20000,y0+20000),(x0,y0+20000),(x0,y0)]]
    items.append({'id':ident,'name':f'Celda {row+1}–{col+1}','lat':center[1],'lon':center[0],'polygon':{'type':'Polygon','coordinates':[ring]},'heights':coarse.ravel().tolist(),'source':'AWS Terrain Tiles z10; bilineal 200 m → media 2 km','coverage':1,'water_mask':'unavailable','row':row,'col':col})
    print(f'{ident}: OK',flush=True)
   except Exception as e:failures.append({'id':ident,'error':str(e)});print(f'{ident}: ERROR {e}',flush=True)
 extent=[list(coords(-a.cells*10000,-a.cells*10000)),list(coords(a.cells*10000,a.cells*10000))]
 manifest={'version':'discovery-1','generated_utc':datetime.now(timezone.utc).isoformat(),'center':[a.lon,a.lat],'extent':extent,'cell_m':2000,'window_km':20,'projection':f'local spherical equirectangular R={R}, lat0={a.lat}; scale varies with latitude','max_east_west_scale_error':max(abs(math.cos(math.radians(pt[1]))/math.cos(math.radians(a.lat))-1) for pt in extent),'sampling_m':200,'requested':a.cells*a.cells,'processed':len(items),'area_nominal_km2':len(items)*400,'elapsed_s':time.time()-start,'tiles':provenance,'failures':failures,'items':items}
 (out/'pilot.json').write_text(json.dumps(manifest,ensure_ascii=False,allow_nan=False),encoding='utf8')
 print(json.dumps({k:v for k,v in manifest.items() if k not in ['tiles','items']},ensure_ascii=False),flush=True)
 if not items:raise RuntimeError('Ninguna ventana procesada')
if __name__=='__main__':main()
