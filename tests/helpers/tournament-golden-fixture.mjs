export function ordinaryGame(kind='warrior',difficulty='balanced'){
 const attrs={strength:6,agility:3,vitality:4,intellect:3,willpower:3,presence:3},skills={weapons:2,defense:1,arcana:0,devotion:0,stealth:0,survival:0,scholarship:0,persuasion:1};
 if(kind==='mage'){Object.assign(attrs,{strength:3,intellect:6,willpower:4});Object.assign(skills,{weapons:0,arcana:3,scholarship:2});}
 if(kind==='rogue'){Object.assign(attrs,{strength:3,agility:6,presence:4});Object.assign(skills,{weapons:0,defense:0,stealth:3,survival:2});}
 return {seed:'ordinary-golden-'+kind,difficulty,revision:5,flags:{battlesStarted:2},hero:{name:'Ordinary '+kind,path:kind,specialization:null,hp:56,maxHp:56,mp:25,maxMp:25,attributes:attrs,skills,condition:null,potions:2,level:3},companions:[],rpg:{trainedTechniques:[]},realm:{},fellowship:{formations:{}}};
}
export function goldenSnapshot(C,game,encounter){
 let b=C.createBattle(game,encounter),states=[structuredClone(b)];
 for(let i=0;i<5&&!b.outcome;i++){
  const actions=C.getBattleActions(b),a=actions.find(a=>a.id===(i%2?'defend':'skill')&&!a.disabledReason)||actions.find(a=>a.id==='attack'),target=a.targetSide==='party'?'hero':'enemy-1';
  states.push({actions,preview:C.previewBattleAction(b,a.id,target)});b=C.takeBattleAction(b,a.id,target);states.push(b);
 }
 return JSON.stringify(states);
}
