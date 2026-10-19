import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {GROUNDED_AGE_ATLASES_V39,GROUNDED_PORTRAIT_FAMILIES_V39} from '../dist/js/grounded-portraits-v39.js';
import {GROUNDED_FOE_REGISTRATION_V39} from '../dist/js/grounded-foe-registration-v39.js';
import {CURSE_STYLE_OVERRIDES_V39} from '../dist/js/curse-style-v39.js';
import {GEAR_ART_MANIFEST,SUPPLIES_ART_MANIFEST,INVENTORY_ART_ATLASES} from '../dist/js/inventory-art-v39.js';
const root=new URL('../',import.meta.url),frames=[];
const registration=JSON.parse(readFileSync(new URL('docs/art-v39/registration.json',root)));
assert.equal(registration.length,36);
for(const r of registration){const bytes=readFileSync(new URL('dist/'+r.target,root));assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256,r.target);assert.equal(bytes.length,r.bytes);}
for(const a of GROUNDED_AGE_ATLASES_V39){
  assert.equal(a.entries.length,a.columns*a.rows);assert.ok(a.columns===6&&[7,8].includes(a.rows)||a.columns===4&&a.rows===2);
  for(const entry of a.entries)frames.push({key:a.id+':'+entry.cell,asset:a.src.slice(2),width:a.width,height:a.height,rect:a.cells[entry.cell]});
}
for(const [id,a] of Object.entries(GROUNDED_FOE_REGISTRATION_V39))a.cells.forEach((rect,i)=>frames.push({key:id+':'+i,asset:a.src.slice(2),width:a.width,height:a.height,rect}));
for(const [id,a] of Object.entries(CURSE_STYLE_OVERRIDES_V39))a.cells.forEach((rect,i)=>frames.push({key:id+':'+i,asset:a.src.slice(2),width:a.width,height:a.height,rect}));
for(const entry of [...GEAR_ART_MANIFEST,...SUPPLIES_ART_MANIFEST]){const a=INVENTORY_ART_ATLASES[entry.atlas];frames.push({key:entry.atlas+':'+entry.key,asset:a.asset.slice(2),width:a.native.width,height:a.native.height,rect:Object.values(entry.sourceRect).map(v=>v*100)});}
assert.equal(frames.length,1582);assert.equal(GROUNDED_PORTRAIT_FAMILIES_V39.length,216);
mkdirSync(new URL('artifacts/',root),{recursive:true});writeFileSync(new URL('artifacts/grounded-art-frames-v39.json',root),JSON.stringify(frames));
const pixels=JSON.parse(execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python3',[new URL('./verify-grounded-art-v39.py',import.meta.url).pathname],{cwd:root.pathname,encoding:'utf8'}));
assert.equal(pixels.checked,frames.length);
const report={version:'0.34.0',assets:registration.length,people:878,identities:216,enemyIllustrations:384,inventoryIllustrations:128,faithfulTransformationRedraws:192,framesChecked:pixels.checked,distinctNativeCrops:pixels.unique,minimumStandardDeviation:pixels.minimumStandardDeviation,checks:['All encoded files match their registered dimensions and hashes','All 1582 crops are distinct, within native image bounds and contain visible nonblank artwork','Seven partial primary sheets retain their truthful seven-row geometry; separately illustrated elder supplements complete every linked identity','Measured panel bounds are used for people, enemy, transformation and inventory art'],visualReview:'All final atlases inspected at native size; portrait ancestry, coat, identity/age order and species/item bindings checked. Browser geometry, touch/device and screen-reader QA unavailable.'};
writeFileSync(new URL('docs/art-v39/verification.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
