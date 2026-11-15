"""Build offline geological and Diviner evidence for TerraLunar mission presets."""
import hashlib
import json
import math
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from zipfile import ZipFile

import numpy as np
import shapefile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'pipeline/raw/planetary'
MARS_QUERY = 'https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0/query'
DIVINER = 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_pcp/diurnal/ltim/pols/'
MOON_SOURCE = 'https://astrogeology.usgs.gov/search/map/Moon/Geology/Unified_Geologic_Map_of_the_Moon_GIS_v2/'
MARS_SOURCE = 'https://pubs.usgs.gov/sim/3292/'

def inside(x, y, shape):
    hit = False
    ends = [*shape.parts[1:], len(shape.points)]
    for first, end in zip(shape.parts, ends):
        ring = shape.points[first:end]
        px, py = ring[-1]
        for nx, ny in ring:
            if (py > y) != (ny > y) and x < px + (nx - px) * (y - py) / (ny - py):
                hit = not hit
            px, py = nx, ny
    return hit

def lunar_units(sites):
    with ZipFile(RAW/'moon-geology.zip') as archive:
        path = next(name[:-4] for name in archive.namelist() if name.endswith('/GeoUnits.shp'))
        with shapefile.Reader(**{ext: archive.open(path+'.'+ext) for ext in ('shp','dbf','shx')}) as reader:
            for site in sites:
                lon = (site['lon']+180)%360-180
                x, y = (1737400*math.radians(v) for v in (lon, site['lat']))
                for feature in reader.iterShapeRecords(bbox=(x-1,y-1,x+1,y+1)):
                    if inside(x,y,feature.shape):
                        code,age,name = feature.record[:3]
                        site['units'].append(dict(code=code, age=age, name=name))

def mars_units(site):
    query = urlencode(dict(geometry=f"{site['lon']},{site['lat']}",geometryType='esriGeometryPoint',
        inSR=104971,spatialRel='esriSpatialRelIntersects',outFields='Unit,UnitDesc',returnGeometry='false',f='json'))
    with urlopen(MARS_QUERY+'?'+query, timeout=25) as response:
        data = json.load(response)
    return [dict(code=a['Unit'],name=a['UnitDesc']) for a in (f['attributes'] for f in data['features'])]

def lunar_thermal(sites, hour):
    path = RAW/f'diviner-{hour}.tab'
    label = path.with_suffix('.lbl').read_text()
    local_hours = [float(re.search(r'CLOCTIME_'+bound+r'\s*=\s*([\d.]+)',label)[1])
                   for bound in ('MIN','MAX')]
    rows = int(re.search(r'^\s*ROWS\s*=\s*(\d+)',label,re.M)[1])
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream,'sha256').hexdigest()
    cells = np.loadtxt(path,delimiter=',',skiprows=1,usecols=(2,3,4))
    if not rows <= len(cells) <= rows+1:
        raise ValueError(f'Unexpected row count: {len(cells)} vs {rows}')
    granule = f'pcp_avg_tbol_pols_sum_ltim{hour:02}_240'
    for site in sites:
        lon,lat = np.radians(cells[:,0]),np.radians(cells[:,1])
        lo,la = math.radians(site['lon']),math.radians(site['lat'])
        # Project onto the local east/north axes of the 20 km tangent window.
        east = 1737400*np.cos(lat)*np.sin(lon-lo)
        north = 1737400*(math.cos(la)*np.sin(lat)-math.sin(la)*np.cos(lat)*np.cos(lon-lo))
        mask = (abs(east)<=10000)&(abs(north)<=10000)&(abs(lat-la)<.02)
        t = cells[mask,2]
        t = t[np.isfinite(t)&(t>0)]
        if len(t):
            site['thermal'].append(dict(hourBin=hour,localHours=local_hours,count=len(t),kelvin=np.percentile(t,[10,50,90]).round(2).tolist(),
                source=DIVINER+granule+'.xml',sha256=digest))

def main():
    index=json.loads((ROOT/'data/compare/index.json').read_text(encoding='utf-8'))
    moon = [dict(name=p['name'],lat=p['lat'],lon=p['lon'],body='luna',units=[],thermal=[],
        geologySource=MOON_SOURCE,geologyScale=5000000) for p in index['items'] if p['body']=='luna']
    lunar_units(moon)
    for hour in (11,23,35,36,87,88):
        lunar_thermal(moon,hour)
    mars_source=(ROOT/'web/src/marsData.ts').read_text(encoding='utf-8')
    section=mars_source.split('export const MARS_SITES = [')[1].split(']')[0]
    mars=[]
    for name,lon,lat in re.findall(r"name:'([^']+)',lon:([-.\d]+),lat:([-.\d]+)",section):
        site=dict(name=name,lon=float(lon),lat=float(lat),body='marte',thermal=[],
            geologySource=MARS_SOURCE,geologyScale=20000000)
        site['units']=mars_units(site)
        mars.append(site)
    out=ROOT/'data/planetary'
    out.mkdir(exist_ok=True)
    (out/'observations.json').write_text(json.dumps(moon+mars,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for p in moon+mars:
        print(p['name'],[u['code'] for u in p['units']],[(t['hourBin'],t['count']) for t in p['thermal']])

if __name__=='__main__':
    main()
