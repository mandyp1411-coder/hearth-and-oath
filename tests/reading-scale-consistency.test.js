import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyDisplay, normalizeDisplay, readDisplay, saveDisplay } from '../dist/js/display.js';

// These are source and display-persistence checks, not computed browser style,
// geometry, physical zoom or screen-reader verification. See the companion record.
const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');
const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selector,body])=>({selector:selector.trim(),body}));
const bodies=selector=>rules.filter(r=>r.selector===selector).map(r=>r.body);
const family=/\.(?:interaction-(?!arrow\b)[\w-]+|quiet-choice|consistent-meeting|activity-tabs|compact-activity|activity-description|activity-intro|crime-(?:option|attempt)|leisure-group|field-(?:atmosphere|paths)|trade-[\w-]+|craft-[\w-]+|shop-spoken|journey-destination|destination-(?:quote|background)|journey-(?:distance|energy|camp)|disabled-reason|living-cost-note|action-cost-help)\b/;
const fontValues=body=>[...body.matchAll(/(?:^|;)\s*font(?:-size)?\s*:\s*([^;{}]+)/g)].map(m=>m[1]);
const scaled=/calc\((\d+(?:\.\d+)?)px \* var\(--reading-scale,\s*1\)\)/;

for(const [label,selector] of [
 ['action labels','.interaction-copy > strong'],
 ['action descriptions','.interaction-description'],
 ['action cost quotes','.interaction-quote'],
 ['shared household cost fine print','.living-cost-note'],
 ['compact household cost details','.interaction-choice .interaction-cost-details'],
 ['optional cost-help summary','.action-cost-help > summary'],
 ['optional cost-help prose','.action-cost-help .small-copy'],
 ['action reasons','.interaction-choice .disabled-reason'],
 ['quiet action labels','.quiet-choice .interaction-copy > strong'],
 ['barter item names','body.game-mode .trade-item-name'],
 ['barter quantity/price labels','body.game-mode .trade-cell small'],
 ['barter requested quantities','body.game-mode .trade-count'],
 ['barter offer descriptions','body.game-mode .trade-offer-row > span'],
 ['barter input','body.game-mode .trade-toolbar input'],
 ['barter category labels','body.game-mode .trade-toolbar label'],
 ['barter category selection','body.game-mode .trade-toolbar select'],
 ['barter settlement labels','body.game-mode .trade-totals > span'],
 ['barter settlement totals','body.game-mode .trade-totals strong'],
 ['barter balance','body.game-mode .trade-workspace .inventory-gold'],
 ['craft summary','body.game-mode .craft-summary'],
 ['craft detail heading','body.game-mode .craft-detail h4'],
 ['craft detail prose','body.game-mode .craft-detail p'],
 ['craft cost/skill/time/result terms','body.game-mode .craft-terms'],
 ['craft ingredient names','body.game-mode .craft-ingredient'],
 ['craft required/owned counts','body.game-mode .craft-ingredient small'],
 ['craft pending-project terms','body.game-mode .craft-project p,body.game-mode .craft-project summary'],
 ['journey price/time','body.game-mode .destination-quote strong'],
 ['journey reserve terms','body.game-mode .journey-energy > div'],
 ['journey remaining time','body.game-mode .journey-distance small'],
 ['journey camp terms','body.game-mode .journey-camp small'],
 ['field action labels','body.game-mode .field-paths strong'],
 ['crime target selection','body.game-mode .crime-attempt select'],
])test(label+' uses one reading-scale factor in every explicit size rule',()=>{
 const values=bodies(selector).flatMap(fontValues);assert.ok(values.length,selector);
 for(const value of values){
  const m=value.match(scaled);assert.ok(m,selector+': '+value);
  assert.equal(value.match(/--reading-scale/g)?.length,1,'no double scaling');
  const base=Number(m[1]);
  assert.equal((base*1.5)/(base*1),1.5,'source expression, not a computed-font measurement');
 }
});

test('the complete scoped font cascade, including narrow rules, has no fixed-pixel prose sizes',()=>{
 let checked=0;
 for(const rule of rules.filter(r=>family.test(r.selector))){
  for(const value of fontValues(rule.body)){
   if(!/\dpx/.test(value))continue;
   assert.match(value,scaled,rule.selector+': '+value);checked++;
  }
 }
 assert.ok(checked>=80,'retain full action/craft/trade/adjacent-terms coverage');
});

test('enlarged names are not line-clamped and narrow terms can reflow',()=>{
 const names=bodies('body.game-mode .trade-item-name').join(';');
 assert.doesNotMatch(names,/-webkit-line-clamp|overflow:\s*hidden/);
 assert.match(names,/overflow-wrap:\s*anywhere/);
 const tabs=bodies('body.game-mode .activity-tabs .button').at(-1);
 for(const p of [/max-width:\s*100%/,/min-width:\s*0/,/white-space:\s*normal/])assert.match(tabs,p);
 assert.match(css,/@media\(max-width:420px\)\{\s*body\.game-mode \.craft-terms>div \{ grid-template-columns:minmax\(0,1fr\); gap:4px; \}/);
 assert.match(bodies('body.game-mode .craft-ingredients').at(-1),/minmax\(min\(150px,100%\),1fr\)/);
 assert.match(bodies('body.game-mode .trade-confirm').at(-1),/flex-wrap:\s*wrap/);
});

test('the narrow selected-item description keeps an art-and-text row before its action wraps',()=>{
 // The inspector already wraps at 950px. Below 700px, reserve the first row
 // for its unchanged 76px art + 16px gap + description instead of allowing
 // the action button to squeeze the flex:1 description into a text sliver.
 const narrow=css.slice(css.indexOf('@media(max-width:700px)',css.indexOf('body.game-mode .trade-inspector {')));
 assert.match(narrow.slice(0,narrow.indexOf('\n}')),/body\.game-mode \.trade-inspector > div \{ flex-basis:\s*calc\(100% - 92px\); \}/);
 assert.equal(bodies('body.game-mode .trade-inspector > div').length,2,'keep the desktop flex rule and one narrow override');
 assert.match(bodies('body.game-mode .trade-inspector > div')[0],/flex:\s*1;\s*min-width:\s*0/);
});

test('text scaling keeps the existing item art, arrow column and click-target minimums',()=>{
 for(const [selector,size] of [
  ['body.game-mode .trade-cell .item-art',54],
  ['body.game-mode .trade-inspector .item-art',76],
  ['body.game-mode .craft-result-art .item-art',76],
  ['body.game-mode .craft-ingredient .item-art',38],
 ])assert.match(bodies(selector)[0],new RegExp('width:\\s*'+size+'px;\\s*height:\\s*'+size+'px'));
 assert.match(bodies('.interaction-arrow')[0],/font:\s*22px\/1/);
 assert.match(bodies('body.game-mode .interaction-choice')[0],/grid-template-columns:\s*minmax\(0,1fr\) 20px/);
 assert.match(bodies('body.game-mode .interaction-choice')[0],/min-height:\s*56px/);
 assert.match(bodies('body.game-mode .interaction-choice.quiet-choice')[0],/min-height:\s*48px/);
 assert.match(bodies('body.game-mode .activity-tabs .button').at(-1),/min-height:\s*46px/);
});

test('display preferences remain browser-wide, independent from saved lives and workspace keys',()=>{
 const data=new Map([
  ['hearth-and-oath-legacy:saves:v1','unchanged saved lives'],
  ['hearth-and-oath-legacy:workspace:life-a:1','unchanged workspace'],
 ]),before=new Map(data),writes=[],storage={getItem:k=>data.get(k),setItem:(k,v)=>{writes.push(k);data.set(k,v);}};
 assert.deepEqual(normalizeDisplay({scale:0,font:'plain'}),{scale:1,font:'plain',singleKeyShortcuts:true});
 assert.deepEqual(normalizeDisplay({scale:9,font:'other'}),{scale:1.5,font:'serif',singleKeyShortcuts:true});
 for(const scale of [1,1.5]){
  const settings=saveDisplay({scale,font:'plain'},storage);assert.deepEqual(readDisplay(storage),settings);
  const style=new Map(),attrs=new Map();applyDisplay(settings,{documentElement:{style:{setProperty:(k,v)=>style.set(k,v)},setAttribute:(k,v)=>attrs.set(k,v)}});
  assert.equal(style.get('--reading-scale'),String(scale));assert.equal(attrs.get('data-reading-font'),'plain');
 }
 assert.deepEqual([...new Set(writes)],['hearth-and-oath-legacy:display:v1']);
 for(const [key,value] of before)assert.equal(data.get(key),value);
 assert.match(css,/html\[data-reading-font="plain"\] \{ --serif: Arial, Helvetica, sans-serif; \}/);
});
