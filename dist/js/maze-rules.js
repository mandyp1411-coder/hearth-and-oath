/** A campaign dungeon this life already began in the maze (a life from before the delve, v0.67):
 * it is resumed in the maze, the way it was begun, never restarted as a delve (v0.72.3). */
export function mazeBegun(s,dungeonId) {
 return Boolean(s.maze?.kind==='authored'&&s.maze.sourceId===dungeonId||s.mazeBook?.records?.some(r=>r.kind==='authored'&&r.sourceId===dungeonId));
}
/** Match the entry resolver without changing any recorded expedition. The board's descent is a delve
 * for every life (v0.72.3); a radiant maze already begun is walked to its end, and none begins (v0.72.4). */
export function isMazeEntry(s,id) {
 return Boolean(s.mazeBook && (id.startsWith('adventure_pursue_')
  || id.startsWith('explore_enter_') && mazeBegun(s,id.slice(14))
  || id.startsWith('rpg_enter_')));
}
export const MAZE_ENTRY_RULES='New ordinary expeditions vary between short, medium and deep layouts (5 × 5, 7 × 7 or 11 × 11). Authored sites and earlier saved maps keep their exact layout. All have finite caches and hidden passages. Each successful walk uses 1 Focus until empty. Every sixth total step takes one day; with no Focus before a step, every third total step does instead. Leave through the entrance stair or the objective’s stair after completing it.';
const stepQuote=(steps,focus)=>({
 step:steps+1, focusCharge:1, focusSpent:Math.min(1,Math.max(0,focus)),
 focusAfter:Math.max(0,focus-1), days:(steps+1)%(focus<=0?3:6)===0?1:0,
});
/** Pure movement-only quote, not a route or enemy forecast. Cadence uses pre-step Focus. */
export function mazeMovementForecast(s) {
 if(!s.maze)return null;
 const quote=stepQuote(s.maze.steps,s.hero.mp);
 let steps=s.maze.steps,focus=s.hero.mp,stepsUntilDay=0;
 // There is always a movement day within six walks. Assume no intervening
 // recovery or combat; neither the maze seed nor undiscovered rooms is read.
 for(let n=1;n<=6;n++) {
  const next=stepQuote(steps,focus); steps=next.step; focus=next.focusAfter;
  if(next.days){stepsUntilDay=n;break;}
 }
 return {...quote,stepsUntilDay,dayOnStep:s.maze.steps+stepsUntilDay};
}
export function mazeMovementDescription(v) {
 return `${v.focusSpent} Focus (${v.focusAfter} after walking) · ${v.days?'1 attended day; ordinary living costs apply':'no calendar day on this step'}.`;
}
