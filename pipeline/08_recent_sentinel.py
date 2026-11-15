"""Recent Sentinel-2 regional sampling, dated observations, not annual land-cover."""
import argparse,re,sys,json,urllib.request,urllib.parse,urllib.error,hashlib,time
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'pipeline/.deps'))
import xml.etree.ElementTree as ET
import numpy as np
import rasterio
from rasterio.enums import Resampling
from pyproj import Transformer

def request(url,data=None):
 for attempt in range(5):
  try:
   time.sleep(1)
   return json.load(urllib.request.urlopen(urllib.request.Request(url,data=json.dumps(data).encode() if data else None,headers={'Content-Type':'application/json'}),timeout=45))
  except urllib.error.HTTPError as e:
   if e.code!=429 or attempt==4:raise
   delay=min(55,max(5,int(e.headers.get('Retry-After','10'))));print('Rate limit: waiting',delay,flush=True);time.sleep(delay)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--region',default='pilot');parser.add_argument('--start',default='2026-10-01');parser.add_argument('--end',default='2026-11-14');parser.add_argument('--scenes-per-tile',type=int,default=3);args=parser.parse_args()
 if not re.fullmatch(r'[a-z0-9_-]+',args.region) or not 1<=args.scenes_per_tile<=5:raise ValueError('Invalid region or scene limit')
 datetime.fromisoformat(args.start);datetime.fromisoformat(args.end)
 base=ROOT/'data/discovery' if args.region=='pilot' else ROOT/'data/discovery'/args.region
 raw=(base/'pilot.json').read_bytes();pilot=json.loads(raw);a,b=pilot['extent'];end=args.end+'T23:59:59Z'
 q={'collections':['sentinel-2-l2a'],'bbox':a+b,'datetime':args.start+'T00:00:00Z/'+end,'limit':100,'sortby':[{'field':'datetime','direction':'desc'}]}
 found=request('https://planetarycomputer.microsoft.com/api/stac/v1/search',q)['features'];chosen=[];tile_counts={}
 for f in found:
  tile=f['properties'].get('s2:mgrs_tile') or f['id'].split('_T')[1][:5]
  if tile_counts.get(tile,0)<args.scenes_per_tile and f['properties'].get('eo:cloud_cover',100)<60:
   chosen.append((tile,f));tile_counts[tile]=tile_counts.get(tile,0)+1
 points=[]
 for p in pilot['items']:
  ring=p['polygon']['coordinates'][0];west,south=ring[0];east,north=ring[2];x,y=np.meshgrid(west+(np.arange(100)+.5)*(east-west)/100,north-(np.arange(100)+.5)*(north-south)/100);points.append((x.ravel(),y.ravel()))
 lon=np.concatenate([p[0] for p in points]);lat=np.concatenate([p[1] for p in points]);ndvi=np.full(len(lon),np.nan);scl=np.zeros(len(lon),dtype=np.uint8);dates=np.full(len(lon),'',dtype='U30');sources=[];failures=[]
 for tile,f in chosen:
  try:
   meta_url=f['assets']['product-metadata']['href']
   signed_meta=request('https://planetarycomputer.microsoft.com/api/sas/v1/sign?href='+urllib.parse.quote(meta_url,safe=''))['href']
   xml=ET.fromstring(urllib.request.urlopen(signed_meta,timeout=30).read());quant=float(xml.find('.//{*}BOA_QUANTIFICATION_VALUE').text)
   offsets={e.attrib['band_id']:float(e.text) for e in xml.findall('.//{*}BOA_ADD_OFFSET')}
   assets={}
   for key in ['B04','B08','SCL']:
    asset=f['assets'][key];signed=request('https://planetarycomputer.microsoft.com/api/sas/v1/sign?href='+urllib.parse.quote(asset['href'],safe=''))['href']
    with rasterio.open(signed) as ds:
     x,y=Transformer.from_crs('EPSG:4326',ds.crs,always_xy=True).transform(lon,lat);cols,rows=(~ds.transform)*(x,y);inside=(cols>=0)&(rows>=0)&(cols<ds.width)&(rows<ds.height)
     # Native nearest-neighbour values sampled on a 200m grid; read overview for bounded IO.
     factor=10 if key=='SCL' else 20;h=ds.height//factor;w=ds.width//factor;arr=ds.read(1,out_shape=(h,w),resampling=Resampling.nearest)
     vals=np.zeros(len(lon));rr=np.clip((rows/factor).astype(int),0,h-1);cc=np.clip((cols/factor).astype(int),0,w-1);vals[inside]=arr[rr[inside],cc[inside]]
     if key!='SCL':
      scale=1/quant;offset=offsets.get({'B04':'3','B08':'7'}[key]);offset=None if offset is None else offset/quant
      if offset is None:raise ValueError('Reflectance offset missing; refusing uncalibrated NDVI')
      vals=vals*scale+offset
     assets[key]=(vals,inside)
   red,inside=assets['B04'];nir,_=assets['B08'];classes,_=assets['SCL'];valid=inside&assets['B08'][1]&assets['SCL'][1]&np.isin(classes,[4,5,6])&((red+nir)>0)&np.isnan(ndvi)
   ratio=(nir[valid]-red[valid])/(nir[valid]+red[valid]);ids=np.where(valid)[0];ok=np.isfinite(ratio)&(ratio>=-1)&(ratio<=1);ids=ids[ok];ndvi[ids]=ratio[ok];scl[ids]=classes[ids];dates[ids]=f['properties']['datetime'][:10]
   sources.append({'id':f['id'],'datetime':f['properties']['datetime'],'accepted_samples':len(ids),'quantification':quant,'band_offsets':offsets,'calibration_source':meta_url,'assets':{k:f['assets'][k]['href'] for k in assets}});print(tile,len(ids),flush=True)
  except Exception as e:failures.append({'tile':tile,'error':str(e).split('?')[0]});print(tile,'failed',type(e).__name__,flush=True)
 items=[]
 for i,p in enumerate(pilot['items']):
  v=ndvi[i*10000:(i+1)*10000];c=scl[i*10000:(i+1)*10000];d=dates[i*10000:(i+1)*10000];ok=np.isfinite(v);count=int(ok.sum());items.append({'id':p['id'],'valid_fraction':count/10000,'ndvi':float(np.quantile(v[ok],.9)) if count else None,'ndvi_median':float(np.median(v[ok])) if count else None,'water':float((c[ok]==6).mean()) if count else None,'vegetation':float((c[ok]==4).mean()) if count else None,'built':None,'dates':sorted(set(d[ok]))})
 output={'version':'sentinel-recent-1','pilot_sha256':hashlib.sha256(raw).hexdigest(),'product':'Sentinel-2 L2A 2026; SCL and calibrated NDVI','method':'200m approximate nearest overview sampling; latest clear observation from selected tiles; SCL 4/5/6 only; NDVI filter uses window p90; built-up not measured','sources':sources,'failures':failures,'items':items,'requested_interval':[args.start,args.end],'max_scenes_per_tile':args.scenes_per_tile,'catalogue_limit':100,'catalogue_returned':len(found),'created':datetime.now(timezone.utc).isoformat()}
 (base/'recent-2026.json').write_text(json.dumps(output,indent=2,allow_nan=False),encoding='utf8');print('windows with observations',sum(i['ndvi'] is not None for i in items),flush=True)
if __name__=='__main__':main()
