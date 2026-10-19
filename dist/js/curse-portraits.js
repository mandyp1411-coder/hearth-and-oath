import { linkedTransformationPortrait } from './linked-transformations-v27.js';
import { CURSE_ART_ASSETS } from './curse-art-v23.js';
import { BLOOD_LINEAGES } from './curses.js';
import { portraitPhenotype } from './portrait-library.js';
import { heritageById } from './heritages.js';
import { BEAST_VAMPIRE_CROPS,MUSTELID_VAMPIRE_CROPS } from './curse-portrait-crops.js';
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const presentations=['masculine','feminine','androgynous'];
export function transformationPortrait(person,appearance,age){
  const c=person?.condition;if(!c||age<18||c.stage==='incubating')return null;
  const linked=linkedTransformationPortrait(person,appearance,age);if(linked)return linked;
  const ancestry=races.includes(appearance.ancestry)?appearance.ancestry:'human',race=races.indexOf(ancestry);
  const presentation=presentations.includes(appearance.portraitPresentation)?appearance.portraitPresentation:'androgynous';
  let src,row,column,label,rect,family;
  if(c.type==='vampire'&&c.curseVersion===1){
    column=Math.max(0,BLOOD_LINEAGES.findIndex(l=>l.id===c.bloodline));
    row=c.hunger>=100||c.humanity<20?3:c.hunger>=85||c.humanity<40?2:c.hunger>=60||c.humanity<65?1:0;
    src=`art/curses/vampire-${ancestry}-${presentation}.avif`;label=['Composed','Starved','Predatory','Feral'][row];
    if(ancestry==='beastfolk'){
      const anchor=portraitPhenotype(appearance),morphology=anchor.morphology==='unknown'?heritageById(appearance.heritage,ancestry)?.morphology:anchor.morphology;
      family={bear:'bear',horned:'goat',long_eared:'hare',feline:'feline',canine:'canine',other:'mustelid'}[morphology]||'canine';
      if(['bear','goat','hare'].includes(family)){
        column=['bear','goat','hare'].indexOf(family);src=`art/curses/vampire-beastfolk-supplement-${presentation}.avif`;
        rect=BEAST_VAMPIRE_CROPS[presentation].find(p=>p.row===row&&p.column===column).rect;
      }else if(family==='mustelid'){
        column=presentations.indexOf(presentation);src='art/curses/vampire-beastfolk-mustelid.avif';
        rect=MUSTELID_VAMPIRE_CROPS.find(p=>p.row===row&&p.column===column).rect;
      }else column=family==='feline'?2:0;
    }
  }else if(c.type==='lycanthrope'&&c.curseVersion===1&&c.form!=='human'){
    column=race%4;row=c.form==='restrained'?2:c.form==='feral'?3:c.moonsLived===1?0:1;
    src=`art/curses/wolf-${age>=65?'elder':'adult'}-${race<4?'a':'b'}.avif`;label=['The first change','Uncontrolled beast','Restrained beast','Broken restraint'][row];
  }else return null;
  const key=`curse:${ancestry}:${presentation}:${family||c.type}:${column}:${row}`;
  const sourceRect=rect?{x:rect[0]*100/1254,y:rect[1]*100/1254,width:rect[2]*100/1254,height:rect[3]*100/1254}:{x:column*25,y:row*25,width:25,height:25};
  return {id:key,key,cell:row*4+column,index:-1,stage:(c.type==='vampire'?(c.apparentAge??age):age)>=65?'elder':'adult',ancestry,presentation,src:CURSE_ART_ASSETS[src.split('/').pop()],width:1254,height:1254,columns:4,rows:4,sourceRect,label,family};
}
