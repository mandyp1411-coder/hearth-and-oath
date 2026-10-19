"""Independent native pixel check; reads final encoded art, never edits it."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageStat

root = Path(__file__).resolve().parents[1]
frames = json.loads((root / 'artifacts/grounded-art-frames-v39.json').read_text())
cache = {}
hashes = set()
minimum = float('inf')
for frame in frames:
    path = root / 'dist' / frame['asset']
    if path not in cache:
        cache[path] = Image.open(path).convert('RGB')
    image = cache[path]
    assert image.size == (frame['width'], frame['height']), frame['key']
    x, y, w, h = frame['rect']
    assert x >= 0 and y >= 0 and w > 0 and h > 0
    assert x + w <= 100.00001 and y + h <= 100.00001, frame['key']
    box = tuple(round(v) for v in (x*image.width/100, y*image.height/100,
                                   (x+w)*image.width/100, (y+h)*image.height/100))
    assert box[2]-box[0] >= 80 and box[3]-box[1] >= 80, frame['key']
    crop = image.crop(box)
    signature = hashlib.sha256(crop.tobytes()).hexdigest()
    assert signature not in hashes, 'Duplicate native painting: '+frame['key']
    hashes.add(signature)
    stats = ImageStat.Stat(crop.convert('L'))
    assert stats.mean[0] > 10 and stats.stddev[0] > 10, 'Blank artwork: '+frame['key']
    minimum = min(minimum, stats.stddev[0])
print(json.dumps({'checked':len(frames),'unique':len(hashes),'minimumStandardDeviation':round(minimum,3)}))
