import { LINKED_CURSE_ATLASES_V27 } from './linked-curse-art-v27.js';
import { CURSE_STYLE_OVERRIDES_V39 } from './curse-style-v39.js';
import { legacyCursePortraitFamily } from './portrait-library.js';
export function linkedTransformationPortrait(person,a,age){
 const c=person?.condition;if(!c||c.curseVersion!==1||c.stage==='incubating'||age<18)return null;
 if(c.type!=='vampire'&&!(c.type==='lycanthrope'&&c.form!=='human'))return null;
 const stage=(c.type==='vampire'?(c.apparentAge??age):age)>=65?'elder':'adult';
 const family=legacyCursePortraitFamily(a,{age:c.type==='vampire'?(c.apparentAge??age):age});if(!family)return null;
 const form=c.type==='lycanthrope'?3:c.hunger>=85||c.humanity<40||c.form==='feral'?2:c.hunger>=60||c.humanity<65?1:0;
 const atlas=LINKED_CURSE_ATLASES_V27.find(x=>x.age===stage&&x.ancestry===a.ancestry&&x.half===family.half);if(!atlas)return null;
 const native=CURSE_STYLE_OVERRIDES_V39[atlas.id]||atlas;
 const cell=Math.floor(family.localFamilyIndex/2)*8+(family.localFamilyIndex%2)*4+form,[x,y,width,height]=native.cells[cell],key=`curse-linked:${family.id}:${stage}:${form}`;
 return {id:key,key,cell,index:-1,stage,ancestry:a.ancestry,presentation:family.presentation,src:native.src,width:native.width,height:native.height,columns:8,rows:8,sourceRect:{x,y,width,height},label:['Composed vampire','Hungry vampire','Feral vampire','The moon beast'][form],familyId:family.id,complexion:family.complexion,hairTone:stage==='elder'?'grey':family.hairTone,morphology:family.morphology,furTone:family.furTone,speciesFamily:family.speciesFamily};
}
