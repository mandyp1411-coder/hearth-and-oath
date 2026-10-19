"""Inspect consequences from complete, lawfully played v0.3 campaign journeys."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
artifacts = project/'artifacts'
artifacts.mkdir(exist_ok=True)
errors = []
key = 'hearth-and-oath:life:v1'

def state(page):
    return json.loads(page.evaluate('(key) => localStorage.getItem(key)', key))

def click(page, op, id):
    selector = f'[data-op="{op}"][data-id="{id}"]'
    if op == 'tab' and not page.locator(selector + ':visible').count():
        page.locator('[data-op="menu"]:visible').first.click()
    page.locator(selector + ':visible').first.click()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    page.set_default_timeout(7000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:3000/', wait_until='networkidle')
    for ending, title in [('renew','The Willing Compact'),('shatter','The Broken Anchor')]:
        fixture_path = project/f'tests/fixtures/campaign-{ending}.json'
        original = json.loads(fixture_path.read_text())
        page.locator('#save-file').set_input_files(str(fixture_path))
        page.get_by_text('Your saved life has been restored.').wait_for()
        assert state(page)['campaign']['ending']['id'] == ending
        assert state(page)['campaign']['completed'] == original['campaign']['completed']
        click(page, 'tab', 'quests')
        assert title in page.locator('#main-content').inner_text()
        assert len(state(page)['campaign']['completed']) == 20
        assert page.locator('.quest-history').count() or 'Ash beneath clean water' in page.locator('#main-content').inner_text()
        page.screenshot(path=str(artifacts/f'v3-ending-{ending}.png'), full_page=True)
        click(page, 'tab', 'map')
        assert page.locator('.map-node').count() == 13
        assert page.locator('.map-node.destroyed').count() == (3 if ending=='shatter' else 0)
        click(page, 'map-select', 'home')
        assert ('Destroyed' if ending=='shatter' else 'Thriving') in page.locator('.map-inspector').inner_text()
        page.screenshot(path=str(artifacts/f'v3-world-{ending}.png'), full_page=True)
        click(page, 'tab', 'relationships')
        click(page, 'contact', 'kin')
        click(page, 'activity', 'talk_kin')
        assert page.locator('[data-op="reply"]').count() >= 2
        if ending=='shatter':
            assert state(page)['conversations']['pending']['nodeId'] == 'damage'
            assert original['world']['locations'][0]['name'] in page.locator('.conversation-thread').inner_text()
        page.locator('[data-op="reply"]:visible').first.click()
        assert not state(page)['conversations']['pending']
        for width,height in [(768,1024),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            for tab in ['quests','map','relationships','journal']:
                click(page, 'tab', tab)
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), (ending,width,tab)
            click(page, 'tab', 'map')
            page.screenshot(path=str(artifacts/f'v3-world-{ending}-{width}.png'), full_page=True)
        page.set_viewport_size({'width':1440,'height':1000})
    assert not errors, errors
    browser.close()
print('Campaign consequence UI passed: preserved and destroyed towns, map markers, displaced family conversation, quest histories, responsive views; no JS errors.')
