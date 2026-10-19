import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as baseline from '../dist/js/boss-stories-v27.js';
import {ENCOUNTER_DESIGN_V27} from '../dist/js/encounter-design-v27.js';
import {bossState,bossContext} from './helpers/maze-signature-state.js';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),rows=[];
for(const regionId of [...new Set(ENCOUNTER_DESIGN_V27.bosses.map(b=>b.regionId))]){
 const s=bossState(regionId);baseline.initializeBossStories(s,s.rpg.expedition);rows.push({id:'init:'+regionId,hash:hash(s)});
 for(const roomId of ['entry','crossing','ledger','stores','guardian','last']){s.rpg.expedition.roomId=roomId;rows.push({id:'offers:'+regionId+':'+roomId,hash:hash(baseline.bossRoomActions(s))});}
 for(const def of ENCOUNTER_DESIGN_V27.bosses.filter(b=>b.regionId===regionId)){
  const lead=structuredClone(s),{ctx,events}=bossContext(lead);for(const [kind,roomId]of [['archive','ledger'],['survey','stores'],['contact','entry']]){baseline.resolveBossApproach(lead,{kind:'boss',id:def.id,choice:'lead_'+kind,details:{roomId}},ctx);rows.push({id:'lead:'+def.id+':'+kind,hash:hash({s:lead,events})});}
  for(const a of def.noncombatApproaches){const q=structuredClone(lead),{ctx,events}=bossContext(q);baseline.resolveBossApproach(q,{kind:'boss',id:def.id,choice:a.id,paid:true,totalDays:a.costs.days,cost:a.costs.gold||0,details:{}},ctx);rows.push({id:'resolve:'+def.id+':'+a.id,hash:hash({s:q,events,properties:baseline.propertyActions(q)})});}
 }
}
test('114 exact published-v581 boss offer, lead and consequence goldens remain unchanged',()=>{assert.deepEqual(rows,JSON.parse(readFileSync(new URL('./fixtures/maze-identity/boss-story-published-v581-parity.json',import.meta.url))).rows);});
