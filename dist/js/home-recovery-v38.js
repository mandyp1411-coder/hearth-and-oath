import {isSettlement} from './world.js';
import {noteTravelRest} from './travel-energy.js';

/** An owned roof at this address, never the player's last town while on the road. */
export function ownedHomeHere(s){
 const home=s.life?.home,site=s.world.locations.find(p=>p.id===s.locationId);
 return Boolean(home&&['cottage','townhouse','estate'].includes(home.tier)&&home.locationId===s.locationId&&isSettlement(s.world,s.locationId)&&!['destroyed','evacuated'].includes(site?.status)&&!s.cartography?.offsite);
}
export function homeRestReason(s,{visiting=false}={}){
 if(!ownedHomeHere(s))return 'You need an owned home in this settlement.';
 if(s.hero.hp<=0||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.cartography?.pending||s.timeline?.journey||s.maze||s.dungeon||s.rpg?.expedition||s.adventuring?.expedition||s.justice?.prison)return 'Finish the current moment first.';
 if(s.life?.plan||s.travel?.pending||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.rpg?.project||s.conversations?.project||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project)return 'Finish your current commitment first.';
 if(!visiting&&(s.cartography?.interior?.siteId!==s.locationId||s.cartography.interior.roomId!=='homes'))return 'Go to your home in the Homes area first.';
 return null;
}
export function homeRestActions(s){
 if(!ownedHomeHere(s))return [];
 const reason=homeRestReason(s);
 return [{id:'home_rest',label:'Rest at Home',description:'Spend one day in your own bed. Restore all Focus and ease 8 Stress. No room fee.',days:1,cost:0,group:'Recovery',...(reason?{disabledReason:reason}:{})}];
}
export function applyHomeRest(s,id,ctx){
 if(id!=='home_rest'||homeRestReason(s))return false;
 const siteId=s.locationId;
 if(ctx.spendDays(1)!==1||s.locationId!==siteId||homeRestReason(s)){
  s.notice='Your rest was interrupted. No Focus was restored.';return true;
 }
 const restored=s.hero.maxMp-s.hero.mp,stress=Math.min(8,s.life.stress);s.hero.mp=s.hero.maxMp;s.life.stress=Math.max(0,s.life.stress-8);noteTravelRest(s);
 s.notice=`You spend a quiet day resting at home. Restored ${restored} Focus and eased ${stress} Stress.`;
 (ctx.journalLiteral||ctx.journal)?.('A Day Resting at Home',s.notice,'life');
 return true;
}
