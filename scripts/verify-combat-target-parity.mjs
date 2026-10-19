// Replays captured QA battles against the pre-extraction executor, not life
// generation or a balance benchmark. No source/build/publication output changes.
// Usage: node scripts/verify-combat-target-parity.mjs [baseline-commit]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseline = process.argv[2] || 'd31d837';
const temporary = await mkdtemp(path.join(tmpdir(), 'hearth-target-parity-'));
const moduleURL = name => pathToFileURL(path.join(project, 'dist/js', name + '.js')).href;
try {
  for (const [original, temporaryName] of [['combat', 'combat.mjs'], ['enemy-plans-v27', 'enemy-plans.mjs']]) {
    const source = execFileSync('git', ['show', `${baseline}:dist/js/${original}.js`], { cwd: project, encoding: 'utf8' });
    const rewritten = source.replace(/from '\.\/([^']+)\.js';/g, (_, dependency) => `from '${dependency === 'enemy-plans-v27' ? pathToFileURL(path.join(temporary, 'enemy-plans.mjs')).href : moduleURL(dependency)}';`);
    await writeFile(path.join(temporary, temporaryName), rewritten);
  }
  const before = await import(pathToFileURL(path.join(temporary, 'combat.mjs')).href);
  const after = await import(moduleURL('combat'));
  const { attachEnemyPlan } = await import(moduleURL('enemy-plans-v27'));
  const { ENCOUNTER_DESIGN_V27 } = await import(moduleURL('encounter-design-v27'));
  const game={seed:'baseline-status-target-parity',revision:5,flags:{},difficulty:'balanced',hero:{name:'Ash',path:'mage',specialization:'healer',hp:40,maxHp:100,mp:30,maxMp:40,potions:2,attributes:{strength:6,agility:9,vitality:6,intellect:6,willpower:6,presence:6},skills:{weapons:2,defense:2,arcana:2,devotion:2,stealth:2,survival:2,scholarship:2,persuasion:2},condition:null},companions:[{id:'mira',name:'Mira',role:'guardian',recruited:true,active:true,hp:20,maxHp:50,mp:15,maxMp:20,agility:5},{id:'orrin',name:'Orrin',role:'mage',recruited:true,active:true,hp:10,maxHp:25,mp:18,maxMp:30,agility:4}]};
  const template=after.createBattle(game,'ruin',null,{openingTurns:false});
  function fixture(){const b=structuredClone(template);b.currentActorId='hero';b.turnOrder=['hero','enemy-1','mira','orrin','enemy-2'];b.actors.find(a=>a.id==='enemy-1').hp=30;b.actors.find(a=>a.id==='enemy-1').maxHp=40;const other=b.actors.find(a=>a.id==='enemy-2');other.hp=10;other.maxHp=40;other.status={ward:8};return b;}
  function check(b,label){const old=before.takeBattleAction(b,'potion','hero'),next=after.takeBattleAction(b,'potion','hero');assert.deepEqual(next,old,label);}
  let legacy=0,typed=0,boss=0;
  for(const key of ['keeper','archivist','thornheart','captain','warden','covenant','warder','leech','sniper','hexer','barbed','basic','striker'])for(let step=0;step<6;step++)for(const trait of [undefined,'snare','barbed'])for(const guard of [false,true]){
   const b=fixture(),e=b.actors.find(a=>a.id==='enemy-1');e.aiKey=key;e.aiStep=step;e.trait=trait;e.status={ward:8,weakened:2};if(guard)b.actors.find(a=>a.id==='mira').status.protecting=true;check(b,`legacy ${key} ${step} ${trait} ${guard}`);legacy++;
  }
  for(const design of ENCOUNTER_DESIGN_V27.species)for(let step=0;step<design.cadence.cycle.length;step++)for(const mode of ['normal','guard','missing','broken','silenced','bramble']){
   const b=fixture();b.effectsVersion=27;let e=b.actors.find(a=>a.id==='enemy-1');const planned=attachEnemyPlan(e,design.id);Object.assign(e,planned);e.aiStep=step;e.lastTargetId=mode==='missing'?'missing':'mira';e.status={charged:4,stolenWard:3,ward:8};b.lastAttackerId=mode==='missing'?'missing':'orrin';b.lastDamagingAction='attack';b.actors.find(a=>a.id==='mira').status.pack_mark=1;
   if(mode==='guard')b.actors.find(a=>a.id==='mira').status.protecting=true;
   if(mode==='broken')delete e.status.charged;
   if(mode==='silenced')e.status.silenced=1;
   if(mode==='bramble')for(const a of b.actors.filter(a=>a.side==='party'))a.status.bramble=3;
   check(b,`typed ${design.id} ${step} ${mode}`);typed++;
  }
  for(const design of ENCOUNTER_DESIGN_V27.bosses){const scratch=attachEnemyPlan(fixture().actors.find(a=>a.id==='enemy-1'),design.speciesId,{bossId:design.id});for(let step=0;step<scratch.planCycle.length;step++)for(const mode of ['normal','guard','broken','silenced','bramble']){
   const b=fixture();b.effectsVersion=27;const e=b.actors.find(a=>a.id==='enemy-1');Object.assign(e,attachEnemyPlan(e,design.speciesId,{bossId:design.id}));e.aiStep=step;e.lastTargetId='mira';e.hp=10;e.maxHp=40;e.status={charged:4,stolenWard:3,ward:8};b.lastAttackerId='orrin';b.lastDamagingAction='attack';
   if(mode==='guard')b.actors.find(a=>a.id==='mira').status.protecting=true;
   if(mode==='broken')delete e.status.charged;
   if(mode==='silenced')e.status.silenced=1;
   if(mode==='bramble')for(const a of b.actors.filter(a=>a.side==='party'))a.status.bramble=3;
   check(b,`boss ${design.id} ${step} ${mode}`);boss++;
  }}
  console.log(JSON.stringify({baseline,legacy,typed,boss,total:legacy+typed+boss,result:'Exact full captured-battle equality after one accepted potion decision and the following enemy action.'},null,2));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
