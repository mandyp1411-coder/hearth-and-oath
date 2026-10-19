import { seededRoll } from './world.js';
const features=['a low stone arch','a draught under a split lintel','a passage with old watermarks','a narrow doorway beside a cracked pillar','a sloping passage with worn steps','an opening under a soot-dark beam'];
export function passageDirection(seed,salt,from,to) {
  const dx=to.x-from.x,dy=to.y-from.y;
  const direction=(dy<0?'North':dy>0?'South':'')+(dx<0?(dy?'west':'West'):dx>0?(dy?'east':'East'):'');
  return `${direction||'Ahead'} · ${features[seededRoll(seed,`${salt}:${to.id}`,features.length)]}`;
}
