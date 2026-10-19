import { seededRoll } from './world.js';
import { ATMOSPHERE_VIGNETTES, immersiveStoryPerson } from './immersive-story-content-v18.js';

const INTERVAL=120;
const living=p=>p&&p.alive!==false&&p.status!=='dead';
const participants=s=>[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[])].filter(living);
/** Called only by the engine after time passes. Queries and redraws never write prose. */
export function recordLifeAtmosphere(s,oldDay,newDay,journal){
  if(!s.stories||s.phase==='retired'||newDay<=oldDay||Math.floor(newDay/INTERVAL)<=Math.floor(oldDay/INTERVAL))return false;
  const generation=s.dynasty?.generation||1;
  const previous=s.journal.filter(entry=>entry.tag==='atmosphere'&&(entry.generation||1)===generation);
  if(previous.some(entry=>Math.floor(entry.day/INTERVAL)>=Math.floor(newDay/INTERVAL)))return false;
  const used=new Set(previous.map(entry=>entry.title));
  const rows=ATMOSPHERE_VIGNETTES.filter(row=>!used.has(row.title)&&row.eligible(s)&&(!row.actor||living(immersiveStoryPerson(s,row.actor(s)))));
  if(!rows.length)return false;
  const row=rows[seededRoll(s.seed,`atmosphere:${generation}:${Math.floor(newDay/INTERVAL)}:${s.locationId}`,rows.length)];
  const person=row.actor?immersiveStoryPerson(s,row.actor(s)):participants(s).find(p=>p.age>=18)||participants(s)[0];
  if(row.text.includes('{name}')&&!person)return false;
  const location=s.world.locations.find(p=>p.id===s.locationId);
  const text=row.text.replaceAll('{name}',person?.name||'').replaceAll('{place}',location?.name||'this place').replaceAll('{work}',String(s.hero.profession||'work').toLowerCase());
  journal(row.title,text,'atmosphere',{literal:true});
  return true;
}
