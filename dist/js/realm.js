import { regionalCulture } from './regional-content-v33.js';
import { gearSaleValue } from './economy-values.js';
import { faithInquiryPlan,inquiryWitnessText,faithRitualText } from './faith-stories-v26.js';
import { publicMagicAt } from './law-text-v25.js';
import { agingPolicy } from './aging-policy-v25.js';
import { FAITH_INQUIRIES } from './audit-content-v25.js';
import { markSiteKnowledge } from './cartography.js';
import { REGION_TEMPLATES, FAITHS } from './realm-content-v18.js';
import { seededRoll, isSettlement, generatePersonName } from './world.js';
import { generateCharacter } from './characters.js';
import { ownedGear, getGearItem, discardGear, GEAR_CATALOG } from './gear.js';
import { isCanonicalAppearance } from './avatar.js';
import { transferStolenGear } from './stolen-gear.js';
import { civicPhase } from './settlement-spaces.js';

const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const year=s=>Math.floor(s.day/365);
const local=s=>s.realm?.sites[s.locationId];
const ownsHolding=(s,site)=>site.owner==='hero'||site.owner===(s.dynasty?.activePersonId||'hero')||s.dynasty?.history.some(p=>p.personId===site.owner);
const log=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'realm');};
const action=(id,label,description,days=0,cost=0,group='The realm',disabledReason)=>({id,label,description,days,cost,group,...(disabledReason?{disabledReason}:{})});
const age=s=>s.age;
const person=(s,key,role,years)=>{const p=generateCharacter(s.seed,key,{role,age:years});return {...p,name:generatePersonName(s.seed,key,p),age:years};};
const livingMarket=(s,id=s.locationId)=>isSettlement(s.world,id)&&!s.realm?.politics?.holds.some(h=>h.siteId===id&&h.status==='held');
const history=(s,text)=>{s.realm.history.push({day:s.day,generation:s.dynasty?.generation||1,text});if(s.realm.history.length>180)s.realm.history.shift();};
const worldChange=(s,id,title,text,details={})=>{s.world.changes.push({id:`realm-${id}-${s.day}-${s.world.changes.length}`,day:s.day,locationId:id,title,text,...details});if(s.world.changes.length>500)s.world.changes.shift();};
function stockFor(s,site,season){
  delete site.merchant.storyPriceBase;
  const region=s.realm.regions.find(r=>r.id===site.regionId), focus=REGION_TEMPLATES.find(r=>r.id===region.id).tradeFocus;
  const preference=focus==='arcane'?['staff','wand','charm','robe']:focus==='martial'?['sword','mail','shield','helm']:focus==='rural'?['bow','spear','cloak','leather']:focus==='craft'?['hammer','gambeson','cap','sword']:focus==='coastal'?['dagger','cloak','pendant']:['dagger','knife','cloak','charm'];
  const order=GEAR_CATALOG.map(g=>({g,n:seededRoll(s.seed,`stock:${site.id}:${season}:${g.id}`,1000)+(preference.some(p=>(g.id+' '+g.name).toLowerCase().includes(p))?1200:0)})).sort((a,b)=>b.n-a.n);
  const stock={},prices={},causes={};
  const conflict=s.realm.wars.some(w=>w.status==='active'&&(w.a===site.regionId||w.b===site.regionId));
  const manner={generous:-.05,exacting:.08,secretive:.05,gregarious:0,wary:.03,ambitious:-.02}[site.merchant.disposition]||0;
  const staples=['iron_sword','ash_staff','hunter_dagger','travel_cloak','leather_armor'];
  const chosen=[...GEAR_CATALOG.filter(g=>staples.includes(g.id)).map(g=>({g})),...order.filter(({g})=>!staples.includes(g.id)).slice(0,5)];
  for(const {g} of chosen) {stock[g.id]=1+seededRoll(s.seed,`quantity:${site.id}:${season}:${g.id}`,2);prices[g.id]=Math.max(1,Math.round(g.price*(.85+seededRoll(s.seed,`price:${site.id}:${season}:${g.id}`,31)/100+(site.security<35?.15:conflict?.1:0)+manner)));}
  for(const id of Object.keys(prices))causes[id]={kind:site.security<35?'unsafe_road':conflict?'war_demand':'ordinary_trade',text:site.security<35?'Unsafe supply roads add a bounded scarcity premium.':conflict?'The local war adds a bounded demand premium.':'Seasonal stock and the merchant’s own terms determine this quote.'};site.merchant.priceCauses=causes;
  site.merchant.stock=stock;site.merchant.prices=prices;site.merchant.potions=2+seededRoll(s.seed,`potions:${site.id}:${season}`,5);site.merchant.rations=4+seededRoll(s.seed,`rations:${site.id}:${season}`,6);site.merchant.season=season;
}
function newMerchant(s,site,generation=0){
  const key=`merchant:${site.id}:${generation}`;
  const npc=person(s,key,'Merchant',24+seededRoll(s.seed,key+':age',30));
  site.merchant={...npc,id:key,baseAge:npc.age,createdDay:s.day,generation,disposition:['generous','exacting','secretive','gregarious','wary','ambitious'][seededRoll(s.seed,key+':disposition',6)],stock:{},prices:{},potions:0,rations:0,season:-1};
  stockFor(s,site,Math.floor(s.day/92));
}
function newKeeper(s,site,generation=0,createdDay=s.day){
 const region=s.realm.regions.find(r=>r.id===site.regionId),faith=FAITHS.find(f=>f.id===(site.faithId||region.faithId)),id=`keeper-${site.id}-${generation}`,p=person(s,id,faith.templeKeeperRole,28+seededRoll(s.seed,id+':age',22));
 if(site.keeper){site.keeperArchive||=[];site.keeperArchive.push({...site.keeper,retiredDay:createdDay});site.keeperArchive=site.keeperArchive.slice(-3);}
 site.keeper={...p,id,baseAge:p.age,createdDay,generation,role:faith.templeKeeperRole};
}
export function initializeRealmLore(s){if(!s.realm)return;for(const site of Object.values(s.realm.sites)){if(site.faithId===undefined){const settlements=s.world.locations.filter(p=>isSettlement(s.world,p.id)),index=settlements.findIndex(p=>p.id===site.id),region=s.realm.regions.find(r=>r.id===site.regionId);site.faithId=s.world.map?.generationVersion>=7?(seededRoll(s.seed,'minority-faith:'+site.id,10)===0?FAITHS[seededRoll(s.seed,'minority-choice:'+site.id,6)].id:region.faithId):index>=0&&index<6?FAITHS[index%6].id:seededRoll(s.seed,'city-faith:'+site.id,3)===0?FAITHS[seededRoll(s.seed,'city-faith-choice:'+site.id,6)].id:region.faithId;site.hasShrine=s.world.map?.generationVersion>=7?index>=0&&(site.id==='home'||!site.id.endsWith('-1')&&seededRoll(s.seed,'city-shrine:'+site.id,4)!==0):index>=0&&(index<6||index!==settlements.length-1&&seededRoll(s.seed,'city-shrine:'+site.id,4)!==0);if(s.world.map?.generationVersion>=7&&site.id==='seat-'+site.regionId){site.faithId=region.faithId;site.hasShrine=true;}}if(!site.keeper)newKeeper(s,site);if(site.hasShrine&&site.keeper)site.keeper.role=FAITHS.find(f=>f.id===site.faithId).templeKeeperRole;}s.realm.faithRecords||=[];if(s.realm.petition===undefined)s.realm.petition=null;}
export function acyclicAllegiance(regions){for(const p of regions){const seen=new Set([p.id]);let next=p.liege;while(next){if(seen.has(next))return false;seen.add(next);next=regions.find(p=>p.id===next)?.liege;}}return true;}
function upgradeRealm(s,{refreshDescription=false}={}){const r=s.realm;if(!r.allegianceVersion){for(const p of r.regions){const seen=new Set([p.id]);let next=p.liege;while(next){if(seen.has(next)){delete p.liege;break;}seen.add(next);next=r.regions.find(p=>p.id===next)?.liege;}}r.allegianceVersion=2;}
  const old=['Willing ancestral rites and the study of the dead are permitted; coercion and grave theft remain crimes.','Ancestral rites require a witness or academy license; raising bodies and binding unwilling souls are prohibited.','Public necromantic practice is prohibited. Authorities require a witness or evidence before opening an investigation.'];
  if(r.lawVersion===1&&refreshDescription)for(const p of s.world.locations){for(const text of old)p.description=p.description.replace(text,'').trim();const region=regionAt(s,p.id);if(region){p.description=p.description.replace(/ Current public magic law: [^.]+\./g,'').trim()+` Current public magic law: ${region.law.publicMagic}; an accusation still requires a local witness or evidence.`;p.necromancyLaw=region.law.publicMagic==='licensed'?'regulated':region.law.publicMagic;}}
}
function lootBuyer(s,site,l){const fence=l.stolen&&(!regionAt(s).law.contrabandAllowed||l.ownerId===site.merchant.id);if(!fence)return {person:site.merchant,fence:false,known:!l.stolen||!!l.ownerId};const key='fence:'+site.id;const p=person(s,key,'Merchant',39);return {person:{...p,id:key},fence:true,known:!!l.ownerId};}
export function lootBasketQuote(s){const m=local(s)?.merchant;if(!m)return null;const items=[...ownedGear(s).filter(g=>!g.stolen&&!Object.values(s.equipment.equipped).includes(g.id)).map(g=>({kind:'gear',id:g.id,quotedPrice:gearSaleValue(g,m)})),...(s.adventuring?.loot||[]).filter(l=>!l.stolen).map(l=>({kind:'loot',id:l.id,quotedPrice:Math.floor(l.value*.8)}))];return {merchantId:m.id,season:m.season,items,total:items.reduce((n,i)=>n+i.quotedPrice,0)};}
export function sellLootBasket(s,quote,ctx={}){const current=lootBasketQuote(s);if(!current||quote.merchantId!==current.merchantId||quote.season!==current.season||!Array.isArray(quote.items)||quote.items.length>400||new Set(quote.items.map(i=>i.kind+':'+i.id)).size!==quote.items.length||quote.items.some(i=>!current.items.some(c=>JSON.stringify(c)===JSON.stringify(i))))return false;let total=0;for(const i of quote.items){if(i.kind==='gear'){discardGear(s,i.id);if(GEAR_CATALOG.some(g=>g.id===i.id))local(s).merchant.stock[i.id]=(local(s).merchant.stock[i.id]||0)+1;}else s.adventuring.loot=s.adventuring.loot.filter(l=>l.id!==i.id);total+=i.quotedPrice;}s.hero.gold+=total;log(s,ctx,'A checked sale receipt',`${quote.items.length} owned, unequipped items sold to ${local(s).merchant.name} for exactly ${total} gold. Stolen property was excluded.`);return true;}
export function initializeRealm(s,{fresh=false}={}){
  if(s.realm){initializeRealmLore(s);upgradeRealm(s);return;}
  const regions=REGION_TEMPLATES.map((r,i)=>{const p=person(s,`ruler:${r.id}:0`,'Courtier',28+seededRoll(s.seed,`ruler-age:${r.id}`,28));return{id:r.id,ruler:{...p,id:`ruler:${r.id}:0`,baseAge:p.age,createdDay:s.day},faithId:r.dominantFaith,power:35+seededRoll(s.seed,'region-power:'+i,41),treasury:150+seededRoll(s.seed,'region-treasury:'+i,151),regime:['council','crown','order'][seededRoll(s.seed,'region-regime:'+i,3)],succession:0};});
  s.realm={version:1,lawVersion:fresh?1:0,lastYear:year(s),regions,sites:{},wars:[],history:[],faithId:null,devotion:0,uses:{}};
  const nodes=s.world.map?.nodes||[];
  for(const place of s.world.locations){
    const node=nodes.find(n=>n.id===place.id), regionId=place.regionId||(place.type==='mountain'?'highstone':place.type==='coast'?'saltreach':place.type==='forest'?'blackgrove':place.type==='marsh'?'rainward':place.type==='gate'||place.type==='citadel'?'ashplain':node?(node.x<340?'bellwater':node.x>660?'saltreach':node.y<270?'highstone':node.y>470?'blackgrove':'rainward'):regions[seededRoll(s.seed,'region:'+place.id,6)].id);
    const site={id:place.id,regionId,prosperity:40+seededRoll(s.seed,'prosperity:'+place.id,31),security:35+seededRoll(s.seed,'security:'+place.id,41),phase:['city','citadel'].includes(place.type)?'town':'village',rebuild:0,services:[...(place.services||[])],merchant:null};
    s.realm.sites[place.id]=site;
    if(fresh){const law=REGION_TEMPLATES.find(r=>r.id===regionId).law.publicMagic;place.necromancyLaw=law==='licensed'?'regulated':law;}
    if(isSettlement(s.world,place.id))newMerchant(s,site);
    newKeeper(s,site);
  }
  initializeRealmLore(s);upgradeRealm(s,{refreshDescription:fresh});
}
export function regionAt(s,id=s.locationId){
  const site=s.realm?.sites[id], record=s.realm?.regions.find(r=>r.id===site?.regionId), template=REGION_TEMPLATES.find(r=>r.id===record?.id);
  if(!record||!template)return null;const law={...template.law,publicMagic:publicMagicAt(s,id)};if(record.occupation?.policy==='watch')law.enforcement=Math.min(95,law.enforcement+10);if(record.occupation?.policy==='restitution')law.theftFinePerEvidence=Math.max(1,law.theftFinePerEvidence-2);return {...template,...record,law};
}
function storyTradeCause(s,siteId,item){
 const b=(s.rpg?.bosses||[]).find(b=>b.locationId===siteId&&b.resolutions.some(r=>s.day>=r.day&&s.day<r.day+92&&((r.id==='close_shaft'&&/iron|steel|mail|hammer|sword/.test(item))||(r.id==='plant_buffer'&&/wood|ash|bow|staff|spear/.test(item)))));
 return b?{kind:'finite_supply',text:'The attended '+b.resolutions[0].id.replaceAll('_',' ')+' agreement reduced this local supply for 92 days. A bounded 12% premium applies.'}:null;
}
export function refreshStoryTrade(s,siteId){
 const m=s.realm?.sites[siteId]?.merchant;if(!m)return;m.prices||={};m.priceCauses||={};m.storyPriceBase||={};
 for(const [id,price]of Object.entries(m.prices)){
  const prior=m.storyPriceBase[id];if(prior){m.prices[id]=prior.price;m.priceCauses[id]=prior.cause;delete m.storyPriceBase[id];}
  const cause=storyTradeCause(s,siteId,id);if(cause){m.storyPriceBase[id]={price:m.prices[id],cause:m.priceCauses[id]||{kind:'ordinary_trade',text:'The existing seasonal quote.'}};m.prices[id]=Math.max(1,Math.round(m.prices[id]*1.12));m.priceCauses[id]=cause;}
 }
 // Stock is deliberately untouched: a story cannot restock a sold item.
}
export function onRealmTime(s,oldDay,newDay,ctx){
  if(!s.realm||s.phase==='retired')return;
  initializeRealmLore(s);
  const r=s.realm, currentYear=Math.floor(newDay/365);
  for(let y=r.lastYear+1;y<=currentYear;y++){
    for(const site of Object.values(r.sites))if(site.keeper.baseAge+Math.floor((y*365-site.keeper.createdDay)/365)>=85+agingPolicy(site.keeper).elder-65)newKeeper(s,site,site.keeper.generation+1,y*365);
    for(const record of r.faithRecords.filter(r=>!r.followedUp&&y*365>=r.day+365)){const site=r.sites[record.boardId];site.security=clamp(site.security+(record.method==='share'?6:record.method==='suppress'?-5:2));record.followedUp=true;history(s,`${record.keeperName}’s request left a later consequence at ${s.world.locations.find(p=>p.id===record.boardId).name}: ${record.method==='share'?'neighbors used the witnessed account to make the route safer':record.method==='suppress'?'a restricted account left households dependent on its patron':'the paid account supported a small continuing practice'}.`);}
    for(const region of r.regions){
      if(region.ruler.baseAge+Math.floor((y*365-region.ruler.createdDay)/365)>70+agingPolicy(region.ruler).elder-65&&seededRoll(s.seed,`succession:${region.id}:${y}`,3)===0){region.succession++;const p=person(s,`ruler:${region.id}:${region.succession}`,'Courtier',25+seededRoll(s.seed,`heir-age:${region.id}:${y}`,20));region.ruler={...p,id:`ruler:${region.id}:${region.succession}`,baseAge:p.age,createdDay:y*365};history(s,`${region.ruler.name} takes the ${region.regime} of ${regionAt(s,Object.values(r.sites).find(p=>p.regionId===region.id)?.id)?.name||region.id}.`);}
    }
    for(const war of r.wars.filter(w=>w.status==='active'&&w.politicalVersion!==33))if(y*365>=war.endsDay){war.status='ended';war.victor=war.balance===0?(seededRoll(s.seed,'victor:'+war.id,2)?war.a:war.b):war.balance>0?war.a:war.b;const winner=r.regions.find(p=>p.id===war.victor),loser=r.regions.find(p=>[war.a,war.b].includes(p.id)&&p.id!==winner.id);winner.power=clamp(winner.power+10);loser.power=clamp(loser.power-12);delete winner.liege;loser.liege=winner.id;loser.occupation={day:y*365,author:winner.ruler.name,policy:winner.regime==='council'?'restitution':winner.regime==='order'?'watch':'tithe'};history(s,`${winner.ruler.name} signs the ${loser.occupation.policy} settlement for the defeated region.`);history(s,`The conflict of ${war.id} ends under ${REGION_TEMPLATES.find(t=>t.id===war.victor).name}. The defeated ruler now owes allegiance to the victor.`);}
    for(const site of Object.values(r.sites)){
      const place=s.world.locations.find(p=>p.id===site.id),war=r.wars.find(w=>w.status==='active'&&(w.a===site.regionId||w.b===site.regionId)),frontline=war&&(war.politicalVersion!==33||war.frontSiteId===site.id||s.world.roads.some(r=>r.from===site.id&&r.to===war.frontSiteId||r.to===site.id&&r.from===war.frontSiteId)),delta=seededRoll(s.seed,`development:${site.id}:${y}`,11)-4;
      if(ownsHolding(s,site)&&(!r.politics?.holds.some(h=>h.siteId===site.id&&h.status==='held'))&&site.prosperity>15&&!['destroyed','evacuated'].includes(place.status)){const tax=Math.floor(site.prosperity/2);s.hero.gold+=tax;(ctx.journalLiteral||ctx.journal)?.('A holding’s yearly returns',`${place.name} sends ${tax} gold to your household. Its present prosperity determines the return.`,'realm');}
      site.prosperity=clamp(site.prosperity+delta-(war?frontline?7:2:0));site.security=clamp(site.security+seededRoll(s.seed,`security:${site.id}:${y}`,9)-3-(war?frontline?9:2:0));
      if(['destroyed','evacuated'].includes(place.status)){site.phase='ruin';continue;}
      if(war&&frontline&&!Object.values(r.politics?.regions||{}).some(r=>r.capitalId===site.id)&&!r.politics?.holds.some(h=>h.siteId===site.id&&['held','cleared'].includes(h.status))&&site.security<20&&site.id!==s.locationId&&site.id!==s.life?.home?.locationId&&(s.campaign?.ending||!['home','city','brook','tower','citadel','sanctuary'].includes(site.id))&&isSettlement(s.world,site.id)&&seededRoll(s.seed,`siege:${site.id}:${y}`,war.politicalVersion===33?15:5)===0){place.status='destroyed';place.servicesAvailable=false;site.phase='ruin';site.rebuild=0;const text=`War leaves ${place.name} in ruins. Its former hearth and market close.`;history(s,text);worldChange(s,site.id,'A settlement lost',text,{day:y*365,source:'war',warId:war.id});ctx?.onSettlementAvailability?.({locationId:site.id,day:y*365,operating:false});(ctx.journalLiteral||ctx.journal)?.('A settlement lost',text,'world');}
      else if(isSettlement(s.world,site.id)){const phase=civicPhase(site.prosperity,site.phase);if(phase!==site.phase){const before=site.phase;site.phase=phase;site.lastDevelopment={from:before,to:phase,day:y*365};const description=phase==='city'?'opens a separate civic hall beside its public work yard':phase==='town'&&before==='city'?'closes the separate civic hall as its public work returns to the older rooms':phase==='town'?'opens a separate public work yard':'returns its public work to shared village rooms as trade contracts',text=`${place.name} changes from ${before} to ${phase} in world year ${y+1}: it ${description}.`;history(s,text);worldChange(s,site.id,'The settlement’s public spaces change',text,{id:`civic-development-${site.id}-${y}`,day:y*365});}}
    }
  }
  r.lastYear=currentYear;if(!r.politics&&r.wars.length>40)r.wars.splice(0,r.wars.length-40);
  const season=Math.floor(newDay/92);
  for(const site of Object.values(r.sites)){
    if(!livingMarket(s,site.id))continue;
    if(!site.merchant)newMerchant(s,site);
    const m=site.merchant;m.age=m.baseAge+Math.floor((newDay-m.createdDay)/365);
    if(m.age>75+agingPolicy(m).elder-65&&season!==m.season)newMerchant(s,site,m.generation+1);
    else if(m.season!==season)stockFor(s,site,season);
    refreshStoryTrade(s,site.id);
  }
}
export function realmActions(s){
  if(!s.realm||age(s)<16||s.event||s.battle||s.phase==='retired'||s.justice?.prison)return [];
  const site=local(s),region=regionAt(s);if(!site||!region)return [];
  const result=[],afford=n=>s.hero.gold<n?`Requires ${n} gold.`:null;
  if(livingMarket(s)&&site.merchant){
    const m=site.merchant;
    result.push(action('realm_potion',`Buy a draught from ${m.name}`,`${m.potions} healing draughts remain this season.`,0,10,'Shops',m.potions<1?'Sold out until next season.':afford(10)));
    result.push(action('realm_ration',`Buy expedition rations`,`${m.rations} bundles remain. Each supports one descent into the unknown.`,0,8,'Shops',m.rations<1?'Sold out until next season.':afford(8)));
    for(const g of ownedGear(s)){
      const buyer=g.stolen?lootBuyer(s,site,{...g.provenance,stolen:true}):{person:m,fence:false},price=g.stolen?Math.floor(g.provenance.value*(buyer.fence?.55:.8)):gearSaleValue(g,m),equipped=Object.values(s.equipment.equipped).includes(g.id);
      result.push(action('realm_sellgear_'+g.id,'Sell '+g.name,`${buyer.person.name}${buyer.fence?' the fence':''} offers ${price} gold. Unequip before selling.${g.stolen?' Stolen property; '+(g.provenance.ownerName?'original owner: '+g.provenance.ownerName+'.':'the earlier owner is unknown.')+(buyer.fence?' A witnessed sale risks prosecution.':''):''}`,0,0,'Sell',equipped?'Unequip this item first.':null));
      if(g.stolen&&g.source===site.id&&g.provenance.ownerId===m.id)result.push(action('realm_returngear_'+g.id,'Return '+g.name+' to '+m.name,'Hand this same piece back to its recorded original owner. No payment; existing criminal evidence remains. Unequip it first.',0,0,'Stolen property',equipped?'Unequip this item first.':null));
    }
    for(const loot of s.adventuring?.loot||[]){const buyer=lootBuyer(s,site,loot),fence=buyer.fence;result.push(action('realm_sellloot_'+loot.id,`Sell ${loot.name}`,`${buyer.person.name} ${fence?'the fence':'the merchant'} offers ${Math.floor(loot.value*(fence?.55:.8))} gold.${loot.stolen&&!buyer.known?' The earlier owner is unknown.':''}${fence?' A witnessed sale risks prosecution.':''}`,0,0,'Sell'));}
    const basket=lootBasketQuote(s);if(basket.items.length)result.push(action('realm_sellbasket','Sell all ordinary unequipped belongings',`${basket.items.length} owned items · exact current quote ${basket.total} gold from ${m.name}. Equipped tools and stolen property are excluded.`,0,0,'Sell'));
    for(const faith of FAITHS.filter(f=>site.hasShrine!==false&&f.id===(site.faithId||region.faithId)))result.push(action('realm_join_'+faith.id,`Follow ${faith.name}`,faith.doctrine,0,0,'Religion',s.realm.faithId===faith.id?'You already follow this tradition.':null));
    if(s.realm.faithId){const f=FAITHS.find(f=>f.id===s.realm.faithId);result.push(action('realm_ritual',f.ritualName,`${faithRitualText(s,f)} Costs 6 gold and one real day; restores ${f.serviceMp} magic and practices ${f.skill}.`,1,6,'Religion',s.realm.uses.ritualDay>s.day-28?'Return after 28 days.':afford(6)),action('realm_leavefaith','Walk away from your tradition','Your experiences remain; formal membership ends.',0,0,'Religion'));}
  }
  if(site.phase==='ruin'||['destroyed','evacuated'].includes(s.world.locations.find(p=>p.id===site.id).status))result.push(action('realm_rebuild','Fund and work on reconstruction',`Spend 30 gold and five days rebuilding surviving foundations. ${site.rebuild}/4 stages completed. Old losses remain recorded.`,5,30,'Reconstruction',afford(30)));
  else result.push(action('realm_invest','Help the settlement grow','Spend 20 gold and three days repairing wells and hearths. Improves prosperity and security.',3,20,'Settlement',afford(20)));
  if(livingMarket(s)){
    if(ownsHolding(s,site)){const wait=s.realm.uses['govern:'+site.id]>s.day-28?'The next local levy or stewardship can be undertaken after 28 days.':null;result.push(action('realm_govern_care','Steward the holding','Spend 10 gold and three days improving homes and security. Your heirs inherit the holding.',3,10,'Your holding',wait||afford(10)),action('realm_govern_tithe','Extract a harsh levy','Spend three days taking 50 gold from the settlement. Prosperity and security fall; coercion can enrich your dynasty.',3,0,'Your holding',wait||(site.prosperity<10?'The settlement has nothing left to surrender.':null)));}
    else result.push(action('realm_charter','Obtain a settlement charter','Pay 250 gold for recognized stewardship. Local trust of 25 is required; your heirs inherit the holding and its yearly returns.',2,250,'Dominion',s.factions.villagers<25?'Requires local standing 25.':afford(250)),action('realm_seize','Seize the settlement by force','Fight the regional watch. Victory establishes a coerced holding and a local criminal report; your choices decide how it is ruled.',1,0,'Dominion',s.hero.hp<20?'Recover before challenging the watch.':null));
  }
  const war=s.realm.wars.find(w=>w.status==='active'&&(w.a===site.regionId||w.b===site.regionId));
  if(war&&war.politicalVersion!==33)result.push(action('realm_relief','Carry relief through the conflict','Spend 15 gold and three days aiding civilians. Security rises; no allegiance is forced.',3,15,'War',afford(15)),action('realm_negotiate','Negotiate a local ceasefire','Scholarship and persuasion support a real attempt; if accepted the current conflict ends.',4,0,'War'),action('realm_raid','Raid the war road','Fight a regional warband. Victory provides spoils and shifts this conflict toward your region. Civilian standing falls.',1,0,'War',s.hero.hp<16?'Recover before battle.':null));
  const petition=s.realm.petition,faith=FAITHS.find(f=>f.id===(site.faithId||region.faithId));
  if(!petition&&site.hasShrine!==false&&livingMarket(s)&&s.realm.faithRecords.length<18){const index=faith.questFlavor.findIndex((_,i)=>!s.realm.faithRecords.some(r=>r.faithId===faith.id&&r.index===i));if(index>=0)result.push(action('realm_petition',`Hear ${site.keeper.name}’s request`,`${faith.name}: ${faith.questFlavor[index]} An optional inquiry with a named source; helping does not join this faith.`));}
  if(petition?.stage==='field'&&petition.destinationId===s.locationId)result.push(action('realm_inquiry','Investigate the keeper’s lead',`${2-petition.researchDays} days of field inquiry remain. Record what is witnessed; a rumor alone is not proof.`));
  if(petition?.stage==='return'&&petition.boardId===s.locationId){result.push(action('realm_report_share',petition.evidence?.share||'Return a public, witnessed account','Preserve its uncertainty. Gain local trust and devotion; the settlement follows up in a later year.'),action('realm_report_sell',petition.evidence?.sell||'Offer a clearly limited paid copy','Receive 16 gold for an explicitly limited account. A later paid practice remains.'),action('realm_report_suppress',petition.evidence?.suppress||'Sell the account to an exclusive patron','Receive 45 gold through restricting the witness’s account. Lose trust, create one named report and break a protector oath.'));}
  if(livingMarket(s)&&site.hasShrine!==false){const d=FAITH_INQUIRIES[site.faithId||region.faithId],practice=site.localPractice,fee=practice?.rule==='priced'?4:practice?.rule==='controlled'?8:0;result.push(action('realm_custom',d.custom,`Spend one real day${fee?' and '+fee+' gold':''} with ${site.keeper.name}. ${practice?'The recorded '+practice.service+' is '+practice.rule+'. ':''}Recover 8 health and 4 magic; once per 28 days.`,1,fee,'Local custom',site.customDay>s.day-28?'Return after 28 days.':afford(fee)));}
  if(site.aftermathPolicy)result.push(action('realm_aftercare',site.aftermathPolicy==='controlled'?'Exercise the post-covenant authority':'Tend the post-covenant refuge',site.aftermathPolicy==='controlled'?'Three real days enforce a toll of 8 gold; local trust falls, and resistance persists.':'Three real days and 8 gold improve local security and care for the named household.',3,site.aftermathPolicy==='controlled'?0:8,'After the covenant',site.aftermathDay>s.day-28?'Return after 28 days.':afford(site.aftermathPolicy==='controlled'?0:8)));
  return s.realm.politics?result.filter(a=>!(s.age<18&&['realm_seize','realm_raid','realm_charter'].includes(a.id))):result;
}
export function applyRealmAction(s,id,ctx){
  const a=realmActions(s).find(a=>a.id===id);if(!a||a.disabledReason)return false;
  const site=local(s),region=regionAt(s),m=site.merchant;
  if(id==='realm_petition'){
    const faith=FAITHS.find(f=>f.id===(site.faithId||region.faithId)),index=faith.questFlavor.findIndex((_,i)=>!s.realm.faithRecords.some(r=>r.faithId===faith.id&&r.index===i));
    const plan=faithInquiryPlan(s,faith.id,index);if(!plan)return false;const {destination,evidence}=plan;
    s.realm.petition={faithId:faith.id,index,boardId:s.locationId,destinationId:destination.id,keeperId:site.keeper.id,keeperName:site.keeper.name,startedDay:s.day,stage:'field',researchDays:0,contentVersion:26,witnessId:s.realm.sites[destination.id].keeper.id,witnessName:s.realm.sites[destination.id].keeper.name,evidence:structuredClone(evidence),requestText:plan.requestText,setting:plan.setting,archiveOnly:plan.archiveOnly,sceneContext:plan.sceneContext};
    markSiteKnowledge(s,destination.id,'Rumored',`${site.keeper.name}: ${faith.name}`);
    log(s,ctx,'A keeper’s unfinished question',`${site.keeper.name}, ${faith.templeKeeperRole} of ${faith.name}, asks: ${faith.questFlavor[index]} Their copied lead points toward ${destination.name}. Examine ${plan.sceneContext} there, then bring your own account back to this keeper’s institution. Your own congregation is unchanged.`);return true;
  }
  if(id==='realm_inquiry'){
    const p=s.realm.petition,actual=ctx.spendDays(2-p.researchDays,{outdoors:true});if(s.phase==='retired')return true;p.researchDays+=actual;
    if(p.researchDays===2){p.stage='return';s.hero.skills.scholarship++;log(s,ctx,'What the lead actually showed',`Two days at ${s.world.locations.find(l=>l.id===p.destinationId).name} ${p.evidence?`yield your field notes alongside ${p.witnessName}’s limited account: ${p.evidence.observation} ${inquiryWitnessText(s,p)} Disputed claim: ${p.evidence.claim} Keeper’s interpretation: ${p.evidence.interpretation}`:'yield a witnessed route and a margin of uncertainty. The oldest claim remains unproven.'} Return to ${s.world.locations.find(l=>l.id===p.boardId).name}; the inquiry belongs to ${p.keeperName}’s recorded request.`);}else s.notice='The inquiry pauses at a calendar need. Your attended days remain recorded.';return true;
  }
  if(id.startsWith('realm_report_')){
    const p=s.realm.petition,method=id.slice(13),faith=FAITHS.find(f=>f.id===p.faithId);s.realm.faithRecords.push({...p,day:s.day,method,followedUp:false});s.realm.petition=null;
    if([25,26].includes(p.contentVersion)){const target=s.realm.sites[p.boardId];target.localPractice={faithId:p.faithId,service:p.evidence.service,rule:method==='share'?'public':method==='sell'?'priced':'controlled',witnessName:p.witnessName,day:s.day};target.security=clamp(target.security+(method==='share'?4:method==='suppress'?-3:1));}
    if(method==='share'){s.realm.devotion+=2;s.hero.skills[faith.skill]++;ctx.standing('villagers',3);}
    if(method==='sell')s.hero.gold+=16;
    if(method==='suppress'){s.hero.gold+=45;ctx.standing('villagers',-5);ctx.addEvidence(1,`${p.keeperName} recorded the sale restricting their institution’s account.`);ctx.breakOath('You sold control over a witness’s account.');}
    log(s,ctx,'The account you returned',`${p.keeperName}’s ${faith.name} request is resolved through your ${method==='share'?'public witnessed account':method==='sell'?'limited paid copy':'exclusive sale'}. The institution retains the dated history. Its households will live with the consequence next year.`);return true;
  }
  // Day-long activities complete only after all advertised calendar days pass.
  if(a.days){const taken=ctx.spendDays(a.days);if(taken!==a.days){s.notice='The calendar interrupts this activity before completion. No fee was charged; return when the waiting need is resolved.';return true;}if(s.phase==='retired')return true;}
  if(s.hero.gold<a.cost)return false;s.hero.gold-=a.cost;
  if(id==='realm_custom'){site.customDay=s.day;site.rememberedCustom={faithId:site.faithId||region.faithId,day:s.day,participantId:site.keeper.id};s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+8);s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+4);log(s,ctx,FAITH_INQUIRIES[site.faithId||region.faithId].custom,`${site.keeper.name} attended this region’s actual practice. The fee was ${a.cost} gold and one day passed.`);}
  else if(id==='realm_aftercare'){site.aftermathDay=s.day;if(site.aftermathPolicy==='controlled'){s.hero.gold+=8;site.resistance=(site.resistance||0)+1;ctx.standing('villagers',-2);}else{site.security=clamp(site.security+5);ctx.standing('villagers',2);}log(s,ctx,'The old ending has living costs',site.aftermathPolicy==='controlled'?'Your gate authority collected eight gold; the named resistance remains.':'Eight gold and three days improved care for the aftermath household.');}
  else if(id==='realm_potion'){m.potions--;s.hero.potions++;log(s,ctx,'A merchant’s draught',`${m.name} sells you one healing draught.`);}
  else if(id==='realm_ration'){m.rations--;s.adventuring.rations++;log(s,ctx,'Stores for the descent',`${m.name} packs salt bread and bitter broth for your expedition.`);}
  else if(id.startsWith('realm_returngear_')){const key=id.slice(17),g=getGearItem(s,key);if(!g?.stolen||g.source!==site.id||g.provenance.ownerId!==m.id||Object.values(s.equipment.equipped).includes(key))return false;if(!transferStolenGear(s,key,{outcome:'returned',recipientId:m.id,recipientName:m.name}))return false;if(g.provenance.stockSeason===m.season&&(m.stock[g.baseId]||0)<1000)m.stock[g.baseId]=(m.stock[g.baseId]||0)+1;log(s,ctx,'The same piece returned',`${m.name} receives the stolen ${g.name.toLowerCase()} back. You receive no payment; the original property and any local evidence remain recorded.`);}
  else if(id.startsWith('realm_sellgear_')){const key=id.slice(15),g=getGearItem(s,key);if(!g||!s.equipment.owned.includes(key)||Object.values(s.equipment.equipped).includes(key))return false;if(g.stolen){const buyer=lootBuyer(s,site,{...g.provenance,stolen:true}),price=Math.floor(g.provenance.value*(buyer.fence?.55:.8));if(!transferStolenGear(s,key,{outcome:'sold',recipientId:buyer.person.id,recipientName:buyer.person.name,price}))return false;s.hero.gold+=price;if(buyer.fence&&seededRoll(s.seed,'fence:'+g.provenance.lootId,100)<region.law.enforcement/2)ctx.addEvidence(1,`${buyer.person.name}, a separate fence, was identified receiving your stolen ${g.provenance.label}.`);log(s,ctx,'Stolen equipment changes hands',`${buyer.person.name} pays ${price} gold for ${g.provenance.label}.${!g.provenance.ownerId?' Its earlier owner remains unknown.':''}`);}else{discardGear(s,key);const price=gearSaleValue(g,m);s.hero.gold+=price;if(GEAR_CATALOG.some(i=>i.id===key))m.stock[key]=(m.stock[key]||0)+1;log(s,ctx,'Tools change hands',`${m.name} pays ${price} gold for your ${g.name}.`);}}
  else if(id==='realm_sellbasket')return sellLootBasket(s,lootBasketQuote(s),ctx);
  else if(id.startsWith('realm_sellloot_')){const key=id.slice(15),i=s.adventuring.loot.findIndex(l=>l.id===key);if(i<0)return false;const l=s.adventuring.loot[i],buyer=lootBuyer(s,site,l),price=Math.floor(l.value*(buyer.fence?.55:.8));s.adventuring.loot.splice(i,1);s.hero.gold+=price;if(buyer.fence&&seededRoll(s.seed,'fence:'+l.id,100)<region.law.enforcement/2)ctx.addEvidence(1,`${buyer.person.name}, a separate fence, was identified receiving your stolen ${l.name}.`);log(s,ctx,'A relic sold',`${buyer.person.name} pays ${price} gold for ${l.name}.${l.stolen&&!buyer.known?' Its earlier owner remains unknown.':''}`);}
  else if(id.startsWith('realm_join_')){s.realm.faithId=id.slice(11);const f=FAITHS.find(f=>f.id===s.realm.faithId);log(s,ctx,'A faith chosen',`You enter the rites of ${f.name}. ${f.doctrine}`);}
  else if(id==='realm_leavefaith'){s.realm.faithId=null;log(s,ctx,'An altar left behind','You leave the congregation, keeping your memories and learned skills.');}
  else if(id==='realm_ritual'){const f=FAITHS.find(f=>f.id===s.realm.faithId);s.realm.uses.ritualDay=s.day;s.realm.devotion++;s.hero.skills[f.skill]++;s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+f.serviceMp);log(s,ctx,f.ritualName,faithRitualText(s,f));}
  else if(id==='realm_rebuild'){if(site.rebuild>=4)site.rebuild=0;site.rebuild++;if(site.rebuild>=4){const p=s.world.locations.find(p=>p.id===site.id);p.status='thriving';p.servicesAvailable=true;p.services=[...site.services];site.phase='village';site.prosperity=35;site.security=40;newMerchant(s,site,(m?.generation||0)+1);const text=`${p.name} is rebuilt upon its old ruins. Four stages of your work establish a new settlement; the destruction remains in history.`;history(s,text);worldChange(s,site.id,'A hearth returns',text);log(s,ctx,'A hearth returns',text);}else log(s,ctx,'Foundations for a new settlement',`Reconstruction at ${s.world.locations.find(p=>p.id===site.id).name} reaches stage ${site.rebuild}/4.`);}
  else if(id==='realm_invest'||id==='realm_relief'){site.prosperity=clamp(site.prosperity+5);site.security=clamp(site.security+8);log(s,ctx,id==='realm_relief'?'Bread through the war':'A settlement tended','Your time and coin improve the actual settlement’s prosperity and safety.');}
  else if(id==='realm_negotiate'){const war=s.realm.wars.find(w=>w.status==='active'&&(w.a===site.regionId||w.b===site.regionId));const score=s.hero.skills.persuasion+s.hero.skills.scholarship+Math.floor(s.hero.attributes.presence/2);if(score>=10+seededRoll(s.seed,'truce:'+war.id+':'+s.day,12)){war.status='truce';war.endsDay=s.day;site.security=clamp(site.security+15);history(s,`Your negotiations end ${war.id} in a ceasefire.`);log(s,ctx,'The fighting falls quiet','The two rulers accept a ceasefire. Trade and settlement recovery can resume.');}else log(s,ctx,'A peace refused','The envoys hear you, but neither ruler accepts the terms. The conflict continues.');}
  else if(id==='realm_raid'){const war=s.realm.wars.find(w=>w.status==='active'&&(w.a===site.regionId||w.b===site.regionId));s.adventuring.raid={warId:war.id,regionId:site.regionId,locationId:s.locationId};ctx.startBattle('free_bandit',{kind:'adventure',mode:'raid',token:war.id,locationId:s.locationId});}
  else if(id==='realm_charter'){site.owner=s.dynasty?.activePersonId||'hero';site.rule='charter';history(s,`${s.hero.name} acquires a recognized charter over ${s.world.locations.find(p=>p.id===site.id).name}.`);log(s,ctx,'A holding entrusted','The charter establishes stewardship and annual returns tied to prosperity. The holding belongs to your dynasty.');}
  else if(id==='realm_seize'){s.adventuring.claim={locationId:s.locationId,regionId:site.regionId};ctx.startBattle('free_bandit',{kind:'adventure',mode:'conquest',token:'claim-'+s.locationId,locationId:s.locationId});}
  else if(id==='realm_govern_care'){site.prosperity=clamp(site.prosperity+10);site.security=clamp(site.security+8);s.realm.uses['govern:'+site.id]=s.day;ctx.standing('villagers',3);log(s,ctx,'Stewardship at the hearth','Your time and resources improve the holding. Its households are safer and its future returns may grow.');}
  else if(id==='realm_govern_tithe'){site.prosperity=clamp(site.prosperity-8);site.security=clamp(site.security-12);s.realm.uses['govern:'+site.id]=s.day;s.hero.gold+=50;ctx.standing('villagers',-6);ctx.standing('underworld',3);log(s,ctx,'Coin beneath a hard hand','You take 50 gold from the holding. Prosperity and security suffer; the wealth remains yours.');}
  return true;
}
export function realmView(s){
  if(!s.realm)return null;const region=regionAt(s),site=local(s),m=site?.merchant;
  return {region,site,merchant:m?{...m,age:m.baseAge+Math.floor((s.day-m.createdDay)/365)}:null,faith:FAITHS.find(f=>f.id===s.realm.faithId)||null,faiths:FAITHS,regions:s.realm.regions.map(r=>({...REGION_TEMPLATES.find(t=>t.id===r.id),...r})),wars:s.realm.wars,history:s.realm.history.slice(-14).reverse()};
}
export function validateRealm(r,s){
  const int=(n,min=0,max=10000000)=>Number.isInteger(n)&&n>=min&&n<=max,person=p=>p&&typeof p.name==='string'&&p.name.length<121&&int(p.baseAge,18,100)&&int(p.createdDay)&&isCanonicalAppearance(p.appearance);
  if(!r||r.version!==1||!int(r.lawVersion,0,1)||!int(r.lastYear)||r.lastYear>year(s)||!Array.isArray(r.regions)||r.regions.length!==6||new Set(r.regions.map(p=>p.id)).size!==6)return false;
  if(!r.regions.every(p=>REGION_TEMPLATES.some(t=>t.id===p.id)&&FAITHS.some(f=>f.id===p.faithId)&&person(p.ruler)&&int(p.power,0,100)&&int(p.treasury)&&['council','crown','order'].includes(p.regime)&&int(p.succession)&&(p.liege===undefined||r.regions.some(r=>r.id===p.liege&&r.id!==p.id))))return false;
  if(r.allegianceVersion!==undefined&&(r.allegianceVersion!==2||!acyclicAllegiance(r.regions)))return false;
  if(!r.sites||Object.keys(r.sites).length!==s.world.locations.length)return false;
  for(const place of s.world.locations){const p=r.sites[place.id];if(!p||p.id!==place.id||!r.regions.some(r=>r.id===p.regionId)||!int(p.prosperity,0,100)||!int(p.security,0,100)||!['village','town','city','ruin'].includes(p.phase)||!int(p.rebuild,0,4)||!Array.isArray(p.services)||p.services.length>20||(p.owner!==undefined&&(typeof p.owner!=='string'||p.owner.length>160||!['charter','force'].includes(p.rule))))return false;if(p.lastDevelopment!==undefined&&(!p.lastDevelopment||!['village','town','city','ruin'].includes(p.lastDevelopment.from)||!['village','town','city'].includes(p.lastDevelopment.to)||p.lastDevelopment.from===p.lastDevelopment.to||!int(p.lastDevelopment.day,0,s.day)))return false;if(p.faithId!==undefined&&!FAITHS.some(f=>f.id===p.faithId)||p.hasShrine!==undefined&&typeof p.hasShrine!=='boolean')return false;const m=p.merchant;if(m&&(!person(m)||!int(m.generation)||!int(m.season)||!int(m.potions,0,100)||!int(m.rations,0,100)||!m.stock||!m.prices||!Object.entries(m.stock).every(([id,n])=>GEAR_CATALOG.some(g=>g.id===id)&&int(n,0,1000))||!Object.entries(m.prices).every(([id,n])=>GEAR_CATALOG.some(g=>g.id===id)&&int(n,1,10000))))return false;}
  for(const site of Object.values(r.sites)){if(site.keeper&&(!person(site.keeper)||!/^keeper-[a-z0-9_-]+$/.test(site.keeper.id)||!int(site.keeper.generation)||typeof site.keeper.role!=='string'))return false;if(site.keeperArchive&&(!Array.isArray(site.keeperArchive)||site.keeperArchive.length>3||site.keeperArchive.some(k=>!person(k)||!int(k.retiredDay)||k.retiredDay>s.day)))return false;}
  const validPetition=p=>p&&FAITHS.some(f=>f.id===p.faithId&&int(p.index,0,f.questFlavor.length-1))&&r.sites[p.boardId]&&r.sites[p.destinationId]&&typeof p.keeperId==='string'&&typeof p.keeperName==='string'&&p.keeperName.length<121&&int(p.startedDay)&&p.startedDay<=s.day&&['field','return'].includes(p.stage)&&int(p.researchDays,0,2)&&(p.stage!=='return'||p.researchDays===2);
  if(r.petition!==undefined&&r.petition!==null&&!validPetition(r.petition))return false;
  if(r.faithRecords!==undefined&&(!Array.isArray(r.faithRecords)||r.faithRecords.length>18||r.faithRecords.some(p=>!validPetition(p)||!int(p.day)||p.day>s.day||!['share','sell','suppress'].includes(p.method)||typeof p.followedUp!=='boolean')))return false;
  if(r.regions.some(region=>region.occupation&&(!int(region.occupation.day)||region.occupation.day>s.day||typeof region.occupation.author!=='string'||!['watch','tithe','restitution'].includes(region.occupation.policy))))return false;
  if(!Array.isArray(r.wars)||r.wars.length>40||!r.wars.every(w=>typeof w.id==='string'&&r.regions.some(r=>r.id===w.a)&&r.regions.some(r=>r.id===w.b)&&w.a!==w.b&&int(w.startDay)&&int(w.endsDay)&&['active','ended','truce'].includes(w.status)&&(w.victor===null||[w.a,w.b].includes(w.victor))&&int(w.balance,-1000,1000)))return false;
  if(r.wars.some(w=>w.grievance!==undefined&&(typeof w.grievance!=='string'||!w.grievance.length||w.grievance.length>1500)))return false;
  return (r.faithId===null||FAITHS.some(f=>f.id===r.faithId))&&int(r.devotion)&&r.uses&&Object.values(r.uses).every(n=>int(n))&&Array.isArray(r.history)&&r.history.length<=180&&r.history.every(h=>int(h.day)&&int(h.generation,1)&&typeof h.text==='string'&&h.text.length<=2000);
}
