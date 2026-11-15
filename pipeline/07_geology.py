import urllib.request,urllib.parse,json,hashlib
from pathlib import Path
root=Path.cwd();p=json.loads((root/'data/discovery/pilot.json').read_text())
b=p['extent'];params={'service':'WFS','version':'1.0.0','request':'GetFeature','typeName':'sigam:e1M.NOA.Geol','outputFormat':'application/json','srsName':'EPSG:4326','bbox':','.join(map(str,b[0]+b[1]))+',EPSG:4326','maxFeatures':'5000'}
u='https://sigam.segemar.gov.ar/geoserver217/ows?'+urllib.parse.urlencode(params)
raw=urllib.request.urlopen(u,timeout=45).read();data=json.loads(raw)
(root/'data/discovery/geology.geojson').write_bytes(raw)
meta={'source':u,'provider':'SEGEMAR SIGAM','layer':'NOA Unidades Geológicas 1M','scale':1000000,'scope':'Regional bounding box context; Argentina only, not whole-window or planetary equivalence','sha256':hashlib.sha256(raw).hexdigest(),'feature_count':len(data.get('features',[])),'properties_example':data.get('features',[{}])[0].get('properties',{})}
(root/'data/discovery/geology-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(meta,ensure_ascii=False))
