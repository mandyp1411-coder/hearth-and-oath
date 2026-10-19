import { isSettlement } from './world.js';

export const PERSONAL_SERVICE_STORIES=['night_door','own_key','winter_commons'];
const labels={night_door:'Use the recorded shelter door',own_key:'Attend the independent workbench',winter_commons:'Visit the winter commons lesson'};
const fromArc=a=>({storyId:a.id,kind:a.id==='night_door'?'refuge':'teaching',rule:a.outcome==='care'?'shared':a.outcome==='enterprise'?'priced':'controlled',participantId:a.personId,name:a.personName,day:a.choices.at(-1).day});

/** Read views never open a ledger or invent a lost usage date. Completed
 * material-story records can establish an earned service, not its erased uses. */
export function personalServicesAt(s,locationId=s.locationId){
  const site=s.realm?.sites[locationId];if(!site)return [];
  const rows={...(site.personalServices||{})};
  if(site.personalService&&!rows[site.personalService.storyId])rows[site.personalService.storyId]={...site.personalService};
  for(const a of s.stories?.arcs||[])if(PERSONAL_SERVICE_STORIES.includes(a.id)&&[2,3,4].includes(a.contentVersion)&&a.status==='completed'&&a.locationId===locationId&&a.choices.length&&!rows[a.id])rows[a.id]=fromArc(a);
  return PERSONAL_SERVICE_STORIES.flatMap(id=>rows[id]?[{...rows[id]}]:[]);
}

export function recordPersonalService(s,arc){
  if(!PERSONAL_SERVICE_STORIES.includes(arc.id)||![2,3,4].includes(arc.contentVersion))return;
  const site=s.realm?.sites[arc.locationId];if(!site)return;
  site.personalServices=Object.fromEntries(personalServicesAt(s,arc.locationId).map(v=>[v.storyId,v]));
  site.personalServices[arc.id]=fromArc(arc);
  // Keep the earlier single-service field readable for older local code. It
  // must not replace the independently earned entries in the actual ledger.
  if(!site.personalService)site.personalService={...site.personalServices[arc.id]};
}

export function personalServiceActions(s){
  const rows=personalServicesAt(s);
  return rows.map(v=>{const fee=v.rule==='priced'?5:0;
    const reason=!isSettlement(s.world,s.locationId)?'This settlement is closed; its recorded service is not operating.':s.hero.gold<fee?'Requires the recorded fee.':v.lastUsedDay!==undefined&&s.day-v.lastUsedDay<28?'Return after 28 days.':null;
    return {id:rows.length===1?'stories_service':`stories_service_${v.storyId}`,label:labels[v.storyId],description:`${v.name}’s ${v.rule} ${v.storyId==='winter_commons'?'commons lesson':v.kind}. Spend 1 real day${fee?' and 5 gold':''}; ${v.kind==='refuge'?'recover up to 15 health':'practice scholarship'}. This service has its own 28-day interval.${v.rule==='controlled'?' Excluded households retain their resistance account.':''}`,days:1,cost:fee,group:'Personal stories',...(reason?{disabledReason:reason}:{})};
  });
}

export function personalServicesPanel(s,actions,ui){
  if(s.age<18||!personalServicesAt(s).length)return '';
  const offered=actions.filter(a=>a.id==='stories_service'||a.id.startsWith('stories_service_'));
  return `<section class="panel personal-services" data-personal-services><span class="eyebrow">RECORDED LOCAL SERVICES</span><h2>Recorded doors &amp; lessons</h2><p class="small-copy">These local services keep their own terms and return dates.</p>${offered.length?ui.actionCards(offered):'<p class="small-copy">Finish the current moment before using these services.</p>'}</section>`;
}

export function usePersonalService(s,id,ctx){
  const action=personalServiceActions(s).find(a=>a.id===id&&!a.disabledReason);if(!action)return false;
  const rows=personalServicesAt(s),v=id==='stories_service'?rows[0]:rows.find(v=>id===`stories_service_${v.storyId}`),old=s.day;
  s.hero.gold-=action.cost;
  const taken=ctx.spendDays(1),actual=Math.max(0,s.day-old);
  if(!actual){s.hero.gold+=action.cost;return true;}
  if(taken!==1||actual!==1||s.phase==='retired'||!isSettlement(s.world,s.locationId))return true;
  const site=s.realm.sites[s.locationId];site.personalServices=Object.fromEntries(rows.map(row=>[row.storyId,row]));
  site.personalServices[v.storyId].lastUsedDay=s.day;
  if(site.personalService?.storyId===v.storyId)site.personalService.lastUsedDay=s.day;
  if(v.kind==='refuge')s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+15);
  else s.hero.skills.scholarship=Math.min(10000,s.hero.skills.scholarship+1);
  s.notice=`${v.name}’s ${v.rule} ${v.storyId==='winter_commons'?'commons lesson':v.kind} took 1 day and ${action.cost} gold. Other earned services keep their own records.`;
  ctx.journal?.('The story’s door remains usable',s.notice,'personal');return true;
}

export function validatePersonalServices(site,s){
  if(site.personalServices===undefined)return true;
  const rows=site.personalServices,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),str=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n,int=(v,min=0,max=s.day)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  return obj(rows)&&Object.keys(rows).length<=3&&Object.entries(rows).every(([id,v])=>PERSONAL_SERVICE_STORIES.includes(id)&&obj(v)&&v.storyId===id&&v.kind===(id==='night_door'?'refuge':'teaching')&&['shared','priced','controlled'].includes(v.rule)&&str(v.participantId,160)&&str(v.name,100)&&int(v.day)&&(v.lastUsedDay===undefined||int(v.lastUsedDay,v.day)));
}
