import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { authoredSceneIssues } from '../dist/js/story-authoring.js';
import { LIFE_STORIES } from '../dist/js/life-stories.js';
import { captureStoryRow } from '../dist/js/story-continuity.js';
test('all current personal chapters retain valid captured attendance, fees and proceeds',()=>{
 for(const d of LIFE_STORIES)for(let chapter=0;chapter<3;chapter++){
  const arc={id:d.id,chapter,contentVersion:4,choices:[]},row=captureStoryRow(arc,d.chapters[chapter]);
  const choices=row.slice(1).map((c,i)=>({...c,id:['care','enterprise','coercion'][i],description:c.outcome}));
  assert.deepEqual(authoredSceneIssues({title:d.title,body:row[0],choices},{age:22},{requires:{adult:true}}),[],d.id+':'+chapter);
 }
});
test('the authoring guard detects missing school context, speech, people and malformed quotes',()=>{
 const scene={title:'A Lesson',body:'A teacher asks a question.',choices:[{id:'answer',label:'Answer',description:'One day.',days:1,cost:0}]};
 const s={age:1,locationId:'home',education:{enrolled:false,attendance:0},life:{people:[]}};
 assert.equal(authoredSceneIssues(scene,s,{requires:{speaking:true,school:true,people:['missing-teacher'],local:true}}).length,3);
 assert.ok(authoredSceneIssues({...scene,choices:[{...scene.choices[0],cost:NaN}]},{age:20}).length);
});
test('a declared childhood seed replays the same observations without infant replies or letters',()=>{
 const replay=()=>{let s=E.createBirthGame({seed:'authoring-replay-v59',familySetup:'two_parents',household:'tradesfolk'}),observations=0;
  for(let step=0;s.age<3&&step<100;step++){
   if(s.event){assert.equal(s.event.choices.length,1);assert.equal(s.event.choices[0].id,'continue');s=E.chooseEventOption(s,'continue');observations++;}
   else s=s.timeline.yearTarget!==null?E.continueAgeUp(s):E.ageUp(s);
   assert.ok(E.validateSave(s));
  }assert.equal(s.age,3);assert.ok(observations>=3);return s;};
 const a=replay(),b=replay();assert.deepEqual(a,b);assert.ok((a.inbox?.entries||[]).every(n=>n.kind!=='letter'||n.day>=(a.timeline.birthDay||0)+3*365));
});
