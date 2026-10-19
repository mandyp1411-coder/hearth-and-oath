"""Record genuine UI lives and inspect phone usability without manufacturing state.

All actions use visible controls; localStorage is read only for observations.
Run HEARTH_UI_PHASE=baseline for baseline, otherwise verify the usability fixes.
"""
import importlib.util
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]

def module(name, path):
    spec = importlib.util.spec_from_file_location(name, project / path)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded

ui = module('phone_dark_ui', 'scripts/browser-dark-ui.py')
dynasty = module('phone_dynasty_ui', 'scripts/browser-dynasty.py')
phase = os.environ.get('HEARTH_UI_PHASE', 'verification')
transcripts = []
errors = []
base_click = ui.click

def record(page, op, ident=None):
    before = ui.state(page)
    selector = f'[data-op="{op}"]' + (f'[data-id="{ident}"]' if ident is not None else '')
    control = page.locator(selector).first
    label = control.inner_text().strip() if control.count() else ident
    base_click(page, op, ident)
    after = ui.state(page)
    transcripts.append({'op':op, 'id':ident, 'label':label,
                        'age':after['age'], 'day':after['day'],
                        'gold':after['hero']['gold'], 'profession':after['hero']['profession'],
                        'generation':after.get('dynasty',{}).get('generation',1),
                        'eventBefore':(before.get('event') or {}).get('id'),
                        'eventAfter':(after.get('event') or {}).get('id'),
                        'dayCost':after['day']-before['day'],
                        'newJournal':after['journal'][len(before['journal']):]})
    checkpoint='focused' if os.environ.get('HEARTH_UI_FOCUSED') else phase
    (ui.artifacts/f'phone-{checkpoint}-checkpoint.json').write_text(json.dumps({'state':after,'transcript':transcripts},indent=2))

ui.click = record
dynasty.click = record
# The helper has a separate ui module instance; use the same observer throughout.
dynasty.ui.click = record

def create(page, name, seed, birthplace, setup, ancestry):
    page.locator('#character-form').wait_for()
    page.locator('[name="name"]').fill(name)
    page.locator('[name="seed"]').fill(seed)
    page.locator('[name="birthplace"]').select_option(birthplace)
    page.locator('[name="household"]').select_option('poor')
    page.locator('[name="familySetup"]').select_option(setup)
    page.locator('[name="ancestry"]').select_option(ancestry)
    page.locator('#character-form button[type="submit"]').click()
    transcripts.append({'op':'birth', 'config':{'name':name,'seed':seed,'birthplace':birthplace,'household':'poor','familySetup':setup,'ancestry':ancestry}, 'state':ui.state(page)})
    dynasty.settle(page)


def settle_current(page):
    policies={'career_year':'care','health_concern':'support','lineage_bereavement':'share',
              'plague_letter':'later','deadline_review':'pause','life_birthday':'people',
              'travel_lore':'record','travel_witness':'listen','travel_caravan':'share',
              'travel_sick_traveler':'aid','travel_bandits':'avoid','travel_beasts':'avoid',
              'travel_weather':'shelter','travel_delay':'continue'}
    for _ in range(120):
        life=ui.state(page)
        if not life['event']:return
        ident=life['event']['id'];picks=[c['id'] for c in life['event']['choices']]
        wanted=policies.get(ident)
        if not wanted or wanted not in picks:
            wanted=next((key for key in ['care','curiosity','support','share','listen','continue','record'] if key in picks),picks[0])
        record(page,'choice',wanted)
    raise AssertionError('Actual decisions did not settle')

dynasty.settle=settle_current

def smith(page,directory):
    create(page,'Vesper Living Hearth','phone-review-living-hearth','village','homeless','dwarf')
    dynasty.activity(page,'family_shelter','household')
    dynasty.grow(page,6)
    dynasty.activity(page,'school_enroll_community','household')
    for _ in range(6):dynasty.activity(page,'school_attend','household')
    dynasty.grow(page,10)
    dynasty.activity(page,'school_exam','household');record(page,'choice','present')
    dynasty.grow(page,16);dynasty.activity(page,'career_choose_blacksmith')
    dynasty.grow(page,18);dynasty.activity(page,'career_batch_month');dynasty.finish_batch(page)
    dynasty.activity(page,'career_open_shop');dynasty.activity(page,'career_shop_operate')
    for _ in range(5):dynasty.commission(page)
    dynasty.activity(page,'life_home_cottage','activities')
    while next(p for p in ui.state(page)['life']['people'] if p['id']=='fellow')['bond']<55:
        dynasty.activity(page,'life_visit_fellow','activities',settle_after=True)
    dynasty.activity(page,'life_court_fellow','activities');record(page,'choice','yes')
    while next(p for p in ui.state(page)['life']['people'] if p['id']=='fellow')['bond']<70:
        dynasty.activity(page,'life_visit_fellow','activities',settle_after=True)
    dynasty.activity(page,'life_commit_fellow','activities');record(page,'choice','pledge')
    dynasty.activity(page,'lineage_marry','legacy');record(page,'choice','vow')
    # Read the actual separation decision, then preserve the household by choice.
    ui.view(page,'relationships');record(page,'contact','fellow')
    record(page,'activity','life_separate_fellow');record(page,'choice','stay')
    for _ in range(10):
        if ui.state(page)['life']['health']>=40:break
        dynasty.activity(page,'health_clinic','health',settle_after=True)
    dynasty.activity(page,'life_family','activities');record(page,'choice','adopt')
    child=ui.state(page)['life']['children'][0]
    dynasty.activity(page,'lineage_nurture_'+child['id'],'legacy');record(page,'choice','curiosity')
    dynasty.grow(page,25)
    dynasty.activity(page,'lineage_school_'+child['id'],'legacy');record(page,'choice','public')
    for index in range(6):
        if index:dynasty.activity(page,'career_batch_month');dynasty.finish_batch(page)
        dynasty.activity(page,'lineage_lesson_'+child['id'],'legacy')
    dynasty.grow(page,30)
    for _ in range(8):
        if ui.state(page)['careers']['records']['Blacksmith']['mastery']==4:break
        dynasty.activity(page,'career_batch_year');dynasty.finish_batch(page)
    assert ui.state(page)['careers']['records']['Blacksmith']['mastery']==4, 'Lifetime mastery must be earned through actual recorded work'
    for material,amount in {'ore':4,'wood':4,'cloth':3}.items():
        while ui.state(page)['equipment']['materials'][material]<amount:dynasty.activity(page,'career_buy_'+material)
    before=ui.state(page);dynasty.activity(page,'career_masterwork');dynasty.finish_batch(page)
    record(page,'choice','household')
    after=ui.state(page)
    assert after['day']==before['day']+14
    budget_paid=after['householdBudget']['paidGold']-before['householdBudget']['paidGold']
    assert after['hero']['gold']==before['hero']['gold']-35-budget_paid
    assert after['hero']['path']=='unformed'
    assert len(after['careers']['masterworks'])==1
    dynasty.activity(page,'lineage_heir_'+child['id'],'legacy')
    dynasty.activity(page,'retire','activities');record(page,'choice','settle')
    retired=ui.state(page)
    (ui.artifacts/'phone-verification-retired.json').write_text(json.dumps(retired,indent=2))
    dynasty.export_reload(page,directory,'phone-live-retired')
    dynasty.activity(page,'lineage_continue_'+child['id'],'legacy')
    heir=ui.state(page)
    assert heir['dynasty']['generation']==2 and heir['world']==retired['world']
    assert heir['hero']['name']==child['name'] and heir['hero']['path']=='unformed'
    assert heir['careers']['shop']==retired['careers']['shop']
    dynasty.grow(page,heir['age']+1)
    dynasty.activity(page,'school_enroll_community','household')
    dynasty.activity(page,'school_attend','household')
    return ui.state(page)

def scholar(page):
    create(page,'Iona Questions','phone-review-city-orphan' if phase=='baseline' else 'phone-review-city-orphan-expanded','city','orphan','human')
    dynasty.grow(page,6)
    dynasty.activity(page,'school_enroll_community','household')
    for _ in range(6): dynasty.activity(page,'school_attend','household')
    dynasty.activity(page,'school_dilemma','household')
    record(page,'choice','ask')
    dynasty.grow(page,10)
    dynasty.activity(page,'school_exam','household')
    record(page,'choice','present')
    dynasty.grow(page,16)
    dynasty.activity(page,'career_choose_scholar')
    dynasty.grow(page,18)
    dynasty.activity(page,'career_batch_month')
    dynasty.finish_batch(page)
    dynasty.commission(page)
    ui.view(page,'character')
    record(page,'activity','calling_meet_thief')
    for _ in range(20):
        ui.view(page,'character')
        available=page.locator('[data-op="activity"][data-id="calling_train_thief"]:enabled')
        if not available.count(): break
        record(page,'activity','calling_train_thief')
    ui.view(page,'character')
    record(page,'activity','calling_seek_thief')
    record(page,'choice','defer')
    # A roleplayed civilian can choose to set the main story aside.
    ui.view(page,'quests')
    record(page,'activity','quest_decline')
    picks=[c['id'] for c in ui.state(page)['event']['choices']]
    record(page,'choice','pause' if 'pause' in picks else picks[0])
    # Genuine message thread and relationship action.
    ui.view(page,'relationships')
    record(page,'contact','fellow')
    record(page,'activity','talk_fellow')
    replies=page.locator('[data-op="reply"]')
    assert replies.count()
    record(page,'reply',replies.first.get_attribute('data-id'))
    dynasty.settle(page)
    dynasty.activity(page,'life_visit_fellow','activities',settle_after=True)
    return ui.state(page)

def inspect(page, label):
    captures=[]
    for width,height in [(390,844),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        ui.drawer_checks(page)
        for ident in sorted(ui.views):
            ui.view(page,ident)
            ui.no_overflow(page,(label,width,ident))
            if width<1000: ui.touch_controls(page,(label,width,ident))
            captures.append({'life':label,'width':width,'view':ident,
                             'pageHeight':page.evaluate('document.documentElement.scrollHeight'),
                             'disabledControls':page.locator('button:disabled').count(),
                             'disabledReasons':page.locator('.disabled-reason').all_inner_texts()})
    return captures

def main():
    ui.artifacts.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='hearth-phone-playtest-') as temporary, sync_playwright() as playwright:
        directory=Path(temporary)
        browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        results=[]; captures=[]
        routes=[os.environ['HEARTH_UI_ROUTE']] if os.environ.get('HEARTH_UI_ROUTE') else ['smith','scholar']
        for ident in routes:
            context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
            page=context.new_page();page.set_default_timeout(10000)
            page.on('pageerror',lambda error: errors.append(str(error)))
            page.goto(ui.url,wait_until='load')
            start=len(transcripts)
            if ident=='smith':
                if phase=='baseline':
                    transcripts.append({'op':'birth','config':{'name':'Vesper Hearthkeeper','seed':'two-lives-at-the-forge','birthplace':'village','household':'poor','familySetup':'homeless','ancestry':'dwarf'}})
                    final=dynasty.journey(page,directory,'phone-'+phase)
                else:final=smith(page,directory)
            else: final=scholar(page)
            captures.extend(inspect(page,ident))
            results.append({'life':ident,'seed':final['seed'],'finalAge':final['age'],
                            'generation':final['dynasty']['generation'],'transcript':transcripts[start:],
                            'finalState':final})
            (ui.artifacts/f'phone-{phase}-{ident}.json').write_text(json.dumps(final,indent=2))
            (ui.artifacts/f'phone-{phase}-partial-transcripts.json').write_text(json.dumps({'phase':phase,'lives':results,'views':captures,'errors':errors},indent=2))
            context.close()
        browser.close()
    assert not errors,errors
    report={'phase':phase,'lives':results,'views':captures,'errors':errors}
    (ui.artifacts/f'phone-{phase}-transcripts.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'phase':phase,'lives':[(r['life'],r['finalAge'],r['generation'],len(r['transcript'])) for r in results],'viewChecks':len(captures),'errors':errors}),flush=True)


def focused_main():
    from types import SimpleNamespace
    audit=SimpleNamespace(ui=ui,record=record,dynasty=dynasty)
    errors=[]
    with tempfile.TemporaryDirectory() as temp,sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        page=context.new_page();page.set_default_timeout(7000);page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(ui.url,wait_until='load')
        ui.import_life(page,Path(temp),'scholar',json.loads((ui.artifacts/('phone-verification-scholar.json' if (ui.artifacts/'phone-verification-scholar.json').exists() else 'phone-baseline-scholar.json')).read_text()))
        ui.view(page,'character')
        assert page.locator('.calling-group').count()==3
        assert page.locator('.calling-card').count()==12
        assert page.locator('.calling-group[open]').count()==0
        before=ui.state(page)
        height=page.evaluate('document.documentElement.scrollHeight')
        page.locator('[data-disclosure="calling-warrior"] summary').click()
        assert page.locator('[data-id="calling_seek_paladin"]').is_disabled()
        card=page.locator('.calling-card').filter(has=page.locator('[data-id="calling_seek_paladin"]'))
        assert card.locator('.offered-action small').first.inner_text().strip()
        ui.view(page,'lore');ui.view(page,'character')
        assert page.locator('[data-disclosure="calling-warrior"]').get_attribute('open') is not None
        assert ui.state(page)==before
        ui.view(page,'career')
        priorities=page.locator('[data-disclosure="household-priorities"]')
        priorities.locator('summary').click()
        before=ui.state(page)
        audit.record(page,'activity','budget_focus_rest')
        after=ui.state(page)
        assert after['day']==before['day'] and after['hero']['gold']==before['hero']['gold']
        assert after['life']['health']==before['life']['health'] and after['life']['focus']=='rest'
        assert '~' in page.locator('.command-reason').inner_text()
        audit.record(page,'activity','budget_focus_livelihood')
        audit.record(page,'activity','budget_lifestyle_comfortable')
        assert ui.state(page)['life']['lifestyle']=='comfortable'
        audit.record(page,'activity','budget_lifestyle_frugal')
        supplies=page.locator('[data-disclosure="career-supplies"]')
        supplies.locator('summary').click()
        before=ui.state(page)
        page.locator('[data-id="career_buy_ore"]').focus()
        audit.record(page,'activity','career_buy_ore')
        assert page.locator('[data-disclosure="career-supplies"]').get_attribute('open') is not None
        page.wait_for_function('document.activeElement?.dataset.id==="career_buy_ore"')
        assert ui.state(page)['equipment']['materials']['ore']>before['equipment']['materials']['ore']
        ui.view(page,'relationships');audit.record(page,'contact','fellow')
        active=page.locator('.contact-card.active').bounding_box();circle=page.locator('.contact-list').bounding_box()
        page.wait_for_function('(() => {const c=document.querySelector(".contact-list").getBoundingClientRect(), a=document.querySelector(".contact-card.active").getBoundingClientRect();return a.left >= c.left-1 && a.right <= c.right+1;})()')
        audit.record(page,'activity','talk_fellow')
        ui.view(page,'party')
        assert page.locator('[data-op="recruit"]:enabled, [data-op="toggle-companion"]:enabled').count()==0
        assert page.locator('.disabled-reason').count()==len(ui.state(page)['companions'])
        ui.view(page,'inventory')
        assert page.locator('[data-op="equip"]:enabled').count()==0
        assert page.locator('.disabled-reason').count()
        ui.view(page,'career')
        assert page.locator('.view-attention').count()==1
        assert 'reply' in page.locator('.view-attention').inner_text()
        audit.record(page,'tab','relationships')
        replies=page.locator('[data-op="reply"]');audit.record(page,'reply',replies.first.get_attribute('data-id'))
        audit.dynasty.settle(page)
        for width in [360,390,430,768,1440]:
            page.set_viewport_size({'width':width,'height':844 if width<1000 else 1000})
            for ident in sorted(ui.views):
                ui.view(page,ident);ui.no_overflow(page,(width,ident))
                if width<1000:ui.touch_controls(page,(width,ident))
        battle_save=ui.artifacts/'playtest/adventure-vampire-construct-midbattle.json'
        blood_checked=False
        if battle_save.exists():
            page.set_viewport_size({'width':390,'height':844})
            ui.import_life(page,Path(temp),'actual-vampire-construct',json.loads(battle_save.read_text()))
            ui.view(page,'life')
            for _ in range(10):
                if ui.state(page)['battle']['currentActorId']=='hero':break
                audit.record(page,'battle-action','defend')
            assert ui.state(page)['battle']['currentActorId']=='hero'
            before=ui.state(page)
            assert page.locator('[data-op="battle-action"][data-id="blood"]').is_disabled()
            assert page.locator('[data-op="battle-action"][data-id="attack"]').is_enabled()
            assert 'No remaining enemy carries blood' in page.locator('.battle-help').inner_text()
            assert ui.state(page)==before,'Rendering the actual bloodless encounter must not mutate it'
            audit.record(page,'battle-action','attack')
            after=ui.state(page)
            assert after['battle']!=before['battle'],'The ordinary attack actually takes a turn'
            (ui.artifacts/'phone-bloodless-turn.json').write_text(json.dumps({'before':before,'after':after},indent=2))
            blood_checked=True
        assert not errors,errors
        print(json.dumps({'characterPhoneHeight':height,'responsiveViewChecks':75,'disclosureState':'preserved','keyboardPurchaseFocus':'preserved','pendingConversationBanner':'single and visible','bloodlessBattleChecked':blood_checked,'errors':errors}))
        browser.close()

if __name__=='__main__':
    if os.environ.get('HEARTH_UI_FOCUSED'):focused_main()
    else:main()
