"""Play two legal generations, civilian mastery, health and roads through browser controls."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('dark_ui', project / 'scripts/browser-dark-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
state, view, click = ui.state, ui.view, ui.click
errors = []

# Observation only: constructors, oscillator starts, and native behavior still run.
audio_observer = r'''(() => {
  const audit = window.__audioAudit = {contexts:0,starts:0};
  for (const key of ['AudioContext', 'webkitAudioContext']) {
    const Native = window[key]; if (!Native) continue;
    window[key] = new Proxy(Native, {construct(target,args) {
      const context = Reflect.construct(target,args); audit.contexts++;
      const create = context.createOscillator.bind(context);
      context.createOscillator = (...args) => {
        const oscillator = create(...args), start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => {audit.starts++; return start(...args);};
        return oscillator;
      };
      return context;
    }});
  }
})()'''


def snapshot(page, label):
    target = ui.artifacts / f'v6-{label}.json'
    target.write_text(json.dumps(state(page), indent=2))
    return state(page)


def screenshot(page, label):
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(ui.artifacts / f'v6-{label}.png'), full_page=True)


def settle(page):
    policy = {'career_year':'care', 'health_concern':'support',
              'lineage_bereavement':'share', 'plague_letter':'later',
              'deadline_review':'pause', 'life_birthday':'people',
              'society_customer':'decline', 'society_neighbor':'welcome',
              'society_staff':'later', 'society_launch':'cooperative'}
    for _ in range(80):
        life = state(page)
        if not life['event']:
            return
        ident = life['event']['id']
        picks = [c['id'] for c in life['event']['choices']]
        pick = ('care' if 'care' in picks else 'curiosity') if ident.startswith(('birth_', 'fate_')) else policy.get(ident)
        assert pick in picks, ('No explicit legal policy', ident, picks)
        click(page, 'choice', pick)
    raise AssertionError('Decisions did not settle')


def activity(page, ident, tab='career', settle_after=False):
    view(page, tab)
    before = state(page)
    click(page, 'activity', ident)
    after = state(page)
    assert after != before, (ident, after.get('notice'))
    assert after['hero']['gold'] >= 0, 'Activities cannot spend imaginary money'
    if settle_after:
        settle(page)
    return state(page)


def grow(page, age):
    for _ in range(180):
        life = state(page)
        if life['event']:
            settle(page)
        elif life['age'] == age and life['timeline']['yearTarget'] is None:
            assert life['day'] == life['timeline'].get('birthDay',0) + age * 365
            return
        else:
            op = 'continue-age' if life['timeline']['yearTarget'] is not None else 'age-up'
            click(page, op)
    raise AssertionError(('Birthday did not complete', state(page)['age'], age))


def finish_batch(page):
    for _ in range(80):
        life = state(page)
        if life['event'] and life['event']['id'] != 'career_legacy':
            settle(page)
        elif life['careers']['batch']:
            activity(page, 'career_batch_continue')
        else:
            return
    raise AssertionError('Committed work did not complete')


def commission(page):
    for _ in range(4):
        view(page, 'career')
        options = page.locator('[data-op="activity"][data-id^="career_accept_"]:enabled')
        if options.count():
            options.first.click()
            break
        activity(page, 'career_batch_month')
        finish_batch(page)
    life = state(page)
    order = life['careers']['active']
    assert order, 'Named customers must offer real work'
    required = dict(order['materials'])
    finishing_material = next(iter(required), 'cloth')
    required[finishing_material] = required.get(finishing_material, 0) + 1
    for material, amount in required.items():
        while state(page)['equipment']['materials'][material] < amount:
            activity(page, 'career_buy_' + material, settle_after=True)
    activity(page, 'career_make_fine')
    assert state(page)['careers']['active']['status'] == 'ready'
    activity(page, 'career_invoice')
    click(page, 'choice', 'honest')
    settle(page)
    assert state(page)['careers']['active'] is None


def export_reload(page, directory, label):
    before = state(page)
    with page.expect_download() as download:
        click(page, 'export')
    path = directory / (label + '.json')
    download.value.save_as(str(path))
    assert json.loads(path.read_text()) == before, 'Export must capture the entire actual life'
    page.reload(wait_until='load')
    if page.locator('[data-op="resume"]:visible').count():
        click(page, 'resume')
    assert state(page) == before, 'Reload cannot reroll work, kin, roads or time'
    page.locator('#save-file').set_input_files(str(path))
    page.get_by_text('Your saved life has been restored.').wait_for()
    assert state(page) == before, 'Import resumes the same current revision-five state'


def sound(page):
    assert page.evaluate('window.__audioAudit.contexts') == 0, 'Sound is silent and creates no context before a gesture'
    before = state(page)
    ui.menu(page)
    button = page.locator('[data-op="sound-toggle"]:visible').first
    assert button.count() and button.get_attribute('aria-pressed') == 'false'
    button.click()
    page.wait_for_function('window.__audioAudit.contexts > 0 && window.__audioAudit.starts > 0')
    volume = page.locator('#ui-sound-volume')
    volume.focus()
    page.keyboard.press('Home')
    for _ in range(4):
        page.keyboard.press('ArrowRight')
    preferences = page.evaluate('JSON.parse(localStorage.getItem("hearth-and-oath:audio:v1"))')
    assert preferences == {'enabled':True, 'volume':0.2}
    assert state(page) == before, 'Audio settings live separately from the character'
    page.keyboard.press('Escape')
    page.reload(wait_until='load')
    assert page.evaluate('window.__audioAudit.contexts') == 0, 'Restoring enabled sound cannot autoplay before another gesture'
    if page.locator('[data-op="resume"]:visible').count():
        click(page, 'resume')
    assert state(page) == before
    ui.menu(page)
    toggle = page.locator('[data-op="sound-toggle"]:visible').first
    assert toggle.get_attribute('aria-pressed') == 'true'
    toggle.click()
    assert page.evaluate('JSON.parse(localStorage.getItem("hearth-and-oath:audio:v1")).enabled') is False
    page.keyboard.press('Escape')


def journey(page, directory, label):
    page.locator('#character-form').wait_for()
    page.locator('[name="name"]').fill('Vesper Hearthkeeper')
    page.locator('[name="seed"]').fill('two-lives-at-the-forge')
    page.locator('[name="birthplace"]').select_option('village')
    page.locator('[name="household"]').select_option('poor')
    page.locator('[name="familySetup"]').select_option('homeless')
    page.locator('[name="ancestry"]').select_option('dwarf')
    page.locator('#character-form button[type="submit"]').click()
    life = state(page)
    assert life['revision'] == 5 and life['age'] == 0 and life['hero']['path'] == 'unformed'
    assert 15 <= len(life['world']['locations']) <= 19
    settle(page)
    activity(page, 'family_shelter', 'household')
    grow(page,6)
    activity(page, 'school_enroll_community', 'household')
    for _ in range(6):
        activity(page, 'school_attend', 'household')
    grow(page,10)
    activity(page, 'school_exam', 'household')
    click(page, 'choice', 'present')
    assert any(q['route'] == 'community' for q in state(page)['education']['qualifications'])
    print(label + ': penniless schooling and actual examination passed.', flush=True)
    grow(page,16)
    activity(page, 'career_choose_blacksmith')
    assert state(page)['hero']['profession'] == 'Blacksmith'
    grow(page,18)
    activity(page, 'career_batch_month')
    finish_batch(page)
    activity(page, 'career_open_shop')
    activity(page, 'career_shop_operate')
    for _ in range(5):
        commission(page)
    life = state(page)
    assert life['careers']['records']['Blacksmith']['commissions'] == 5
    assert life['careers']['shop']['weeks'] == 1
    assert life['hero']['path'] == 'unformed'
    export_reload(page,directory,label+'-smith')
    print(label + ': actual smithy, work, five delivered commissions and exact save/reload passed.', flush=True)
    activity(page, 'life_home_cottage', 'activities')
    while next(p for p in state(page)['life']['people'] if p['id']=='fellow')['bond'] < 55:
        activity(page, 'life_visit_fellow', 'activities', settle_after=True)
    activity(page, 'life_court_fellow', 'activities')
    click(page, 'choice', 'yes')
    while next(p for p in state(page)['life']['people'] if p['id']=='fellow')['bond'] < 70:
        activity(page, 'life_visit_fellow', 'activities', settle_after=True)
    activity(page, 'life_commit_fellow', 'activities')
    click(page, 'choice', 'pledge')
    activity(page, 'lineage_marry', 'legacy')
    click(page, 'choice', 'vow')
    for choice in ['welcome','adopt']:
        for _ in range(10):
            if state(page)['life']['health'] >= 40:
                break
            before = state(page)
            activity(page, 'health_clinic', 'health', settle_after=True)
            after = state(page)
            assert after['hero']['gold'] == before['hero']['gold']-6
            assert after['day'] == before['day']+2
        activity(page, 'life_family', 'activities')
        click(page, 'choice', choice)
    assert len(state(page)['life']['children']) == 2
    child = state(page)['life']['children'][0]
    activity(page, 'lineage_nurture_'+child['id'], 'legacy')
    click(page, 'choice', 'curiosity')
    grow(page,25)
    activity(page, 'lineage_school_'+child['id'], 'legacy')
    click(page, 'choice', 'public')
    for index in range(6):
        if index:
            activity(page, 'career_batch_month')
            finish_batch(page)
        activity(page, 'lineage_lesson_'+child['id'], 'legacy')
    grow(page,30)
    for _ in range(8):
        if state(page)['careers']['records']['Blacksmith']['mastery'] == 4:
            break
        activity(page, 'career_batch_year')
        finish_batch(page)
    assert state(page)['careers']['records']['Blacksmith']['mastery'] == 4, 'Lifetime mastery requires actual recorded work'
    for material,amount in {'ore':4,'wood':4,'cloth':3}.items():
        while state(page)['equipment']['materials'][material] < amount:
            activity(page, 'career_buy_'+material)
    before = state(page)
    activity(page, 'career_masterwork')
    finish_batch(page)
    assert state(page)['event']['id'] == 'career_legacy'
    click(page, 'choice', 'household')
    assert state(page)['day'] == before['day']+14
    calendar_paid = state(page).get('householdBudget', {}).get('paidGold', 0) - before.get('householdBudget', {}).get('paidGold', 0)
    assert state(page)['hero']['gold'] == before['hero']['gold']-35-calendar_paid, 'Upfront materials/work and actual household costs are separate'
    assert state(page)['careers']['records']['Blacksmith']['mastery'] == 4
    assert len(state(page)['careers']['masterworks']) == 1
    view(page,'career')
    screenshot(page,label+'-master-smith-phone')
    activity(page, 'lineage_heir_'+child['id'], 'legacy')
    activity(page, 'retire', 'activities')
    click(page, 'choice', 'settle')
    retired = state(page)
    assert retired['phase'] == 'retired' and retired['lineage']['heroDeath'] is None
    export_reload(page,directory,label+'-retired')
    snapshot(page,label+'-retired')
    view(page,'legacy')
    if page.locator('[data-op="continue-child"][data-id="'+child['id']+'"]').count():
        click(page, 'continue-child', child['id'])
    else:
        click(page, 'activity', 'lineage_continue_'+child['id'])
    heir = snapshot(page,label+'-successor')
    assert heir['dynasty']['generation'] == 2
    assert heir['hero']['name'] == child['name']
    assert heir['day'] == retired['day'] and heir['timeline']['birthDay'] == child['bornDay']
    assert heir['age'] == (retired['day']-child['bornDay'])//365
    assert heir['hero']['path'] == 'unformed' and heir['hero']['profession'] == 'Unemployed'
    assert heir['world'] == retired['world'] and heir['careers']['shop'] == retired['careers']['shop']
    assert heir['careers']['masterworks'] == retired['careers']['masterworks']
    assert heir['workshop']['crafting'] == 0 and heir['careers']['records']['Blacksmith']['experience'] == 0
    inheritance = heir['dynasty']['history'][-1]['inheritance']
    assert heir['hero']['gold'] + sum(s['gold'] for s in inheritance['shares']) == retired['hero']['gold']
    assert heir['journal'][:len(retired['journal'])] == retired['journal']
    grow(page,heir['age']+1)
    activity(page, 'school_enroll_community','household')
    before=state(page)['hero']['skills']['scholarship']
    activity(page, 'school_attend','household')
    assert state(page)['hero']['skills']['scholarship'] == before+1
    export_reload(page,directory,label+'-heir')
    view(page,'legacy')
    screenshot(page,label+'-educated-heir-phone')
    print(label + ': marriage, recorded children, schooling, lifetime work, retirement and real successor birthday/school passed.',flush=True)
    return snapshot(page,label+'-final')


def road_journeys(page,directory):
    fixtures=json.loads((project/'tests/fixtures/legacy-v5.json').read_text())['states']
    plans={'pace':'fast','supplies':False,'scout':False,'escort':False,'night':False}
    def plan():
        view(page,'map')
        form=page.locator('#travel-plan-form')
        form.locator('[name="pace"]').select_option('fast')
        for key in plans:
            if key!='pace': form.locator('[name="'+key+'"]').set_checked(False)
        form.locator('button[type="submit"]').click()
        assert state(page)['travel']['plan'] == plans
    def travel(destination):
        view(page,'map')
        click(page,'map-select',destination)
        click(page,'travel',destination)
    def finish():
        policies={'travel_lore':'record','travel_witness':'listen','travel_caravan':'share','travel_sick_traveler':'aid','travel_bandits':'avoid','travel_beasts':'avoid','travel_weather':'shelter','travel_delay':'continue'}
        for _ in range(80):
            life=state(page)
            if life['event']:
                pick=policies.get(life['event']['id'])
                if pick: click(page,'choice',pick)
                else: settle(page)
            elif life['timeline']['journey']:
                click(page,'activity','grow_continue_journey')
            else: return
        raise AssertionError('Road journey did not complete')
    ui.import_life(page,directory,'v5-adult-road',fixtures['adult18'])
    plan(); travel('forest')
    assert state(page)['event']['id']=='travel_lore'
    export_reload(page,directory,'road-lore')
    click(page,'choice','record'); finish()
    assert state(page)['locationId']=='forest' and len(state(page)['travel']['discoveries'])==1
    ui.import_life(page,directory,'v5-professional-road',fixtures['professional'])
    plan(); travel('forest'); finish(); travel('ruin'); finish(); travel('mountain')
    assert state(page)['event']['id']=='travel_bandits'
    export_reload(page,directory,'road-danger')
    click(page,'choice','fight')
    assert state(page)['battle']['context']['kind']=='travel'
    export_reload(page,directory,'road-midbattle')
    screenshot(page,'road-battle-phone')
    for _ in range(120):
        battle=state(page)['battle']
        if battle['outcome']: break
        target=next(a for a in battle['actors'] if a['side']=='enemy' and a['hp']>0)
        page.locator('input[name="battle-target"][value="'+target['id']+'"]').check()
        click(page,'battle-action','attack')
    assert state(page)['battle']['outcome'] in ['victory','defeat']
    click(page,'battle-finish');finish()
    assert state(page)['locationId']=='mountain' and state(page)['travel']['pending'] is None
    print('Roads: genuine earlier life, real noncombat discovery, actual party combat, exact saved leg and battle reload passed.',flush=True)



def paid_road(page,directory):
    genuine=json.loads((project/'tests/fixtures/legacy-v5.json').read_text())['states']['professional']
    ui.import_life(page,directory,'paid-road-professional',genuine)
    view(page,'map')
    before_setting=state(page)
    form=page.locator('#travel-plan-form')
    form.locator('[name="pace"]').select_option('cautious')
    for key in ['supplies','scout','escort']:
        form.locator('[name="'+key+'"]').check()
    form.locator('[name="night"]').uncheck()
    form.locator('button[type="submit"]').click()
    assert state(page)['day']==before_setting['day']
    assert state(page)['hero']['gold']==before_setting['hero']['gold']
    click(page,'map-select','forest')
    metrics=page.locator('.route-preview .travel-metrics > div strong').all_inner_texts()
    days,cost=int(metrics[0]),int(metrics[1].removesuffix('g'))
    assert days>0 and cost>0 and metrics[2].endswith('%')
    before=state(page)
    click(page,'travel','forest')
    assert before['hero']['gold']-state(page)['hero']['gold']==cost
    export_reload(page,directory,'paid-prepared-road')
    extra=ui.finish_road(page)
    after=state(page)
    assert after['locationId']=='forest'
    assert after['day']-before['day']==days+extra
    assert before['hero']['gold']-after['hero']['gold']==cost
    assert after['world']==before['world']
    assert len([c for c in after['companions'] if c['active']])==len([c for c in before['companions'] if c['active']]), 'A paid escort never occupies a companion slot'
    print('Paid road: actual cautious pace, supplies, scout, escort, quoted days/fee and reload paid once passed.',flush=True)
    return after


def focused_final():
    """Resume authentic estates against the final hosted and isolated bundle."""
    cases = {
        'retired': ui.artifacts / 'v6-regular-retired.json',
        'successor': ui.artifacts / 'v6-regular-successor.json',
    }
    for ending in ['renew', 'shatter']:
        path = ui.artifacts / f'v6-covenant-{ending}-heir.json'
        if path.exists():
            cases[ending] = path
    with tempfile.TemporaryDirectory(prefix='hearth-final-') as temp, sync_playwright() as playwright:
        directory = Path(temp)
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        results = []
        blocked = []
        for bundled in [False, True]:
            context = browser.new_context(viewport={'width':390,'height':844}, accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            target = ui.url + ('hearth-and-oath.html' if bundled else '')
            if bundled:
                def isolated(route):
                    if route.request.url == target:
                        route.continue_()
                    else:
                        blocked.append(route.request.url)
                        route.abort()
                page.route('**/*', isolated)
            page.goto(target, wait_until='load')
            captures = {}
            for label, path in cases.items():
                original = json.loads(path.read_text())
                ui.import_life(page, directory, label, original)
                if original['phase'] == 'retired':
                    child = original['life']['children'][0]
                    activity(page, 'lineage_continue_'+child['id'], 'legacy')
                heir = state(page)
                assert heir['dynasty']['generation'] == 2
                assert heir['world'] == original['world']
                ending = heir['campaign']['ending']
                destination = 18 if ending else heir['age'] + 1
                for _ in range(180):
                    life = state(page)
                    if life['event'] and life['age'] == destination and life['event']['id'] == 'birth_year_'+str(destination):
                        export_reload(page, directory, label+'-pending-birthday')
                        if ending:
                            assert 'your own' in page.locator('[data-op="choice"][data-id="curiosity"]').inner_text().lower() or 'my own' in page.locator('[data-op="choice"][data-id="curiosity"]').inner_text().lower()
                        break
                    if life['event']:
                        settle(page)
                    else:
                        click(page, 'continue-age' if life['timeline']['yearTarget'] is not None else 'age-up')
                else:
                    raise AssertionError((label, 'The actual birthday must remain saveable before deciding'))
                grow(page, destination)
                activity(page, 'school_enroll_community', 'household')
                scholarship = state(page)['hero']['skills']['scholarship']
                activity(page, 'school_attend', 'household')
                assert state(page)['hero']['skills']['scholarship'] == scholarship + 1
                view(page, 'lore')
                discoveries = page.locator('[data-op="activity"][data-id^="lore_read_"]:enabled')
                if discoveries.count():
                    discoveries.first.click()
                    click(page, 'choice', 'record')
                view(page, 'quests')
                quest_buttons = page.locator('[data-op="activity"][data-id^="quest_"]').evaluate_all('(buttons) => buttons.map(b => ({id:b.dataset.id,disabled:b.disabled,text:b.innerText}))')
                if ending:
                    assert state(page)['campaign']['stage'] == 'complete'
                    assert state(page)['campaign']['ending'] == ending
                    assert page.locator('.campaign-ending').count() == 1
                    available = page.locator('[data-op="activity"][data-id="quest_followup"]:enabled')
                    assert available.count(), 'A lived birthday produces a real covenant aftermath'
                    available.click()
                    assert state(page)['event']['id'] == 'quest_followup'
                    export_reload(page, directory, label+'-pending-aftermath')
                    click(page, 'choice', 'record')
                    assert state(page)['campaign']['ending'] == ending
                    if label == 'shatter':
                        assert next(s for s in state(page)['world']['locations'] if s['id']=='home')['status'] == 'destroyed'
                export_reload(page, directory, label+'-continued-heir')
                captures[label] = {'state':state(page), 'quests':quest_buttons}
                print(('Offline' if bundled else 'Hosted')+': '+label+' actual inherited birthday, schooling, lore and covenant availability passed.', flush=True)
            captures['paid-road'] = paid_road(page, directory)
            results.append(captures)
            context.close()
        assert results[0] == results[1], 'Every continued heir, actual ending, available quest and paid road must match exactly'
        assert not blocked, ('Standalone made an external request', blocked)
        assert not errors, errors
        browser.close()
    print('Final frozen-build parity passed: authentic retired/successor imports, saved actual birthdays, schooling/lore, inherited covenant endings and saved aftermath, paid preparations once; no external requests or JavaScript errors.')


def main():
    if not os.environ.get('HEARTH_SKIP_BUILD'):
        subprocess.run(['npm','run','build'],cwd=project,check=True)
    with tempfile.TemporaryDirectory(prefix='hearth-dynasty-') as temp,sync_playwright() as playwright:
        directory=Path(temp)
        browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        context.add_init_script(audio_observer)
        page=context.new_page();page.set_default_timeout(8000)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(ui.url,wait_until='networkidle')
        regular=journey(page,directory,'regular')
        sound(page)
        for width in [360,390,430,768,1440]:
            page.set_viewport_size({'width':width,'height':900 if width>=768 else 844})
            ui.drawer_checks(page)
            for ident in sorted(ui.views):
                view(page,ident);ui.no_overflow(page,f'{width}/{ident}')
                if width<768:ui.touch_controls(page,f'{width}/{ident}')
            screenshot(page,f'all-views-{width}-legacy')
        page.set_viewport_size({'width':390,'height':844})
        road_journeys(page,directory)
        regular_paid_road=paid_road(page,directory)
        offline_context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        offline_context.add_init_script(audio_observer)
        offline=offline_context.new_page();offline.set_default_timeout(8000)
        offline.on('pageerror',lambda error:errors.append(str(error)))
        blocked=[];offline_url=ui.url+'hearth-and-oath.html'
        def isolated(route):
            if route.request.url==offline_url:route.continue_()
            else:blocked.append(route.request.url);route.abort()
        offline.route('**/*',isolated);offline.goto(offline_url,wait_until='load')
        bundled=journey(offline,directory,'offline')
        assert bundled==regular,'Two entire legal generations must reproduce exact state in standalone and hosted versions'
        sound(offline)
        road_journeys(offline,directory)
        assert paid_road(offline,directory)==regular_paid_road, 'Paid road preparations and save continuity must match the standalone game'
        assert not blocked,('The standalone game must not request external files',blocked)
        assert not errors,errors
        browser.close()
    print('Dynasty UI passed: legal zero-to-master-smith, married family, educated child, retirement/heir, real offset school, health, road choices/combat, 15 responsive views, gesture-only local sound and isolated offline exact parity; no JavaScript errors.')


if __name__=='__main__':
    focused_final() if '--focused' in sys.argv else main()
