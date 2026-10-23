"""The archive, checked in a real browser: a life written under the old rules
leaves the main game, opens in the Old Rules archive, plays on there, and
comes back; a new-rules life is turned away at the archive's door; the two
games never share a browser database; and both open from their offline files.

    python3 scripts/browser-archive-check.py [--main dist] [--archive out-legacy]
        [--main-offline artifacts/hearth-and-oath.html]
        [--archive-offline out-legacy/hearth-and-oath-old-rules.html]
        [--snapshot docs/measures/archive-verification-v070.md]

The main game is served from `dist/` (what `npm start` serves) and the
archive from `out-legacy/` (what `scripts/build-archive.mjs` packages), on two
ports, so they are two origins as they will be when published. Every step
records pass or fail with what was seen; the script exits 1 if any step
failed. Screenshots go to artifacts/archive-check/.
"""
import argparse
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
out = project / 'artifacts' / 'archive-check'
out.mkdir(parents=True, exist_ok=True)
results = []


def record(step, ok, seen=''):
    results.append({'step': step, 'ok': bool(ok), 'seen': seen})
    print(('PASS ' if ok else 'FAIL ') + step + (f' — {seen}' if seen else ''))


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def serve(directory):
    port = free_port()
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--directory', str(directory), '--bind', '127.0.0.1'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    return proc, f'http://127.0.0.1:{port}/'


def op(page, name, id=None, timeout=10000):
    selector = f'[data-op="{name}"]' + (f'[data-id="{id}"]' if id is not None else '')
    control = page.locator(selector + ':visible').first
    control.wait_for(timeout=timeout)
    control.click()


def title(page, url):
    page.goto(url, wait_until='networkidle')
    page.locator('.title-screen').wait_for(timeout=20000)


def import_file(page, path, review=True):
    """Import through the real control: the hidden file input the Import button opens. The review modal (or the refusal toast) follows the file read."""
    page.locator('#save-file').set_input_files(str(path))
    if review:
        page.locator('.modal [data-op="confirm-import"]').first.wait_for(timeout=15000)
    else:
        page.wait_for_timeout(800)


def confirm_import(page):
    page.locator('[data-op="confirm-import"]:visible').first.wait_for(timeout=10000)
    page.locator('[data-op="confirm-import"]:visible').first.click()
    page.locator('.app-shell.has-life').wait_for(timeout=30000)


def slot_rules(page):
    """From the Saved lives screen: the rules label on each occupied slot."""
    return [(row.locator('.slot-rules').first.get_attribute('data-rules') if row.locator('.slot-rules').count() else None,
             row.locator('.slot-rules').first.inner_text() if row.locator('.slot-rules').count() else '')
            for row in page.locator('.save-slot-row.occupied-slot-row').all()]


def to_slots(page):
    """Reach the Saved lives screen from wherever the page is: the game (through the menu drawer), the title or another menu screen."""
    if page.locator('.app-shell.has-life').count():
        op(page, 'menu')
        page.locator('#menu-drawer [data-op="title-menu"]').first.click()
    elif not page.locator('.title-screen').count() and page.locator('[data-op="title-menu"]:visible').count():
        op(page, 'title-menu')
    page.locator('.title-screen').wait_for(timeout=15000)
    op(page, 'title-load')
    page.locator('.save-slots-screen').wait_for(timeout=15000)


def export_slot(page, slot_index=0):
    with page.expect_download(timeout=20000) as download:
        page.locator(f'[data-op="export-session"][data-id="{slot_index}"]:visible').first.click()
    path = out / download.value.suggested_filename
    download.value.save_as(str(path))
    return path


def storage_names(page):
    return page.evaluate('''async () => {
        const dbs = (await (indexedDB.databases ? indexedDB.databases() : Promise.resolve([]))).map(d => d.name).filter(Boolean).sort();
        const keys = Object.keys(localStorage).sort();
        return {dbs, keys};
    }''')


def one_season(page):
    """Live a season or age up, answering whatever the day asks, until the day moved."""
    before = page.evaluate("document.querySelector('.app-shell')?.innerText.length || 0")
    for _ in range(40):
        if page.locator('[data-op="choice"]:visible').count():
            page.locator('[data-op="choice"]:visible').first.click()
            page.wait_for_timeout(150)
            continue
        for name in ('live-season', 'continue-age', 'age-up'):
            control = page.locator(f'[data-op="{name}"]:visible')
            if control.count() and control.first.is_enabled():
                control.first.click()
                page.wait_for_timeout(400)
                break
        else:
            break
        if not page.locator('[data-op="choice"]:visible').count():
            break
    return page.evaluate("document.querySelector('.app-shell')?.innerText.length || 0") != before


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--main', default='dist')
    ap.add_argument('--archive', default='out-legacy')
    ap.add_argument('--main-offline', default='artifacts/hearth-and-oath.html')
    ap.add_argument('--archive-offline', default='out-legacy/hearth-and-oath-old-rules.html')
    ap.add_argument('--snapshot', default=None)
    ap.add_argument('--chromium', default=None)
    args = ap.parse_args()

    legacy = json.loads((project / 'tests/fixtures/legacy-v5.json').read_text())['states']['adult18']
    old_file = out / 'fixture-old-rules.json'
    old_file.write_text(json.dumps(legacy))
    import gzip
    new69 = json.loads(gzip.decompress((project / 'tests/fixtures/saves/v0690.json.gz').read_bytes()))['states']['eighteen']
    new_file = out / 'fixture-new-rules-v069.json'
    new_file.write_text(json.dumps(new69))

    main_proc, main_url = serve(project / args.main)
    archive_proc, archive_url = serve(project / args.archive)
    errors = {'main': [], 'archive': []}
    try:
        with sync_playwright() as p:
            launch = {'headless': True, 'args': ['--no-sandbox']}
            if args.chromium:
                launch['executable_path'] = args.chromium
            browser = p.chromium.launch(**launch)
            ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
            main = ctx.new_page()
            archive = ctx.new_page()
            main.on('pageerror', lambda e: errors['main'].append(str(e)))
            archive.on('pageerror', lambda e: errors['archive'].append(str(e)))

            # 1. The two games open, and say what they are.
            title(main, main_url)
            record('main game opens at its own origin', main.locator('.title-screen').count() == 1, main_url)
            title(archive, archive_url)
            text = archive.locator('.title-screen').inner_text()
            record('archive opens at its own origin and names itself', 'old rules' in text.lower(), archive_url)

            # 2. An old-rules save in the main game: label, note, export for the archive.
            op(main, 'import')
            import_file(main, old_file)
            review = main.locator('.modal').inner_text() if main.locator('.modal').count() else ''
            record('import review in the main game labels the old-rules life', 'Old rules' in review and 'archive' in review.lower(), review.strip().replace('\n', ' ')[:160])
            confirm_import(main)
            to_slots(main)
            rules = slot_rules(main)
            record('the slot says Old rules', any(r == 'old' for r, _ in rules), str(rules))
            note = main.locator('[data-archive-note]')
            record('the slot carries the way to the archive, in the game’s voice', note.count() >= 1 and 'Export for the archive' in note.first.inner_text(), note.first.inner_text().replace('\n', ' ')[:160] if note.count() else 'no note')
            main.screenshot(path=str(out / 'main-slot-old-rules.png'), full_page=True)
            exported_old = export_slot(main, 0)
            data = json.loads(exported_old.read_text())
            record('the export is named for its rules and carries the stamp', exported_old.name.endswith('-old-rules.json') and data.get('edition', {}).get('rules') == 'old', f'{exported_old.name} edition={data.get("edition")}')

            # 3. The archive takes it, labels it, plays a season, exports it back.
            op(archive, 'import')
            import_file(archive, exported_old)
            review = archive.locator('.modal').inner_text() if archive.locator('.modal').count() else ''
            record('the archive’s import review labels the life Old rules', 'Old rules' in review, review.strip().replace('\n', ' ')[:120])
            confirm_import(archive)
            record('the archive loads the life', archive.locator('.app-shell.has-life').count() == 1)
            moved = one_season(archive)
            record('the life plays on in the archive', moved and not errors['archive'], f'errors={errors["archive"][:2]}')
            archive.screenshot(path=str(out / 'archive-life.png'), full_page=True)
            to_slots(archive)
            rules = slot_rules(archive)
            record('the archive’s slot says Old rules', any(r == 'old' for r, _ in rules), str(rules))
            exported_back = export_slot(archive, 0)
            record('the archive’s export is named for the archive', exported_back.name.endswith('-old-rules-archive.json'), exported_back.name)

            # 4. Back in the main game it still opens (nothing is removed in v0.70).
            to_slots(main)
            op(main, 'import')
            import_file(main, exported_back)
            confirm_import(main)
            record('a life played in the archive opens in the main game again', main.locator('.app-shell.has-life').count() == 1 and not errors['main'], f'errors={errors["main"][:2]}')

            # 5. A new-rules life: labelled in the main game, turned away by the archive.
            to_slots(main)
            op(main, 'import')
            import_file(main, new_file)
            review = main.locator('.modal').inner_text() if main.locator('.modal').count() else ''
            record('a v0.69 new-rules save is labelled "New rules, begun before v0.70"', 'New rules, begun before v0.70' in review, review.strip().replace('\n', ' ')[:120])
            confirm_import(main)
            to_slots(main)
            exported_new = export_slot(main, [r for r, _ in slot_rules(main)].index('new'))
            record('the new-rules export is named for its rules', exported_new.name.endswith('-new-rules.json'), exported_new.name)
            to_slots(archive)
            op(archive, 'import')
            import_file(archive, exported_new, review=False)
            toast = archive.locator('#toast').inner_text() if archive.locator('#toast').count() else ''
            record('the archive turns the new-rules life away in a line', 'new rules' in toast.lower() and 'main game' in toast.lower() and not archive.locator('[data-op="confirm-import"]').count(), toast)

            # 6. A life begun in the archive opens in the main game, labelled for the release that made it.
            op(archive, 'title-menu')
            archive.locator('.title-screen').wait_for()
            op(archive, 'title-new')
            archive.locator('.save-slots-screen').wait_for(timeout=15000)
            archive.locator('.save-slot-row:not(.occupied-slot-row) [data-op="slot-new"]:visible').first.click()
            archive.locator('#character-form').wait_for(timeout=15000)
            # the first submit opens the review step, the second begins the life
            archive.locator('#character-form').evaluate('f => f.requestSubmit()')
            archive.wait_for_timeout(600)
            archive.locator('#character-form').evaluate('f => f.requestSubmit()')
            archive.locator('.app-shell.has-life').wait_for(timeout=180000)
            record('a life begins in the archive', True)
            to_slots(archive)
            labels = slot_rules(archive)
            record('a life begun in the archive is labelled New rules, begun in v0.69', any(t == 'New rules, begun in v0.69' for _, t in labels), str(labels))
            new_from_archive = export_slot(archive, [r for r, _ in labels].index('new'))
            to_slots(main)
            op(main, 'import')
            import_file(main, new_from_archive)
            review = main.locator('.modal').inner_text() if main.locator('.modal').count() else ''
            record('the main game takes a life begun in the archive and keeps its date', 'New rules, begun in v0.69' in review, review.strip().replace('\n', ' ')[:120])
            if main.locator('[data-op="confirm-import"]:visible').count():
                confirm_import(main)

            # 7. Storage never shared.
            s_main, s_arch = storage_names(main), storage_names(archive)
            record('the main game keeps its saves in hearth-and-oath', 'hearth-and-oath' in s_main['dbs'] and all(k.startswith('hearth-and-oath:') for k in s_main['keys']), json.dumps(s_main)[:200])
            record('the archive keeps its saves in hearth-and-oath-legacy and nowhere else', s_arch['dbs'] == ['hearth-and-oath-legacy'] and all(k.startswith('hearth-and-oath-legacy:') for k in s_arch['keys']), json.dumps(s_arch)[:200])

            # 8. The offline files open and take the same imports.
            for name, path, label_expected in (('main offline file', project / args.main_offline, 'Old rules'), ('archive offline file', project / args.archive_offline, 'Old rules')):
                if not path.exists():
                    record(f'{name} opens from disk', False, f'{path} is not built')
                    continue
                page = ctx.new_page()
                errs = []
                page.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
                try:
                    page.goto(path.as_uri(), wait_until='commit', timeout=300000)
                    page.locator('.title-screen').wait_for(timeout=300000)
                    record(f'{name} opens from disk', True, f'{path.stat().st_size // 1048576} MB')
                    op(page, 'import')
                    import_file(page, exported_old)
                    review = page.locator('.modal').inner_text() if page.locator('.modal').count() else ''
                    record(f'{name} labels an imported old-rules life', label_expected in review, review.strip().replace('\n', ' ')[:120])
                    if page.locator('[data-op="confirm-import"]:visible').count():
                        confirm_import(page)
                        record(f'{name} loads the imported life', page.locator('.app-shell.has-life').count() == 1 and not errs, f'errors={errs[:2]}')
                except Exception as e:  # noqa: BLE001
                    record(f'{name} opens from disk', False, f'{type(e).__name__}: {str(e)[:120]}')
                page.close()
            browser.close()
    finally:
        main_proc.terminate()
        archive_proc.terminate()

    (out / 'report.json').write_text(json.dumps({'results': results, 'errors': errors}, indent=2))
    failed = [r for r in results if not r['ok']]
    md = ['# The archive, checked in a browser (v0.70)', '', f'{len(results) - len(failed)} of {len(results)} steps passed. Headless Chromium, the main game served from `{args.main}/` and the archive from `{args.archive}/` on two ports (two origins, as published); the offline files opened from disk.', '', '| Step | Result | Seen |', '|---|---|---|']
    for r in results:
        md.append(f"| {r['step']} | {'pass' if r['ok'] else 'FAIL'} | {r['seen'].replace('|', '/')} |")
    md += ['', 'Page errors: ' + (json.dumps(errors) if errors['main'] or errors['archive'] else 'none.'), '']
    (out / 'report.md').write_text('\n'.join(md))
    if args.snapshot:
        Path(project / args.snapshot).parent.mkdir(parents=True, exist_ok=True)
        Path(project / args.snapshot).write_text('\n'.join(md))
    print(f'\n{len(results) - len(failed)}/{len(results)} passed')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
