import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {mountApp} from './helpers/ui-surface.mjs';
import {readIntoRulebook} from './helpers/one-rulebook.mjs';

// Source/semantic regressions only. The fake DOM does not calculate CSS geometry;
// the companion visual QA report records the real-browser viewport checks.
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));

test('mobile navigation exposes all six main views and its menu in order',async t=>{
 const ui=await mountApp(t, {states:[readIntoRulebook(fixture.states.base)]});
 await ui.click('title-continue');
 const buttons=ui.root.querySelectorAll('.mobile-command-dock .bottom-nav button');
 assert.deepEqual(buttons.map(b=>[b.dataset.op,b.dataset.id]),[
  ['tab','life'],['tab','activities'],['tab','map'],['tab','relationships'],
  ['tab','inventory'],['tab','journal'],['menu','nav'],
 ]);
 assert.equal(buttons.at(-1).getAttribute('aria-label'),'Open game menu');
});

test('the more-specific mobile grid accounts for all seven navigation controls',()=>{
 const rules=[...css.matchAll(/body\.game-mode \.mobile-command-dock \.bottom-nav\s*\{([^}]+)\}/g)].map(m=>m[1]);
 const grid=rules.filter(r=>/grid-template-columns/.test(r)).at(-1);
 assert.match(grid,/grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
 assert.match(rules.at(-1),/(?:^|;)\s*height:\s*auto(?:;|$)/);
});

test('mobile labels wrap within their button without shrinking reading-scale text',()=>{
 const rule=[...css.matchAll(/body\.game-mode \.mobile-command-dock \.bottom-nav button > span:last-child\s*\{([^}]+)\}/g)].at(-1)?.[1];
 assert.ok(rule);
 for(const property of [/max-width:\s*100%/,/min-width:\s*0/,/white-space:\s*normal/,/overflow-wrap:\s*anywhere/,/11px \* var\(--reading-scale,1\)/])assert.match(rule,property);
});

test('the title menu retains its content height when reading text is enlarged',()=>{
 const rules=[...css.matchAll(/body\.title-mode \.title-screen\s*\{([^}]+)\}/g)].map(m=>m[1]);
 const grid=rules.filter(r=>/grid-template-rows/.test(r)).at(-1);
 assert.match(grid,/grid-template-rows:\s*auto minmax\(min-content,\s*1fr\) auto auto/);
 assert.ok(rules.some(r=>/overflow-y:\s*auto/.test(r)));
});

test('narrow portrait headers wrap resources rather than crush the identity',()=>{
 const section=css.match(/@media \(max-width:419px\) and \(min-height:501px\) \{([\s\S]*?)\n\}/)?.[1];
 assert.ok(section);
 assert.match(section,/\.header-person \{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap/);
 assert.match(section,/> \.identity-bar \{[^}]*flex:\s*1 1 150px/);
 assert.match(section,/> \.header-resources \{[^}]*order:\s*2;[^}]*margin-left:\s*auto/);
 assert.match(section,/button\.header-place \{[^}]*order:\s*3;[^}]*flex:\s*0 0 100%/);
});
