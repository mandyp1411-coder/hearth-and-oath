import { culturalNameV31, defaultNamingIdentityV31, namingLoreV31 } from './cultural-name-catalog-v31.js';
import { NAME_CULTURES_V20, REGION_NAME_LORE_V20 } from './name-cultures-v20.js';

// Independent of the world module, so names and world generation share no cycle.
function roll(seed,salt,range){let h=2166136261;const input=`${String(seed??'hearth')}\u001f${String(salt??'')}`;for(let i=0;i<input.length;i++)h=Math.imul(h^input.charCodeAt(i),16777619);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return(h>>>0)%Math.max(1,range);}
const races=['human','human','human','human','human','elf','elf','dwarf','dwarf','halfling','halfling','orc','orc','goblin','tiefling','beastfolk'];
export function defaultNamingIdentity(seed,id){return defaultNamingIdentityV31(seed,id);}
export function culturalName(seed='hearth',id='person',options={}){return culturalNameV31(seed,id,options);}
export function namingLore(ancestry,heritage){return namingLoreV31(ancestry,heritage);}
export function regionalNamingLore(id){return REGION_NAME_LORE_V20[id]||REGION_NAME_LORE_V20.rainward;}
export function culturalPlaceName(seed,id,regionId){const p=regionalNamingLore(regionId),pick=(salt,values)=>values[roll(seed,`place:${id}:${salt}`,values.length)];return pick('format',p.placeFormats).replace('{root}',pick('root',p.placeRoots)).replace('{ending}',pick('ending',p.placeEndings));}

export function familyNameOf(person){if(person?.naming?.name===person?.name)return person.naming.family;const parts=String(person?.name||'').trim().split(/\s+/),of=parts.indexOf('of');return of>=0?parts.slice(of).join(' '):parts.length>1?parts.at(-1):'';}
