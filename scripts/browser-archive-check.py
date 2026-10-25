"""The archive and the one-rulebook main game, checked in a real browser.

From v0.72 the main game plays the new rules only. This walks what that
means for a player: an old-rules file meets the archive's door in main and
plays on in the Old Rules archive; what the archive exports still meets the
door in main; a new-rules life plays in main and is turned away by the
archive; a life begun in the archive is new rules and main keeps its date;
the two games never share a browser database; a returning player whose old
life is already in a slot sees it kept, never opened, and sends it to the
archive whole; a player whose only save is the oldest single-save mirror
finds it kept in the first slot and exported exactly as stored; and both
offline files behave the same from disk.

    python3 scripts/browser-archive-check.py [--main dist] [--archive out-legacy]
        [--main-offline artifacts/hearth-and-oath.html]
        [--archive-offline artifacts/old-rules-archive/hearth-and-oath-old-rules.html]
        [--snapshot docs/measures/archive-verification-v0722.md]

The main game is served from `dist/` (what `npm start` serves) and the
archive from `out-legacy/` (what `scripts/build-archive.mjs` packages), on two
ports, so they are two origins as they will be when published. Every step
records pass or fail with what was seen; the script exits 1 if any step
failed. Screenshots go to artifacts/archive-check/.
"""
import argparse
import gzip
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
    ap.add_argument('--archive-offline', default='artifacts/old-rules-archive/hearth-and-oath-old-rules.html')
    ap.add_argument('--snapshot', default=None)
    ap.add_argument('--chromium', default=None)
    args = ap.parse_args()

    legacy = json.loads((project / 'tests/fixtures/legacy-v5.json').read_text())['states']['adult18']
    old_file = out / 'fixture-old-rules.json'
    old_file.write_text(json.dumps(legacy))
    new69 = json.loads(gzip.decompress((project / 'tests/fixtures/saves/v0690.json.gz').read_bytes()))['states']['eighteen']
    new_file = out / 'fixture-new-rules-v069.json'
    new_file.write_text(json.dumps(new69))

    # A returning player's browser from before v0.72: an old-rules life in
    # slot 0 beside a new-rules one, as the game's one-time localStorage
    # migration source. The app copies it into IndexedDB on first load.
    older = json.loads(gzip.decompress((project / 'tests/fixtures/saves/v0600.json.gz').read_bytes()))['states']
    kept_life = older['eighteen']
    returning = {'version': 1, 'activeSlot': 0, 'backups': {},
                 'slots': [{'id': 0, 'state': kept_life, 'updatedAt': '2026-10-20T00:00:00.000Z', 'revision': 'returning-0'},
                           {'id': 1, 'state': new69, 'updatedAt': '2026-10-21T00:00:00.000Z', 'revision': 'returning-1'},
                           {'id': 2, 'state': None, 'updatedAt': None, 'revision': 'returning-2'}]}
    seed_script = ("if (!localStorage.getItem('hearth-and-oath:seeded')) {"
                   f"localStorage.setItem('hearth-and-oath:slots:v1', {json.dumps(json.dumps(returning))});"
                   f"localStorage.setItem('hearth-and-oath:life:v1', {json.dumps(json.dumps(kept_life))});"
                   "localStorage.setItem('hearth-and-oath:seeded', '1'); }")

    main_proc, main_url = serve(project / args.main)
    archive_proc, archive_url = serve(project / args.archive)
    errors = {'main': [], 'archive': [], 'returning': [], 'mirror': []}
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

            # 2. An old-rules file in the main game meets the archive's door.
            op(main, 'import')
            import_file(main, old_file, review=False)
            door = main.locator('[data-archive-door]')
            link = main.locator('.modal [data-archive-link]')
            record('main: an old-rules file meets the archive’s door, with no slot offered', door.count() == 1 and main.locator('[data-op="confirm-import"]').count() == 0, door.first.inner_text() if door.count() else 'no door')
            record('main: the door links to the public archive', link.count() == 1 and (link.first.get_attribute('href') or '').startswith('https://'), link.first.get_attribute('href') if link.count() else 'no link')
            main.screenshot(path=str(out / 'main-door.png'), full_page=True)
            op(main, 'close-modal')

            # 3. The archive takes the old file, plays a season, exports it.
            op(archive, 'import')
            import_file(archive, old_file)
            review = archive.locator('.modal').inner_text() if archive.locator('.modal').count() else ''
            record('archive: the import review labels the life Old rules', 'Old rules' in review, review.strip().replace('\n', ' ')[:120])
            confirm_import(archive)
            moved = one_season(archive)
            record('archive: the old life plays on', archive.locator('.app-shell.has-life').count() == 1 and moved and not errors['archive'], f'errors={errors["archive"][:2]}')
            to_slots(archive)
            exported_back = export_slot(archive, 0)
            record('archive: its export is named for the archive', exported_back.name.endswith('-old-rules-archive.json'), exported_back.name)

            # 4. That export, brought back to main, meets the door again: main plays one rulebook.
            to_slots(main) if not main.locator('.title-screen').count() else None
            op(main, 'import')
            import_file(main, exported_back, review=False)
            record('main: a life played in the archive meets the door, not a slot', main.locator('[data-archive-door]').count() == 1 and main.locator('[data-op="confirm-import"]').count() == 0)
            op(main, 'close-modal')

            # 5. A new-rules life: reviewed and played in main; turned away by the archive.
            op(main, 'import')
            import_file(main, new_file)
            review = main.locator('.modal').inner_text() if main.locator('.modal').count() else ''
            record('main: a v0.69 new-rules save is labelled "New rules, begun before v0.70"', 'New rules, begun before v0.70' in review, review.strip().replace('\n', ' ')[:120])
            confirm_import(main)
            moved = one_season(main)
            record('main: the new-rules life plays', main.locator('.app-shell.has-life').count() == 1 and moved and not errors['main'], f'errors={errors["main"][:2]}')
            to_slots(main)
            exported_new = export_slot(main, [r for r, _ in slot_rules(main)].index('new'))
            record('main: the new-rules export is named for its rules', exported_new.name.endswith('-new-rules.json'), exported_new.name)
            to_slots(archive)
            op(archive, 'import')
            import_file(archive, exported_new, review=False)
            toast = archive.locator('#toast').inner_text() if archive.locator('#toast').count() else ''
            record('archive: turns the new-rules life away in a line', 'new rules' in toast.lower() and 'main game' in toast.lower() and not archive.locator('[data-op="confirm-import"]').count(), toast)

            # 6. A life begun in the archive is new rules: main takes it and keeps its date.
            op(archive, 'title-menu')
            archive.locator('.title-screen').wait_for()
            op(archive, 'title-new')
            archive.locator('.save-slots-screen').wait_for(timeout=15000)
            archive.locator('.save-slot-row:not(.occupied-slot-row) [data-op="slot-new"]:visible').first.click()
            archive.locator('#character-form').wait_for(timeout=15000)
            archive.locator('#character-form').evaluate('f => f.requestSubmit()')
            archive.wait_for_timeout(600)
            archive.locator('#character-form').evaluate('f => f.requestSubmit()')
            archive.locator('.app-shell.has-life').wait_for(timeout=180000)
            to_slots(archive)
            labels = slot_rules(archive)
            record('archive: a life begun there is labelled New rules, begun in v0.69', any(text == 'New rules, begun in v0.69' for _, text in labels), str(labels))
            new_from_archive = export_slot(archive, [r for r, _ in labels].index('new'))
            to_slots(main)
            op(main, 'import')
            import_file(main, new_from_archive)
            review = main.locator('.modal').inner_text() if main.locator('.modal').count() else ''
            record('main: takes a life begun in the archive and keeps its date', 'New rules, begun in v0.69' in review, review.strip().replace('\n', ' ')[:120])
            if main.locator('[data-op="confirm-import"]:visible').count():
                confirm_import(main)

            # 7. Storage never shared.
            s_main, s_arch = storage_names(main), storage_names(archive)
            record('main keeps its saves in hearth-and-oath', 'hearth-and-oath' in s_main['dbs'] and all(k.startswith('hearth-and-oath:') for k in s_main['keys']), json.dumps(s_main)[:200])
            record('the archive keeps its saves in hearth-and-oath-legacy and nowhere else', s_arch['dbs'] == ['hearth-and-oath-legacy'] and all(k.startswith('hearth-and-oath-legacy:') for k in s_arch['keys']), json.dumps(s_arch)[:200])

            # 8. A returning player: an old life already in a slot is kept, never opened, and sent on whole.
            back = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
            back.add_init_script(seed_script)
            returning_page = back.new_page()
            returning_page.on('pageerror', lambda e: errors['returning'].append(str(e)))
            title(returning_page, main_url)
            saved_lives = returning_page.locator('[data-op="title-load"]').inner_text()
            record('returning: the title continues the new-rules life and counts the kept one', returning_page.locator('[data-op="title-continue"][data-id="1"]').count() == 1 and returning_page.locator('[data-op="title-continue"][data-id="0"]').count() == 0 and 'kept for the archive' in saved_lives, saved_lives.replace('\n', ' ')[:120])
            op(returning_page, 'title-load')
            returning_page.locator('.save-slots-screen').wait_for(timeout=15000)
            kept_slot = returning_page.locator('.save-slot[data-id="0"]')
            record('returning: the old slot is kept, not opened', kept_slot.is_disabled() and kept_slot.get_attribute('data-refused-life') is not None and 'kept for the archive' in kept_slot.inner_text().lower(), kept_slot.inner_text().replace('\n', ' ')[:120])
            returning_page.screenshot(path=str(out / 'returning-kept-slot.png'), full_page=True)
            with returning_page.expect_download(timeout=20000) as download:
                returning_page.locator('[data-archive-note] [data-op="export-kept"][data-id="0"]').first.click()
            kept_export = out / ('returning-' + download.value.suggested_filename)
            download.value.save_as(str(kept_export))
            exported = json.loads(kept_export.read_text())
            # v0.72.1: the old life is never decoded here, so its export is exactly what was stored.
            whole = exported == kept_life
            record('returning: the kept life exports exactly as stored, named for its rules', kept_export.name.endswith('-old-rules.json') and whole, kept_export.name)
            to_slots(archive)
            op(archive, 'import')
            import_file(archive, kept_export)
            archive_review = archive.locator('.modal').inner_text() if archive.locator('.modal').count() else ''
            confirm_import(archive)
            record('archive: takes the returning player’s kept life and opens it', 'Old rules' in archive_review and archive.locator('.app-shell.has-life').count() == 1, archive_review.strip().replace('\n', ' ')[:100])
            record('returning: no page errors', not errors['returning'], str(errors['returning'][:2]))
            back.close()

            # 8b. The oldest returning player: one old life in the single-save mirror, no slots at all.
            # The first load moves browser storage into IndexedDB; the life must arrive kept in the first slot.
            mirror_only = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
            mirror_only.add_init_script("if (!localStorage.getItem('hearth-and-oath:seeded')) {"
                                        f"localStorage.setItem('hearth-and-oath:life:v1', {json.dumps(json.dumps(kept_life))});"
                                        "localStorage.setItem('hearth-and-oath:seeded', '1'); }")
            single = mirror_only.new_page()
            single.on('pageerror', lambda e: errors['mirror'].append(str(e)))
            title(single, main_url)
            card = single.locator('.title-life-kept').inner_text() if single.locator('.title-life-kept').count() else ''
            record('single save: the title shows the old life kept, with nothing to continue', kept_life['hero']['name'] in card and 'kept for the archive' in card.lower() and single.locator('[data-op="title-continue"]').count() == 0, card.replace('\n', ' ')[:120])
            op(single, 'title-load')
            single.locator('.save-slots-screen').wait_for(timeout=15000)
            first = single.locator('.save-slot[data-id="0"]')
            record('single save: it is kept in the first slot, not opened', first.is_disabled() and kept_life['hero']['name'] in first.inner_text(), first.inner_text().replace('\n', ' ')[:120])
            with single.expect_download(timeout=20000) as download:
                single.locator('.slot-row-actions [data-op="export-kept"][data-id="0"]').first.click()
            single_export = out / ('single-' + download.value.suggested_filename)
            download.value.save_as(str(single_export))
            record('single save: it exports exactly as stored', json.loads(single_export.read_text()) == kept_life, single_export.name)
            record('single save: no page errors', not errors['mirror'], str(errors['mirror'][:2]))
            mirror_only.close()

            # 9. The offline files: main shows the door to an old life and takes a new one; the archive takes the old.
            for name, path, incoming, expect_door in (('main offline file', project / args.main_offline, old_file, True),
                                                      ('main offline file', project / args.main_offline, new_file, False),
                                                      ('archive offline file', project / args.archive_offline, old_file, False)):
                kind = 'an old-rules' if incoming == old_file else 'a new-rules'
                if not path.exists():
                    record(f'{name} opens from disk', False, f'{path} is not built')
                    continue
                page = ctx.new_page()
                errs = []
                page.on('pageerror', lambda e, errs=errs: errs.append(str(e)))
                try:
                    page.goto(path.as_uri(), wait_until='commit', timeout=300000)
                    page.locator('.title-screen').wait_for(timeout=300000)
                    op(page, 'import')
                    if expect_door:
                        import_file(page, incoming, review=False)
                        record(f'{name}: {kind} file meets the door', page.locator('[data-archive-door]').count() == 1 and page.locator('[data-op="confirm-import"]').count() == 0 and not errs, f'errors={errs[:2]}')
                    else:
                        import_file(page, incoming)
                        confirm_import(page)
                        record(f'{name}: {kind} file is reviewed and loads', page.locator('.app-shell.has-life').count() == 1 and not errs, f'{path.stat().st_size // 1048576} MB; errors={errs[:2]}')
                except Exception as e:  # noqa: BLE001
                    record(f'{name}: {kind} file', False, f'{type(e).__name__}: {str(e)[:120]}')
                page.close()
            browser.close()
    finally:
        main_proc.terminate()
        archive_proc.terminate()

    (out / 'report.json').write_text(json.dumps({'results': results, 'errors': errors}, indent=2))
    failed = [r for r in results if not r['ok']]
    version = json.loads((project / 'package.json').read_text()).get('version', '?')
    head = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=project, capture_output=True, text=True).stdout.strip() or 'unknown'
    md = [f'# The archive, checked in a browser (main {version} at {head})', '', f'{len(results) - len(failed)} of {len(results)} steps passed. Headless Chromium, the main game served from `{args.main}/` and the archive from `{args.archive}/` on two ports (two origins, as published); the offline files opened from disk.', '', '| Step | Result | Seen |', '|---|---|---|']
    for r in results:
        md.append(f"| {r['step']} | {'pass' if r['ok'] else 'FAIL'} | {r['seen'].replace('|', '/')} |")
    md += ['', 'Page errors: ' + (json.dumps(errors) if any(errors.values()) else 'none.'), '']
    (out / 'report.md').write_text('\n'.join(md))
    if args.snapshot:
        Path(project / args.snapshot).parent.mkdir(parents=True, exist_ok=True)
        Path(project / args.snapshot).write_text('\n'.join(md))
    print(f'\n{len(results) - len(failed)}/{len(results)} passed')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
