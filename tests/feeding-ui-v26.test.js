import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../dist/js/engine.js';
import {mountApp} from './helpers/ui-surface.mjs';
// The old capture, read into the one rulebook as the main game's engine reads any life (v0.72.2).
const saved=E.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/hunger-birthday-v26.json',import.meta.url),'utf8')));
test('the real menu exposes paused blood hunger at a birthday and advances refusal through the saved calendar',async t=>{
 const ui=await mountApp(t, {states:[saved]});await ui.click('title-continue');const oldDay=ui.current().day,oldHunger=ui.current().hero.condition.hunger;
 await ui.click('blood-need');assert.equal(ui.current().event.id,'life_hunger');assert.equal(ui.current().day,oldDay);await ui.click('choice','endure');
 const s=ui.current();assert.equal(s.day,oldDay+1);assert.equal(s.hero.condition.hunger,oldHunger+2);assert.match(s.event.id,/^birth_/);assert.equal(s.age,30);assert.ok(E.validateSave(s));
});
