import { seededRoll } from './world.js';
import { resolveGearArtwork } from './inventory-art-v39.js';

export const EQUIPMENT_SLOTS = ['weapon','offhand','head','armor','hands','feet','cloak','belt','trinket','ring'];
export const SLOT_NAMES = {weapon:'Main hand',offhand:'Off hand',head:'Head',armor:'Body',hands:'Hands',feet:'Feet',cloak:'Cloak',belt:'Belt',trinket:'Amulet',ring:'Ring'};
export const RARITIES = ['common','uncommon','rare','epic','legendary'];
export const AFFIXES = {
  plain:{name:'',bonuses:{}},
  vanguard:{name:'of the Vanguard',bonuses:{armor:1}},
  duelist:{name:'of the Duelist',bonuses:{attack:1}},
  arcanist:{name:'of the Arcanist',bonuses:{magic:1}},
  wayfarer:{name:'of the Wayfarer',bonuses:{agility:1}},
  striker:{name:'of the Striker',bonuses:{attack:3,armor:-1},description:'More weapon power at the cost of protection.',thresholds:[{count:3,bonuses:{attack:3,armor:-1}},{count:5,bonuses:{attack:1,agility:1,armor:-1}}]},
  channeler:{name:'of the Channeler',bonuses:{magic:3,armor:-1},description:'More spell power at the cost of protection.',thresholds:[{count:3,bonuses:{magic:3,armor:-1}},{count:5,bonuses:{magic:1,agility:1,armor:-1}}]},
  bastion:{name:'of the Bastion',bonuses:{armor:2,attack:-2},description:'More protection at the cost of weapon power.',thresholds:[{count:3,bonuses:{armor:2,attack:-2}},{count:5,bonuses:{armor:1,attack:-1}}]},
};
const piece=(id,name,slot,price,stats,art,description)=>({id,name,slot,price,bonuses:{attack:0,armor:0,magic:0,agility:0,...stats},art,description,recipe:{...(stats.magic>0?{cloth:2,crystal:1}:slot==='head'||slot==='offhand'?{ore:2,hide:1}:{hide:1,cloth:2}),gold:4},craftDays:2,craftSkill:0,workshopTier:1});
export const EXTRA_GEAR = [
  piece('field_shield','Iron roundshield','offhand',42,{armor:2},4,'A broad guard for a patient defender.'),
  piece('bone_focus','Carved bone focus','offhand',38,{magic:2},15,'A quiet focus for a caster’s free hand.'),
  piece('field_helm','Watchman’s helm','head',32,{armor:1},5,'Old steel, a sound lining, and no grand promises.'),
  piece('scholar_hood','Scholar’s hood','head',34,{magic:1},7,'Threaded with a small focusing rune.'),
  piece('leather_gloves','Delver’s gloves','hands',28,{attack:1},8,'A sure grip on cold iron.'),
  piece('rune_gloves','Scribe’s handwraps','hands',30,{magic:1},8,'Runes worked into the cuffs steady a spell.'),
  piece('trail_boots','Soft trail boots','feet',30,{agility:1},9,'Supple soles leave a quiet step.'),
  piece('iron_boots','Iron-capped boots','feet',38,{armor:1,agility:-1},9,'A little more protection, a little less speed.'),
  piece('field_cloak','Wool traveler’s mantle','cloak',24,{armor:1},12,'A heavy mantle for the road and its weather.'),
  piece('spell_cloak','Embroidered spellmantle','cloak',40,{magic:1},12,'Fine stitches carry a modest ward.'),
  piece('field_belt','Delver’s toolbelt','belt',26,{attack:1},13,'Keeps a weapon and a few useful tools within reach.'),
  piece('quick_belt','Runner’s sash','belt',26,{agility:1},13,'A light sash that leaves movement free.'),
  piece('silver_amulet','Silver hearth amulet','trinket',38,{magic:1,armor:1},10,'An ordinary protective charm, given careful work.'),
  piece('iron_ring','Engraved iron ring','ring',24,{attack:1},11,'A fighter’s token, balanced for a working hand.'),
  piece('glass_ring','Blue-glass focus ring','ring',28,{magic:1},11,'Blue glass turns a candle flame into a steady point.'),
  piece('nimble_ring','Traveler’s signet','ring',28,{agility:1},11,'A small keepsake from a longer road.'),
];

export function itemArtwork(item) { return resolveGearArtwork(item).index; }

export function itemScore(item) {
  const b=item.bonuses;return Math.max(1,Math.round(3*b.attack+5*b.armor+3*b.magic+4*b.agility));
}
export function resolveFoundItem(record,catalog) {
  const base=catalog.find(i=>i.id===record.baseId);if(!base)return null;
  if(record.stolen){const item={...base,id:record.id,baseId:base.id,bonuses:{...base.bonuses},quality:'common',affix:'plain',tier:1,source:record.source,foundDay:record.day,stolen:true,provenance:structuredClone(record.provenance),recipe:null};return {...item,score:itemScore(item)};}
  const rank=RARITIES.indexOf(record.quality),affix=AFFIXES[record.affix];if(rank<0||!affix)return null;
  const b={...base.bonuses};
  // Quality strengthens the piece's main purpose; it never multiplies every stat.
  const principal=Object.entries(b).sort((a,b)=>b[1]-a[1])[0]?.[0]||'armor';
  b[principal]+=rank+Math.floor((record.tier-1)/3);
  if(rank>0)for(const [key,n] of Object.entries(affix.bonuses))b[key]+=n;
  const item={...base,id:record.id,baseId:base.id,name:`${record.crafted?'Crafted': ['Worn','Sound','Fine','Masterwork','Relic'][rank]} ${base.name}${rank>0&&affix.name?' '+affix.name:''}`,description:base.description.replace(/\s*Adds .+$/,''),bonuses:b,quality:record.quality,affix:record.affix,tier:record.tier,price:Math.round(base.price*(1+rank*.55)+record.tier*5),source:record.source,foundDay:record.day,recipe:null,...(record.crafted?{crafted:true}:{})};
  return {...item,score:itemScore(item)};
}
export function makeGearDrop(state,salt,tier,catalog,ctx={}) {
  const gear=state.equipment;if(!gear)return null;
  gear.instances||=[];
  const id=`found_${seededRoll(state.seed,`gear:${salt}`,2147483647).toString(36)}_${state.dynasty?.generation||1}`;
  if(gear.instances.some(i=>i.id===id))return null;
  if(gear.instances.length>=120){ctx.journal?.('No room for another piece','Your gear bag is full. Sell unequipped equipment at a merchant to make room.','equipment');return null;}
  tier=Math.max(1,Math.min(6,Math.floor(tier)));
  const roll=seededRoll(state.seed,`gear-quality:${salt}`,1000);
  const quality=roll<3&&tier>=5?'legendary':roll<35&&tier>=3?'epic':roll<170?'rare':roll<500?'uncommon':'common';
  const pool=catalog.filter(g=>g.price<=35+tier*30);
  const base=pool[seededRoll(state.seed,`gear-base:${salt}`,pool.length)];if(!base)return null;
  const affixes=Object.keys(AFFIXES).filter(id=>id!=='plain');
  const affix=affixes[seededRoll(state.seed,`gear-affix:${salt}`,affixes.length)];
  const record={id,baseId:base.id,quality,affix,tier,source:state.locationId,day:state.day};
  gear.instances.push(record);gear.owned.push(id);
  const item=resolveFoundItem(record,catalog);
  ctx.journal?.('Equipment recovered',`${item.name} · ${item.quality} · gear score ${item.score}. Keep it for a build or sell it at a merchant.`,'equipment');
  return item;
}
export function setProgress(items) {
  const counts={};for(const i of items)if(i.quality!=='common'&&i.affix&&i.affix!=='plain')counts[i.affix]=(counts[i.affix]||0)+1;
  return Object.entries(counts).map(([id,count])=>{
    const affix=AFFIXES[id];
    const thresholds=(affix.thresholds||[{count:3,bonuses:Object.fromEntries(Object.keys(affix.bonuses).map(k=>[k,2]))}]).map(t=>({...t,bonuses:{...t.bonuses},active:count>=t.count}));
    const bonuses={};for(const t of thresholds.filter(t=>t.active))for(const [key,n]of Object.entries(t.bonuses))bonuses[key]=(bonuses[key]||0)+n;
    return {id,count,name:affix.name.slice(7),bonuses,thresholds};
  });
}
export function setBonuses(items) { return setProgress(items).filter(s=>s.thresholds.some(t=>t.active)); }
export function validateStolenGearRecord(i,catalog) {
  const text=(t,max)=>typeof t==='string'&&t.length>0&&t.length<=max;
  const nullable=(t,max)=>t===null||text(t,max),int=(n,min=0,max=10000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const p=i?.provenance;
  return !!i&&/^stolen_(?:[1-9]\d*_[1-9]\d*|legacy_[a-z0-9]+_[1-9]\d*)$/.test(i.id)&&i.stolen===true&&catalog.some(g=>g.id===i.baseId)&&i.quality==='common'&&i.affix==='plain'&&i.tier===1&&i.crafted===undefined&&text(i.source,80)&&int(i.day)&&!!p&&text(p.lootId,160)&&text(p.label,160)&&nullable(p.ownerId,160)&&nullable(p.ownerName,120)&&nullable(p.propertyId,240)&&int(p.value,1,10000)&&(p.stockSeason===undefined||int(p.stockSeason));
}
export function validateGearInstances(v,catalog) {
  if(v===undefined)return true;
  return Array.isArray(v)&&v.length<=120&&new Set(v.map(i=>i?.id)).size===v.length&&v.every(i=>i&&(i.stolen!==undefined?validateStolenGearRecord(i,catalog):/^found_[a-z0-9]+_\d+$/.test(i.id)&&i.provenance===undefined&&catalog.some(g=>g.id===i.baseId)&&RARITIES.includes(i.quality)&&Object.hasOwn(AFFIXES,i.affix)&&Number.isInteger(i.tier)&&i.tier>=1&&i.tier<=6&&(i.crafted===undefined||i.crafted===true&&i.quality==='uncommon'&&i.tier===1&&['duelist','arcanist','vanguard','wayfarer'].includes(i.affix)&&!!catalog.find(g=>g.id===i.baseId)?.workshopTier)&&typeof i.source==='string'&&i.source.length<=80&&Number.isSafeInteger(i.day)&&i.day>=0));
}
