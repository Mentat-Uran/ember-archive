"""Optional asset preparation: lossless WebP, with exact decoded RGBA equality.
Builds use the checked-in cache and require only Node.js. Regeneration needs Pillow.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import hashlib,json,io

root=Path(__file__).resolve().parents[1]
originals=root/'public'/'question-images'
cache=root/'assets'/'question-images'
cache.mkdir(parents=True,exist_ok=True)
files=sorted(originals.rglob('*.png'),key=lambda p:p.stat().st_size,reverse=True)[:500]

def optimize(src):
    raw=src.read_bytes()
    with Image.open(src) as original:
        pixels=original.convert('RGBA')
        output=io.BytesIO()
        pixels.save(output,'WEBP',lossless=True,method=3,exact=True)
        encoded=output.getvalue()
        if len(encoded)>=len(raw)-1024:return None
        with Image.open(io.BytesIO(encoded)) as decoded:
            if decoded.convert('RGBA').tobytes()!=pixels.tobytes():
                raise RuntimeError('Pixel mismatch: '+str(src))
        relative=src.relative_to(originals).as_posix()
        target=cache/Path(relative).with_suffix('.webp')
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(encoded)
        return {'source':relative,'webp':target.relative_to(cache).as_posix(),'sourceSha256':hashlib.sha256(raw).hexdigest(),'webpSha256':hashlib.sha256(encoded).hexdigest(),'sourceBytes':len(raw),'webpBytes':len(encoded),'width':pixels.width,'height':pixels.height,'pixelsVerified':True}

with ThreadPoolExecutor(max_workers=6) as pool:
    records=[r for r in pool.map(optimize,files) if r]
records.sort(key=lambda r:r['source'])
(cache/'manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'optimized':len(records),'savedMiB':round(sum(r['sourceBytes']-r['webpBytes'] for r in records)/1048576,2),'pixelEqualityVerified':True},ensure_ascii=False))
