import { seededRoll } from './world.js';

export function areaScene(state,{dungeon=null,room=null,site=null}={}) {
  site||=state.world.locations.find(p=>p.id===state.locationId);
  const terrain=site?.type||site?.id||'';
  const interior={tavern:3,shrine:4,watch:5};
  const wild=/forest|wood|wild/.test(terrain)?0:/coast|marsh|shore/.test(terrain)?1:/mountain|highland/.test(terrain)?2:null;
  const extra={workyard:0,hall:1,wayhouse:2,court:1,stronghold:1};
  const collection=!dungeon&&Object.hasOwn(extra,room?.id)?'c':!dungeon&&(Object.hasOwn(interior,room?.id)||wild!==null)?'b':'a';
  const cell=collection==='c'?extra[room.id]:collection==='b'?(interior[room?.id]??wild):dungeon?(/cistern/.test(state.maze?.sourceId||'')?3:/watchtower|citadel/.test(state.maze?.sourceId||'')?5:4):room?.id==='archive'?2:site?.type==='city'||site?.id==='city'?1:0;
  const moods=['The lanterns burn low.','Rain settles on old stone.','A draft carries the smell of smoke.','The last light gathers at the windows.'];
  const present={workyard:site?.status==='scarred'?'Scaffolds keep the damaged lane in use.':'Tools wait beside the worn benches.',hall:'Low voices carry from the long tables.',wayhouse:room?.operating?'Warm light spills from the doorway.':'The common room is quiet, and its hearth is cold.'};
  return {cell,collection,mood:present[room?.id]||moods[seededRoll(state.seed,`area-mood:${site?.id}:${room?.id||'outside'}`,moods.length)]};
}
export function renderAreaScene(state,ui,options={}) {
  const {cell,mood,collection}=areaScene(state,options),site=options.site||state.world.locations.find(p=>p.id===state.locationId),title=options.dungeon?.room?.title||options.room?.name||site?.name||'The country';
  return `<figure class="area-scene" aria-label="${ui.e(title)} environment illustration"><div class="area-illustration scene-collection-${collection}" style="background-position:${cell%3*50}% ${Math.floor(cell/3)*100}%" role="img" aria-label="${ui.e(title)}"></div><figcaption><span>${ui.e(title)}</span><small>${ui.e(mood)}</small></figcaption></figure>`;
}
export function settlementLayout(s) {
  const layouts=[
    {gate:[280,260],market:[140,160],tavern:[140,65],shrine:[420,160],watch:[280,350],archive:[420,65],homes:[65,260]},
    {gate:[280,345],market:[280,205],tavern:[125,210],shrine:[425,210],watch:[425,340],archive:[425,65],homes:[125,65]},
    {gate:[70,205],market:[215,205],tavern:[200,65],shrine:[355,205],watch:[85,345],archive:[470,65],homes:[455,340]},
    {gate:[280,340],market:[150,235],tavern:[75,90],shrine:[420,235],watch:[465,90],archive:[280,65],homes:[280,205]},
  ];
  const result=structuredClone(layouts[seededRoll(s.seed,'settlement-layout:'+s.locationId,layouts.length)]),candidates=[70,280,490].flatMap(x=>[55,150,245,340].map(y=>[x,y]));
  for(const id of ['workyard','hall','wayhouse','court','stronghold']){const point=[...candidates].sort((a,b)=>Math.min(...Object.values(result).map(p=>Math.hypot(p[0]-b[0],p[1]-b[1])))-Math.min(...Object.values(result).map(p=>Math.hypot(p[0]-a[0],p[1]-a[1]))))[0];result[id]=point;candidates.splice(candidates.indexOf(point),1);}
  return result;
}
export function spatialMoveOffer(s,kind,id,actions) {
  if(kind==='hex') {
    const [q,r]=id.split(',').map(Number);
    const a=actions.find(a=>a.id===`atlas_step_${q}_${r}`);
    return a&&!a.disabledReason?{op:'activity',id:a.id}:null;
  }
  if(kind==='room') {
    const a=actions.find(a=>a.id==='atlas_room_'+id);
    return a&&!a.disabledReason?{op:'activity',id:a.id}:null;
  }
  return null;
}
