#!/usr/bin/env python3
"""Decode native art and verify its registered crops; never modifies image pixels."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import subprocess
from PIL import Image, ImageStat

root = Path(__file__).resolve().parents[1]
probe = "import {MATURE_PORTRAIT_ATLASES_V40 as m} from './dist/js/mature-portraits-v40.js'; import {LIFECYCLE_PORTRAIT_ATLASES_V40 as a,LIFECYCLE_PORTRAIT_FAMILIES_V40 as f} from './dist/js/lifecycle-portraits-v40.js'; console.log(JSON.stringify({m,a,f}));"
data = json.loads(subprocess.run(['node', '--input-type=module', '-e', probe], cwd=root, capture_output=True, text=True, check=True).stdout)
atlases = data['m'] + data['a']
keys = set()
pixels = set()
rows = []
stages = Counter()
for atlas in atlases:
    asset = root / 'dist' / atlas['src'].removeprefix('./')
    im = Image.open(asset).convert('RGB')
    assert list(im.size) == [atlas['width'], atlas['height']], atlas['id']
    minimum = 255
    for entry in atlas['entries']:
        key = f"{atlas['id']}:{entry['cell']:02}"
        assert key not in keys, key
        keys.add(key)
        x, y, width, height = atlas['cells'][entry['cell']]
        assert min(x, y) >= 0 and min(width, height) > 0 and x + width <= 100.001 and y + height <= 100.001, key
        rect = (round(x * im.width / 100), round(y * im.height / 100), round((x + width) * im.width / 100), round((y + height) * im.height / 100))
        crop = im.crop(rect)
        variation = ImageStat.Stat(crop.convert('L')).stddev[0]
        assert variation > 10, (key, variation)
        minimum = min(minimum, variation)
        fingerprint = hashlib.sha256(crop.tobytes()).hexdigest()
        assert fingerprint not in pixels, key
        pixels.add(fingerprint)
        stages[entry['stage']] += 1
    rows.append({'id': atlas['id'], 'ancestry': atlas['ancestry'], 'asset': str(asset.relative_to(root)), 'width': im.width, 'height': im.height, 'portraits': len(atlas['entries']), 'bytes': asset.stat().st_size, 'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(), 'minimumCropLuminanceStdDev': round(minimum, 4)})
linked = []
for family in data['f']:
    assert set(family['selections']) == {'infant', 'child', 'adolescent', 'adult', 'mature', 'older', 'elder'}, family['id']
    assert all(key in keys for key in family['selections'].values()), family['id']
    linked.extend(family['selections'].values())
assert len(data['f']) == 96 and len(linked) == len(set(linked)) == 672
assert sum(len(a['entries']) for a in data['m']) == 512
css = (root / 'dist/styles.css').read_text()
assert 'body .fantasy-avatar { filter:grayscale(1); }' in css
assert '--illustration-tone: grayscale(1) contrast(.98)' in css
report = {'atlases': len(rows), 'portraits': len(keys), 'linkedFamilies': len(data['f']), 'linkedPortraits': len(linked), 'standaloneMaturePortraits': 512, 'stages': dict(stages), 'encodedBytes': sum(r['bytes'] for r in rows), 'allNativeCropsUnique': True, 'allNativeCropsNonblank': True, 'sharedGrayscaleRendering': True, 'creativeGeneration': 'Built-in image generation; native encoding and crop analysis only during packing.', 'assets': rows}
(root / 'docs/art-v40/verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'assets'}, indent=2))
