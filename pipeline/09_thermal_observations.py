"""Extract native MOD11A1 pixels inside each 20km geographic candidate window.
Run with PYTHONPATH=pipeline/.thermal-deps. Inputs remain external; output is small.
"""
import argparse, hashlib, json, math, re
from datetime import datetime
from pathlib import Path
import numpy as np
from pyhdf.SD import SD

def quality(raw, qc):
    # MOD11A1 C6.1 table 13: all four flags in their best class.
    return (raw >= 7500) & (raw <= 65535) & (qc == 0)

def summary(raw, qc, times, mask, scale):
    good = mask & quality(raw, qc)
    count = int(good.sum())
    clock = times[good & (times <= 240)] * .1
    return dict(count=count, total=int(mask.sum()),
        validFraction=count/int(mask.sum()) if mask.any() else 0,
        kelvin=[round(float(v),2) for v in np.percentile(raw[good]*scale,[10,50,90])] if count else None,
        solarHours=[round(float(clock.min()),2),round(float(clock.max()),2)] if clock.size else None)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('hdf',type=Path); args=ap.parse_args()
    root=Path(__file__).resolve().parents[1]
    f=SD(str(args.hdf)); meta=f.attributes()['StructMetadata.0']
    def pair(key):
        return tuple(map(float,re.search(key+r'=\(([^)]+)\)',meta)[1].split(',')))
    left,top=pair('UpperLeftPointMtrs'); right,bottom=pair('LowerRightMtrs')
    radius=pair('ProjParams')[0]
    shape=f.select('LST_Day_1km').get().shape
    yy=top+(np.arange(shape[0])+.5)*(bottom-top)/shape[0]
    xx=left+(np.arange(shape[1])+.5)*(right-left)/shape[1]
    lat=np.broadcast_to(np.degrees(yy/radius)[:,None],shape)
    lon=np.degrees(xx[None,:]/(radius*np.cos(yy[:,None]/radius)))
    layers={}
    for phase in ['Day','Night']:
        s=f.select('LST_'+phase+'_1km')
        layers[phase]=(s.get(), f.select('QC_'+phase).get(),f.select(phase+'_view_time').get(),float(s.attributes()['scale_factor']))
    sources=[root/'data/compare/index.json',*sorted((root/'data/discovery').rglob('pilot.json'))]
    candidates={}
    for path in sources:
        for p in json.loads(path.read_text(encoding='utf-8'))['items']:
            if p.get('body')=='luna': continue
            candidates[p['id']]=p
    items=[]
    for p in candidates.values():
        # Same spherical window convention as the regional terrain search.
        dlat=math.degrees(10000/6371000); dlon=dlat/math.cos(math.radians(p['lat']))
        # Do not report partial tile overlap as coverage of a complete candidate.
        corners=[(radius*math.radians(lo)*math.cos(math.radians(la)),radius*math.radians(la))
                 for lo in [p['lon']-dlon,p['lon']+dlon] for la in [p['lat']-dlat,p['lat']+dlat]]
        if not all(left<=x<=right and bottom<=y<=top for x,y in corners): continue
        mask=(abs(lat-p['lat'])<=dlat)&(abs(lon-p['lon'])<=dlon)
        if not mask.any(): continue
        phases={k.lower():summary(raw,qc,t,mask,s) for k,(raw,qc,t,s) in layers.items()}
        items.append(dict(id=p['id'],lat=p['lat'],lon=p['lon'],**phases))
    date=datetime.strptime(re.search(r'\.A(\d{7})',args.hdf.name)[1],'%Y%j').date().isoformat()
    result=dict(version='thermal-observation/1',product='MOD11A1.061',date=date,
        granule=args.hdf.name,sha256=hashlib.sha256(args.hdf.read_bytes()).hexdigest(),
        source='https://doi.org/10.5067/MODIS/MOD11A1.061',
        documentation='https://lpdaac.usgs.gov/documents/715/MOD11_User_Guide_V61.pdf',
        resolutionM=(right-left)/shape[1],windowKm=20,quality='QC=0: good retrieval, good data, emissivity error <=0.01, LST error <=1 K',
        interpretation='Spatial percentiles of clear-sky surface temperature for one day; not air temperature or a complete thermal cycle.',
        comparisonEligible=False,items=items)
    dest=root/'data/thermal/modis-observations.json'; dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(result,ensure_ascii=False,allow_nan=False,indent=2),encoding='utf-8')
    print(f'{len(items)} covered candidates; {sum(p["day"]["count"]>0 for p in items)} with valid daytime data; {sum(p["night"]["count"]>0 for p in items)} nighttime')
    f.end()

if __name__=='__main__': main()
