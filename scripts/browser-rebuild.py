"""Check core life controls, persistence, movement, and responsive layouts."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
artifacts = project / 'artifacts'
artifacts.mkdir(exist_ok=True)
errors = []
key = 'hearth-and-oath:life:v1'
url = 'http://127.0.0.1:3000/'

def state(page):
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', key))

def click(page, op, id=None):
    selector = f'[data-op="{op}"]' + (f'[data-id="{id}"]' if id is not None else '')
    if op == 'tab' and not page.locator(selector + ':visible').count():
        page.locator('[data-op="menu"]:visible').first.click()
    if op == 'activity' and not page.locator(selector).count():
        view(page, 'activities')
    control = page.locator(selector+':visible').first if page.locator(selector+':visible').count() else page.locator(selector).first
    for disclosure in control.locator('xpath=ancestor::details[not(@open)]').all():
        if disclosure.get_attribute('open') is None:
            disclosure.locator('summary').first.click()
    assert control.is_enabled(), (op, id, state(page).get('notice'))
    control.click()

def view(page, id):
    click(page, 'tab', id)
    assert page.locator('#main-content').inner_text().strip()

def clear_scene(page):
    for _ in range(50):
        value = state(page)
        if not value['event']:
            if value['timeline']['journey']:
                click(page, 'activity', 'grow_continue_journey')
                continue
            return
        policies = {'health_concern':'continue', 'career_year':'care', 'lineage_bereavement':'private',
                    'travel_lore':'continue', 'travel_witness':'continue', 'travel_caravan':'continue',
                    'travel_sick_traveler':'continue', 'travel_bandits':'avoid', 'travel_beasts':'avoid',
                    'travel_weather':'press', 'travel_delay':'continue'}
        ident = policies.get(value['event']['id'])
        if ident is None:
            ident = next((c['id'] for c in value['event']['choices'] if c['id'] in ['curiosity','question','accept','care']), value['event']['choices'][0]['id'])
        click(page, 'choice', ident)
    raise AssertionError('Scenes failed to settle')

def birthday(page):
    before = state(page)['age']
    for _ in range(35):
        value = state(page)
        if value['event']:
            clear_scene(page)
        elif value['age'] > before and value['timeline']['yearTarget'] is None:
            return
        else:
            click(page, 'continue-age' if value['timeline']['yearTarget'] else 'age-up')
    raise AssertionError('Birthday never arrived')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(7000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='networkidle')
    page.locator('#character-form').wait_for()
    assert page.locator('.path-card').count() == 0
    page.locator('[name="name"]').fill('Aster Browser')
    page.locator('[name="seed"]').fill('browser-covenant-v3')
    page.locator('[name="familySetup"]').select_option('two_parents')
    page.locator('[name="household"]').select_option('tradesfolk')
    page.locator('[name="ancestry"]').select_option('elf')
    page.locator('[name="hairStyle"]').select_option('braided')
    page.screenshot(path=str(artifacts/'v3-creation-desktop.png'), full_page=True)
    page.locator('button[type="submit"]').click()
    assert state(page)['age'] == 0 and state(page)['hero']['path'] == 'unformed'
    assert state(page)['event']['id'] == 'birth_arrival'
    assert page.locator('[data-op="age-up"]:visible').is_disabled()
    clear_scene(page)
    view(page, 'activities')
    assert page.locator('[data-id="grow_weapons"]').count() == 0
    click(page, 'activity', 'grow_family')
    view(page, 'relationships')
    click(page, 'activity', 'talk_kin')
    assert state(page)['conversations']['pending']
    assert page.locator('[data-op="age-up"]:visible').is_disabled()
    click(page, 'reply')
    assert not state(page)['conversations']['pending']
    for age in range(1, 19):
        birthday(page)
        assert state(page)['age'] == age
        if age in [6,10]:
            click(page, 'activity', 'grow_read' if age == 6 else 'grow_arcana')
    value = state(page)
    assert value['hero']['path'] == 'unformed'
    assert len(value['timeline']['yearHistory']) == 19
    assert value['campaign']['ageClues'] == [4,10,15]
    page.screenshot(path=str(artifacts/'v3-life-desktop.png'), full_page=True)
    view(page, 'map')
    assert page.locator('.map-node').count() == len(state(page)['world']['locations'])
    click(page, 'map-select', 'city')
    before = state(page)['day']
    click(page, 'travel', 'city')
    clear_scene(page)
    assert state(page)['locationId'] == 'city' and state(page)['day'] > before
    assert page.locator('[data-map-piece]').count() >= 1
    view(page, 'map')
    click(page, 'map-select', 'brook')
    click(page, 'travel', 'brook')
    clear_scene(page)
    view(page, 'character')
    assert page.locator('.calling-card').count() == 12
    click(page, 'activity', 'calling_meet_healer')
    for _ in range(15):
        value = state(page)
        seek = page.locator('[data-op="activity"][data-id="calling_seek_healer"]')
        if seek.is_enabled():
            break
        click(page, 'activity', 'calling_train_healer')
        clear_scene(page)
        view(page, 'character')
    click(page, 'activity', 'calling_seek_healer')
    click(page, 'choice', 'accept')
    assert state(page)['hero']['specialization'] == 'healer'
    view(page, 'relationships')
    page.screenshot(path=str(artifacts/'v3-people-desktop.png'), full_page=True)
    view(page, 'quests')
    assert 'Ash beneath clean water' in page.locator('#main-content').inner_text()
    page.screenshot(path=str(artifacts/'v3-quests-desktop.png'), full_page=True)
    with page.expect_download() as download:
        click(page, 'export')
    exported_path = artifacts/'v3-browser-life.json'
    download.value.save_as(str(exported_path))
    before = state(page)
    page.reload(wait_until='networkidle')
    click(page, 'resume')
    assert state(page) == before
    page.locator('#save-file').set_input_files(str(exported_path))
    page.get_by_text('Your saved life has been restored.').wait_for()
    assert state(page) == before
    for width, height in [(1440,1000),(768,1024),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for tab in ['life','map','relationships','quests','journal','character','party','inventory']:
            view(page, tab)
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), (width,tab)
        view(page, 'life')
        page.screenshot(path=str(artifacts/f'v3-life-{width}.png'), full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    view(page, 'map')
    click(page, 'map-select', 'marsh')
    click(page, 'travel', 'marsh')
    clear_scene(page)
    view(page, 'quests')
    click(page, 'activity', 'quest_begin_well')
    assert state(page)['dungeon']['id'] == 'cistern'
    assert page.locator('.dungeon-room-grid').count() == 1
    click(page, 'choice', 'route_sluice')
    click(page, 'choice', 'fight')
    assert state(page)['battle']['context']['kind'] == 'dungeon'
    page.screenshot(path=str(artifacts/'v3-dungeon-combat.png'), full_page=True)
    before_battle = state(page)['battle']
    click(page, 'battle-action', 'attack')
    assert state(page)['battle'] != before_battle
    fixture = json.loads((project/'tests/fixtures/legacy-v2.json').read_text())
    legacy = fixture['states']['midbattle']
    imported_path = artifacts/'legacy-v2-battle.json'
    imported_path.write_text(json.dumps(legacy))
    page.locator('#save-file').set_input_files(str(imported_path))
    page.get_by_text('Your saved life has been restored.').wait_for()
    assert state(page)['revision'] == 5 and state(page)['battle'] == legacy['battle']
    assert page.locator('[data-op="battle-action"]').count() > 0
    offline = context.new_page()
    offline.on('pageerror', lambda error: errors.append(str(error)))
    offline.route('**/*', lambda route: route.continue_() if route.request.url == url+'hearth-and-oath.html' else route.abort())
    offline.goto(url+'hearth-and-oath.html', wait_until='load')
    offline.locator('#character-form').wait_for()
    offline.locator('button[type="submit"]').click()
    assert state(offline)['age'] == 0
    assert offline.locator('[data-op="choice"]').count() == 3
    assert not errors, errors
    browser.close()
print('Browser checks passed: birth to 18, age gates, conversation, earned class, seeded map/travel, saves, legacy battle, eight responsive views, offline HTML; no JS errors.')
