"""Register generated atlas pixels without recolouring or altering the illustrations."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('inputs', type=Path)
args = parser.parse_args()
records = json.loads(args.inputs.read_text())
registered = []
for record in records:
    source = Path(record['source'])
    target = ROOT / 'dist' / record['target']
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as illustration:
        pixels = illustration.convert('RGB')
        pixels.save(target, quality=90)
        width, height = pixels.size
    registered.append({**record, 'width': width, 'height': height,
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'bytes': target.stat().st_size})
print(json.dumps(registered, indent=2))
