import assert from 'node:assert/strict';
// Historical mechanical comparator for tests that isolate transition effects.
// Captured import prose uses the stricter assertCapturedMigration below.
export function assertMigrationMechanics(before,after,path='state'){
 if(path.endsWith('.conversations.pending')){assert.equal(after?.personId??null,before?.personId??null);return;}
 if(path.endsWith('.memories')&&Array.isArray(before)){assert.equal(after.length,before.length);return;}
 const key=path.split('.').at(-1);
 if(key==='revision'){assert.ok(after>=before);return;}
 if(['title','body','text','description','label','summary','notice','chronicle'].includes(key)&&typeof before==='string'){assert.equal(typeof after,'string',path);return;}
 if(key==='outcome'&&typeof before==='string'&&before.length>30){assert.equal(typeof after,'string',path);return;}
 if(Array.isArray(before)){assert.equal(after.length,before.length,path);before.forEach((v,i)=>assertMigrationMechanics(v,after[i],path+'['+i+']'));return;}
 if(before&&typeof before==='object'){for(const [key,v]of Object.entries(before)){assert.ok(Object.hasOwn(after,key),path+'.'+key);assertMigrationMechanics(v,after[key],path+'.'+key);}return;}
 assert.deepEqual(after,before,path);
}
export function assertEventMechanics(before,after){if(!before){assert.equal(after,before);return;}assert.equal(after.id,before.id);assert.deepEqual(after.choices.map(c=>c.id),before.choices.map(c=>c.id));for(let i=0;i<before.choices.length;i++)for(const [key,v]of Object.entries(before.choices[i]))if(!['label','description'].includes(key))assert.deepEqual(after.choices[i][key],v);}

// Current preservation contract: added sidecars are allowed, captured values
// remain exact. The sole choice conversion is infancy's observer-only policy.
export function assertCapturedMigration(before,after,path='state'){
 if(path.endsWith('.event')&&before&&after?.observationVersion===1){
  assert.ok(before.id==='birth_arrival'||/^birth_year_[012]$/.test(before.id)||before.id==='health_concern',path);
  assert.equal(after.id,before.id);assert.equal(after.title,before.title);assert.equal(after.body,before.body);
  assert.deepEqual(after.choices.map(c=>c.id),['continue']);assert.equal(after.choices[0].owner,'observer');return;
 }
 const key=path.split('.').at(-1);
 if(key==='revision'){assert.ok(after>=before,path);return;}
 if(key==='narrativeEdition'){assert.equal(after,30,path);return;}
 if(Array.isArray(before)){
  const expected=path.includes('.conversations.threads.')?before.filter(m=>!Number.isInteger(m.age)||m.age>=3):before;
  assert.equal(after.length,expected.length,path);expected.forEach((v,i)=>assertCapturedMigration(v,after[i],path+'['+i+']'));return;
 }
 if(before&&typeof before==='object'){for(const [key,value] of Object.entries(before)){assert.ok(Object.hasOwn(after,key),path+'.'+key);assertCapturedMigration(value,after[key],path+'.'+key);}return;}
 assert.deepEqual(after,before,path);
}
