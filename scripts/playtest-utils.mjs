import {settlementServices,serviceAccepts,serviceWalkPath} from '../dist/js/world-services.js';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as engine from '../dist/js/engine.js';
import { getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { getThread } from '../dist/js/conversations.js';

export { engine };
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// These are choices for incidental interruptions, not assertions that all lives
// should share a personality. A run supplies its own policy for its main story.
export function ordinaryChoice(event) {
  const known = { career_year:'care', life_birthday:'people', plague_letter:'later', deadline_review:'pause', health_concern:'support', lineage_bereavement:'share', retirement:'settle', road_bandits:'avoid', road_beasts:'avoid', road_weather:'wait', road_caravan:'decline', road_witness:'listen', road_sick:'comfort', road_lore:'listen' };
  const preferred = known[event.id];
  if (preferred && event.choices.some(c => c.id === preferred)) return preferred;
  if (/^(birth_|fate_)/.test(event.id)) {
    return ['care','curiosity','question','people','rest','help'].find(id => event.choices.some(c => c.id === id)) || event.choices[0]?.id;
  }
  return null;
}

export class LifeRun {
  constructor(id, config, policy = ordinaryChoice) {
    this.id=id; this.config=structuredClone(config); this.policy=policy;
    this.state=engine.createBirthGame(config); this.log=[]; this.findings=[];
    assert.ok(engine.validateSave(this.state), `${id}: birth is saveable`);
    this.initialHash=fingerprint(this.state);
  }
  step(operation, fn, detail={}) {
    const before=this.state, hash=fingerprint(before);
    const next=fn(before);
    assert.equal(fingerprint(before), hash, `${this.id}/${operation}: public API preserves input`);
    assert.ok(engine.validateSave(JSON.parse(JSON.stringify(next))), `${this.id}/${operation}: invalid save at day ${next.day}, scene ${next.event?.id}, notice ${next.notice}`);
    assert.ok(next.hero.gold>=0, `${this.id}/${operation}: overspent gold`);
    this.log.push({operation, day:before.day, age:before.age, location:before.locationId, ...detail, elapsed:next.day-before.day, goldDelta:next.hero.gold-before.hero.gold, notice:next.notice, nextEvent:next.event?.id||null, journal:next.journal.filter(j=>!before.journal.some(old=>old.id===j.id))});
    this.state=next; return this;
  }
  available(id) { return engine.getActions(this.state).find(a=>a.id===id && !a.disabledReason); }
  act(id) {
    const provider=settlementServices(this.state).find(r=>serviceAccepts(r,id)),room=provider?.roomId||(/^life_home_/.test(id)?'homes':null),path=room&&serviceWalkPath(this.state,room);if(path)for(const next of path)this.step('walk:'+next,s=>engine.chooseAction(s,'atlas_room_'+next));
    const action=engine.getActions(this.state).find(a=>a.id===id);
    assert.ok(action, `${this.id}: ${id} not offered at ${this.state.age}/${this.state.locationId}; event ${this.state.event?.id}, notice ${this.state.notice}`);
    assert.ok(!action.disabledReason, `${this.id}: ${id}: ${action.disabledReason}`);
    return this.step(`action:${id}`, s=>engine.chooseAction(s,id), {label:action.label,quotedDays:action.durationDays??action.days,quotedCost:action.cost});
  }
  choose(id) {
    const event=this.state.event;if(this.state.age<3&&event?.observationVersion===1)id='continue';const choice=event?.choices.find(c=>c.id===id);
    assert.ok(choice, `${this.id}: ${event?.id} does not offer ${id}`);
    return this.step(`choice:${event.id}:${id}`, s=>engine.chooseEventOption(s,id), {event:event.id,title:event.title,body:event.body,options:event.choices,selected:id});
  }
  settle(policy=this.policy, limit=300) {
    for(let i=0;i<limit;i++) {
      if(this.state.battle) { this.fight(); continue; }
      if(this.state.event) {
        const pick=policy(this.state.event,this.state,this) ?? ordinaryChoice(this.state.event);
        assert.ok(pick, `${this.id}: provide a roleplay policy for ${this.state.event.id}: ${this.state.event.choices.map(c=>c.id).join(', ')}`);
        this.choose(pick); continue;
      }
      if(this.state.conversations?.pending) {
        const id=this.state.conversations.pending.personId;
        const view=getThread(this.state,id);
        const options=view.replies||[];
        assert.ok(options.length,`${this.id}: explicit pending conversation reply needed for ${id}`);
        const reply=policy({id:`conversation_${id}`,choices:options},this.state,this);
        assert.ok(reply,`${this.id}: choose a reply for ${id}`);
        this.step(`reply:${id}:${reply}`,s=>engine.replyMessage(s,id,reply)); continue;
      }
      return this;
    }
    throw new Error(`${this.id}: too many interruptions while settling`);
  }
  grow(age, policy=this.policy, limit=4000) {
    for(let i=0;i<limit;i++) {
      this.settle(policy);
      if(this.state.phase==='retired' || this.state.age>=age && this.state.timeline.yearTarget===null) return this;
      if(this.state.timeline.journey) this.step('continue-road',engine.continueJourney);
      else if(this.state.careers?.batch) this.act('career_batch_continue');
      else if(this.state.workshop?.project) this.act('workshop_continue');
      else this.step(this.state.timeline.yearTarget===null?'age-up':'continue-age-up',this.state.timeline.yearTarget===null?engine.ageUp:engine.continueAgeUp);
    }
    throw new Error(`${this.id}: could not reach age ${age}`);
  }
  move(id, policy=this.policy) {
    this.settle(policy);
    if(this.state.locationId===id) return this;
    this.step(`travel:${id}`,s=>engine.travelTo(s,id));
    for(let i=0;i<500;i++) {
      this.settle(policy);
      if(!this.state.timeline.journey) {
        assert.equal(this.state.locationId,id,`${this.id}: travel did not reach ${id}`);return this;
      }
      this.step('continue-road',engine.continueJourney);
    }
    throw new Error(`${this.id}: road never finished`);
  }
  fight(mode='win', chooser=null) {
    assert.ok(this.state.battle,`${this.id}: no actual battle`);
    const initial=this.state.battle;
    let battle=initial;
    for(let i=0;i<600 && !battle.outcome;i++) {
      const options=getBattleActions(battle).filter(a=>!a.disabledReason);
      const party=battle.actors.filter(a=>a.side==='party'&&a.hp>0);
      const enemies=battle.actors.filter(a=>a.side==='enemy'&&a.hp>0);
      const injured=[...party].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      const enemy=[...enemies].sort((a,b)=>a.hp-b.hp)[0];
      let pick=chooser?.(battle,options);
      if(!pick && mode==='retreat') pick={id:'retreat'};
      if(!pick && mode==='defeat') pick={id:'defend'};
      if(!pick) {
        const heal=options.find(a=>a.id==='skill'&&a.targetSide==='party');
        const potion=options.find(a=>a.id==='potion');
        const attack=options.find(a=>a.id==='skill'&&a.targetSide==='enemy')||options.find(a=>a.id==='attack');
        pick=injured?.hp<injured?.maxHp*.42 && heal ? {id:heal.id,target:injured.id} : injured?.hp<injured?.maxHp*.30 && potion ? {id:potion.id,target:injured.id} : {id:attack?.id,target:enemy?.id};
      }
      assert.ok(options.some(a=>a.id===pick.id),`${this.id}: unavailable combat move ${pick.id}`);
      const next=takeBattleAction(battle,pick.id,pick.target);
      assert.notEqual(fingerprint(next),fingerprint(battle),`${this.id}: combat stuck on ${pick.id}`);
      this.log.push({operation:`combat:${battle.encounterId}:${pick.id}`,day:this.state.day,age:this.state.age,actor:battle.currentActorId,target:pick.target||null,round:battle.round});
      battle=next;
    }
    assert.ok(battle.outcome,`${this.id}: unfinished battle`);
    return this.step(`battle-result:${initial.encounterId}:${battle.outcome}`,s=>engine.resolveBattle(s,battle),{outcome:battle.outcome});
  }
  finishBatch(policy=this.policy) {
    for(let i=0;i<500;i++) {
      this.settle(policy);
      if(!this.state.careers?.batch)return this;
      this.act('career_batch_continue');
    }
    throw new Error(`${this.id}: work commitment did not finish`);
  }
  retire(policy=this.policy) {
    if(this.state.phase==='retired')return this;
    this.grow(30,policy).settle(policy).act('retire').choose('settle');return this;
  }
  summary() {
    const s=this.state;
    return {id:this.id,config:this.config,completed:s.phase==='retired'||s.campaign?.ending!=null,terminal:s.phase==='retired'?'closed-life':s.campaign?.ending?.id||'ongoing',age:s.age,day:s.day,generation:s.dynasty?.generation,operations:this.log.length,choices:this.log.filter(x=>x.selected).length,uniqueActions:[...new Set(this.log.filter(x=>x.operation.startsWith('action:')).map(x=>x.operation.slice(7)))],uniqueEvents:[...new Set(this.log.filter(x=>x.event).map(x=>x.event))],battleOutcomes:this.log.filter(x=>x.outcome).map(x=>({encounter:x.operation,outcome:x.outcome})),profession:s.hero.profession,calling:s.hero.specialization,path:s.hero.path,condition:s.hero.condition?.type||null,gold:s.hero.gold,children:s.life?.children?.map(c=>({id:c.id,name:c.name,bornDay:c.bornDay,alive:c.alive}))||[],ending:s.campaign?.ending||null,world:s.world.locations.map(p=>({id:p.id,name:p.name,status:p.status})),factions:s.factions,findings:this.findings,initialHash:this.initialHash,finalHash:fingerprint(s)};
  }
  save(directory='artifacts/playtest') {
    mkdirSync(directory,{recursive:true});
    writeFileSync(`${directory}/${this.id}.json`,JSON.stringify({summary:this.summary(),log:this.log,state:this.state},null,2)+'\n');return this.summary();
  }
}
