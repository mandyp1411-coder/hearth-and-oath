import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACTION_DEFINITIONS_V27 } from '../dist/js/faction-catalog-v27.js';
import { RPG_FACTIONS_V27 } from '../dist/js/rpg-depth-v27.js';

const modules=new URL('../dist/js/',import.meta.url);
const dependencies=source=>[...source.matchAll(/^import\s+\{[^}]+\}\s+from\s+'\.\/([^']+)\.js';\s*$/gm)].map(match=>match[1]);

test('the shared leaf preserves the complete original faction catalog and public object identity',()=>{
 const original=JSON.parse(readFileSync(new URL('./fixtures/faction-catalog-v27.json',import.meta.url),'utf8'));
 assert.equal(RPG_FACTIONS_V27,FACTION_DEFINITIONS_V27,'the public RPG API and service catalog use the same array');
 assert.equal(JSON.stringify(RPG_FACTIONS_V27),JSON.stringify(original),'all definitions, methods, order and exact authored text stay canonical');
 assert.equal(Object.isFrozen(RPG_FACTIONS_V27),false,'the extraction does not add a freezing contract');
});

test('the complete app dependency graph stays acyclic for the existing offline translator',()=>{
 const visited=new Set(),active=[];
 function visit(name){
  assert.ok(!active.includes(name),'circular offline dependency: '+[...active,name].join(' -> '));
  if(visited.has(name))return;
  active.push(name);
  for(const dependency of dependencies(readFileSync(new URL(name+'.js',modules),'utf8')))visit(dependency);
  active.pop();visited.add(name);
 }
 visit('app');
 assert.ok(visited.has('faction-catalog-v27'));
 const services=readFileSync(new URL('world-services.js',modules),'utf8');
 assert.equal(dependencies(services).includes('rpg-depth-v27'),false,'services must not import RPG action logic');
});
