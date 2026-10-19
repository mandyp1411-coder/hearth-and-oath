import { attachEnemyPlan } from './enemy-plans-v27.js';
import { BLOOD_LINEAGES } from './curses.js';
import { FOE_ATLASES } from './foe-catalog.js';
import { GROUNDED_ENEMY_SPECIES_V39, GROUNDED_ENEMY_PLAN_ALIASES_V39, GROUNDED_BOSS_ROWS_V39, GROUNDED_FOE_ATLASES_V39, enemyTerrainAliasesV39 } from './grounded-enemies-v39.js';
import { hexAtlas } from './cartography.js';
import { seededRoll, generatePersonName } from './world.js';
import { generateCharacter } from './characters.js';
import { renderAvatar, isCanonicalAppearance } from './avatar.js';

export const ENEMY_SPECIES = [
  ['wolf','Briar wolf','beasts',0,'beast','striker'],['boar','Iron-tusk boar','beasts',1,'beast','striker'],['rat','Grave rat','beasts',2,'beast','barbed'],['leech','Marsh leech','beasts',3,'beast','leech'],['spider','Root spider','beasts',4,'beast','hexer'],['bat','Cave bat','beasts',5,'beast','striker'],['bear','Hollow bear','beasts',6,'beast','striker'],['serpent','Ash serpent','beasts',7,'beast','barbed'],
  ['skeleton','Bone soldier','undead',0,'undead','striker'],['grave_knight','Grave knight','undead',1,'undead','warder'],['ghoul','Hunger ghoul','undead',2,'undead','leech'],['mummy','Salt mummy','undead',3,'undead','hexer'],['drowned','Drowned revenant','undead',4,'undead','barbed'],['bone_hound','Bone hound','undead',5,'undead','striker'],['acolyte','Death acolyte','undead',6,'undead','hexer'],['rotted_jailer','Rotting jailer','undead',7,'undead','warder'],
  ['wraith','Pale wraith','spirits',0,'spirit','hexer'],['wisp','Bog wisp','spirits',1,'spirit','leech'],['shadow','Shadow adept','spirits',2,'spirit','hexer'],['archivist','Bound archivist','spirits',3,'spirit','warder'],['shade','Funeral shade','spirits',4,'spirit','hexer'],['seal','Soul seal','spirits',5,'spirit','warder'],['ember','Living ember','spirits',6,'spirit','barbed'],['watcher','Spectral watcher','spirits',7,'spirit','sniper'],
  ['sentinel','Stone sentinel','constructs',0,'construct','striker'],['golem','Rune golem','constructs',1,'construct','warder'],['husk','Iron husk','constructs',2,'construct','striker'],['keeper','Cistern keeper','constructs',3,'construct','keeper'],['root','Living root','constructs',4,'construct','barbed'],['thornheart','Thornheart','constructs',5,'construct','thornheart'],['sprout','Living sprout','constructs',6,'construct','warder'],['guardian','Covenant guardian','constructs',7,'construct','covenant'],
  ['moth','Moth horror','aberrations',0,'aberration','hexer'],['fungus','Fungal horror','aberrations',1,'aberration','leech'],['eye','Many-eyed horror','aberrations',2,'aberration','sniper'],['chimera','Ash chimera','aberrations',3,'aberration','striker'],['fiend','Horned fiend','aberrations',4,'aberration','barbed'],['crawler','Mawed crawler','aberrations',5,'aberration','striker'],['eldritch_knight','Eldritch knight','aberrations',6,'aberration','warder'],['oracle','Pale oracle','aberrations',7,'aberration','hexer'],
  ['captain','Tower captain','bosses',0,'humanoid','captain'],['last_archivist','The last archivist','bosses',1,'spirit','archivist'],['anchor_warden','Anchor warden','bosses',2,'spirit','warden'],['thorn_sovereign','Thorn sovereign','bosses',3,'construct','thornheart'],['hollow_king','Hollow king','bosses',4,'undead','covenant'],['death_cleric','Death cleric','bosses',5,'undead','hexer'],['dragon','Old dragon','bosses',6,'beast','striker'],['witch','Mire witch','bosses',7,'humanoid','hexer'],
  ...GROUNDED_ENEMY_SPECIES_V39.map(row=>[row.id,row.name,row.group,row.row,row.role,row.aiKey]),
];
export const ENEMY_ATLASES = {...FOE_ATLASES,...GROUNDED_FOE_ATLASES_V39};
const newSpecies=new Map(GROUNDED_ENEMY_SPECIES_V39.map(row=>[row.id,row]));
const bossSpecies=new Set(GROUNDED_BOSS_ROWS_V39);
const nameConnectors=new Set(['a','an','and','as','at','but','by','for','from','in','into','nor','of','on','or','the','to','with','without']);
/** Format the visible label without changing saved actors or combat history. */
export function enemyDisplayName(actor){
  const name=typeof actor==='string'?actor:String(actor?.name||'Enemy');
  // Generated people retain the spelling and capitalization of their identity.
  if(typeof actor==='object'&&(actor?.illustration?.kind==='person'||actor?.naming))return name;
  return name.replace(/(^|[\s-])(\p{L})([\p{L}\p{M}’']*)/gu,(word,prefix,first,rest,offset)=>{
    const lower=(first+rest).toLowerCase();
    return prefix+(offset>0&&prefix!=='-'&&nameConnectors.has(lower)?lower:first.toLocaleUpperCase()+rest);
  });
}

export function enemyEncounterTerrains(game){
  if(game.cartography?.offsite&&game.world?.locations&&game.world?.roads){
    const cell=hexAtlas(game).byKey[game.cartography.position];
    if(cell)return enemyTerrainAliasesV39(cell.terrain);
  }
  const site=game.world?.locations?.find(row=>row.id===game.locationId),named=enemyTerrainAliasesV39(site?.id);
  return named.length?named:enemyTerrainAliasesV39(site?.type);
}
export function enemySpeciesPool(game,type){
  const rows=ENEMY_SPECIES.filter(row=>row[4]===type&&!bossSpecies.has(row[0])&&row[2]!=='bosses');
  const terrains=enemyEncounterTerrains(game);
  if(!terrains.length)return rows;
  const local=rows.filter(row=>{
    // Existing authored quests retain their original candidate species. New
    // additions use only the habitats drawn and described for that creature.
    const habitats=newSpecies.get(row[0])?.terrains;
    return !habitats?.length||habitats.some(terrain=>terrains.includes(terrain));
  });
  return local.length?local:rows.filter(row=>!newSpecies.has(row[0]));
}
const TRAITS=[['cautious','Ward first, then strike.','warder',0,1],['ravenous','Drain strength from the wounded.','leech',1,0],['relentless','Press the weakest opening.','striker',2,0],['spiteful','Leave wounds after each strike.','barbed',0,0],['cunning','Break focus with a hex.','hexer',0,0],['watchful','Punish an exposed target.','sniper',0,0]];
export function enemyIllustration(species,seed,salt){
  const row=ENEMY_SPECIES.find(e=>e[0]===species)||ENEMY_SPECIES[0];
  if(bossSpecies.has(row[0])){
    const variant=seededRoll(seed,salt,16);
    return {kind:'foe',species:row[0],group:variant<8?row[2]:'grounded-bosses-39',cell:row[3]*8+variant%8};
  }
  const cells=Array.from({length:8},(_,i)=>row[3]*8+i).filter(i=>!(row[0]==='wisp'&&i===14)&&!(row[0]==='fungus'&&i===13));
  return {kind:'foe',species:row[0],group:row[2],cell:cells[seededRoll(seed,salt,cells.length)]};
}
export function identifyEnemy(enemy,seed,salt){
  const n=String(enemy.name||'').toLowerCase();
  const known=ENEMY_SPECIES.find(row=>n===row[1].toLowerCase()||n.endsWith(' '+row[1].toLowerCase()));
  if(known)return enemyIllustration(known[0],seed,salt);
  const rules=[[/last archivist/,'last_archivist'],[/anchor warden/,'anchor_warden'],[/tower captain/,'captain'],[/covenant.*guardian/,'guardian'],[/thornheart/,'thornheart'],[/sprout/,'sprout'],[/sentinel/,'sentinel'],[/golem/,'golem'],[/husk/,'husk'],[/cistern keeper/,'keeper'],[/jailer/,'rotted_jailer'],[/grave guardian/,'grave_knight'],[/wolf/,'wolf'],[/boar/,'boar'],[/rat/,'rat'],[/leech/,'leech'],[/spider/,'spider'],[/wisp/,'wisp'],[/spark|ember/,'ember'],[/seal/,'seal'],[/archivist|record|page/,'archivist'],[/shade|echo/,'shade'],[/thorn/,'root'],[/trial guardian/,'sentinel']];
  const species=rules.find(([re])=>re.test(n))?.[1];
  if(species)return enemyIllustration(species,seed,salt);
  if(enemy.role==='spirit')return enemyIllustration('wraith',seed,salt);
  if(enemy.role==='beast')return enemyIllustration('boar',seed,salt);
  const years=20+seededRoll(seed,salt+'age',35),person=generateCharacter(seed,salt,{role:/slinger|scavenger|trapper|cutpurse/.test(n)?'Ranger':'Soldier',age:years});
  return {kind:'person',appearance:person.appearance,age:years};
}
export function proceduralEnemies(game,type='beast',tier=1,salt='encounter',targetName=null,targetPerson=null){
  const count=1+seededRoll(game.seed,salt+':count',Math.min(3,1+tier)), result=[];
  const rows=enemySpeciesPool(game,type);
  const targetLabel=targetName||targetPerson?.name;
  const targetSpecies=typeof targetLabel==='string'?ENEMY_SPECIES.find(row=>row[4]===type&&!bossSpecies.has(row[0])&&(targetLabel.toLowerCase()===row[1].toLowerCase()||targetLabel.toLowerCase().endsWith(' '+row[1].toLowerCase()))):null;
  for(let i=0;i<count;i++){
    const key=salt+':'+i, trait=TRAITS[seededRoll(game.seed,key+':trait',TRAITS.length)], row=i===0&&targetSpecies?targetSpecies:rows[seededRoll(game.seed,key+':species',rows.length)]||ENEMY_SPECIES[0];
    const humanoid=type==='bandit', name=i===0&&targetLabel?targetLabel:humanoid?generatePersonName(game.seed,key):row[1],humanRole=trait[2]==='hexer'?'mage':trait[2]==='sniper'?'ranger':'warrior';
    const years=i===0&&targetPerson?targetPerson.age:20+seededRoll(game.seed,key+':age',35),person=i===0&&targetPerson?targetPerson:humanoid?generateCharacter(game.seed,key,{role:humanRole==='mage'?'Scholar':humanRole==='ranger'?'Ranger':'Soldier',age:years,disposition:trait[0]}):null;
    const infected=!(i===0&&targetLabel)&&type==='undead'&&row[0]==='ghoul'&&seededRoll(game.seed,key+':carrier',3)===0,carrier=infected?generateCharacter(game.seed,key+':carrier-face',{role:'Exile',age:years}):null;
    result.push({name:i===0&&targetLabel?targetLabel:infected?'Feral Blood-Carrier':humanoid?name:enemyDisplayName(`${trait[0]} ${name}`),role:humanoid?humanRole:row[4],hp:18+tier*6+seededRoll(game.seed,key+':hp',9),attackPower:4+Math.min(6,tier)+trait[3],agility:3+seededRoll(game.seed,key+':agility',5),armor:trait[4]+Math.floor(tier/3),aiKey:['keeper','thornheart','covenant','archivist','captain','warden'].includes(row[5])?row[5]:trait[2],aiStep:0,personality:trait[0],weakness:type==='undead'?'radiance':type==='construct'?'lightning':type==='aberration'?'fire':type==='spirit'?'radiance':'ice',intent:trait[1],bloodless:['undead','spirit','construct'].includes(type),illustration:infected?{kind:'curse',appearance:carrier.appearance,age:years,condition:{type:'vampire',curseVersion:1,stage:'changed',form:'feral',hunger:100,humanity:10,bloodline:BLOOD_LINEAGES[seededRoll(game.seed,key+':bloodline',4)].id}}:humanoid?{kind:'person',appearance:person.appearance,age:years}:enemyIllustration(row[0],game.seed,key+':portrait')});
  }
  return game.rpg?result.map((e,i)=>attachEnemyPlan(e,e.illustration?.kind==='foe'?(GROUNDED_ENEMY_PLAN_ALIASES_V39[e.illustration.species]||e.illustration.species):type==='bandit'?['captain','witch','oracle'][seededRoll(game.seed,salt+':human-plan:'+i,3)]:e.role==='undead'?'ghoul':'wolf')):result;
}
export function validEnemyIllustration(value){
  if(value?.kind==='curse')return isCanonicalAppearance(value.appearance)&&Number.isInteger(value.age)&&value.age>=18&&value.age<=200&&['vampire','lycanthrope'].includes(value.condition?.type)&&value.condition.curseVersion===1&&value.condition.stage==='changed'&&(value.condition.type!=='vampire'||BLOOD_LINEAGES.some(l=>l.id===value.condition.bloodline))&&['feral','beast'].includes(value.condition.form);
  if(value?.kind==='person')return value.appearance&&Number.isInteger(value.age)&&value.age>=18&&value.age<=100;
  if(value?.kind!=='foe'||!Number.isInteger(value.cell)||value.cell<0||value.cell>=64)return false;
  const row=ENEMY_SPECIES.find(e=>e[0]===value.species);
  const groupMatches=row&&(row[2]===value.group||bossSpecies.has(row[0])&&value.group==='grounded-bosses-39');
  return Boolean(row&&groupMatches&&Math.floor(value.cell/8)===row[3]&&!(value.species==='wisp'&&value.cell===14)&&!(value.species==='fungus'&&value.cell===13));
}
export function renderEnemyPortrait(actor){
  const art=actor.illustration||identifyEnemy(actor,actor.name,'legacy-portrait');
  if(art.kind==='curse')return renderAvatar({name:actor.name,appearance:art.appearance,condition:art.condition},{size:'small',age:art.age});
  if(art.kind==='person')return renderAvatar({name:actor.name,appearance:art.appearance},{size:'battle',age:art.age});
  const atlas=ENEMY_ATLASES[art.group], rect=atlas?.cells[art.cell];if(!rect)return '';
  const [x,y,w,h]=rect,ratio=(w*atlas.width)/(h*atlas.height),ww=ratio>=1?100:ratio*100,hh=ratio>=1?100/ratio:100;
  return `<div class="fantasy-avatar size-small"><div class="raster-portrait enemy-portrait" role="img" aria-label="Enemy illustration"><span class="preset-window" style="width:${ww}%;height:${hh}%;left:${(100-ww)/2}%;top:${(100-hh)/2}%"><img class="preset-portrait-img" src="${atlas.src}" alt="" style="width:${10000/w}%;height:${10000/h}%;left:${-x/w*100}%;top:${-y/h*100}%" decoding="async"></span></div></div>`;
}
