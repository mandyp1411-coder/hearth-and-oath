import { townNpc, projectNpcPerson, npcContinuationAvailable, retiredNpcContacts, NPC_FAVOR_RETURN_DAYS } from './npc-continuity.js';
import { heldSettlement } from './regional-world-v33.js';
import { isCanonicalAppearance } from './avatar.js';
import { generateCharacter } from './characters.js';
import { seededRoll, isSettlement } from './world.js';
import { personalReadiness } from './people-context.js';
const clamp=n=>Math.max(0,Math.min(100,n)),safe=id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
export function initializeSocialLife(s){if(!s.socialLife)s.socialLife={version:1,attraction:'any',gender:genderOf(s.hero),legacyPartners:[s.life?.partnerId,s.life?.courtshipId].filter(Boolean),met:{},known:{},favors:[],game:null,games:0,lastGameDay:null,lastDiceDay:null,prankDay:null};}
export function residentContacts(s){
 if(!s.socialLife)return [];const result=[];
 for(const site of s.world.locations.filter(p=>isSettlement(s.world,p.id)&&!['destroyed','evacuated'].includes(p.status)&&(p.id===s.locationId||s.cartography?.sites[p.id]?.kind==='Visited'))){
  for(let i=0;i<10;i++){
   const original=townNpc(s,site.id,i),p=projectNpcPerson(s,{...original,...(s.socialLife.met[original.id]||{})}),life=s.life?.people.find(x=>x.id===p.id),relationship=s.conversations?.relationships?.[p.id];
   result.push({...p,minAge:6,available:life?.alive!==false&&p.alive!==false&&!heldSettlement(s,site.id),kind:'extra',source:relationship,bond:relationship?.bond??p.bond??25,population:true});
  }
 }
 for(const saved of Object.values(s.socialLife.met))if(!result.some(x=>x.id===saved.id)){
  const p=projectNpcPerson(s,saved),site=s.world.locations.find(l=>l.id===p.locationId),retired=p.retired===true||s.day>=(p.serviceEndDay??s.day+1),continuation=npcContinuationAvailable(s,p),available=s.life?.people.find(x=>x.id===p.id)?.alive!==false&&p.alive!==false&&(!retired||continuation)&&!!site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false&&!heldSettlement(s,p.locationId);
  result.push({...p,age:p.ageAtRetirement??p.baseAge+Math.floor(Math.min(s.day,p.serviceEndDay??s.day)/365),...(retired?{retired:true,retiredDay:p.retiredDay??p.serviceEndDay,ageAtRetirement:p.ageAtRetirement??p.baseAge+Math.floor((p.serviceEndDay??s.day)/365),availabilityReason:p.availabilityReason||'Their earlier public life is recorded; later whereabouts are unrecorded.'}:{}),...(continuation?{commitmentOnly:true}:{}),minAge:6,available,kind:'extra',source:s.conversations?.relationships?.[p.id],bond:s.conversations?.relationships?.[p.id]?.bond??p.bond??25,population:true});
 }
 return result;
}
export function rememberResident(s,p){if(!s.socialLife||!p?.id.startsWith('townsfolk-')||s.socialLife.met[p.id]||Object.keys(s.socialLife.met).length>=512)return;const original=residentContacts(s).find(x=>x.id===p.id);if(original){const {source,kind,minAge,available,...record}=original;s.socialLife.met[p.id]=structuredClone(record);}}
const genderOf=p=>p.gender||({'he/him':'man','she/her':'woman','they/them':'nonbinary'}[p.pronouns]||'nonbinary');
export function romanceProfile(s,p){
 const gender=genderOf(p),roll=seededRoll(s.seed,'attraction:'+p.id,100),attraction=s.socialLife?.legacyPartners.includes(p.id)?'any':roll<30?'any':roll<62?'men':roll<94?'women':'none';
 const label=attraction==='none'?'Aromantic':attraction==='any'?'Bisexual':gender==='man'?attraction==='men'?'Gay':'Straight':gender==='woman'?attraction==='women'?'Gay':'Straight':attraction==='men'?'Attracted to Men':'Attracted to Women';return {gender,attraction,label};
}
const accepts=(attraction,gender)=>attraction==='any'||attraction==='men'&&gender==='man'||attraction==='women'&&gender==='woman';
export function romanceReason(s,p,{friendship=true}={}){
 if(s.age<18||p.age<18)return 'Romance begins between adults of eighteen or older.';
 if(p.familyRole||/parent|sibling|guardian|your child|relative/i.test(p.role)||s.life.children.some(c=>c.id===p.id))return 'This person is family.';
 if(p.available===false||p.locationId!==s.locationId||s.cartography?.offsite||s.timeline?.journey||s.cartography?.pending)return 'Meet this person where they actually are.';
 if(p.roomId&&p.roomId!==(s.cartography?.interior?.roomId||'gate'))return 'Find them in their part of the settlement.';
 if(s.life.partnerId&&s.life.partnerId!==p.id)return 'You have a committed partner. Resolve that relationship first.';
 if(s.life.courtshipId&&s.life.courtshipId!==p.id)return 'You are already courting someone. Resolve that relationship first.';
 const profile=romanceProfile(s,p);if(!accepts(profile.attraction,s.socialLife?.gender||genderOf(s.hero))||!accepts(s.socialLife?.attraction||'any',profile.gender))return 'Your romantic interests do not match. Friendship is still welcome.';
 if(friendship&&p.bond<55)return 'Build a friendship of at least 55 Bond first.';return personalReadiness(s,p.id);
}
export function projectLifePerson(s,p,{relationship='friend'}={}){
 let person=s.life.people.find(x=>x.id===p.id);if(person)return person;if(s.life.people.length>=128||!safe(p.id))return null;
 const record=s.conversations?.relationships?.[p.id],detail=generateCharacter(s.seed,p.id,{role:p.role,age:p.age,pronouns:p.pronouns});
 person={...detail,appearance:p.appearance||detail.appearance,id:p.id,name:p.name,role:relationship,relation:relationship,disposition:['kind','driven','reserved','bold'].includes(p.disposition)?p.disposition:'kind',baseAge:p.age,bornDay:Number.isSafeInteger(p.bornDay)?p.bornDay:s.day-p.age*365,age:p.age,bond:p.bond,memories:structuredClone(record?.memories||[]),knownFacts:structuredClone(record?.knownFacts||[]),locationId:p.locationId,roomId:p.roomId,description:p.description||'Someone you met in the world.',occupation:p.occupation||p.role,worldSource:true,alive:true};s.life.people.push(person);delete s.conversations.relationships[p.id];return person;
}
const offer=(id,label,description,days=0,cost=0,reason)=>({id,label,description,days,cost,group:'People & Pastimes',...(reason?{disabledReason:reason}:{})});
export function socialLifeActions(s,contacts=[]){
 if(!s.socialLife||s.conversations?.project||s.stories?.project||s.rpg?.project||s.health?.recovery||s.life?.plan||s.researchPortfolio?.project||s.familyOrigins?.project||s.community?.project?.commitment||s.society?.project||s.fellowship?.project||s.pastimes?.project||s.repertoire?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.maze||s.careers?.batch||s.workshop?.project||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite||s.justice?.prison)return [];
 const a=[];
 for(const f of s.socialLife.favors.filter(f=>f.status==='active'))a.push(offer('people_withdraw_'+f.personId,'Withdraw the Favour for '+f.name,'Close this accepted favour without taking supplies, Gold or trust. Its earlier agreement remains recorded.'));
 const returns=retiredNpcContacts(s).filter(p=>npcContinuationAvailable(s,p)&&!contacts.some(c=>c.id===p.id));
 const local=[...contacts,...returns].filter(p=>p.locationId===s.locationId&&(!p.roomId||p.roomId===(s.cartography?.interior?.roomId||'gate')));
 for(const p of local){
  if(!p.commitmentOnly&&s.age>=18&&p.age>=18&&!p.familyRole&&!/parent|sibling|guardian|your child|relative/i.test(p.role)){
   a.push(offer('people_orientation_'+p.id,'Ask about Romantic Interests','A plain conversation about whom they are interested in. Asking grants no affection.'));
   if(!s.life.people.some(x=>x.id===p.id))a.push(offer('people_court_'+p.id,'Ask '+p.name+' on a Date','A close adult friendship may become courtship, when your interests and wishes match. The date takes one day.',1,0,romanceReason(s,p)));
   const repeated=Number.isInteger(s.socialLife.known['hang:'+p.id])&&s.day-s.socialLife.known['hang:'+p.id]<7;
   a.push(offer('people_hang_'+p.id,'Spend an Afternoon Together',`Spend one day, gain ${repeated?1:5} Bond and 5 Joy, and reduce Stress by 4. ${repeated?'Recent company means a smaller familiarity gain. ':''}Friendship does not imply romance.`,1,0,s.socialLife.known['hang:'+p.id]===s.day?'You have already spent time together today.':null));
  }
  const old=s.socialLife.favors.find(f=>f.personId===p.id);
  if(!p.commitmentOnly&&!old&&s.age>=14&&p.id.startsWith('townsfolk-')&&s.conversations.meetings?.[p.id]&&seededRoll(s.seed,'favor:'+p.id,100)<15&&s.socialLife.favors.length<100){const item=['herbs','wood','cloth'][seededRoll(s.seed,'favor-item:'+p.id,3)];a.push(offer('people_favor_'+p.id,'Ask about a Small Favour',`${p.name} needs 2 ${item} and offers 12 Gold. Hear and accept this small request if you want to help.`,0,0,s.socialLife.favors.filter(f=>f.status==='active').length>=8?'Finish an earlier favour first.':null));}
  if(old?.status==='active'){const have=old.item==='herbs'?s.flags.herbs||0:s.equipment.materials[old.item]||0;a.push(offer('people_deliver_'+p.id,'Hand Over the Requested Supplies',`Give 2 ${old.item} to ${p.name}; receive 12 Gold.`,0,0,have<2?'You need 2 '+old.item+'.':null));}
 }
 if(s.age>=6&&isSettlement(s.world,s.locationId)){
  if(!s.socialLife.game)a.push(offer('fun_pairs','Play Runestone Pairs','Open freely · 1 day to finish. Find six pairs for up to 8 Joy and 6 less Stress, once per day.',0,0,s.socialLife.lastGameDay===s.day?'Play again another day.':null));
  else if(s.socialLife.game.matched.length===12)a.push(offer('fun_pairs_finish','Finish the Game','Spend one day; gain 8 Joy and reduce Stress by 6.',1));
  else for(let i=0;i<12;i++)if(!s.socialLife.game.matched.includes(i)&&!s.socialLife.game.revealed.includes(i))a.push(offer('fun_pair_'+i,'Turn Runestone '+(i+1),'Reveal this stone. Find its matching pair.'));
  a.push(offer('fun_prank','Play a Harmless Prank','Spend one day swapping festival masks with willing company. Gain 4 Joy; no theft or injury.',1,0,s.socialLife.prankDay===s.day?'Let the joke rest for today.':null));
  if(s.age>=18)for(const side of ['low','high'])a.push(offer('fun_dice_'+side,'Dice — '+(side==='low'?'Under Seven':'Over Seven'),'Stake 2 Gold and spend one day. Win 4 Gold if two dice total '+(side==='low'?'under':'over')+' seven; a seven returns the stake. Other totals lose it.',1,2,s.hero.gold<2?'Requires 2 Gold.':s.socialLife.lastDiceDay===s.day?'Return another day for another game.':null));
 }
 return a;
}
function bondWith(s,p,amount){const life=s.life.people.find(x=>x.id===p.id),record=life||(s.conversations.relationships[p.id]||={bond:p.bond,memories:[],knownFacts:[]});record.bond=clamp(record.bond+amount);}
function completePairs(s,ctx){if(s.socialLife.game?.matched.length!==12)return false;if(ctx.spendDays(1)!==1||s.phase==='retired')return true;s.life.happiness=clamp(s.life.happiness+8);s.life.stress=clamp(s.life.stress-6);s.socialLife.lastGameDay=s.day;s.socialLife.game=null;ctx.journal?.('Runestone Pairs','You finished a game of matching runestones. The quiet play left you in better spirits.','life');return true;}
export function applySocialLifeAction(s,id,ctx,contacts=[]){
 contacts=[...contacts,...retiredNpcContacts(s).filter(p=>npcContinuationAvailable(s,p)&&!contacts.some(c=>c.id===p.id))];
 const a=socialLifeActions(s,contacts).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;
 if(id.startsWith('people_')){
  const [mode,...parts]=id.slice(7).split('_'),personId=parts.join('_');
  if(mode==='withdraw'){const f=s.socialLife.favors.find(f=>f.personId===personId&&f.status==='active');if(!f)return false;f.status='withdrawn';f.endedDay=s.day;ctx.journal?.('A Favour Set Aside','You withdrew the favour for '+f.name+'. The original agreement remains recorded; no supplies, Gold or trust changed hands.','quest');return true;}
  const p=contacts.find(p=>p.id===personId&&p.locationId===s.locationId);if(!p)return false;
  if(mode==='orientation'){s.socialLife.known[p.id]=romanceProfile(s,p).label;s.notice=p.name+' tells you: “'+({'any':'I can fall in love with people of any gender.','men':'I am interested in men.','women':'I am interested in women.','none':'Romance is not something I want for myself.'})[romanceProfile(s,p).attraction]+'”';}
  else if(mode==='court'){if(romanceReason(s,p))return false;if(ctx.spendDays(1)!==1||s.phase==='retired')return true;const current=ctx.contacts?ctx.contacts().find(q=>q.id===p.id):p;if(!current||romanceReason(s,current)){s.notice='They cannot begin a courtship now. Friendship remains.';return true;}const person=projectLifePerson(s,current);if(!person)return false;ctx.registerWorldPerson?.(person);return ctx.beginCourtship?.(p.id)===true;}
  else if(mode==='hang'){const gain=Number.isInteger(s.socialLife.known['hang:'+p.id])&&s.day-s.socialLife.known['hang:'+p.id]<7?1:5;if(ctx.spendDays(1)!==1||s.phase==='retired')return true;bondWith(s,p,gain);s.life.happiness=clamp(s.life.happiness+5);s.life.stress=clamp(s.life.stress-4);s.socialLife.known['hang:'+p.id]=s.day;ctx.journal?.('An Afternoon with '+p.name,'You shared food, conversation and an unhurried walk with '+p.name+'.','life');}
  else if(mode==='favor'){const item=['herbs','wood','cloth'][seededRoll(s.seed,'favor-item:'+p.id,3)];s.socialLife.favors.push({id:'favor-'+p.id,personId:p.id,name:p.name,locationId:s.locationId,item,status:'active',acceptedDay:s.day,completedDay:null});ctx.journal?.('A Small Favour',p.name+' asked for 2 '+item+' and offered 12 Gold. You agreed to bring them.','quest');}
  else if(mode==='deliver'){const f=s.socialLife.favors.find(f=>f.personId===p.id&&f.status==='active');if(!f)return false;if(f.item==='herbs')s.flags.herbs-=2;else s.equipment.materials[f.item]-=2;s.hero.gold+=12;f.status='completed';f.completedDay=s.day;bondWith(s,p,5);ctx.journal?.('A Favour Returned','You delivered the supplies to '+p.name+' and received 12 Gold.','quest');}
  return true;
 }
 if(id==='fun_pairs'){const faces=[0,0,1,1,2,2,3,3,4,4,5,5],n=++s.socialLife.games;for(let i=11;i>0;i--){const j=seededRoll(s.seed,'pairs:'+n+':'+i,i+1);[faces[i],faces[j]]=[faces[j],faces[i]];}s.socialLife.game={id:n,faces,revealed:[],matched:[],moves:0};s.notice='Find the matching pairs. Turn two runestones at a time.';return true;}
 if(id==='fun_pairs_finish')return completePairs(s,ctx);
 if(id.startsWith('fun_pair_')){const g=s.socialLife.game,i=Number(id.slice(9));if(g.revealed.length===2)g.revealed=[];g.revealed.push(i);if(g.revealed.length===2){g.moves++;if(g.faces[g.revealed[0]]===g.faces[g.revealed[1]]){g.matched.push(...g.revealed);g.revealed=[];}}return true;}
 if(id==='fun_prank'){if(ctx.spendDays(1)!==1||s.phase==='retired')return true;s.socialLife.prankDay=s.day;s.life.happiness=clamp(s.life.happiness+4);s.notice='The joke ends in laughter. Everyone gets their own mask back.';return true;}
 if(id.startsWith('fun_dice_')){if(ctx.spendDays(1)!==1||s.phase==='retired')return true;s.hero.gold-=2;const one=1+seededRoll(s.seed,'dice:'+s.day+':one',6),two=1+seededRoll(s.seed,'dice:'+s.day+':two',6),total=one+two,win=id==='fun_dice_low'?total<7:total>7;s.hero.gold+=total===7?2:win?4:0;s.socialLife.lastDiceDay=s.day;s.life.happiness=clamp(s.life.happiness+3);s.notice=`The dice show ${one} and ${two}. ${total===7?'Your stake is returned.':win?'You receive 4 Gold.':'You lose the 2 Gold stake.'}`;ctx.journal?.('Dice at the Table',s.notice,'life');return true;}
 return false;
}
export function validateSocialLife(s){
 if(s.socialLife===undefined)return true;const v=s.socialLife,int=(n,a=0,b=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=a&&n<=b,day=d=>d===null||int(d,0,s.day),text=t=>typeof t==='string'&&t.length<=160;
 if(!v||v.version!==1||!['any','men','women','none'].includes(v.attraction)||!['man','woman','nonbinary'].includes(v.gender)||!Array.isArray(v.legacyPartners)||v.legacyPartners.length>2||!v.legacyPartners.every(safe)||!v.met||Object.keys(v.met).length>512||!v.known||Object.keys(v.known).length>1024||!Object.entries(v.known).every(([id,x])=>(id.startsWith('hang:')?safe(id.slice(5))&&int(x,0,s.day):safe(id)&&text(x)))||!int(v.games)||![v.lastGameDay,v.lastDiceDay,v.prankDay].every(day))return false;
 if(!Object.entries(v.met).every(([id,p])=>safe(id)&&p.id===id&&typeof p.name==='string'&&p.name.length<=80&&int(p.age,18,200)&&isCanonicalAppearance(p.appearance)&&['he/him','she/her','they/them'].includes(p.pronouns)&&Number.isSafeInteger(p.baseAge)&&p.baseAge>=-5000&&p.baseAge<=5000&&int(p.serviceEndDay,0,10000000)&&s.world.locations.some(l=>l.id===p.locationId)&&text(p.role)&&typeof p.description==='string'&&p.description.length<=1200))return false;
 if(!Array.isArray(v.favors)||v.favors.length>100||new Set(v.favors.map(f=>f.id)).size!==v.favors.length||!v.favors.every(f=>f&&f.id==='favor-'+f.personId&&safe(f.personId)&&text(f.name)&&s.world.locations.some(l=>l.id===f.locationId)&&['herbs','wood','cloth'].includes(f.item)&&['active','completed','withdrawn'].includes(f.status)&&int(f.acceptedDay,0,s.day)&&(f.status==='completed'?int(f.completedDay,f.acceptedDay,s.day):f.completedDay===null)&&(f.status==='withdrawn'?int(f.endedDay,f.acceptedDay,s.day):f.endedDay===undefined)))return false;
 for(const f of v.favors)if(f.returnWindow!==undefined){const w=f.returnWindow,r=s.npcContinuity?.people?.[f.personId];if(!w||typeof w!=='object'||Array.isArray(w)||!int(w.retiredDay,f.acceptedDay,s.day)||w.untilDay!==w.retiredDay+NPC_FAVOR_RETURN_DAYS||r?.retiredDay!==w.retiredDay||f.status==='completed'&&f.completedDay<w.retiredDay||f.status==='withdrawn'&&f.endedDay<w.retiredDay)return false;}
 const g=v.game;if(g!==null){if(!g||!int(g.id,1,v.games)||!Array.isArray(g.faces)||g.faces.length!==12||!Array.from({length:6},(_,i)=>g.faces.filter(x=>x===i).length===2).every(Boolean)||!int(g.moves))return false;for(const a of [g.matched,g.revealed])if(!Array.isArray(a)||new Set(a).size!==a.length||!a.every(i=>int(i,0,11)))return false;if(g.revealed.length>2||g.matched.length%2||g.matched.some(i=>g.revealed.includes(i))||Array.from({length:6},(_,i)=>g.matched.filter(n=>g.faces[n]===i).length).some(n=>n!==0&&n!==2))return false;}
 return true;
}
