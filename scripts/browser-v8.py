"""Verify the v0.8 panels using genuine replay checkpoints and visible controls.

Recorded public API actions reconstruct each life; no age, money, skills, contacts
or outcomes are granted. Each checkpoint is imported through the normal save UI.
Hosted and isolated standalone runs must produce exactly the same saved states.
"""
import importlib.util
import json
import os
import subprocess
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

project = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('v8_phone_helpers', project / 'scripts/browser-dark-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)

replay_source = r'''
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import * as e from './dist/js/engine.js';
import { takeBattleAction } from './dist/js/combat.js';
const directory=process.argv[2],fixtures=new Map();
const wantedBySource={community:['community-charter','funded-community-work'],people:['recurring-customer','independent-colleague'],family:['school-project-records','older-child-adoption','relationship-values'],formation:['calling-inquiry','recognized-formation','companion-resolution'],sanctuary:['local-hearing','named-donor','household-moon-plan']};
function capture(name,s,view,selector,steps=[]) {
 if(fixtures.has(name))return;
 assert.ok(e.validateSave(s),name+' must be an actual valid save');
 fixtures.set(name,{name,state:structuredClone(s),view,selector,steps});
}
function observe(s,source) {
 const event=s.event,choices=event?.choices||[],has=id=>choices.some(c=>c.id===id);
 const free=!s.event&&!s.battle&&!s.conversations?.pending;
 if(source==='community') {
  if(event?.id==='community_charter')capture('community-charter',s,'career','.community-ambition',[{op:'choice',id:has('open')?'open':choices[0].id}]);
  if(s.community?.project?.commitment)capture('active-commitment',s,'life','.experience-commitment',[{op:'finish-current'}]);
  if(free&&!s.community?.project&&s.community?.works?.length) {
   const w=s.community.works.find(w=>w.locationId===s.locationId);
   if(w)capture('funded-community-work',s,'career','.community-work',[{op:'activity',id:'community_review_'+w.id},{op:'choice',id:'keep'}]);
  }
 }
 if(source==='people') {
  if(event?.id==='society_customer')capture('recurring-customer',s,'career','.society-person',[{op:'choice',id:has('repair')?'repair':has('teach')?'teach':choices[0].id}]);
  const independent=s.society?.people.find(p=>p.status==='independent');
  if(free&&independent)capture('independent-colleague',s,'career','.society-person',[{op:'show-contact',id:independent.id}]);
 }
 if(source==='family') {
  if(free&&s.education?.projects?.length>=2)capture('school-project-records',s,'household','.school-depth');
  if(event?.id==='lineage_adoption'&&has('listen'))capture('older-child-adoption',s,'legacy','.adoption-candidate',[{op:'choice',id:'listen'},{op:'adoption-offer'}]);
  if(free) {
   const known=s.life?.people.find(p=>p.compatibility?.known?.length);
   if(known)capture('relationship-values',s,'relationships','.relationship-values',[{op:'contact',id:known.id}]);
  }
 }
 if(source==='formation') {
  if(event?.id==='fellowship_formation_start')capture('calling-inquiry',s,'quests','.formation-card',[{op:'choice',id:has('independent')?'independent':choices[0].id}]);
  if(free&&Object.values(s.fellowship?.formations||{}).some(f=>f.stage==='completed'))capture('recognized-formation',s,'character','.formation-card');
  if(free&&Object.values(s.fellowship?.companions||{}).some(p=>p.stage==='completed'))capture('companion-resolution',s,'party','.companion-story');
 }
 if(source==='sanctuary') {
  if(event?.id==='sanctuary_case_hearing')capture('local-hearing',s,'relationships','.local-case',[{op:'choice',id:'service'}]);
  const a=s.sanctuaries?.agreements.find(a=>a.status==='active'&&a.nextSessionDay<=s.day);
  if(free&&a&&!s.sanctuaries.commitment&&e.getActions(s).some(x=>x.id==='sanctuary_feed_'+a.id&&!x.disabledReason))capture('named-donor',s,'health','.donor-agreement',[{op:'activity',id:'sanctuary_feed_'+a.id}]);
  const p=s.sanctuaries?.plans.find(p=>p.status==='active'&&p.preparedMoon>s.day);
  if(free&&p&&!s.sanctuaries.commitment)capture('household-moon-plan',s,'health','.moon-agreement',[{op:'activity',id:'sanctuary_close_'+p.id}]);
 }
}
function replay(config,log,source,wanted=wantedBySource[source]) {
 let s=e.createBirthGame(config),battle=null;
 observe(s,source);
 for(const row of log) {
  const parts=row.operation.split(':'),op=parts[0];
  if(op==='combat'){battle=takeBattleAction(battle||s.battle,parts[2],row.target||undefined);continue;}
  if(op==='battle-result'){s=e.resolveBattle(s,battle);battle=null;}
  else if(op==='action')s=e.chooseAction(s,parts.slice(1).join(':'));
  else if(op==='choice') {
   assert.equal(s.event?.id,parts[1],source+' recorded event must be the actual next event');
   s=e.chooseEventOption(s,parts.slice(2).join(':'));
  }
  else if(op==='age-up')s=e.ageUp(s);
  else if(op==='continue-age-up')s=e.continueAgeUp(s);
  else if(op==='travel')s=e.travelTo(s,parts[1]);
  else if(op==='continue-road')s=e.continueJourney(s);
  else if(op==='reply')s=e.replyMessage(s,parts[1],parts[2]);
  else if(op==='recruit')s=e.recruitCompanion(s,parts[1]);
  else if(op==='continue-actual-child')break;
  else throw Error('Unrecognized genuine replay operation '+row.operation);
  assert.ok(e.validateSave(s),source+'/'+row.operation+' must remain saveable');
  observe(s,source);
  if(wanted.every(name=>fixtures.has(name)))break;
 }
}
for(const [path,source] of [
 ['artifacts/playtest/community/community-founder.json','community'],
 ['artifacts/playtest/v8-people/v8-people-maker.json','people'],
 ['artifacts/playtest/v8-family/V8F01.json','family'],
 ['artifacts/playtest/v8-fellowship/v8-fellowship-knight.json','formation']
]){const record=JSON.parse(readFileSync(path,'utf8'));replay(record.summary.config,record.log,source);}
for(const record of JSON.parse(readFileSync('artifacts/playtest/v8/sanctuary-actions.json','utf8'))) {
 const wanted={'v8-local-law-service':['local-hearing'],'v8-named-donor':['named-donor'],'v8-moon-household':['household-moon-plan']}[record.id];
 if(wanted)replay(record.config,record.log,'sanctuary',wanted);
}
// A complete trace need not contain an interrupted civic milestone. Branch
// prospectively from its real charter and spend actual recovery days until its next
// birthday is within the actual first construction quotation.
if(!fixtures.has('active-commitment')) {
 let s=structuredClone(fixtures.get('community-charter').state),branch=[];
 const step=(op,id)=>{const day=s.day;s=op==='choice'?e.chooseEventOption(s,id):e.chooseAction(s,id);assert.ok(e.validateSave(s));branch.push({op,id,day,elapsed:s.day-day});};
 const settle=()=>{for(let i=0;i<30&&s.event;i++){const ids=s.event.choices.map(c=>c.id),pick=['continue','people','care','curiosity','listen','keep','support','private','quiet'].find(id=>ids.includes(id))||ids[0];step('choice',pick);}assert.equal(s.event,null);};
 step('choice',s.event.choices.some(c=>c.id==='open')?'open':s.event.choices[0].id);settle();
 for(let i=0;i<220;i++) {
  const birth=s.timeline.birthDay||0,next=birth+(Math.floor((s.day-birth)/365)+1)*365;
  if(next-s.day<=12)break;
  const action=e.getActions(s).find(a=>a.id==='camp_rest'&&!a.disabledReason);
  assert.ok(action,'actual recovery days must be offered before construction');step('activity',action.id);settle();
 }
 const before={day:s.day,age:s.age,projectId:s.community.project.id,step:s.community.project.step,gold:s.hero.gold,inventory:structuredClone(s.inventory)};
 writeFileSync('tests/fixtures/v8-community-before-birthday.json',JSON.stringify(s)+'\n');
 const offered=e.getActions(s).find(a=>a.id==='community_stage');assert.ok(offered&&!offered.disabledReason,JSON.stringify({notice:s.notice,offered,day:s.day}));
 step('activity','community_stage');
 assert.ok(s.community.project.commitment,'actual birthday must interrupt the quoted milestone');
 capture('active-commitment',s,'life','.experience-commitment',[{op:'finish-current'}]);
 fixtures.get('active-commitment').branchActions=branch;
 fixtures.get('active-commitment').branchProvenance={sourceParentTrace:'artifacts/playtest/community/community-founder.json',parentCheckpoint:'community-charter',charterEventId:fixtures.get('community-charter').state.event.id,projectId:s.community.project.id,before,after:{day:s.day,age:s.age,eventId:s.event?.id,remainingDays:s.community.project.commitment.remainingDays,paidGold:s.community.project.paidGold,paidMaterials:s.community.project.paidMaterials}};
}
const required=['community-charter','active-commitment','funded-community-work','recurring-customer','independent-colleague','school-project-records','older-child-adoption','relationship-values','calling-inquiry','recognized-formation','companion-resolution','local-hearing','named-donor','household-moon-plan'];
for(const name of required)assert.ok(fixtures.has(name),'a genuine replay must reach '+name);
writeFileSync(directory+'/fixtures.json',JSON.stringify([...fixtures.values()]));
console.log(JSON.stringify({checkpoints:fixtures.size,names:[...fixtures.keys()]}));
'''

records, errors = [], []


def click(page, op, ident=None):
    if op == 'choice':
        ui.view(page, 'life')
    before = ui.state(page)
    ui.click(page, op, ident)
    after = ui.state(page)
    records.append({'op': op, 'id': ident, 'day': before['day'], 'elapsed': after['day'] - before['day'],
                    'eventBefore': (before.get('event') or {}).get('id'),
                    'eventAfter': (after.get('event') or {}).get('id')})
    if op in ('activity', 'choice'):
        assert after != before, (op, ident, after.get('notice'))
        assert after['hero']['gold'] >= 0


def settle(page):
    for _ in range(16):
        event = ui.state(page).get('event')
        if not event:
            return
        choices = [c['id'] for c in event['choices']]
        selected = next((c for c in ['continue', 'people', 'care', 'curiosity', 'listen', 'keep', 'quiet', 'support', 'private'] if c in choices), choices[0])
        click(page, 'choice', selected)
    raise AssertionError('Actual calendar decisions did not settle')


def exercise(page, fixture, directory, edition, width):
    label = f"{edition}-{width}-{fixture['name']}"
    imported = ui.import_life(page, directory, label, fixture['state'])
    assert imported == fixture['state'], label + ': importing cannot reroll the actual checkpoint'
    page.set_viewport_size({'width': width, 'height': 844 if width < 1000 else 1000})
    ui.view(page, fixture['view'])
    # School and calling project records are inspected at their actual saved stage.
    if fixture['name'] != 'relationship-values':
        assert page.locator(fixture['selector']).count(), (label, fixture['selector'])
    ui.no_overflow(page, label)
    if width == 390:
        ui.touch_controls(page, label)
    if fixture['name'] == 'named-donor':
        session = fixture['steps'][0]['id']
        quote = page.locator(f'.activity-row[data-id="{session}"] .activity-cost').inner_text()
        assert quote.split() == ['1d', '8g'], (label, 'Actual donor attendance must quote its day and fee', quote)
    for step in fixture['steps']:
        op, ident = step['op'], step.get('id')
        if op == 'finish-current':
            settle(page)
            ui.view(page, 'life')
            buttons = page.locator('.experience-commitment [data-op="activity"]:enabled')
            assert buttons.count(), 'The actual interrupted work must offer a continuation'
            ident = buttons.first.get_attribute('data-id')
            click(page, 'activity', ident)
        elif op == 'adoption-offer':
            event = ui.state(page)['event']
            if event and any(c['id'] == 'offer' for c in event['choices']):
                click(page, 'choice', 'offer')
                assert ui.state(page)['life']['children'], 'A real agreed adoption must retain the child'
        elif op == 'show-contact':
            click(page, 'show-contact', ident)
            assert page.locator('.game-content.relationships-content').is_visible()
        else:
            click(page, op, ident)
    if fixture['name'] == 'relationship-values':
        assert page.locator('.relationship-values .known-preferences > div').count() == 4, 'The actual discussed tastes must be displayed'
    ui.no_overflow(page, label + '-after')
    if width == 390:
        ui.touch_controls(page, label + '-after')
    after = ui.state(page)
    if fixture['name'] == 'named-donor':
        living = after['householdBudget']['paidGold'] - imported['householdBudget']['paidGold']
        assert imported['hero']['gold'] - after['hero']['gold'] - living == 8, label + ': the quoted fee must be charged once in addition to actual living costs'
        assert after['day'] - imported['day'] == 1, label + ': a session requires its quoted actual attendance day'
    page.reload(wait_until='load')
    if page.locator('[data-op="resume"]:visible').count():
        ui.click(page, 'resume')
    assert ui.state(page) == after, label + ': save/reload cannot change the chosen consequences'
    if width == 390 and fixture['name'] in ('funded-community-work', 'independent-colleague', 'older-child-adoption', 'local-hearing', 'named-donor'):
        ui.view(page, fixture['view'])
        page.screenshot(path=str(ui.artifacts / f'v8-{label}.png'), full_page=True)
    return after


def main():
    if not os.environ.get('HEARTH_SKIP_BUILD'):
        subprocess.run(['npm', 'run', 'build'], cwd=project, check=True)
    with tempfile.TemporaryDirectory(prefix='hearth-v8-browser-') as temporary:
        directory = Path(temporary)
        subprocess.run(['node', '--input-type=module', '-', str(directory)], input=replay_source,
                       text=True, cwd=project, check=True)
        fixtures = json.loads((directory / 'fixtures.json').read_text())
        outputs, blocked = {}, []
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            for edition in ('hosted', 'standalone'):
                context = browser.new_context(viewport={'width': 390, 'height': 844})
                page = context.new_page(); page.set_default_timeout(9000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                address = ui.url if edition == 'hosted' else ui.url + 'hearth-and-oath.html'
                if edition == 'standalone':
                    def isolated(route):
                        if route.request.url == address:
                            route.continue_()
                        else:
                            blocked.append(route.request.url); route.abort()
                    page.route('**/*', isolated)
                page.goto(address, wait_until='load')
                outputs[edition] = {}
                for width in (390, 1440):
                    for fixture in fixtures:
                        outputs[edition][f"{width}/{fixture['name']}"] = exercise(page, fixture, directory, edition, width)
                context.close()
            assert outputs['hosted'] == outputs['standalone'], 'Every visible decision must yield exact online/isolated standalone save parity'
            assert not blocked, ('Standalone requested external files', blocked)
            assert not errors, errors
            browser.close()
        result = {'checkpoints': len(fixtures), 'responsiveChecks': len(fixtures) * 4,
                  'controlsClicked': len(records), 'widths': [390, 1440], 'exactOnlineOfflineParity': True,
                  'donorQuotationChecks': 4,
                  'externalStandaloneRequests': blocked, 'javascriptErrors': errors,
                  'checkpointNames': [f['name'] for f in fixtures], 'controls': records,
                  'actualBranchActions': next((f.get('branchActions', []) for f in fixtures if f['name'] == 'active-commitment'), []),
                  'branchProvenance': next((f.get('branchProvenance') for f in fixtures if f['name'] == 'active-commitment'), None)}
        (project / 'docs/playtest/v8-browser.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps({k: v for k, v in result.items() if k not in ('controls', 'actualBranchActions')}, indent=2))


if __name__ == '__main__':
    main()
