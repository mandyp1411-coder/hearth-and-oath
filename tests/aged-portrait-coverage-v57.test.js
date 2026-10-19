import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { agedPortraitCatalogSource, compileAgedPortraitCatalog } from '../scripts/build-aged-portraits-v57.mjs';
import { verifyAgedPortraitCoverage } from '../scripts/verify-aged-portraits-v57.mjs';
import * as original from '../dist/js/portrait-library.js';
import * as heritages from '../dist/js/heritages.js';

const stages=['mature','older','elder'];
async function fixture(){
  const directFamily=original.PORTRAIT_FAMILIES.find(f=>!f.modern&&f.ancestry==='human'&&f.presentation==='masculine'&&f.complexion==='light'&&original.portraitEntry(f.selections.adult)?.cell===0);
  const adult=original.portraitEntry(directFamily.selections.adult),sourceId=adult.key.split(':')[0];
  const modern=original.PORTRAIT_FAMILIES.find(f=>f.modern&&f.ancestry==='human'&&f.presentation===adult.presentation&&f.complexion===adult.complexion);
  const bytes=await readFile(new URL('../dist/'+adult.src.slice(2),import.meta.url)),sha=createHash('sha256').update(bytes).digest('hex');
  // Existing image bytes exercise native registration without creating art or
  // changing the shipped catalogue. Only this imported test runtime sees them.
  const source={id:sourceId,ancestry:adult.ancestry,rows:1,columns:1,referencePath:'dist/'+adult.src.slice(2),referenceSha256:sha,entries:[{cell:0,adultKey:adult.key,presentation:adult.presentation,complexion:adult.complexion}]};
  const receipts=stages.map(stage=>({id:`verifier-fixture-${stage}-57`,adultAtlasId:sourceId,ancestry:adult.ancestry,stage,target:`art/presets/verifier-fixture-${stage}-57.avif`,src:`./art/presets/verifier-fixture-${stage}-57.avif`,width:adult.width,height:adult.height,rows:1,columns:1,cells:[[0,0,100,100]],entries:[{cell:0,adultKey:adult.key,presentation:adult.presentation,complexion:adult.complexion,hairTone:adult.hairTone}],encodedSha256:sha,status:'accepted',visualReview:{reviewer:'test fixture only',reviewedAt:'2026-10-18T00:00:00.000Z',grid8x8:true,identityPreserved:true,ageAppropriate:true,presentationPreserved:true,phenotypePreserved:true},provenance:{generator:'built-in image_gen',prompt:'Test fixture only; these are existing native bytes, not new age paintings.',referenceSha256:sha}}));
  const readAsset=target=>target.includes('verifier-fixture-')?Promise.resolve(bytes):readFile(new URL('../dist/'+target,import.meta.url));
  const compiled=await compileAgedPortraitCatalog(receipts,{adultEntries:[adult],readAsset});
  let code=await readFile(new URL('../dist/js/portrait-library.js',import.meta.url),'utf8');
  code=code.replace(/^import \{ AGED_PORTRAIT_ATLASES_V57, AGED_PORTRAIT_COUNTERPARTS_V57 \} from '.\/aged-portraits-v57.js';$/m,`const AGED_PORTRAIT_ATLASES_V57=${JSON.stringify(compiled.atlases)},AGED_PORTRAIT_COUNTERPARTS_V57=${JSON.stringify(compiled.counterparts)};`);
  code=code.replace(/from '\.\/([^']+)';/g,(_,name)=>`from '${new URL('../dist/js/'+name,import.meta.url).href}';`);
  const imported=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const keys=new Set([adult.key,...Object.values(directFamily.selections),...Object.values(modern.selections),...Object.values(compiled.counterparts[adult.key])]);
  const runtime={...imported,PORTRAIT_LIBRARY:imported.PORTRAIT_LIBRARY.filter(p=>keys.has(p.key)),PORTRAIT_FAMILIES:[directFamily,modern]};
  return {inventory:{atlases:[source]},queue:{jobs:receipts.map(r=>({id:r.id,adultAtlasId:r.adultAtlasId,ancestry:r.ancestry,stage:r.stage,target:r.target,status:'accepted',expectedPortraits:1,referenceSha256:sha}))},receipts,atlases:compiled.atlases,counterparts:compiled.counterparts,runtime,heritages,readAsset,expected:{adultAtlases:1,adultAnchors:1,jobs:3,paintings:3,modernAdultFamilies:1},adult,directFamily,modern};
}

test('final coverage checks real runtime identity, preserved direct elder links, modern variants and explicit choices',async()=>{
  const options=await fixture(),before=JSON.stringify(options.receipts),result=await verifyAgedPortraitCoverage(options);
  assert.equal(result.status,'passed');assert.equal(result.acceptedJobs,3);assert.equal(result.registeredAgePaintings,3);
  assert.equal(result.runtimeAgeChecks,3);assert.equal(result.legacyPresetChecks,3);assert.equal(result.preservedDirectLinks,1);
  assert.equal(result.modernAdultFamilies,1);assert.equal(result.modernAgeVariantChecks,Object.keys(options.modern.selections).length);
  assert.equal(result.explicitSelectionChecks,6);assert.equal(result.adultReselectionChecks,2);
  assert.deepEqual(result.byPresentation.masculine,{adultAnchors:1,mature:1,older:1,elder:1});
  assert.equal(JSON.stringify(options.receipts),before);
});

test('final coverage rejects unfinished jobs and missing exported age counterparts',async()=>{
  const options=await fixture();options.queue.jobs[0].status='pending-visual-review';
  await assert.rejects(verifyAgedPortraitCoverage(options),/Unaccepted.*generation job/);
  options.queue.jobs[0].status='accepted';delete options.counterparts[options.adult.key].older;
  await assert.rejects(verifyAgedPortraitCoverage(options),/counterpart mapping differs/);
});

test('final coverage accepts the actual generated module after optional undefined fields are serialized',async()=>{
  const options=await fixture();
  assert.ok(Object.values(options.atlases[0].entries[0]).some(value=>value===undefined));
  const generated=await import('data:text/javascript;base64,'+Buffer.from(agedPortraitCatalogSource({atlases:options.atlases,counterparts:options.counterparts})).toString('base64'));
  options.atlases=generated.AGED_PORTRAIT_ATLASES_V57;options.counterparts=generated.AGED_PORTRAIT_COUNTERPARTS_V57;
  assert.equal((await verifyAgedPortraitCoverage(options)).status,'passed');
});

test('final coverage detects a phenotype-compatible unrelated runtime fallback',async()=>{
  const options=await fixture(),normal=options.runtime.selectedPortraitArt;
  options.runtime.selectedPortraitArt=(appearance,identity,context)=>appearance.portraitSelections.adult===options.adult.key&&context.age===45?options.runtime.portraitEntry(options.modern.selections.mature):normal(appearance,identity,context);
  await assert.rejects(verifyAgedPortraitCoverage(options),/age 45 resolved to unrelated fallback/);
});

test('final coverage detects replacement of an explicit saved age selection',async()=>{
  const options=await fixture(),normal=options.runtime.selectedPortraitArt;
  options.runtime.selectedPortraitArt=(appearance,identity,context)=>{
    if(context.age===58&&appearance.portraitSelections.older)return normal({...appearance,portraitSelections:{adult:appearance.portraitSelections.adult}},identity,context);
    return normal(appearance,identity,context);
  };
  await assert.rejects(verifyAgedPortraitCoverage(options),/explicit saved older selection was replaced/);
});
