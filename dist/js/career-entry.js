import { credentialReason } from './schooling.js';
import { isSettlement } from './world.js';

const good=(id,name,materials,days,pay,extra={})=>({id,name,materials,days,pay,...extra});
export const PROFESSION_CATALOG=[
  {id:'unemployed',name:'Unemployed',description:'Paid local labor leaves room to decide what you want to learn.',skill:null,wage:18,annualWage:480,goods:[good('stacked-timber','stacked and weatherproofed timber',{},3,26),good('market-setup','a safe market-stall setup',{wood:1},3,32),good('storehouse','an organized community storehouse',{},4,34)]},
  {id:'healer',name:'Healer',description:'Care, patient consent, and reliable remedies form a civilian life.',skill:'devotion',wage:24,annualWage:640,goods:[good('dressings','clean dressings for a household',{cloth:2},3,45),good('clinic-kit','a checked clinic supply kit',{cloth:2,wood:1},4,55),good('recovery','a written recovery plan',{cloth:1},3,40)]},
  {id:'merchant',name:'Merchant',description:'Build a livelihood through transport accounts, fair exchanges, and trusted customers.',skill:'persuasion',wage:28,annualWage:760,goods:[good('provision-crate','a sealed provision crate',{wood:2,cloth:1},4,58),good('stall-fittings','weatherproof market fittings',{wood:2,cloth:2},4,62),good('ledger','a reconciled cooperative ledger',{},3,42)]},
  {id:'scholar',name:'Scholar',description:'Teach, copy, investigate, and preserve the names behind a discovery.',skill:'scholarship',wage:23,annualWage:620,goods:[good('reading-boards','a set of public reading boards',{wood:2},4,47),good('archive-cases','dry cases for a local archive',{wood:2,cloth:1},4,55),good('annotated-lessons','carefully annotated local lessons',{},4,44)]},
  {id:'herbalist',name:'Herbalist',description:'Tend a useful landscape and make dependable, honestly described preparations.',skill:'survival',wage:23,annualWage:600,goods:[good('drying-rack','a clean herb-drying rack',{wood:2,cloth:1},4,50),good('garden-markers','labeled garden beds',{wood:2},3,42),good('herb-wraps','weatherproof remedy wraps',{cloth:2},3,44)]},
  {id:'soldier',name:'Soldier',description:'Local watch service, safe training, and civilian protection do not require an adventurer’s life.',skill:'weapons',wage:26,annualWage:700,goods:[good('watch-drill','a supervised watch drill',{},4,45),good('bridge-lanterns','safe bridge lantern fittings',{ore:1,wood:1},4,53),good('training-shields','practice shields for recruits',{wood:2,cloth:1},4,54)]},
  {id:'blacksmith',name:'Blacksmith',description:'Repair farmers’ tools, earn a maker’s reputation, run a smithy, and leave work that outlasts you.',skill:'survival',wage:25,annualWage:720,goods:[good('farm-tools','a set of repaired farm tools',{ore:2,wood:1},4,58),good('door-hinges','fitted hinges for a neighbor’s door',{ore:2},3,49),good('iron-sword','a balanced iron longsword',{ore:3},4,66,{gearId:'iron_sword',tier:1})]},
  {id:'farmer',name:'Farmer',description:'Keep soil, irrigation, harvests, and community food arrangements healthy over many seasons.',skill:'survival',wage:22,annualWage:640,goods:[good('seed-beds','prepared community seed beds',{wood:1},4,44),good('irrigation','repaired field irrigation',{stone:2,wood:1},5,59),good('harvest-storage','dry and labeled harvest storage',{wood:2,cloth:1},4,51)]},
  {id:'alchemist',name:'Alchemist',description:'Useful mixtures depend on careful tests and honest labels, not a combat class.',skill:'arcana',wage:26,annualWage:730,goods:[good('safe-reagents','sealed and checked reagent jars',{crystal:1,cloth:1},4,62),good('water-test','a documented household water test',{crystal:1},4,54),good('cleaning-mixture','a labeled cleaning preparation',{cloth:1,wood:1},3,46)]},
  {id:'innkeeper',name:'Innkeeper',description:'An open door, clean rooms, and fair treatment can become a whole life’s work.',skill:'persuasion',wage:24,annualWage:700,goods:[good('guest-bedding','clean bedding for visiting households',{cloth:3},4,55),good('community-supper','an organized community supper',{wood:1,cloth:1},4,48),good('safe-rooms','checked and repaired guest rooms',{wood:2,cloth:1},5,62)]},
  {id:'miner',name:'Miner',description:'Work accessible local deposits under cooperative safety rules; exploration and combat remain optional.',skill:'survival',wage:27,annualWage:750,goods:[good('ore-sorting','a documented and sorted ore delivery',{},4,49),good('shaft-supports','tested gallery supports',{wood:3,ore:1},5,65),good('stone-cutting','dressed stone for a local builder',{stone:2},4,52)]},
  {id:'bard',name:'Bard',description:'Teach music, preserve living stories, and earn a living through performances with consent and credit.',skill:'persuasion',wage:23,annualWage:660,goods:[good('communal-song','a commissioned communal song',{},4,47),good('instrument-repair','a restored practice instrument',{wood:1,cloth:1},4,53),good('festival-lessons','rehearsed festival lessons',{},5,57)]},
  {id:'cartographer',name:'Cartographer',description:'Turn local surveys and careful observations into maps that people can rely on.',skill:'scholarship',wage:25,annualWage:710,goods:[good('field-map','a checked map of local fields',{cloth:1},4,51),good('water-map','a documented map of irrigation and wells',{cloth:1,wood:1},5,61),good('access-map','a legible community access map',{cloth:1},4,52)]},
];

export const getProfession = name => PROFESSION_CATALOG.find(p => p.name === name || p.id === name) || null;
export const professionSkill = name => getProfession(name)?.skill || null;
export const MODERN_CAREER_LEVELS = Object.freeze([0,90,360,900,1800]);
export const unpaidCareerExperience = days => Math.floor(Math.max(0, days) * .75);
export const freshCareerRecord = () => ({experience:0,mastery:0,reputation:30,workedDays:0,paidWorkedDays:0,unpaidWorkedDays:0,earnedGold:0,commissions:0,failures:0,safety:70,lastPracticeDay:null,lastStoryAge:null});

// Entry remains accessible. Certificates affect existing wages, not permission
// to begin a civilian profession, and a profession never assigns a combat class.
export function civilianProfessionEntryReason({profession, age, operating} = {}) {
  if (!getProfession(profession)) return 'This civilian profession is not recorded.';
  if (!Number.isSafeInteger(age) || age < 16) return 'Civilian apprenticeships open at sixteen.';
  if (!operating) return 'An operating settlement is needed to begin civilian work.';
  return null;
}

export function civilianEntryReason(s, {profession, age = s.age, locationId = s.locationId} = {}) {
  // On a new life the learned trades ask for letters and schooling; older saves keep open entry.
  return civilianProfessionEntryReason({profession,age,operating:isSettlement(s.world,locationId)}) || credentialReason(s, getProfession(profession)?.id);
}
