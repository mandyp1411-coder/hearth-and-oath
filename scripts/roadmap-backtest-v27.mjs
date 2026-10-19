// Public-command regression lives. No stat, clock, reward, inventory or condition patches.
import { mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { normalizeAppearance } from '../dist/js/avatar.js';
import { getBattleActions } from '../dist/js/combat.js';
import { getContacts } from '../dist/js/conversations.js';
const sourceFileHashes=Object.fromEntries(readdirSync(new URL('../dist/js',import.meta.url)).filter(f=>f.endsWith('.js')).sort().map(f=>[f,createHash('sha256').update(readFileSync(new URL('../dist/js/'+f,import.meta.url))).digest('hex')]));
const runtimeSha256=createHash('sha256').update(JSON.stringify(sourceFileHashes)).digest('hex');
const start=Number(process.argv[2]||0),count=Number(process.argv[3]||25),out=process.argv[4]||fileURLToPath(new URL('../artifacts/playtest/v27/lives-'+start+'.json',import.meta.url));
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'],profiles=['civilian','explorer','artisan','relationships','sustained_vampire','prepared_werewolf','predatory_vampire','refusing_vampire','untamed_werewolf','combatant'];
const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex'),reports=existsSync(out)?JSON.parse(readFileSync(out,'utf8')).reports:[];
for(let index=start;index<start+count;index++){
  if(reports.some(r=>r.index===index&&r.status==='passed'))continue;for(let i=reports.length-1;i>=0;i--)if(reports[i].index===index)reports.splice(i,1);
  const mode=index%10,seed=`hearth-roadmap-v27-life-${String(index+1).padStart(3,'0')}`,race=races[index%8],begin=Date.now(),commands=[],stats={commands:0,reloads:0,battles:0,events:{},actions:{},portraits:new Set()},trace=[];
  let s,returnHex;
  function commit(op,id,fn){const before=s,old=hash(s);s=fn(s);assert.equal(hash(before),old,'operation mutated its input');assert.ok(E.validateSave(s),`${op} ${id}: ${s.notice}`);stats.commands++;const row={step:stats.commands,op,id,day:s.day,age:s.age,event:s.event?.id||null,condition:s.hero.condition?.type||null,hunger:s.hero.condition?.hunger??null,control:s.hero.condition?.control??null};trace.push(row);if(trace.length>40)trace.shift();commands.push(row);if(stats.commands%25===0||s.event?.id.startsWith('curse_')){const r=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(r,'reload rejected');assert.equal(hash(r),hash(s),'reload changed the recorded life');s=r;stats.reloads++;}return hash(s)!==old;}
  function act(id){const a=E.getActions(s).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;stats.actions[id]=(stats.actions[id]||0)+1;const origin=s.cartography?.position;const changed=commit('action',id,x=>E.chooseAction(x,id));if(id.startsWith('atlas_step_')&&s.cartography?.offsite)returnHex=origin;return changed;}
  function available(ids){for(const id of ids)if(act(id))return true;return false;}
  function eventPick(){const id=s.event.id,cs=s.event.choices.filter(c=>!c.disabledReason);let pick;
    if(id.startsWith('birth_'))pick=cs[(index+s.age)%cs.length];
    else if(id==='life_hunger')pick=cs.find(c=>c.id===(mode===7?'endure':mode===6?'animal':'agreement'))||cs.find(c=>c.id==='animal');
    else if(id==='vampire_offer'||id==='lycan_offer')pick=cs.find(c=>c.id==='accept');
    else if(id==='vampire_feeding')pick=cs.find(c=>c.id===(mode===6?'predation':'animal'));
    else if(id==='lycan_fullmoon')pick=cs.find(c=>c.id===(mode===8?'roam':'safe'))||cs.find(c=>c.id==='isolate');
    else if(id==='curse_frenzy')pick=cs.find(c=>c.id===(mode===6?'hunt':mode===7?'contain':'feed'));
    else if(id==='curse_hunters')pick=cs.find(c=>c.id===((mode===6||mode===8)?'answer':'hide'));
    else if(id==='curse_trial')pick=cs.find(c=>c.id===((mode===6||mode===8)?'accept':'records'));
    else if(id==='way_encounter')pick=cs.find(c=>c.id===(s.hero.gold>=4?'care':'leave'));
    else if(id==='stories_chapter')pick=cs.find(c=>c.id==='enterprise');
    else if(id==='retirement')pick=cs.find(c=>c.id==='settle');
    else if(id==='plague_letter')pick=cs.find(c=>c.id==='later');
    else if(id==='life_budget')pick=cs.find(c=>c.id==='simplify');
    else if(id==='health_concern')pick=cs.find(c=>c.id===(s.hero.condition?.hunger>=75||s.flags.pendingMoonDays?.length?'continue':'rest'))||cs.find(c=>c.id==='continue');
    else if(id==='justice_arrest')pick=cs.find(c=>c.id==='surrender');
    pick||=cs.find(c=>['continue','keep','wait','leave','listen','honest','later','decline','private','cancel','pause'].includes(c.id))||cs[0];
    stats.events[id]=(stats.events[id]||0)+1;commit('choice',id+':'+pick.id,x=>E.chooseEventOption(x,pick.id));
  }
  try{
    const startingAge=mode<4?[0,3,10,18,25,45,65][Math.floor(index/10)%7]:18;
    s=await createLifeAtAge({seed,startAge:startingAge,difficulty:mode>=6&&mode<=8?'balanced':'gentle',appearance:normalizeAppearance({ancestry:race,portraitPresentation:['masculine','feminine','androgynous'][index%3]})});assert.ok(E.validateSave(s));
    const target=Math.max(startingAge+4,mode>=4&&mode<=8?30:32),acted=new Set();let curseAttempts=0,stalls=0;
    for(let step=0;step<4500&&s.phase!=='retired';step++){
      const before=hash(s);
      if(s.event)eventPick();
      else if(s.conversations.pending){const p=s.conversations.pending;commit('reply',p.personId,x=>E.replyMessage(x,p.personId,p.replies[0].id));}
      else if(s.battle){const b=s.battle,a=b.actors.find(a=>a.id===b.currentActorId);if(b.outcome){stats.battles++;commit('battle_result',b.outcome,x=>E.resolveBattle(x,x.battle));}else{const options=getBattleActions(b).filter(o=>!o.disabledReason),targets=o=>b.actors.filter(t=>t.hp>0&&t.side===o.targetSide&&(!o.targetIds||o.targetIds.includes(t.id))),hurt=targets({targetSide:'party'}).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];let choice=options.find(o=>o.id==='potion'&&hurt?.hp<hurt?.maxHp*.45)||options.find(o=>o.id==='blood'&&a.hp<a.maxHp*.65)||options.find(o=>o.id==='skill'&&o.targetSide==='enemy')||options.find(o=>o.id==='attack')||options[0];if(a.hp<a.maxHp*.22)choice=options.find(o=>o.id==='retreat')||choice;const target=choice.targetSide==='party'?hurt:targets(choice).sort((a,b)=>a.hp-b.hp)[0];commit('battle_action',choice.id,x=>E.chooseBattleAction(x,choice.id,target?.id));}}
      else if(s.justice.prison){if(s.hero.condition?.type==='vampire'&&s.hero.condition.hunger>=70)available(['curse_prison_blood','curse_prison_rations']);else if(s.hero.condition?.type==='lycanthrope'&&!E.getMoonForecast(s).prepared)act('curse_prison_refuge');else act('justice_serve');}
      else if(s.hero.condition?.type==='vampire'&&s.hero.condition.hunger>=70){const fed=mode===7?act('curse_abstain'):mode===6?act('feed_vampire'):available(['curse_animal','feed_vampire']);if(!fed){const birthday=E.getActions(s).find(a=>a.id==='feed_vampire')?.disabledReason?.includes('birthday');if(birthday||s.hero.condition.hunger<75)commit('age_up','feeding waits for birthday',s.timeline.yearTarget!==null?E.continueAgeUp:E.ageUp);else commit('hunger','attend',E.attendBloodHunger);}}
      else if(s.hero.condition?.type==='lycanthrope'&&mode===5&&!E.getMoonForecast(s).prepared){if(!s.hero.condition.accepted&&act('curse_accept')){}else available(['lycan_prepare','lycan_control']);}
      else if(s.hero.hp<s.hero.maxHp*.5&&!(mode===7&&s.hero.condition)){available(['camp_rest','health_rest','atlas_rest']);}
      else if(s.cartography?.pending)act('atlas_continue');
      else if(s.cartography?.offsite&&returnHex){const [q,r]=returnHex.split(',');act(`atlas_step_${q}_${r}`);}
      else if(s.timeline.journey)commit('continue_journey','road',x=>E.continueJourney(x));
      else if(E.getLifeCommitment(s)){const rows=E.getActions(s);const a=rows.find(a=>!a.disabledReason&&/(continue|stage)$/.test(a.id))||rows.find(a=>!a.disabledReason&&/(cancel|abandon|withdraw)$/.test(a.id));if(a)act(a.id);}
      else if(mode>=4&&mode<=8&&!s.hero.condition&&curseAttempts<2){const vampire=[4,6,7].includes(mode),desired=vampire?'city':'forest',id=vampire?'vampire_invitation':'lycan_invitation';if(s.locationId!==desired){commit('travel',desired,x=>E.travelTo(x,desired));}else if(act(id))curseAttempts++;else {curseAttempts++;act('camp_rest');}}
      else if(s.age>=target){if(!act('retire')){if(s.timeline.yearTarget!==null)commit('continue_age','year',x=>E.continueAgeUp(x));else commit('age_up','year',x=>E.ageUp(x));}}
      else {
        const key=s.age+':'+mode;
        if(!acted.has(key)){acted.add(key);if(mode===1){const a=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason);if(a){act(a.id);continue;}}
          if(mode===2&&available(['career_work','workshop_gather_wood','grow_practice']))continue;
          if(mode===3){const p=getContacts(s).find(p=>E.getActions(s).some(a=>a.id==='talk_'+p.id&&!a.disabledReason));if(p&&act('talk_'+p.id))continue;}
          if(mode===9&&available(['train','grow_train','grow_practice','adventure_roam_beast']))continue;
          if(mode===0&&available(['health_rest','grow_family','grow_practice']))continue;
        }
        if(s.timeline.yearTarget!==null)commit('continue_age','year',x=>E.continueAgeUp(x));else commit('age_up','year',x=>E.ageUp(x));
      }
      if(hash(s)===before){if(++stalls>5)throw Error('No progress; available: '+E.getActions(s).map(a=>a.id+(a.disabledReason?'!':'')).join(','));}else stalls=0;
    }
    assert.equal(s.phase,'retired','life did not conclude');assert.ok(s.chronicle);const final=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(final);assert.equal(hash(final),hash(s));stats.reloads++;
    reports.push({runtimeSha256,sourceFileHashes,index,seed,race,profile:profiles[mode],startingAge,difficulty:s.difficulty,status:'passed',ending:s.lineage.heroDeath?'death':'retirement',cause:s.lineage.heroDeath?.cause||null,age:s.age,day:s.day,name:s.hero.name,condition:s.hero.condition?.type||null,bloodline:s.hero.condition?.bloodline||null,stats:{...stats,portraits:undefined},finalHash:hash(s),elapsedMs:Date.now()-begin,trace,commands});
  }catch(error){reports.push({runtimeSha256,sourceFileHashes,index,seed,race,profile:profiles[mode],status:'failed',error:error.stack,commands,stats:{...stats,portraits:undefined},trace});if(s){mkdirSync(dirname(out),{recursive:true});writeFileSync(out+'.failed-'+index+'.json',JSON.stringify(s));}}
  mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({kind:'Automated public-command lives; no human critics or browser play',runtimeSha256,sourceFileHashes,start,count,completed:reports.length,reports},null,2));
  console.log(JSON.stringify({index,status:reports.at(-1).status,age:reports.at(-1).age,commands:stats.commands}));
}
if(reports.some(r=>r.status==='failed'))process.exitCode=1;
