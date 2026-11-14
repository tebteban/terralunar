"""Download public MOLA topography. No API key. Retain native grid, gzip for browser delivery."""
import gzip, hashlib, json, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'mars'
BASE = 'https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg032/'
if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    raw = ROOT / 'pipeline' / 'raw' / 'mars' / 'megt90n000fb.img'
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not raw.exists():
        urllib.request.urlretrieve(BASE + raw.name, raw.with_suffix('.part'))
        raw.with_suffix('.part').replace(raw)
    assert raw.stat().st_size == 5760 * 11520 * 2, 'Wrong MOLA file size'
    data = raw.read_bytes()
    for band in range(16):
        with gzip.open(OUT / f'mola32-{band}.dat', 'wb', compresslevel=6) as f:
            f.write(data[band*360*11520*2:(band+1)*360*11520*2])
    urllib.request.urlretrieve(BASE + 'megt90n000fb.lbl', OUT / 'megt90n000fb.lbl')
    (OUT / 'source.json').write_text(json.dumps(dict(url=BASE+raw.name, sha256=hashlib.sha256(data).hexdigest(), width=11520, height=5760, pixels_per_degree=32, endian='big', units='m above areoid', nominal_resolution_m=1853, note='Interpolated cells included; native sampling varies. Visualization is shaded topography, not imagery.'), indent=2))
    print('MOLA ready: 16 latitude bands')
