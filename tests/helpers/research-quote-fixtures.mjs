import assert from 'node:assert/strict';
import {copy,roundtrip,freshStory,act,pick,walk,acceptResearch} from './story-life-fixtures.mjs';
import {settlementServices} from '../../dist/js/world-services.js';
import {projectLifePerson} from '../../dist/js/world-people-v31.js';
import {registerWorldLifeRecord} from '../../dist/js/lineage.js';
import {initializeFamilyDepth} from '../../dist/js/household.js';
import {reconcileNpcContinuity,validateNpcContinuity} from '../../dist/js/npc-continuity.js';

// Controlled source captures from the immutable played v30 fixture. Real public
// commands acquire every source/consent; not naturally earned life/balance proof.
const prepared=new Map();
export function researchQuotePending({place='homes',quote=false}={}) {
  assert.ok(['homes','archive'].includes(place));
  if(!prepared.has(quote)) {
    let s=acceptResearch(freshStory({home:true}));
    for(const id of ['axle_rubbing','repair_shares'])s=act(s,'research_copy_'+id);
    if(quote) {
      const maker=settlementServices(s).find(row=>row.kind==='smith');assert.ok(maker);
      s=walk(s,maker.roomId);s=act(s,'research_consult');s=pick(s,'hear');
      s=act(s,'research_quote');s=pick(s,'ask');
      assert.equal(s.researchPortfolio.runs[0].permissions.find(p=>p.scope==='quote').decision,'willing','the actual named craftsperson must genuinely grant quotation; never forge consent');
    }
    s=walk(s,'homes');s=act(s,'research_compare');s=pick(s,'compare');
    s=act(s,'research_interpret');s=pick(s,'shared_repair');prepared.set(quote,roundtrip(s));
  }
  let s=walk(copy(prepared.get(quote)),place);s=act(s,'research_conclude');
  assert.equal(s.event.id,'research_conclude');
  for(const c of s.event.choices)if(['public','public_quote','private'].includes(c.id)) {
    assert.equal(c.days,0);assert.match(c.description,/No time or Gold\.$/,'retain the historical raw snapshot, repair only the rendered quote');
  }
  if(quote)assert.ok(s.event.choices.some(c=>c.id==='public_quote'));
  return roundtrip(s);
}

export function researchQuoteVacancy(original) {
  const state=copy(original),before=copy(original),ref=state.researchPortfolio.runs[0].cast.archivist;
  const old=settlementServices(state,{siteId:ref.locationId}).find(row=>row.personId===ref.id);assert.ok(old);
  // Controlled recorded death + normal public reconciliation, not a naturally
  // played death and never a live-browser or imported user-state mutation.
  const person=projectLifePerson(state,{...old.person,roomId:old.roomId});assert.ok(person);
  person.alive=false;person.deathDay=state.day;registerWorldLifeRecord(state,person);initializeFamilyDepth(state);reconcileNpcContinuity(state);
  assert.ok(validateNpcContinuity(state));assert.equal(state.npcContinuity.people[ref.id].retiredDay,state.day);
  const next=settlementServices(state,{siteId:ref.locationId}).find(row=>row.kind===old.kind&&row.subjectId===old.subjectId);
  assert.ok(next);assert.notEqual(next.personId,ref.id);assert.deepEqual(original,before,'vacancy setup is detached');
  return {state:roundtrip(state),previous:copy(ref),next:copy(next)};
}
