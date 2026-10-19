import test from 'node:test';
import assert from 'node:assert/strict';
import { introduceAdultChildLife, advanceAdultChildLife, adultChildInheritance } from '../dist/js/adult-child-livelihoods.js';
import { adultChildLifeView, adultChildChoiceOutcome } from '../dist/js/adult-child-view.js';
import { familyResidence, familyVisitReason } from '../dist/js/household-residence.js';
import { resetCareerForSuccessor, initializeCareers } from '../dist/js/careers.js';
import { groundedEvent, groundedOutcome } from '../dist/js/grounded-narrative-content.js';
const YEAR=365;
function fixture() {
 const p={id:'line-42-g1-child-child-1',source:'child',localId:'child-1',name:'Aven',bornDay:0,alive:true,preferences:{pursuit:'craft'},development:{traits:{care:0,curiosity:0,courage:0},skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0])),education:{route:null,attendance:0,qualifications:[]},history:[]}};
 const c={id:p.localId,name:p.name,bornDay:0,age:18};
 const s={seed:'child-view',day:18*YEAR,age:50,phase:'adult',hero:{name:'Parent',origin:'village',birthplaceId:'home',gold:1000,profession:'Scholar',skills:{}},dynasty:{activePersonId:'parent'},lineage:{people:[p],pending:null},life:{home:{tier:'cottage',locationId:'home'},children:[c],people:[],career:{rank:0}},world:{locations:[{id:'home',name:'Old Hearth',type:'village',status:'thriving',servicesAvailable:true},{id:'city',name:'New Town',type:'city',status:'thriving',servicesAvailable:true}]}};
 return {s,p,c};
}
function grown(s,p,days=90){introduceAdultChildLife(s,p,{source:'calendar'});const before=s.day;s.day+=days;advanceAdultChildLife(s,p,{oldDay:before,newDay:s.day,eligiblePeriods:[{fromDay:before,toDay:s.day,locationId:'home'}]});}
test('views never introduce old adulthood metadata or mutate an existing case',()=>{
 const {s,p}=fixture(),before=structuredClone({s,p});assert.equal(adultChildLifeView(s,p),null);assert.deepEqual({s,p},before);grown(s,p);const saved=structuredClone({s,p});const view=adultChildLifeView(s,p);assert.match(view.progress,/14\/14/);assert.match(view.residence,/Independent lodgings in Old Hearth/);assert.deepEqual({s,p},saved);
});
test('a recorded child residence survives a parent move without a new deed or asset',()=>{
 const {s,p,c}=fixture();grown(s,p);s.life.home={tier:'townhouse',locationId:'city'};s.locationId='city';assert.equal(familyResidence(s,c),'home');assert.match(familyVisitReason(s,c),/Old Hearth/);assert.equal(s.world.locations.length,2);assert.equal(s.life.home.tier,'townhouse');
 s.world.locations[0].servicesAvailable=false;assert.match(adultChildLifeView(s,p).residence,/currently unavailable/);assert.match(familyVisitReason(s,c),/unavailable/);
});
test('sibling addresses remain exact, but a former hero’s childhood lodging does not override their later parent address',()=>{
 const {s,p}=fixture();grown(s,p);p.source='life';p.localId='family_sibling_1';const sibling={id:p.localId,name:p.name,familyRole:'sibling',locationId:'city'};s.life.children=[];s.life.people=[sibling];assert.equal(familyResidence(s,sibling),'home');
 p.localId='kin';const parent={id:'kin',name:p.name,familyRole:'parent',locationId:'city'};s.life.people=[parent];assert.equal(familyResidence(s,parent),'city');
});
test('career reset restores only the selected child’s recorded unpaid evidence',()=>{
 const {s,p}=fixture();grown(s,p);const own=adultChildInheritance(s,p);initializeCareers(s);s.careers.records.Scholar.experience=1800;s.careers.records.Scholar.mastery=4;s.careers.records.Scholar.workedDays=1800;s.careers.records.Scholar.paidWorkedDays=1800;s.careers.records.Scholar.earnedGold=5000;
 const gold=s.hero.gold,skills=structuredClone(s.hero.skills);resetCareerForSuccessor(s,{},own);assert.equal(s.hero.profession,'Blacksmith');assert.equal(s.careers.records.Blacksmith.experience,10);assert.equal(s.careers.records.Blacksmith.workedDays,14);assert.equal(s.careers.records.Scholar.experience,0);assert.equal(s.careers.records.Blacksmith.mastery,0);assert.equal(s.careers.records.Blacksmith.earnedGold,0);assert.equal(s.hero.gold,gold);assert.deepEqual(s.hero.skills,skills);
});
test('a malformed restoration cannot smuggle parent mastery, a paid wage or another profession record',()=>{
 const {s,p}=fixture();grown(s,p);const own=adultChildInheritance(s,p);initializeCareers(s);own.careerRecord.experience=1800;own.careerRecord.mastery=4;own.careerRecord.earnedGold=9999;s.hero.profession='Unemployed';resetCareerForSuccessor(s,{},own);assert.equal(s.hero.profession,'Unemployed');assert.equal(s.careers.records.Blacksmith.experience,0);assert.equal(s.careers.records.Blacksmith.earnedGold,0);
});
test('authored adult-child plans retain exact people, costs and contextual outcomes in narrative edition',()=>{
 const {s,p}=fixture();introduceAdultChildLife(s,p,{source:'conversation'});s.lineage.pending={type:'future',personId:'child-1',sourcePersonId:p.id};const event={id:'lineage_future',title:"Aven's plan",body:'Aven chooses blacksmith work. Optional support costs 20 gold.',choices:[{id:'fund',label:'Fund the 20-gold start',description:'No new identity.'}]};
 assert.deepEqual(groundedEvent(s,event),event);assert.match(groundedOutcome(s,{eventId:event.id,choice:{id:'fund'}}),/one-off 20-gold start Aven requested/);assert.match(adultChildChoiceOutcome(s,p,event.id,'decline'),/no failure or lost affection/);assert.match(adultChildChoiceOutcome(s,p,event.id,'listen'),/No gold/);
});
test('milestone wording recalls the actual earlier response and grants no occupancy claim',()=>{
 const {s,p}=fixture();grown(s,p);p.adultLife.response='fund';const funded=adultChildChoiceOutcome(s,p,'lineage_independence','company');assert.match(funded,/20-gold help/);assert.doesNotMatch(funded,/their deed/);p.adultLife.response='decline';assert.match(adultChildChoiceOutcome(s,p,'lineage_independence','space'),/financial boundary/);
});
