"""Verify the dark phone shell using real controls and genuine earlier lives and additive revision-five migration."""
import json
import os
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
artifacts = project / 'artifacts'
artifacts.mkdir(exist_ok=True)
url = 'http://127.0.0.1:3000/'
save_key = 'hearth-and-oath:life:v1'
views = {'life', 'map', 'relationships', 'activities', 'quests', 'journal',
         'household', 'workshop', 'lore', 'character', 'party', 'inventory',
         'career', 'health', 'legacy'}
errors = []


def state(page):
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', save_key))


def menu(page):
    if not page.locator('.menu-drawer:visible').count():
        page.locator('[data-op="menu"]:visible').first.click()
    page.locator('.menu-drawer').wait_for(state='visible')
    return page.locator('.menu-drawer')


def view(page, ident):
    before = state(page)
    drawer = menu(page)
    drawer.locator(f'[data-op="tab"][data-id="{ident}"]').click()
    assert not page.locator('.menu-drawer:visible').count(), 'Navigation must dismiss the drawer'
    assert page.locator(f'.game-content.{ident}-content').is_visible(), ident
    assert state(page) == before, 'Navigation must never spend time or change the saved life'


def click(page, op, ident=None):
    selector = f'[data-op="{op}"]' + (f'[data-id="{ident}"]' if ident is not None else '')
    if op == 'activity' and not page.locator(selector).count():
        if ident and ident.startswith(('life_visit_', 'life_gift_', 'life_court_', 'life_commit_')):
            view(page, 'relationships')
            click(page, 'contact', ident.rsplit('_',1)[-1])
        else:
            destination = ('career' if ident and ident.startswith('career_') else
                           'health' if ident and ident.startswith('health_') else
                           'legacy' if ident and ident.startswith('lineage_') else 'activities')
            view(page, destination)
    found = page.locator(selector + ':visible')
    control = found.first if found.count() else page.locator(selector).first
    assert control.count(), (op, ident)
    for details in control.locator('xpath=ancestor::details[not(@open)]').all():
        if details.get_attribute('open') is None:
            details.locator('summary').first.click()
    assert control.is_enabled(), (op, ident, state(page).get('notice'))
    control.click()


def shot(page, label):
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(artifacts / f'v5-{label}.png'), full_page=True)


def no_overflow(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), label


def dock(page, blocked):
    controls = page.locator('.command-age-button:visible, .desktop-age-button:visible')
    assert controls.count() == 1, 'Exactly one age control must be visible at each breakpoint'
    assert controls.first.is_disabled() == blocked, state(page).get('event')
    if page.viewport_size['width'] < 1000:
        assert page.locator('.mobile-command-dock').is_visible()
        assert page.locator('.bottom-nav button').count() == 5
        if blocked:
            assert page.locator('.command-reason').inner_text().strip()


def status(page):
    life = state(page)
    hero = next((a for a in (life.get('battle') or {}).get('actors', []) if a['id'] == 'hero'), life['hero'])
    expected = [('Health', hero['hp'], hero['maxHp']),
                ('Joy', life['life']['happiness'], 100),
                ('Focus', hero['mp'], hero['maxMp']),
                ('Stress', life['life']['stress'], 100)]
    bars = page.locator('.status-bars [role="progressbar"]')
    assert bars.count() == 4
    for label, value, maximum in expected:
        bar = page.get_by_role('progressbar', name=label, exact=True)
        assert float(bar.get_attribute('aria-valuenow')) == value, (label, value)
        assert float(bar.get_attribute('aria-valuemax')) == maximum, (label, maximum)


def feed(page):
    if not page.locator('.game-content.life-content').count():
        view(page, 'life')
    life = state(page)
    journal = [entry for entry in life['journal'] if entry.get('generation',1) == life.get('dynasty',{}).get('generation',1)]
    entries = page.locator('.life-feed .life-entry')
    assert entries.count() == len(journal), 'The feed must show this generation’s recorded life without invented or omitted events'
    for article, record in zip(entries.all(), journal):
        assert int(article.get_attribute('data-day')) == record['day']
        assert int(article.get_attribute('data-age')) == record['age']
        text = ' '.join(article.text_content().split())
        assert record['title'] in text
        assert ' '.join(record['text'].split()) in text
    groups = page.locator('.life-feed .age-ledger')
    ages = list(dict.fromkeys(record['age'] for record in journal))
    assert groups.count() == len(ages)
    actual_open = [int(group.locator('.life-entry').first.get_attribute('data-age'))
                   for group in groups.all() if group.get_attribute('open') is not None]
    assert actual_open == ages[-2:], (actual_open, ages[-2:])
    for group in groups.all():
        if group.get_attribute('open') is None:
            group.locator('summary').click()
            assert group.locator('.life-entry').first.is_visible(), 'Earlier years must expand through the real disclosure control'
            group.locator('summary').click()
            break
    page.locator('.life-feed-list').hover()
    page.mouse.wheel(0, 10000)
    page.wait_for_function('(() => { const el=document.querySelector(".life-feed-list"); return el.scrollTop + el.clientHeight >= el.scrollHeight - 1; })()')


def newest_entry(page):
    page.wait_for_function('''(() => {
      const entries=[...document.querySelectorAll('.life-feed .life-entry')];
      const last=entries.at(-1)?.getBoundingClientRect();
      const dock=document.querySelector('.mobile-command-dock')?.getBoundingClientRect();
      return last && dock && last.top >= 0 && last.bottom <= dock.top + 1;
    })()''')
    pane = page.locator('.life-feed-list').bounding_box()
    latest = page.locator('.life-feed .life-entry').last.bounding_box()
    assert latest and pane['y'] <= latest['y'] and latest['y'] + latest['height'] <= pane['y'] + pane['height'] + 1, 'Returning from a newly recorded activity must reveal the latest entry in the life feed'


def drawer_checks(page):
    before = state(page)
    trigger = page.locator('[data-op="menu"]:visible').first
    trigger.click()
    drawer = page.locator('.menu-drawer')
    assert drawer.get_attribute('role') == 'dialog'
    assert drawer.get_attribute('aria-modal') == 'true'
    assert trigger.get_attribute('aria-expanded') == 'true'
    assert set(drawer.locator('.drawer-links [data-op="tab"]').evaluate_all('(els) => els.map(el => el.dataset.id)')) == views
    assert page.evaluate('document.body.classList.contains("menu-open") || getComputedStyle(document.body).overflow === "hidden"')
    for _ in range(24):
        page.keyboard.press('Tab')
        assert page.evaluate('document.querySelector(".menu-drawer").contains(document.activeElement)'), 'Focus must stay inside the open menu'
    page.keyboard.press('Shift+Tab')
    assert page.evaluate('document.querySelector(".menu-drawer").contains(document.activeElement)')
    page.keyboard.press('Escape')
    assert not page.locator('.menu-drawer:visible').count()
    page.wait_for_function('document.activeElement?.dataset.op === "menu" && document.activeElement.dataset.id === "header"')
    assert trigger.evaluate('(el) => el === document.activeElement'), 'Closing the drawer must restore the trigger focus'
    menu(page).get_by_role('button', name='Close menu', exact=True).click()
    assert not page.locator('.menu-drawer:visible').count()
    if page.viewport_size['width'] == 1440:
        menu(page)
        page.locator('.drawer-overlay').click(position={'x': 5, 'y': 5})
        assert not page.locator('.menu-drawer:visible').count(), 'The backdrop must dismiss the drawer'
    assert state(page) == before


def touch_controls(page, label):
    # Visible controls on the phone shell and current page must have a real touch area.
    small = page.locator('button:visible, input:visible, select:visible, summary:visible').evaluate_all('''(els) => els.flatMap(el => {
      const r=el.getBoundingClientRect();
      return r.height >= 46 && r.width >= 46 ? [] : [{op:el.dataset.op,id:el.dataset.id,text:el.textContent.trim().slice(0,60),width:r.width,height:r.height}];
    })''')
    assert not small, (label, small)


def preserve(original, migrated, path='state'):
    if path.endswith('.revision'):
        return
    if isinstance(original, dict):
        for key, value in original.items():
            assert key in migrated, path + '.' + key
            preserve(value, migrated[key], path + '.' + key)
    elif isinstance(original, list):
        assert len(migrated) == len(original), path
        for index, value in enumerate(original):
            preserve(value, migrated[index], f'{path}[{index}]')
    else:
        assert migrated == original, (path, migrated, original)


def import_life(page, directory, label, life, exact=True):
    target = directory / (label + '.json')
    target.write_text(json.dumps(life))
    page.locator('#save-file').set_input_files(str(target))
    page.get_by_text('Your saved life has been restored.').wait_for()
    imported = state(page)
    assert imported['version'] == 1 and imported['revision'] == 5
    if exact:
        preserve(life, imported, label)
    else:
        for field in ['event', 'battle', 'journal']:
            assert imported[field] == life[field], (label, field)
    return imported


def finish_road(page):
    extra = 0
    picks = {'travel_lore':'continue', 'travel_witness':'continue', 'travel_caravan':'continue',
             'travel_sick_traveler':'continue', 'travel_bandits':'avoid', 'travel_beasts':'avoid',
             'travel_weather':'press', 'travel_delay':'continue', 'health_concern':'continue'}
    for _ in range(80):
        life = state(page)
        if life['event']:
            pick = picks.get(life['event']['id'])
            assert pick, ('Road policy must explicitly handle', life['event']['id'])
            before = life['day']
            click(page, 'choice', pick)
            extra += state(page)['day'] - before
        elif life['timeline']['journey']:
            click(page, 'activity', 'grow_continue_journey')
        else:
            return extra
    raise AssertionError('The real route did not complete')


def clear_birth(page):
    for _ in range(12):
        life = state(page)
        if not life['event']:
            return
        if life['event']['id'] == 'health_concern':
            click(page, 'choice', 'continue')
            continue
        assert life['event']['id'].startswith(('birth_', 'fate_')), life['event']['id']
        ids = [c['id'] for c in life['event']['choices']]
        click(page, 'choice', 'curiosity' if 'curiosity' in ids else ids[0])
    raise AssertionError('Childhood scenes did not settle')


def school_journey(page, offline=False):
    page.locator('#character-form').wait_for()
    page.locator('[name="name"]').fill('Vesper of the Ashes')
    page.locator('[name="seed"]').fill('dark-phone-school')
    page.locator('[name="familySetup"]').select_option('homeless')
    page.locator('[name="ancestry"]').select_option('tiefling')
    page.locator('[name="hairStyle"]').select_option('locs')
    page.locator('[name="hair"]').select_option('silver')
    assert page.locator('[data-avatar-preview] svg').get_attribute('data-ancestry') == 'tiefling'
    assert page.locator('[data-avatar-preview] .avatar-tiefling-horns').count()
    no_overflow(page, 'creation390')
    touch_controls(page, 'creation390')
    if not offline:
        shot(page, 'creation-phone')
    page.locator('#character-form button[type="submit"]').click()
    assert state(page)['age'] == 0 and state(page)['revision'] == 5
    dock(page, True)
    status(page)
    clear_birth(page)
    view(page, 'household')
    before = state(page)
    click(page, 'activity', 'family_shelter')
    assert state(page)['day'] - before['day'] == 2 and state(page)['hero']['gold'] == before['hero']['gold']
    assert state(page)['family']['housing'] == 'shelter'
    view(page, 'life')
    for age in range(1, 7):
        dock(page, False)
        click(page, 'age-up')
        dock(page, True)
        for _ in range(30):
            clear_birth(page)
            life = state(page)
            if life['age'] == age and life['timeline']['yearTarget'] is None:
                break
            click(page, 'continue-age')
        assert state(page)['age'] == age
        assert state(page)['day'] == life['timeline'].get('birthDay',0) + age*365
    view(page, 'household')
    click(page, 'activity', 'school_enroll_community')
    for _ in range(6):
        click(page, 'activity', 'school_attend')
    assert state(page)['education']['attendance'] == 6
    click(page, 'activity', 'school_dilemma')
    assert state(page)['event']['id'] == 'school_dilemma'
    dock(page, True)
    click(page, 'choice', 'ask')
    dock(page, False)
    status(page)
    view(page, 'household')
    before_lesson = state(page)
    click(page, 'activity', 'school_attend')
    assert state(page)['education']['attendance'] == 7
    assert len(state(page)['journal']) > len(before_lesson['journal'])
    view(page, 'life')
    newest_entry(page)
    if not offline:
        page.screenshot(path=str(artifacts / 'v5-life-latest-entry-phone.png'))
    feed(page)
    if not offline:
        shot(page, 'life-school-phone')
    return state(page)


def responsive_views(page):
    for width, height in [(360, 800), (390, 844), (430, 932), (768, 1024), (1440, 1000)]:
        page.set_viewport_size({'width': width, 'height': height})
        drawer_checks(page)
        for ident in sorted(views):
            view(page, ident)
            no_overflow(page, (width, ident))
            dock(page, False)
            status(page)
            if width < 1000:
                touch_controls(page, (width, ident))
                page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
                last_control = page.locator('.game-footer .button').last.bounding_box()
                dock_top = page.locator('.mobile-command-dock').bounding_box()['y']
                assert last_control['y'] + last_control['height'] <= dock_top + 1, (width, ident, 'The dock must not cover the final page control')
            if width == 390 and ident in ['activities', 'household']:
                shot(page, ident + '-phone')
        view(page, 'life')
        feed(page)
        shot(page, f'life-{width}')
    print(f'All {len(views)} views passed at 360, 390, 430, 768 and 1440 pixels, with exact navigation state and drawer keyboard focus.', flush=True)


def pending_lives(page, directory):
    fixtures = json.loads((project / 'tests/fixtures/legacy-v4.json').read_text())['states']
    for ident in ['birth0', 'schoolPending', 'midbattle', 'pendingConversation', 'pendingRoad', 'pendingProject', 'retired', 'completedDungeon']:
        original = fixtures[ident]
        import_life(page, directory, ident, original)
        view(page, 'life')
        dock(page, True)
        status(page)
        before = state(page)
        page.reload(wait_until='load')
        click(page, 'resume')
        assert state(page) == before, ident + ': reloading must preserve the pending situation exactly'
        if ident in ['pendingRoad', 'pendingProject']:
            click(page, 'choice', 'curiosity')
            dock(page, True)
            assert page.locator('[data-op="activity"][data-id="' + ('grow_continue_journey' if ident == 'pendingRoad' else 'workshop_continue') + '"]:visible').count()
        if ident == 'midbattle':
            assert page.locator('[data-op="battle-action"]:visible').count()
            assert page.locator('.identity-bar svg').get_attribute('data-age') == str(original['age'])
            click(page, 'battle-action', 'attack')
            assert state(page)['battle'] != original['battle']
            status(page)
            shot(page, 'pending-combat-phone')
        if ident == 'completedDungeon':
            assert state(page)['dungeon']['complete']
            click(page, 'choice', 'leave')
            assert state(page)['dungeon'] is None
            dock(page, False)
    legacy = json.loads((project / 'tests/fixtures/legacy-v3.json').read_text())['states']['campaign']
    import_life(page, directory, 'legacy-campaign', legacy, exact=False)
    dock(page, True)
    assert page.locator('.story-scene h2').inner_text() == legacy['event']['title']
    assert set(page.locator('[data-op="choice"]').evaluate_all('(els) => els.map(el => el.dataset.id)')) == {c['id'] for c in legacy['event']['choices']}
    legacy_plan = json.loads((project / 'tests/fixtures/legacy-v2.json').read_text())['states']['annualPlan']
    import_life(page, directory, 'legacy-year', legacy_plan, exact=False)
    dock(page, True)
    click(page, 'choice', 'later')
    dock(page, True)
    assert page.locator('[data-op="continue-year"]:visible').count(), 'The legacy annual-plan continuation must remain reachable'
    import_life(page, directory, 'customization', fixtures['schoolPending'])
    view(page, 'character')
    before = state(page)
    portrait = page.locator('.portrait-stage svg').evaluate('(el) => el.outerHTML')
    click(page, 'customize')
    page.locator('#appearance-form [name="hairStyle"]').select_option('braided')
    page.locator('#appearance-form [name="outfit"]').select_option('ritual')
    page.locator('#appearance-form button[type="submit"]').click()
    after = state(page)
    assert after['hero']['appearance']['hairStyle'] == 'braided'
    assert after['hero']['appearance']['outfit'] == 'ritual'
    assert after['hero']['appearance']['ancestry'] == 'tiefling'
    view(page, 'character')
    assert page.locator('.portrait-stage svg').evaluate('(el) => el.outerHTML') != portrait
    assert page.locator('.portrait-stage svg').get_attribute('data-age') == str(before['age'])
    for value in [before, after]:
        value.pop('notice', None)
        value['hero'].pop('appearance')
    assert after == before, 'Appearance edits must preserve skills, money, time, relationships and the exact pending school scene'
    shot(page, 'etched-character-phone')
    import_life(page, directory, 'travel', fixtures['adult18'])
    view(page, 'map')
    assert page.locator('.map-node').count() == len(state(page)['world']['locations'])
    click(page, 'map-select', 'city')
    expected_days = int(page.locator('.route-preview .travel-metrics > div').first.locator('strong').inner_text().split()[0])
    before = state(page)
    shot(page, 'engraved-map-phone')
    click(page, 'travel', 'city')
    extra_days = finish_road(page)
    after = state(page)
    assert after['locationId'] == 'city' and after['day'] - before['day'] == expected_days + extra_days
    assert after['world'] == before['world'], 'Selecting and following a road cannot reroll the region'
    dock(page, False)
    print('Additive revision-five imports/reloads and pending school, conversation, road, project, battle, legacy quest and annual controls passed.', flush=True)


def main():
    if not os.environ.get('HEARTH_SKIP_BUILD'):
        subprocess.run(['npm', 'run', 'build'], cwd=project, check=True)
    with tempfile.TemporaryDirectory(prefix='hearth-dark-ui-') as temporary, sync_playwright() as playwright:
        directory = Path(temporary)
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        page = context.new_page()
        page.set_default_timeout(7000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='networkidle')
        regular = school_journey(page)
        responsive_views(page)
        page.set_viewport_size({'width': 390, 'height': 844})
        pending_lives(page, directory)
        offline_context = browser.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        offline = offline_context.new_page()
        offline.set_default_timeout(7000)
        offline.on('pageerror', lambda error: errors.append(str(error)))
        blocked = []
        offline_url = url + 'hearth-and-oath.html'
        def isolated(route):
            if route.request.url == offline_url:
                route.continue_()
            else:
                blocked.append(route.request.url)
                route.abort()
        offline.route('**/*', isolated)
        offline.goto(offline_url, wait_until='load')
        bundled = school_journey(offline, offline=True)
        assert bundled == regular, 'Offline birth, family, schooling, choices and feed must reproduce the exact hosted life'
        assert not blocked, 'The standalone game must not even request external files: ' + repr(blocked)
        assert not errors, errors
        shot(offline, 'offline-school-phone')
        browser.close()
    print('Dark UI passed: genuine newborn schooling, chronological feed, truthful status/dock, all responsive views, exact pending saves, isolated offline equality; no JavaScript errors.')


if __name__ == '__main__':
    main()
