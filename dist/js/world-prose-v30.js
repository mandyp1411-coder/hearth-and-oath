import { seededRoll } from './world.js';
const surroundings={
 village:['Low roofs gather around a well. Smoke drifts from the kitchens, and footpaths lead between the houses.','Gardens and small houses stand beside a worn road. People pause at their doors to watch travelers arrive.'],
 city:['Stone streets wind between workshops, shops and crowded homes. Bells carry over the roofs.','A stream of carts and walkers moves through the gate. Above the market, washing hangs between the upper windows.'],
 forest:['Branches close over a narrow path. Fallen leaves soften your steps, and birds call somewhere out of sight.','Trees crowd the edge of an old trail. Roots cross the ground where the path begins to fade.'],
 marsh:['Reeds stir above dark water. A raised path threads between pools and patches of firmer ground.','Water gathers beneath the boardwalk. The path ahead is quiet except for insects and the movement of reeds.'],
 mountain:['The path climbs through bare stone. Wind catches at your clothes, and the valley lies far below.','Loose stones shift beneath the mountain path. Sheltered ledges break the long climb.'],
 coast:['Salt hangs in the air. Waves turn pale against the shore, and a worn path follows the headland.','The sea is loud beyond the buildings. Ropes creak at the landing as the tide moves through.'],
 ruin:['Broken walls rise from the grass. An opening leads into the remains of the old building.','Stone steps disappear beneath the surviving walls. The open sky gives way to shadow inside.'],
 tower:['A tall stone tower stands above the road. Its stair is narrow, and the upper windows are dark.','Wind moves through the tower’s open arches. Worn steps lead toward the rooms above.'],
 fortress:['High walls enclose a gate and an inner court. Footsteps echo beneath the stone arches.','A steep approach leads to the fortified gate. Beyond it, old walls divide the courtyards.'],
};
export function rewriteWorldProse(s){
 for(const p of s.world.locations){const kind=surroundings[p.type]?p.type:/city|citadel/.test(p.id)?'city':/coast|harbor/.test(p.id)?'coast':/mountain|highland/.test(p.id)?'mountain':/forest|grove/.test(p.id)?'forest':/marsh|bog/.test(p.id)?'marsh':/ruin|archive/.test(p.id)?'ruin':'village',rows=surroundings[kind];p.description=rows[seededRoll(s.seed,'place-prose30:'+p.id,rows.length)];}
}
const endings={
 renew:['The Wards Renewed','The wards continue with willing help. Their protection is weaker, and people have a way to leave the work.'],
 release:['The Old Bond Broken','The binding has ended. The protection it supplied has changed, and people must live with the arrangements made before its release.'],
 keeper:['The Keeper’s Watch','You agreed to help keep the wards running for a limited time. Your next review and the choice to leave remain part of that agreement.'],
 dominion:['Rule Behind the Walls','The wards endure under compulsory service. Their protection remains, along with the people forced to sustain it.'],
 shatter:['After the Breaking','The mechanism was destroyed. The places and people affected must live with the damage; the surviving roads remain open to another life.'],
 haven:['A Place of Shelter','The people prepared a different place to live with the changed wards. Their work continues beyond the end of the investigation.'],
};
export function endingProse(s,ending){const row=endings[ending?.id];return row?{...ending,title:row[0],summary:row[1]}:ending;}
const aftermath=[
 ['A Familiar Face in the Street','Someone you know stops to ask how things have been since the change. There is time to listen, offer a little help, or write down what they tell you.'],
 ['Work After the Crisis','People are getting on with ordinary work again. A small request brings you back among them, and you can choose how much time to give.'],
 ['An Evening to Remember','A conversation turns to the days around the changing wards. People remember different parts of it. You can hear them out without deciding their memories for them.'],
];
export function aftermathProse(s,event){const row=aftermath[(s.age||0)%aftermath.length],site=s.world.locations.find(p=>p.id===s.locationId),ending=endingProse(s,s.campaign?.ending);return {...event,title:row[0],body:`${site?.name?`You return to ${site.name}. `:''}${row[1]}${ending?' '+ending.summary:''}`};}
export function lifeEpilogue(s){
 const visited=Object.values(s.cartography?.sites||{}).filter(p=>p.kind==='Visited').length,children=(s.life?.children||[]).filter(p=>p.alive!==false),ending=endingProse(s,s.campaign?.ending),ended=s.hero.alive===false||s.health?.deathCause;
 const beginning=s.hero.upbringing?.adultLife,own=beginning?.work?.introducedDay!==null&&beginning?.work?`Their adult beginning included ${beginning.work.trainingDays} recorded unpaid ${beginning.goal.profession.toLowerCase()} training days. `:beginning?.study?.attendance?`Their adult beginning included ${beginning.study.attendance} dated free-course sessions, not an inherited certificate. `:'';
 return `${s.epitaph?`${s.epitaph}\n\n`:''}${s.hero.name} ${ended?'died':'settled into retirement'} at age ${s.age}. ${s.hero.profession!=='Unemployed'?`They worked as a ${s.hero.profession.toLowerCase()}. `:''}${own}${visited?`They visited ${visited} named places. `:''}${children.length?`Their living children are ${children.map(p=>p.name).join(', ')}. `:''}${ending?ending.summary+' ':''}The Journal keeps the people they met and the choices they made.`;
}
