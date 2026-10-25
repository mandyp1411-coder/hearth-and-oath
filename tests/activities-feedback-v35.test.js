import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {availableOrigins,ORIGIN_ANCESTRIES,originAllowed} from '../dist/js/origins.js';
import {completeAttributePoints,attributePointBudget,attributePointsSpent} from '../dist/js/starting-attributes.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {defaultCreatorDraft,captureCreatorDraft,selectCreatorOrigin,renderCharacterCreator} from '../dist/js/creator.js';
import {getContacts,rememberedContacts} from '../dist/js/conversations.js';
import {residentContacts} from '../dist/js/world-people-v31.js';
import {MISDEEDS,crimeCheck} from '../dist/js/daylife-v35.js';
import {queueWildernessEncounter,wildernessProfile} from '../dist/js/wilderness-v35.js';
import {learnQuestDirections} from '../dist/js/quest-directions-v35.js';
import {hexAtlas,markSiteKnowledge,syncCartography,observeRoadCountry} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {renderTravelMap} from '../dist/js/explore-map-v34.js';
import {seededRoll} from '../dist/js/world.js';
import {applyPersonalityBuild,personalityImpact} from '../dist/js/personality.js';
import {getBattleActions,takeBattleAction} from '../dist/js/combat.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=(key='base')=>E.migrateSave(structuredClone(fixture.states[key]));
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
const stable=s=>({day:s.day,hp:s.hero.hp,mp:s.hero.mp,gold:s.hero.gold,cartography:s.cartography,justice:s.justice,life:s.life});
function walk(s,room){for(const r of settlementWalkPath(s,room)||[])s=valid(E.chooseAction(s,'atlas_room_'+r));return s;}
async function open(t,s=fresh()){const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');return ui;}
function dieFor(s,a,n){return 1+seededRoll(s.seed,`misdeed:${s.dynasty?.generation||1}:${n}:${a.crime}:${a.targetId}`,20);}
function fixDie(s,a,wanted){for(let n=1;n<500;n++)if(dieFor(s,a,n)===wanted){s.justice.crimeRolls=n-1;return;}assert.fail('missing die fixture');}

for(const race of ORIGIN_ANCESTRIES)test(race+' has three exclusive, selectable origins that start real lives',async()=>{
 const rows=availableOrigins(race);assert.equal(rows.length,3);assert.ok(rows.every(o=>o.ancestries.length===1&&o.ancestries[0]===race));assert.equal(new Set(rows.map(o=>o.description)).size,3);assert.ok(rows.every(o=>o.description.length>160));
 let draft=captureCreatorDraft({ancestry:race,startAge:0},defaultCreatorDraft('origins-v35-'+race));draft=selectCreatorOrigin(draft,rows[2].id);assert.equal(draft.originId,rows[2].id);const s=await createLifeAtAge(draft);valid(s);assert.equal(s.hero.lifeOrigin.id,rows[2].id);assert.match(s.journal.at(-1).text,new RegExp(rows[2].communityName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(s.hero.appearance.ancestry,race);assert.equal(s.family.setup==='homeless'?'poor':s.hero.household,s.hero.household);assert.deepEqual(E.migrateSave(s),s);
});
test('creation origin commands retain selection across steps, name editing, fate rolls and ancestry changes',async t=>{
 const ui=await mountApp(t, {rulebooks:'both'});await ui.click('title-new');await ui.click('slot-new','0');ui.set('ancestry','dwarf');await ui.fire('input',ui.root.querySelector('[name="ancestry"]'));const id=availableOrigins('dwarf')[1].id;await ui.click('creator-origin',id);assert.equal(ui.root.form.controls.find(c=>c.name==='originId').value,id);assert.equal(ui.root.querySelector(`[data-op="creator-origin"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');await ui.click('creator-step','1');await ui.click('creator-step','0');assert.equal(ui.root.form.controls.find(c=>c.name==='originId').value,id);await ui.click('creator-random');assert.equal(ui.root.form.controls.find(c=>c.name==='originId').value,id);ui.set('ancestry','elf');await ui.fire('input',ui.root.querySelector('[name="ancestry"]'));assert.equal(ui.root.form.controls.find(c=>c.name==='originId').value,'random');assert.equal(ui.root.querySelector(`[data-op="creator-origin"][data-id="${id}"]`),null);assert.equal(ui.current(),null);
});
test('fate labels conceal the drawn ancestry, identity, heritage and origin',()=>{
 const h=renderCharacterCreator(defaultCreatorDraft('concealed-v35'));assert.equal((h.match(/>Cast by Fate<\/option>/g)||[]).length,3);assert.doesNotMatch(h,/>Random</);assert.match(h,/Choose an ancestry above/);assert.equal((h.match(/data-op="creator-origin"/g)||[]).length,1);assert.ok(originAllowed('hearthborn','goblin'),'legacy origin remains valid');
});
test('unspent attribute points are deterministic, age-bounded and preserve manual choices',()=>{
 for(const age of [0,3,12,18,45,80]){const a=completeAttributePoints({strength:2},age,'fate-points');assert.equal(attributePointsSpent(a),attributePointBudget(age));assert.ok(a.strength>=Math.min(2,attributePointBudget(age)));assert.ok(Object.values(a).every(n=>n>=0&&n<=6));assert.deepEqual(completeAttributePoints({strength:2},age,'fate-points'),a);}
 const full={strength:6,agility:6,vitality:6,intellect:0,willpower:0,presence:0};assert.deepEqual(completeAttributePoints(full,80,'full'),full);
});
test('map selection has no yellow circle and panning viewport hides native scrollbars',()=>{
 const s=fresh(),id=Object.keys(s.cartography.sites).find(id=>id!==s.locationId),h=renderTravelMap(s,{selectedId:id});assert.doesNotMatch(h,/data-selected-destination/);const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');assert.match(css,/journey-world-map \.hex-map-scroll \{[^}]*overflow:hidden; scrollbar-width:none;[^}]*scrollbar-color:var\(--scroll-thumb\)/);assert.match(h,/data-map-viewport tabindex="0"/);
});
test('accepted quest directions unlock destinations, while unaccepted offers do not',()=>{
 const s=fresh(),before=structuredClone(s.cartography);learnQuestDirections(s);assert.deepEqual(s.cartography,before);const accepted=valid(E.chooseAction(s,'journal_main_accept'));assert.equal(accepted.questLog.main,'active');assert.equal(accepted.cartography.sites.marsh.kind,'Rumored');assert.match(accepted.cartography.sites.marsh.source,/Directions/);assert.deepEqual(s.cartography,before);
});
test('an accepted supplies request restores its actual unknown destination on import and Journal Find works',async t=>{
 const s=fresh(),site=s.world.locations.find(p=>!s.cartography.sites[p.id]);s.socialLife.favors.push({id:'favor-directions-person',personId:'directions-person',name:'A Named Traveller',locationId:site.id,item:'wood',status:'active',acceptedDay:s.day,completedDay:null});valid(s);const migrated=valid(E.migrateSave(s));assert.equal(migrated.cartography.sites[site.id].kind,'Rumored');assert.match(migrated.cartography.sites[site.id].source,/Directions/);assert.ok(!E.exploreTravelPreview(migrated,site.id).disabledReason);const ui=await open(t,s);await ui.click('tab','journal');await ui.click('quest-location',site.id);assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,site.id);assert.equal(ui.root.querySelector('[data-op="travel"]').disabled,false);
});
test('manual scouting and encounter farming are absent from engine and surroundings',async t=>{
 const s=fresh('offsite');assert.ok(!E.getActions(s).some(a=>a.id==='atlas_scout'||a.id.startsWith('adventure_roam_')));const ui=await open(t,s);await ui.click('place-open');assert.ok(ui.root.querySelector('.field-place'));assert.doesNotMatch(ui.root.textContent||ui.root.innerHTML,/Seek beast encounters|Survey the nearby country|Seek undead encounters/);assert.equal(ui.root.querySelector('[data-id="atlas_scout"]'),null);assert.ok(ui.root.querySelector('[data-id="trail_camp"]'));
});
test('actual terrain travel automatically charts nearby country without granting adjacent visits',()=>{
 let s=fresh('offsite');const atlas=hexAtlas(s),next=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason),day=s.day;assert.ok(next);s=valid(E.chooseAction(s,next.id));assert.ok(s.day>day);assert.ok(Object.keys(s.cartography.cells).length>=Object.keys(fresh('offsite').cartography.cells).length);for(const [id,p]of Object.entries(s.cartography.sites))if(p.kind==='Visited')assert.ok(id===s.locationId||fresh('offsite').cartography.sites[id]?.kind==='Visited');
});
test('wilderness danger follows terrain, war, exhaustion and hostile occupation',()=>{
 const s=fresh();s.realm.politics.holds=[];s.realm.wars=[];const cell={key:'0,0',terrain:'forest',road:false,regionId:s.realm.regions[0].id},calm=wildernessProfile(s,cell);assert.deepEqual(calm.kinds,['beast','bandit']);s.hero.mp=0;assert.ok(wildernessProfile(s,cell).risk>calm.risk);s.realm.wars.push({a:cell.regionId,b:s.realm.regions[1].id,status:'active'});assert.ok(wildernessProfile(s,cell).risk>calm.risk+10);s.realm.politics||={holds:[]};s.realm.politics.holds.push({siteId:s.world.locations.find(p=>p.regionId===cell.regionId).id,status:'held'});assert.deepEqual(wildernessProfile(s,cell).kinds,['undead']);assert.deepEqual(wildernessProfile({...fresh(),realm:{...fresh().realm,politics:{holds:[]}}},{...cell,terrain:'marsh'}).kinds,['beast','spirit']);
});
function countryEvent(){
 for(let d=1;d<80;d++){const s=fresh('offsite'),cell=hexAtlas(s).byKey[s.cartography.position];s.day+=d;let fired=false;queueWildernessEncounter(s,cell,{setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};fired=true;}});if(fired&&E.validateSave(s))return s;}
 assert.fail('no deterministic natural encounter');
}
test('a natural encounter saves exactly once and avoidance spends Focus without a battle',()=>{
 const s=countryEvent(),before=structuredClone(s);assert.deepEqual(E.migrateSave(s),s);assert.equal(queueWildernessEncounter(s,hexAtlas(s).byKey[s.cartography.position],{}),false);assert.deepEqual(s,before);const n=valid(E.chooseEventOption(s,'avoid'));assert.equal(n.hero.mp,Math.max(0,s.hero.mp-4));assert.equal(n.battle,null);assert.equal(n.cartography.wilderness.pending,null);assert.equal(n.day,s.day);assert.match(n.notice,/4 Focus/);
});
test('fighting a natural danger uses the normal battle and immutable saved encounter',()=>{
 const s=countryEvent(),n=valid(E.chooseEventOption(s,'fight'));assert.ok(n.battle);assert.match(n.battle.encounterId,/^free_/);assert.equal(n.cartography.wilderness.pending,null);assert.deepEqual(E.migrateSave(n).battle,n.battle);assert.equal(n.day,s.day);
});
test('adult Activities show real recovery controls without phantom Mira, school reading, relationship links or repeated headings',async t=>{
 const ui=await open(t);await ui.click('tab','activities');for(const pane of ['daily','work','recovery','training','fun','crime']){await ui.click('activities-pane',pane);const section=ui.root.querySelector('[data-activity-category]');assert.equal(section.querySelector('h2'),null,pane);assert.equal(ui.root.querySelector('.activities-links'),null);assert.doesNotMatch(section.textContent,/\bMira\b|Read with a teacher/);assert.equal(section.querySelector('[data-op="spatial-contact"]'),null);assert.equal(section.querySelector('#romantic-identity'),null);}
 assert.ok(!E.getActions(fresh()).some(a=>a.id==='grow_read'));
});
test('walks use an attended day, improve mood, grant no friendship and cannot repeat on the same day',()=>{
 const s=fresh(),bonds=s.life.people.map(p=>p.bond),n=valid(E.chooseAction(s,'leisure_walk'));assert.equal(n.day,s.day+1);assert.equal(n.life.stress,Math.max(0,s.life.stress-5));assert.deepEqual(n.life.people.map(p=>p.bond),bonds);const again=valid(E.chooseAction(n,'leisure_walk'));assert.equal(again.day,n.day);assert.equal(again.socialLife.leisure.last.walk,n.day);assert.deepEqual(E.migrateSave(n),n);
});
test('tavern drinking requires a real tavern, charges once, uses Focus and records drunkenness',()=>{
 const gate=fresh(),no=E.chooseAction(gate,'leisure_drink');assert.deepEqual(stable(no),stable(gate));let s=walk(gate,'tavern');s.hero.gold=100;const n=valid(E.chooseAction(s,'leisure_drink'));assert.equal(n.day,s.day+1);assert.ok(n.hero.gold<=s.hero.gold-4);assert.equal(n.hero.mp,Math.max(0,s.hero.mp-6));assert.equal(n.socialLife.leisure.tipsyUntil,n.day+2);assert.match(n.notice,/tipsy/);const quiet=valid(E.chooseAction(n,'leisure_read')),again=valid(E.chooseAction(quiet,'leisure_drink'));assert.match(again.notice,/drunk/);assert.ok(again.hero.hp<=quiet.hero.hp-4);assert.ok(E.validateSave(E.migrateSave(again)));
});
test('Social & Fun offers board games and outings without conversation or courtship commands',async t=>{
 const ui=await open(t);await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.ok(ui.root.querySelector('[data-id="leisure_walk"]'));assert.ok(ui.root.querySelector('[data-id="fun_pairs"]'));assert.equal(ui.root.querySelector('[data-op="spatial-contact"]'),null);assert.equal(ui.root.querySelector('[data-op="activity"][data-id="social_smalltalk"]'),null);await ui.click('activity','fun_pairs');assert.equal(ui.root.querySelectorAll('.runestone').length,12);assert.equal(ui.current().day,fresh().day);
});
test('theft opens at twelve; serious crimes have explicit age gates',()=>{
 const s=fresh();for(const age of [11,12,15,16,17,18]){s.age=age;const offered=E.getActions(s);assert.equal(offered.some(a=>a.crime==='theft'),age>=12);assert.equal(offered.some(a=>a.crime==='extort'),age>=16);assert.equal(offered.some(a=>a.crime==='murder'),age>=18);}
});
test('every crime uses the displayed attribute bonus, d20 odds and actual target',()=>{
 for(const crime of MISDEEDS){const s=fresh(),check=crimeCheck(s,crime),a=E.getActions(s).find(a=>a.crime===crime.id);assert.ok(a);assert.equal(a.bonus,check.bonus);assert.equal(a.chance,Array.from({length:20},(_,i)=>i+1).filter(d=>d===20||d!==1&&d+check.bonus>=check.dc).length*5);fixDie(s,a,1);const n=valid(E.chooseAction(s,a.id));assert.match(n.notice,/d20 1 \+/);assert.equal(n.justice.crimeHistory.at(-1).success,false);assert.equal(n.justice.crimeHistory.at(-1).personId,a.targetId);assert.equal(n.justice.crimeHistory.at(-1).dc,crime.dc);assert.equal(n.day,s.day+1);assert.deepEqual(E.migrateSave(n),n);}
});
test('successful murder permanently ends the actual named life and removes future interaction',()=>{
 const s=fresh(),a=E.getActions(s).find(a=>a.crime==='murder'&&a.targetId==='fellow');fixDie(s,a,20);const n=valid(E.chooseAction(s,a.id));assert.equal(n.life.people.find(p=>p.id===a.targetId).alive,false);assert.ok(n.lineage.people.find(p=>p.localId===a.targetId&&p.source==='life').alive===false);assert.ok(!getContacts(n).some(p=>p.id===a.targetId));assert.equal(n.justice.crimeHistory.at(-1).success,true);assert.deepEqual(E.migrateSave(n).lineage,n.lineage);assert.match(n.notice,/kill/);
});
test('a resident victim keeps one identity, no automatic friendship, and stays dead on reload',()=>{
 const s=fresh(),a=E.getActions(s).find(a=>a.crime==='murder'&&a.targetId.startsWith('townsfolk-'));assert.ok(a);fixDie(s,a,20);const n=valid(E.chooseAction(s,a.id));assert.equal(n.life.people.find(p=>p.id===a.targetId).alive,false);assert.equal(n.life.people.find(p=>p.id===a.targetId).relation,'acquaintance');assert.ok(residentContacts(n).find(p=>p.id===a.targetId).available===false);assert.ok(!getContacts(E.migrateSave(n)).some(p=>p.id===a.targetId));
});
test('remote, nonexistent or dead crime targets cannot cost time or create an outcome',()=>{
 const s=fresh(),a=E.getActions(s).find(a=>a.crime==='theft'&&a.targetId==='fellow');s.life.people.find(p=>p.id==='fellow').locationId=s.world.locations.find(p=>p.id!==s.locationId).id;for(const id of [a.id,'misdeed_murder_mira-does-not-exist']){const n=E.chooseAction(s,id);assert.deepEqual(stable(n),stable(s));assert.equal(n.justice.crimeHistory,undefined);}
});
test('malformed die receipts and new subsystem records are rejected on import',()=>{
 const s=fresh(),a=E.getActions(s).find(a=>a.crime==='theft');fixDie(s,a,1);const n=valid(E.chooseAction(s,a.id));for(const change of [r=>r.justice.crimeHistory[0].die=21,r=>r.justice.crimeHistory[0].success=true,r=>r.socialLife.leisure.last.walk=r.day+1,r=>r.justice.crimePurses={someone:-2}]){const bad=structuredClone(n);change(bad);assert.equal(E.validateSave(bad),false);assert.equal(E.migrateSave(bad),null);}
});
test('crime forms invoke the production engine once and preserve Activity scroll',async t=>{
 const s=fresh(),ui=await open(t,s);await ui.click('tab','activities');await ui.click('activities-pane','crime');const form=ui.root.querySelector('[data-crime-form="theft"]'),select=form.querySelector('select');assert.ok(form);form.controls=[select];const before=ui.current(),id=select.value;ui.root.querySelector('.game-content').scrollTop=275;await ui.fire('submit',form);const n=valid(ui.current());assert.equal(n.justice.crimeHistory.length,1);assert.deepEqual(n,E.chooseAction(before,id));if(!n.event)assert.equal(ui.root.querySelector('.game-content').scrollTop,275);
});

test('a completed wilderness battle clears its saved source and cannot pay twice',()=>{
 let s=valid(E.chooseEventOption(countryEvent(),'fight')),battle=s.battle;
 for(let turn=0;!battle.outcome&&turn<180;turn++){const a=getBattleActions(battle).find(a=>a.id==='retreat'&&!a.disabledReason)||getBattleActions(battle).find(a=>a.id==='attack'&&!a.disabledReason);assert.ok(a);const target=a.needsTarget?battle.actors.find(p=>p.side==='enemy'&&p.hp>0)?.id:undefined;battle=takeBattleAction(battle,a.id,target);}
 assert.ok(battle.outcome);const position=s.cartography.position;s=valid(E.resolveBattle(s,battle));assert.equal(s.cartography.wilderness.battle,undefined);assert.equal(s.cartography.position,position);const before=stable(s),again=valid(E.resolveBattle(s,battle));assert.deepEqual(stable(again),before);
});
test('victim purses are finite and attributes change the advertised crime odds',()=>{
 const s=fresh(),c=MISDEEDS.find(c=>c.id==='theft'),low=crimeCheck(s,c);s.hero.attributes.agility+=30;s.hero.attributes.intellect+=30;assert.ok(crimeCheck(s,c).chance>low.chance);const a=E.getActions(s).find(a=>a.crime==='theft');s.justice.crimePurses={[a.targetId]:0};assert.match(E.getActions(s).find(r=>r.id===a.id).disabledReason,/no Gold left/);const n=E.chooseAction(s,a.id);assert.equal(n.day,s.day);assert.equal(n.hero.gold,s.hero.gold);
});
test('work and doctor shortcuts still take the player to real service meetings',async t=>{
 const ui=await open(t);await ui.click('tab','activities');await ui.click('activities-pane','recovery');const doctor=ui.root.querySelector('[data-op="activity-visit"][data-id="doctor-'+ui.current().locationId+'"]');assert.ok(doctor);await ui.click('activity-visit',doctor.dataset.id);assert.equal(ui.current().cartography.interior.roomId,'shrine');assert.ok(ui.root.querySelector('.service-meeting'));assert.ok(E.validateSave(ui.current()));
});

test('crime attempts respect the existing personality stress rules',()=>{
 const s=fresh();assert.ok(applyPersonalityBuild(s,['compassionate','honest']));const a=E.getActions(s).find(a=>a.crime==='theft');assert.ok(personalityImpact(s,{kind:'action',id:a.id}).delta>0);fixDie(s,a,1);const n=valid(E.chooseAction(s,a.id));assert.ok(n.hero.personality.history.some(r=>r.day===n.day&&r.delta>0));assert.match(n.notice,/d20/);
});

test('road observations chart country along the real saved path without creating visits or moving the hero',()=>{
 const s=fresh(),r=s.world.roads.find(r=>r.points?.length>1),before=structuredClone(s),visited=Object.entries(s.cartography.sites).filter(([,v])=>v.kind==='Visited').map(([id])=>id).sort();assert.ok(r);assert.equal(observeRoadCountry(s,r.from,r.to,.5),true);assert.equal(s.day,before.day);assert.equal(s.cartography.position,before.cartography.position);assert.equal(s.locationId,before.locationId);assert.deepEqual(Object.entries(s.cartography.sites).filter(([,v])=>v.kind==='Visited').map(([id])=>id).sort(),visited);assert.ok(Object.keys(s.cartography.cells).length>Object.keys(before.cartography.cells).length);valid(s);
});
