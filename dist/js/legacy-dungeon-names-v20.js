// Immutable v0.20–0.27 naming contract for authenticating saved dungeon snapshots.
// Fresh people continue to use the current naming catalog.
import { NAME_CULTURES_V20 } from './name-cultures-v20.js';

// Independent of the world module, so names and world generation share no cycle.
function roll(seed,salt,range){let h=2166136261;const input=`${String(seed??'hearth')}\u001f${String(salt??'')}`;for(let i=0;i<input.length;i++)h=Math.imul(h^input.charCodeAt(i),16777619);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return(h>>>0)%Math.max(1,range);}
const races=['human','human','human','human','human','elf','elf','dwarf','dwarf','halfling','halfling','orc','orc','goblin','tiefling','beastfolk'];
export function defaultNamingIdentity(seed,id){const ancestry=races[roll(seed,`person:${id}:ancestry`,races.length)],pronouns=['he/him','she/her','they/them','he/him','she/her'][roll(seed,`person:${id}:pronouns`,5)],heritages=Object.keys(NAME_CULTURES_V20[ancestry].heritages);return {ancestry,pronouns,heritage:heritages[roll(seed,`person:${id}:heritage`,heritages.length)]};}
export function culturalName(seed='hearth',id='person',options={}){
  const defaults=defaultNamingIdentity(seed,id),ancestry=options.ancestry||options.appearance?.ancestry||defaults.ancestry,base=NAME_CULTURES_V20[ancestry]||NAME_CULTURES_V20.human;
  const requested=options.heritage||options.appearance?.heritage||defaults.heritage,heritage=base.heritages[requested]?requested:Object.keys(base.heritages)[roll(seed,`person:${id}:heritage`,Object.keys(base.heritages).length)],culture=base.heritages[heritage];
  const pronouns=options.pronouns||defaults.pronouns,presentation=options.presentation||options.appearance?.portraitPresentation||({ 'he/him':'masculine','she/her':'feminine','they/them':'neutral' })[pronouns]||'neutral',gender=presentation==='androgynous'?'neutral':presentation;
  const used=new Set(options.usedNames||[]);let result;
  for(let attempt=0;attempt<128;attempt++){
    const key=`name:${id}:${attempt}`,pick=(salt,values)=>values[roll(seed,`${key}:${salt}`,values.length)],source=roll(seed,key+':source',4)<3?culture:base;
    const pool=source.given[gender]||source.given.neutral,fragments=source.givenFragments;
    const given=roll(seed,key+':composed',3)===0?pick('start',fragments.starts)+pick('end',fragments.ends):pick('given',pool);
    const familySource=roll(seed,key+':family-source',4)<3?culture.family:base.family;
    const family=options.familyName||pick('format',familySource.formats).replace('{root}',pick('root',familySource.roots)).replace('{ending}',pick('ending',familySource.endings));
    const name=`${given} ${family}`.slice(0,40);
    result={version:1,name,given,family,ancestry:base===NAME_CULTURES_V20[ancestry]?ancestry:'human',heritage,culture:culture.label,lore:culture.lore};
    if(!used.has(name))break;
  }
  return result;
}
