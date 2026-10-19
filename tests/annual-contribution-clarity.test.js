import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import {birthEvent,applyBirthChoice} from '../dist/js/birth.js';
import {groundedEvent} from '../dist/js/grounded-narrative-content.js';

const context=s=>({
  setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},
  journal(){},onBirthday(){},remember(){},standing(){},finishObligation(){},
});

test('grounded prose preserves conditional numerical contribution terms without inventing a fee',()=>{
  const s={seed:'conditional-quote',age:30,day:10950,locationId:'home',hero:{gold:100},life:{people:[]},world:{locations:[{id:'home',name:'Home'}]},timeline:{}};
  for(const amount of [8,15]){
    const description=`Contribute ${amount} gold if you have it; otherwise bring what help you can.`;
    const event={id:'birth_adult_year',title:'A room for the next household',body:'A household needs a room.',choices:[{id:'courage',label:'Contribute what you can',description,effect:{cost:amount}}]};
    const before=structuredClone({s,event}),shown=groundedEvent(s,event);
    assert.equal(shown.choices[0].description,description);
    assert.deepEqual(shown.choices[0].effect,{cost:amount});
    assert.deepEqual({s,event},before,'wording must not spend or mutate the underlying offer');
  }
  const noQuote=groundedEvent(s,{id:'birth_adult_year',title:'A room for the next household',choices:[{id:'courage',label:'Help',description:'Contribute what help you can.'}]});
  assert.equal(noQuote.choices[0].description,'Choose this action.','a nonnumerical contribution is not an invented numerical fee');
});

// Controlled annual-scene subsystem fixture, not a shortcut through actual life
// aging. Use the production scheduler to locate the original eight-Gold offer,
// then retain the same seed/year/typed effect for the current edition.
function annualContribution(gold){
  const base=engine.createBirthGame({seed:'adult-edition-v9',household:'poor'});
  delete base.timeline.storybook;
  for(let age=19;age<35;age++){
    const old=structuredClone(base);old.age=age;old.day=age*365;old.event=null;
    old.timeline.yearStartDay=old.day;old.timeline.contentVersion=6;old.hero.gold=gold;
    birthEvent(old,context(old));
    const pick=old.event.choices.find(c=>/\bSpend 8 gold/.test(c.description))?.id;
    if(!pick)continue;
    const s=structuredClone(base);s.age=age;s.day=old.day;s.event=null;s.timeline.yearStartDay=s.day;s.hero.gold=gold;
    birthEvent(s,context(s));
    return {s,pick};
  }
  throw Error('The fixed production annual schedule no longer contains its eight-Gold contribution; review this fixture deliberately.');
}

for(const gold of [100,8,7,0])test(`current annual contribution quotes its exact conditional fee with ${gold} Gold available`,()=>{
  const {s,pick}=annualContribution(gold),choice=s.event.choices.find(c=>c.id===pick),day=s.day,eventId=s.event.id;
  assert.match(choice.description,/Contribute 8 gold if you have it; otherwise bring what help you can\./);
  assert.equal(s.hero.gold,gold,'showing the annual offer does not pay it');
  s.event=null;
  assert.equal(applyBirthChoice(s,eventId,pick,context(s)),true);
  assert.equal(s.hero.gold,gold>=8?gold-8:gold,'the existing conditional deduction is unchanged, without overdraft or partial collection');
  assert.equal(s.day,day,'this wording fix adds no simulated time');
});
