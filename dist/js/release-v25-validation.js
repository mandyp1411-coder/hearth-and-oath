// Additive release fields are optional on genuine older saves, bounded when present.
import { validatePersonalServices } from './personal-services.js';
export function validateReleaseFields(s){
  const int=(n,a=0,b=10000000)=>Number.isSafeInteger(n)&&n>=a&&n<=b,text=(v,n=2000)=>typeof v==='string'&&v.length<=n,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),site=id=>s.world.locations.some(p=>p.id===id),person=id=>typeof id==='string'&&id.length<=160;
  for(const p of [...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[])])if(p.agency!==undefined&&(!obj(p.agency)||!['available','bargaining','refusing','withdrawn','constrained'].includes(p.agency.status)||!int(p.agency.day,0,s.day)||!text(p.agency.reason)))return false;
  for(const p of Object.values(s.realm?.sites||{})){
    if(!validatePersonalServices(p,s))return false;
    if(p.resistance!==undefined&&!int(p.resistance,0,100000))return false;
    if(p.personalService!==undefined){const v=p.personalService;if(!obj(v)||!['night_door','own_key','winter_commons'].includes(v.storyId)||!['refuge','teaching'].includes(v.kind)||!['shared','priced','controlled'].includes(v.rule)||!person(v.participantId)||!text(v.name,100)||!int(v.day,0,s.day)||v.lastUsedDay!==undefined&&!int(v.lastUsedDay,v.day,s.day))return false;}
    if(p.localPractice!==undefined){const v=p.localPractice;if(!obj(v)||!['lantern','ancestors','wilds','forge','moon','ash'].includes(v.faithId)||!['watch','register','well','workshop','tide','hearth'].includes(v.service)||!['public','priced','controlled'].includes(v.rule)||!text(v.witnessName,100)||!int(v.day,0,s.day))return false;}
    if(p.aftermathPolicy!==undefined&&!['shared','recorded','controlled'].includes(p.aftermathPolicy))return false;
    if(p.aftermathDay!==undefined&&!int(p.aftermathDay,0,s.day)||p.customDay!==undefined&&!int(p.customDay,0,s.day))return false;
    if(p.merchant?.priceCauses!==undefined&&(!obj(p.merchant.priceCauses)||Object.keys(p.merchant.priceCauses).length>40||!Object.values(p.merchant.priceCauses).every(v=>obj(v)&&['unsafe_road','war_demand','ordinary_trade','finite_supply'].includes(v.kind)&&text(v.text,500))))return false;
  }
  for(const p of [s.realm?.petition,...(s.realm?.faithRecords||[])].filter(Boolean))if(p.contentVersion!==undefined){if(![25,26].includes(p.contentVersion)||!person(p.witnessId)||!text(p.witnessName,100)||!obj(p.evidence)||!['observation','claim','interpretation','share','sell','suppress','service','custom'].every(k=>text(p.evidence[k],1000)))return false;}
  for(const p of [s.realm?.petition,...(s.realm?.faithRecords||[])].filter(Boolean))if(p.contentVersion===26&&(!text(p.requestText,1000)||!['crossing','hearth','ruin','grove','well','workshop','coast','tower','fortress','archive'].includes(p.setting)||typeof p.archiveOnly!=='boolean'||!text(p.sceneContext,1000)))return false;
  if(s.campaign?.aftermathAccounts!==undefined&&(!Array.isArray(s.campaign.aftermathAccounts)||s.campaign.aftermathAccounts.length>18||!s.campaign.aftermathAccounts.every(v=>obj(v)&&text(v.id,100)&&['renew','release','keeper','dominion','shatter','haven'].includes(v.endingId)&&int(v.day,0,s.day)&&site(v.locationId)&&person(v.participantId)&&text(v.participantName,100)&&['help','listen','record'].includes(v.resolution))))return false;
  if(s.justice?.accounts!==undefined&&(!Array.isArray(s.justice.accounts)||s.justice.accounts.length>24||!s.justice.accounts.every(v=>obj(v)&&text(v.id,160)&&obj(v.person)&&text(v.person.name,100)&&site(v.locationId)&&int(v.startDay,0,s.day)&&int(v.releaseDay,v.startDay,s.day)&&text(v.concern,500)&&[null,'introduced'].includes(v.resolution))))return false;
  for(const p of s.community?.works||[])if(p.nextReminderDay!==undefined&&!int(p.nextReminderDay))return false;
  if(s.life?.pendingEvent?.conditionStoryVersion!==undefined&&(s.life.pendingEvent.conditionStoryVersion!==26||!['life_vampire_guest','life_wolf_confidant'].includes(s.life.pendingEvent.eventId)||typeof s.life.pendingEvent.confidenceKnown!=='boolean'))return false;
  if(s.health?.agePolicy!==undefined&&s.health.agePolicy!==25)return false;
  if(s.lineage?.heirAccounts!==undefined&&(!Array.isArray(s.lineage.heirAccounts)||s.lineage.heirAccounts.length>8||!s.lineage.heirAccounts.every(a=>obj(a)&&text(a.id,80)&&text(a.storyId,80)&&text(a.personName,100)&&int(a.sourceGeneration,1,200)&&text(a.excerpt,2000)&&(a.readDay===null||int(a.readDay,0,s.day)))))return false;
  const u=s.hero.upbringing;if(u!==undefined&&(!obj(u)||!person(u.sourcePersonId)||!int(u.bornDay,-10000000,s.day)||!obj(u.traits)||!Object.values(u.traits).every(v=>int(v,0,10000))||!obj(u.skills)||!Object.values(u.skills).every(v=>int(v,0,10000))||!Array.isArray(u.history)||u.history.length>60||!u.history.every(v=>obj(v)&&int(v.day,0,s.day)&&text(v.text,2000))))return false;
  if(s.battle?.tacticsVersion!==undefined&&(s.battle.tacticsVersion!==25||typeof s.battle.coverUsed!=='boolean'||typeof s.battle.formationEarned!=='boolean'))return false;
  return true;
}
