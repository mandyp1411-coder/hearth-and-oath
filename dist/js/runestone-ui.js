const symbols=['✦','☽','♜','♞','◇','♧'];
const names=['Star','Moon','Tower','Knight','Diamond','Clover'];
/** Only visible faces contribute names. Hidden stones never expose their face. */
export function runestoneLabel(game,index){
 const shown=game.matched.includes(index)||game.revealed.includes(index);
 return `Stone ${index+1}${shown?' · '+names[game.faces[index]]:''}${game.matched.includes(index)?' · Matched':''}`;
}
/** Continue after the activated position, wrapping once over enabled stones. */
export function nextRunestone(game,after=-1){
 if(!game||game.matched.length===12)return null;
 for(let offset=1;offset<=12;offset++){const i=(after+offset+12)%12;if(!game.matched.includes(i)&&!game.revealed.includes(i))return i;}
 return null;
}
export function runestoneStatus(game){
 if(!game)return 'Game finished. Open another game on a later day.';
 if(game.matched.length===12)return 'All six pairs found. Finish the game to spend one day and claim its benefits.';
 const faces=game.revealed.map(i=>`Stone ${i+1}: ${names[game.faces[i]]}`).join('. ');
 return `${game.matched.length/2} of 6 pairs. ${game.moves} turns.${faces?' '+faces+'.':''}${game.revealed.length===2?' No match. The next turn closes these stones.':''}`;
}
export function renderRunestones(s,ui,actions){
 const game=s.socialLife?.game;if(!game)return '';
 const {e,button}=ui,finished=game.matched.length===12,finish=actions.find(a=>a.id==='fun_pairs_finish');
 return `<section class="runestone-game" aria-labelledby="runestone-title"><h3 id="runestone-title" tabindex="-1">Runestone Pairs</h3><p id="runestone-status" tabindex="-1" role="status" aria-live="polite">${e(runestoneStatus(game))}</p><p class="small-copy">Turning stones is free. Focus moves to the next available stone, wrapping to the beginning.</p><div class="runestone-board" role="group" aria-label="Twelve runestones">${game.faces.map((face,i)=>{const shown=game.matched.includes(i)||game.revealed.includes(i);return `<button type="button" class="runestone${shown?' revealed':''}" data-op="activity" data-id="fun_pair_${i}" aria-label="${e(runestoneLabel(game,i))}"${shown?' disabled':''}>${shown?symbols[face]:'?'}</button>`;}).join('')}</div>${finished?`<div class="runestone-completion" aria-labelledby="runestone-complete"><h4 id="runestone-complete">Six pairs found</h4><p>1 day · No entry fee · Up to +8 Joy and −6 Stress. Daily living costs and other daily changes still apply.</p>${button('Finish the Game','activity','fun_pairs_finish','primary',!finish||!!finish.disabledReason)}${finish?.disabledReason?`<p>${e(finish.disabledReason)}</p>`:''}<p class="small-copy">Your solved board stays here until you finish. The last flip spends no time.</p></div>`:''}</section>`;
}
