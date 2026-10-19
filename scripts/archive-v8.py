"""Preserve complete expansion journeys without counting replays as new lives."""
import gzip
import json
from pathlib import Path

project = Path(__file__).resolve().parents[1]
paths = []
for directory in ('v8-fellowship', 'v8-family', 'v8-people'):
    paths.extend(sorted((project / 'artifacts/playtest' / directory).rglob('*.json')))
paths.extend(project / 'artifacts/playtest/community' / name for name in
             ('community-founder.json', 'community-caregiver.json', 'community-founder-successor.json'))
records = []
for path in paths:
    record = json.loads(path.read_text())
    if not all(key in record for key in ('summary', 'log', 'state')) or 'error' in record:
        raise ValueError('An incomplete journey cannot enter this archive: ' + str(path))
    records.append({'path': str(path.relative_to(project)), **record})
payload = {
    'edition': '0.8',
    'method': 'Actual public-API actions and final states. Successor records extend a family journey; they are not counted as another completed original life. Dungeon and sanctuary complete records have separate durable archives.',
    'records': records,
}
destination = project / 'docs/playtest/v8/complete-actions-v8.json.gz'
destination.parent.mkdir(parents=True, exist_ok=True)
with destination.open('wb') as output:
    with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as archive:
        archive.write(json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode())
print(json.dumps({'archive': str(destination.relative_to(project)),
                  'completeRecords': len(records), 'bytes': destination.stat().st_size}))
