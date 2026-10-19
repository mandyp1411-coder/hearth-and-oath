// Prospective, bounded prose. No save migration or mechanical terms live here.
export const STORY_FLAVOR = 'household-causeway-1';
export function personalFlavor(arc,row){
 if(arc.id!=='hearth_letter'||arc.chapter>2)return row;
 const openings=[
  '{name} lays a soot-stained agreement on the table. “I thought it was something to light the fire with.” Beneath the hearthstone, the folded paper has survived better than the household’s memory of it. The creditor says it binds the family to years of service; the written amount is small. “Show me where it says years,” {name} says. There is room beside the old signatures for a copy, not another promise.',
  '{name} brings the witness’s account back to the household: one room, one payment, and a promise nobody wrote down. Two relatives want the room for different reasons, and each has started calling it theirs. “We have one door,” {name} says, setting the letter between them. “Shouting has not made a second.” You can hear their claims, arrange a limited lease, or alter the claim to take the only key.',
  'The creditor returns to {place} with a copy of the household account. {name} spreads the papers out so that none covers another. “If we leave this folded up again, somebody else will grow old arguing over it.” The remaining claim needs a decision: settle what was actually agreed before willing witnesses, separate your own property, or use the claim to demand obedience.'
 ];
 const corrected='Your correction is already filed beside the earlier household agreement. {name} lays the two papers on the table. “That claim is withdrawn. Now can we talk about the room?” The altered sole-key claim is withdrawn, not an unanswered accusation. The household needs a plan for this season: shared use, a bounded lease, or fresh exclusive terms imposed by you. The correction will stay on file whichever you choose.';
 return [arc.legalReply?.choice==='correct'&&arc.chapter===2?corrected:openings[arc.chapter],...row.slice(1).map((c,i)=>({...c,...(arc.chapter===0&&i===2?{outcome:'You disclose a private household account to the creditor in exchange for relief. The payment does not turn the disclosed confidence into your property; the account records what you gave away.'}:{}),narrativeFlavor:STORY_FLAVOR}))];
}
export function flavoredCompletion(before,after){
 const p=before.stories?.project||before.stories?.pending;
 if(p?.arcId==='hearth_letter'&&p.rowSnapshot?.[1]?.narrativeFlavor===STORY_FLAVOR){
  const old=before.stories.arcs.find(a=>a.id===p.arcId),next=after.stories?.arcs.find(a=>a.id===p.arcId);
  if(next?.chapter>old?.chapter)return true;
 }
 const r=before.rpg?.project||before.rpg?.pending;
 if(r?.id==='rainward_last_lantern'&&(r.narrativeFlavor===STORY_FLAVOR||r.details?.choice?.narrativeFlavor===STORY_FLAVOR)){
  const old=before.rpg.arcs.find(a=>a.id===r.id),next=after.rpg?.arcs.find(a=>a.id===r.id);
  if(next?.chapter>old?.chapter)return true;
 }
 return false;
}
