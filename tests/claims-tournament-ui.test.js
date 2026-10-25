// Controlled canonical source captures + actual mounted production handlers,
// not a browser/physical-keyboard, naturally earned party or balance claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { DUEL_RULES_TEXT } from '../dist/js/tournament-duel-rules.js';
import { captureClaimsTournamentBase,captureLockedTournament,capturePausedTournament,copy,roundtrip } from './helpers/claims-tournament-fixtures.mjs';
import { mountApp } from './helpers/ui-surface.mjs';

test('actual solo battle uses shared current renderer, exact named targets and honest nonlethal outcome',async t=>{
 const start=captureLockedTournament(captureClaimsTournamentBase()),s=E.chooseAction(start,'tournament_bout_0');assert.equal(s.battle?.context.kind,'tournament');assert.equal(s.battle.actors.length,2);roundtrip(s);
 const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','life');assert.ok(ui.root.querySelector('.battle-workspace'));assert.ok(ui.root.innerHTML.includes(DUEL_RULES_TEXT.replace(/&/g,'&amp;')));assert.equal(ui.root.querySelector('[data-battle-outlook]'),null);assert.ok(ui.root.querySelector('[name="battle-target"][value="enemy-1"]'));assert.ok(ui.root.querySelector('[name="battle-ally-target"][value="hero"]'));
 const before=copy(ui.current());await ui.click('battle-action','retreat');assert.equal(ui.current().battle.outcome,'retreat');assert.match(ui.root.innerHTML,/You chose to stop/);assert.match(ui.root.innerHTML,/No recovery day, fine, experience or equipment/);assert.doesNotMatch(ui.root.innerHTML,/Recovery takes 3 days|Your party earns/);await ui.click('battle-finish');assert.equal(ui.current().phase,'adult');assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.equal(ui.current().hero.exp,before.hero.exp);assert.equal(ui.current().adultTournament.endReason,'withdrawn');roundtrip(ui.current());
});

test('connected tournament care controls stay behind detached rehearsal with zero life or storage writes',async t=>{
 const s=capturePausedTournament(captureClaimsTournamentBase()),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','training');assert.ok(ui.root.querySelector('[data-op="tournament-care"]'));await ui.click('menu');await ui.click('practice-open','protect_ally');
 const before=copy(ui.current()),bytes=JSON.stringify([...ui.values]),writes=[],set=ui.storage.setItem.bind(ui.storage);ui.storage.setItem=(key,value)=>{writes.push(key);return set(key,value);};const care=ui.root.querySelector('[data-op="tournament-care"]');assert.ok(care?.isConnected);await ui.fire('click',care);assert.ok(ui.root.querySelector('.practice-modal'));assert.deepEqual(ui.current(),before);assert.equal(JSON.stringify([...ui.values]),bytes);assert.deepEqual(writes,[]);await ui.click('practice-close');assert.deepEqual(ui.current(),before);roundtrip(ui.current());
});
