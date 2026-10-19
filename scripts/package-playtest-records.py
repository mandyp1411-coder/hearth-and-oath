"""Preserve complete played traces and a countable original-life ledger.

Run after the five public-API route scripts. Same-seed replays and debugging
attempts remain evidence but never increase the distinct completed-life count.
The archive stays in source documentation, outside the deployed dist directory.
"""
import csv
import gzip
import hashlib
import io
import json
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
docs = root / 'docs' / 'playtest'
artifacts = root / 'artifacts' / 'playtest'


def read(name):
    return json.loads((docs / (name + '.json')).read_text())


rows = []
for group, name, key in [
    ('career', 'careers-baseline', 'lives'),
    ('family', 'family', 'baseline'),
    ('childhood', 'childhood-baseline', 'lives'),
    ('adventure', 'adventure', 'results'),
    ('story', 'story-summary', 'lives'),
]:
    for index, life in enumerate(read(name)[key], 1):
        config = life.get('config', life.get('profile', life))
        # Story summaries can show the continued heir. The original eight
        # campaign players each closed their chapter at age 30.
        age = 30 if group == 'story' else life.get('terminalAge', life.get('endingAge', life.get('age')))
        rows.append({
            'id': life.get('id', f'{group}-{index:02d}'),
            'group': group,
            'name': config.get('name'),
            'seed': config.get('seed'),
            'birthplace': config.get('birthplace'),
            'household': config.get('household'),
            'family_setup': config.get('familySetup'),
            'profession': life.get('profession', config.get('profession')),
            'original_terminal_age': age,
            'source_record': name + '.json',
        })
assert len(rows) == 36
assert len({row['seed'] for row in rows}) == 36
with (docs / 'original-life-ledger.csv').open('w', newline='') as output:
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)

# Adventure and family preserve their complete traces in dedicated archives.
# These remaining full transcripts include failed debugging attempts labelled
# in their filenames; those attempts do not appear in the 36-person ledger.
paths = sorted({
    *artifacts.glob('career-*.json'),
    *artifacts.glob('baseline/childhood/*.json'),
    *artifacts.glob('after/childhood/*.json'),
    *artifacts.glob('story/*.json'),
})
assert len(paths) >= 44, 'Run all original and replay scripts first'
manifest = []
archive = docs / 'api-action-records.tar.gz'
with archive.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as compressed:
    with tarfile.open(fileobj=compressed, mode='w|') as tar:
        for path in paths:
            data = path.read_bytes()
            name = path.relative_to(artifacts).as_posix()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mtime = 0
            info.mode = 0o644
            tar.addfile(info, io.BytesIO(data))
            manifest.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
result = {
    'distinctCompleteOriginalLives': 36,
    'sameSeedReplaysCountAsNewLives': False,
    'archive': archive.name,
    'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
    'records': manifest,
    'separateFullTraceArchives': ['family-actions.json.gz', 'adventure-transcripts.json.gz'],
    'browserRecords': 'ui-lives.json',
}
(docs / 'action-records-manifest.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'distinctOriginalLives': 36, 'archivedRecords': len(paths), 'archiveBytes': archive.stat().st_size}))
