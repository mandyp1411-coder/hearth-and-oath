"""Play the homestead expansion through UI controls; inspect saves without granting state."""
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
key = 'hearth-and-oath:life:v1'
errors = []


def state(page):
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', key))


def click(page, op, ident=None):
    selector = f'[data-op="{op}"]' + (f'[data-id="{ident}"]' if ident is not None else '')
    if op == 'tab' and not page.locator(selector + ':visible').count():
        page.locator('[data-op="menu"]:visible').first.click()
    if op == 'activity' and not page.locator(selector).count():
        view(page, 'activities')
    visible = page.locator(selector + ':visible')
    control = visible.first if visible.count() else page.locator(selector).first
    assert control.count(), (op, ident, state(page).get('notice'))
    # Open real disclosure controls, rather than modifying the DOM or game state.
    for disclosure in control.locator('xpath=ancestor::details[not(@open)]').all():
        if disclosure.get_attribute('open') is None:
            disclosure.locator('summary').first.click()
    assert control.is_enabled(), (op, ident, state(page).get('notice'))
    control.click()


def view(page, ident):
    click(page, 'tab', ident)
    assert page.locator('#main-content').inner_text().strip()


def settle_ambient(page):
    for _ in range(12):
        life = state(page)
        event = life['event']
        if not event or event['id'] not in ['health_concern', 'career_year']:
            return
        click(page, 'choice', 'continue' if event['id'] == 'health_concern' else 'care')
    raise AssertionError('Ambient decisions did not settle')


def activity(page, ident, tab='household', days=None, cost=None):
    settle_ambient(page)
    view(page, tab)
    before = state(page)
    click(page, 'activity', ident)
    after = state(page)
    if days is not None:
        assert after['day'] - before['day'] == days, (ident, before['day'], after['day'])
    if cost is not None:
        assert before['hero']['gold'] - after['hero']['gold'] == cost, (ident, cost)
    settle_ambient(page)
    return state(page)


def clear_birth_scene(page):
    for _ in range(10):
        value = state(page)
        if not value['event']:
            return
        if value['event']['id'] == 'health_concern':
            click(page, 'choice', 'continue')
            continue
        assert value['event']['id'].startswith(('birth_', 'fate_')), value['event']['id']
        picks = value['event']['choices']
        pick = next((item['id'] for item in picks if item['id'] == 'curiosity'), picks[0]['id'])
        click(page, 'choice', pick)
    raise AssertionError('Birth scenes did not settle')


def grow(page, target):
    for _ in range(80):
        value = state(page)
        if value['event']:
            clear_birth_scene(page)
        elif value['age'] == target and value['timeline']['yearTarget'] is None:
            return
        else:
            assert value['age'] <= target
            click(page, 'continue-age' if value['timeline']['yearTarget'] else 'age-up')
    raise AssertionError(('Birthday did not arrive', target, state(page)['age']))


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


def travel(page, ident):
    before = state(page)
    if before['locationId'] == ident:
        return
    view(page, 'map')
    click(page, 'map-select', ident)
    click(page, 'travel', ident)
    finish_road(page)
    settle_ambient(page)
    after = state(page)
    assert after['locationId'] == ident and after['day'] > before['day']
    assert not after['event'] and not after['timeline']['journey']


def export_reload_import(page, directory, label):
    before = state(page)
    path = directory / f'{label}.json'
    with page.expect_download() as download:
        click(page, 'export')
    download.value.save_as(str(path))
    assert json.loads(path.read_text()) == before
    page.reload(wait_until='load')
    click(page, 'resume')
    assert state(page) == before, 'Reload must preserve the complete life and pending decision'
    page.locator('#save-file').set_input_files(str(path))
    page.get_by_text('Your saved life has been restored.').wait_for()
    assert state(page) == before, 'Import must preserve the exported life exactly'


def screenshot(page, filename):
    page.evaluate('window.scrollTo(0, 0)')
    page.screenshot(path=str(artifacts / filename), full_page=True)


def journey(page, directory, standalone=False):
    page.locator('#character-form').wait_for()
    page.locator('[name="name"]').fill('Lark Homestead')
    page.locator('[name="seed"]').fill('a-school-with-room')
    page.locator('[name="familySetup"]').select_option('homeless')
    page.locator('[name="household"]').select_option('noble')
    page.locator('[name="ancestry"]').select_option('tiefling')
    page.locator('[name="hairStyle"]').select_option('topknot')
    page.locator('[name="hair"]').select_option('rose')
    page.locator('[name="skin"]').select_option('lavender')
    page.locator('summary').filter(has_text='Expression, preferences').click()
    page.locator('[name="pursuit"]').select_option('knowledge')
    page.locator('[name="socialStyle"]').select_option('quiet')
    page.locator('[name="value"]').select_option('ambition')
    page.locator('[name="food"]').select_option('sweet')
    assert page.locator('[data-avatar-preview] svg').get_attribute('data-ancestry') == 'tiefling'
    assert page.locator('[data-avatar-preview] .avatar-tiefling-horns').count() == 1
    if not standalone:
        screenshot(page, 'v4-creation-desktop.png')
    page.locator('#character-form button[type="submit"]').click()
    value = state(page)
    assert value['revision'] == 5 and value['age'] == 0
    assert value['hero']['household'] == 'poor' and value['hero']['gold'] == 0
    assert value['hero']['preferences']['food'] == 'sweet'
    assert value['family']['housing'] == 'unsheltered'
    assert next(p for p in value['life']['people'] if p['id'] == 'kin')['familyRole'] == 'guardian'
    assert all(m['personId'] is None for m in value['family']['members'] if m['availability'] != 'present')
    assert page.locator('[data-op="age-up"]:visible').is_disabled()
    clear_birth_scene(page)
    activity(page, 'family_shelter', days=2, cost=0)
    assert state(page)['family']['housing'] == 'shelter'
    view(page, 'household')
    assert 'guardian' in page.locator('.family-grid').inner_text().lower()
    assert page.locator('.family-member.absent [data-op="show-contact"]').count() == 0
    click(page, 'show-contact', 'kin')
    click(page, 'activity', 'talk_kin')
    assert state(page)['conversations']['pending']['personId'] == 'kin'
    click(page, 'reply')
    assert state(page)['conversations']['pending'] is None

    grow(page, 6)
    view(page, 'household')
    assert page.locator('[data-id="school_enroll_academy"]').is_disabled()
    activity(page, 'school_enroll_community', days=1, cost=0)
    scholar = state(page)['hero']['skills']['scholarship']
    for _ in range(6):
        activity(page, 'school_attend', days=4, cost=0)
    assert state(page)['education']['attendance'] == 6
    assert state(page)['hero']['skills']['scholarship'] == scholar + 6
    activity(page, 'school_dilemma', days=1, cost=0)
    click(page, 'choice', 'ask')
    assert any('helped me study' in memory for memory in next(p for p in state(page)['life']['people'] if p['id'] == 'fellow')['memories'])
    grow(page, 10)
    activity(page, 'school_exam', days=2, cost=0)
    assert state(page)['event']['id'] == 'school_exam'
    if not standalone:
        export_reload_import(page, directory, 'pending-school-exam')
    click(page, 'choice', 'present')
    assert state(page)['flags']['literacyCertificate']
    grow(page, 12)
    activity(page, 'school_scholarship', days=2, cost=0)
    click(page, 'choice', 'service')
    assert state(page)['education']['scholarship']
    activity(page, 'school_service', days=3, cost=0)
    assert next(o for o in state(page)['obligations'] if o['id'] == 'school_service')['resolved']
    activity(page, 'school_enroll_academy', days=1, cost=0)
    for _ in range(6):
        activity(page, 'school_attend', days=4, cost=0)
    grow(page, 14)
    travel(page, 'city')
    activity(page, 'school_exam', days=2, cost=0)
    click(page, 'choice', 'present')
    assert state(page)['flags']['certified']
    assert [q['route'] for q in state(page)['education']['qualifications']] == ['community', 'academy']
    if not standalone:
        view(page, 'household')
        screenshot(page, 'v4-school-desktop.png')
    grow(page, 18)
    assert state(page)['hero']['path'] == 'unformed'
    print(('Offline' if standalone else 'Hosted') + ' schooling passed: guardian, free lessons, named memories, both exams, service scholarship, adulthood.', flush=True)
    travel(page, 'home')
    activity(page, 'lore_read_founding', tab='lore', days=1, cost=0)
    assert state(page)['event']['id'] == 'lore_founding'
    click(page, 'choice', 'record')
    assert state(page)['lore']['records'][0]['locationId'] == 'home'
    assert state(page)['lore']['records'][0]['witness']
    view(page, 'character')
    before = state(page)
    click(page, 'preferences')
    page.locator('#preferences-form [name="pursuit"]').select_option('craft')
    page.locator('#preferences-form [name="food"]').select_option('spiced')
    page.locator('#preferences-form button[type="submit"]').click()
    assert state(page)['hero']['preferences']['pursuit'] == 'craft'
    for field in ['attributes', 'skills', 'gold', 'exp']:
        assert state(page)['hero'][field] == before['hero'][field]
    assert state(page)['day'] == before['day']
    assert state(page)['preferenceHistory'] == before['preferenceHistory']
    click(page, 'customize')
    page.locator('#appearance-form [name="hairStyle"]').select_option('locs')
    page.locator('#appearance-form [name="outfit"]').select_option('ritual')
    page.locator('#appearance-form button[type="submit"]').click()
    assert state(page)['hero']['appearance']['hairStyle'] == 'locs'
    assert state(page)['hero']['appearance']['ancestry'] == 'tiefling'

    for _ in range(4):
        before = state(page)
        activity(page, 'work', tab='life', days=3)
        assert state(page)['hero']['gold'] > before['hero']['gold']
    for material, days in [('wood', 2), ('wood', 2), ('stone', 2), ('cloth', 1)]:
        activity(page, f'workshop_gather_{material}', tab='workshop', days=days, cost=0)
    activity(page, 'workshop_build_shelter', tab='workshop', days=3, cost=6)
    assert state(page)['workshop']['structures'][0]['type'] == 'shelter'
    crafting = state(page)['workshop']['crafting']
    activity(page, 'workshop_practice', tab='workshop', days=3, cost=4)
    assert state(page)['workshop']['crafting'] == crafting + 1
    activity(page, 'workshop_rest', tab='workshop', days=1, cost=0)
    travel(page, 'forest')
    for material, days, cost in [('wood', 2, 0), ('wood', 2, 0), ('ore', 2, 0), ('hide', 3, 2)]:
        activity(page, f'workshop_gather_{material}', tab='workshop', days=days, cost=cost)
    travel(page, 'home')
    crafting = state(page)['workshop']['crafting']
    activity(page, 'workshop_craft_woodland_spear', tab='workshop', days=3, cost=10)
    assert state(page)['workshop']['crafting'] == crafting + 1
    view(page, 'inventory')
    before = state(page)
    click(page, 'equip', 'woodland_spear')
    assert state(page)['equipment']['equipped']['weapon'] == 'woodland_spear'
    assert state(page)['hero']['attributes'] == before['hero']['attributes']
    travel(page, 'ruin')
    for material, days in [('ore', 2), ('ore', 2), ('crystal', 3)]:
        activity(page, f'workshop_gather_{material}', tab='workshop', days=days, cost=0)
    travel(page, 'home')
    activity(page, 'workshop_gather_wood', tab='workshop', days=2, cost=0)
    for _ in range(3):
        activity(page, 'workshop_gather_stone', tab='workshop', days=2, cost=0)
    activity(page, 'workshop_build_forge', tab='workshop', days=5, cost=24)
    assert {b['type'] for b in state(page)['workshop']['structures']} == {'shelter', 'forge'}
    assert page.locator('[data-id="workshop_upgrade_forge"]').count() == 1
    travel(page, 'mountain')
    for _ in range(2):
        activity(page, 'workshop_gather_ore', tab='workshop', days=2, cost=0)
    travel(page, 'home')
    activity(page, 'workshop_craft_steel_sword', tab='workshop', days=4, cost=18)
    view(page, 'inventory')
    click(page, 'equip', 'steel_sword')
    assert state(page)['equipment']['equipped']['weapon'] == 'steel_sword'
    assert state(page)['hero']['gold'] >= 0
    assert state(page)['workshop']['project'] is None
    print(('Offline' if standalone else 'Hosted') + ' workshop passed: real supplies, shelter, tool practice, recovery, forge, two crafted/equipped weapons.', flush=True)
    export_reload_import(page, directory, 'standalone-adult' if standalone else 'homestead-adult')

    widths = [(1440, 1000), (390, 844)] if not standalone else [(390, 844)]
    for width, height in widths:
        page.set_viewport_size({'width': width, 'height': height})
        for tab in ['household', 'workshop', 'lore']:
            view(page, tab)
            if width < 700:
                assert page.locator('.mobile-command-dock').is_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, tab)
            screenshot(page, f'v4-{"offline-" if standalone else ""}{tab}-{width}.png')
    return state(page)


if not os.environ.get('HEARTH_SKIP_BUILD'):
    subprocess.run(['npm', 'run', 'build'], cwd=project, check=True)
with tempfile.TemporaryDirectory(prefix='hearth-homestead-browser-') as temporary, sync_playwright() as playwright:
    directory = Path(temporary)
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(7000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='networkidle')
    regular = journey(page, directory)
    print('Hosted journey passed: genuine birth/school/home/workshop/lore, exact saves, desktop/mobile.', flush=True)
    if not os.environ.get('HEARTH_SKIP_BUILD'):
        subprocess.run(['npm', 'run', 'build'], cwd=project, check=True)
    offline_context = browser.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
    offline = offline_context.new_page()
    offline.set_default_timeout(7000)
    offline.on('pageerror', lambda error: errors.append(str(error)))
    offline_url = url + 'hearth-and-oath.html'
    offline.route('**/*', lambda route: route.continue_() if route.request.url == offline_url else route.abort())
    offline.goto(offline_url, wait_until='load')
    bundled = journey(offline, directory, standalone=True)
    assert bundled == regular, 'The isolated inline bundle must reproduce the same real life exactly'
    assert not errors, errors
    browser.close()
print('Homestead browser checks passed, including the complete offline journey with all other network requests blocked; no JavaScript errors.')
