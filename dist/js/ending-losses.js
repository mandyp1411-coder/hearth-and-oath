const lost=status=>['destroyed','evacuated'].includes(status);
const sourceOf=c=>c?.source==='war'||/^War leaves /.test(c?.text||'')?'war':c?.source==='covenant'||c?.id?.startsWith('covenant-')?'covenant':'unrecorded';
const record=(s,p,c)=>({locationId:p.id,name:p.name,status:p.status,source:sourceOf(c),sourceId:c?.id||null,day:c?.day??null,detail:c?.text||'The earlier loss has no recorded cause.'});
const lastCause=(s,id,day=s.day)=>s.world.changes?.findLast(c=>c.locationId===id&&c.day<=day&&(c.source==='war'||c.source==='covenant'||c.id?.startsWith('covenant-')||/^War leaves /.test(c.text||'')||c.title==='A hearth returns'));
const names=rows=>rows.slice(0,6).map(r=>r.name+(r.source==='unrecorded'?' (cause unrecorded)':'')).join(', ')+(rows.length>6?`, and ${rows.length-6} other recorded places`:'');

export function lossesBeforeEnding(s){
  return s.world.locations.filter(p=>lost(p.status)).map(p=>{const c=lastCause(s,p.id);return record(s,p,c?.title==='A hearth returns'?null:c);});
}
export function currentLossCause(s,id){const c=lastCause(s,id);return c?.title==='A hearth returns'?null:c;}
export function endingLosses(s,before){
  const choice=s.world.locations.filter(p=>lost(p.status)&&!before.some(b=>b.locationId===p.id&&b.status===p.status)).map(p=>record(s,p,lastCause(s,p.id)));
  return {version:1,earlier:structuredClone(before),choice};
}
export function endingLossSummary(ledger){
  const parts=[],war=ledger.earlier.filter(r=>r.source==='war'),other=ledger.earlier.filter(r=>r.source!=='war');
  if(war.length)parts.push(`Earlier war losses remain: ${names(war)}.`);
  if(other.length)parts.push(`Earlier losses or departures remain: ${names(other)}.`);
  for(const status of ['destroyed','evacuated']){const rows=ledger.choice.filter(r=>r.status===status);if(rows.length)parts.push(`This decision ${status==='destroyed'?'destroyed':'evacuated'}: ${rows.map(r=>r.name).join(', ')}.`);}
  return parts.join(' ');
}

/** Older endings keep their saved prose. Only explicit, dated world accounts
 * can reconstruct attribution; later wars must not become ending losses. */
export function endingLossLedger(s){
  const ending=s.campaign?.ending;if(!ending)return null;
  if(ending.losses)return structuredClone(ending.losses);
  const earlier=[],choice=[];
  for(const p of s.world.locations){
    const c=lastCause(s,p.id,ending.day);if(!c)continue;
    const status=c.title==='A hearth returns'?'thriving':c.lossStatus||(/^War leaves /.test(c.text||'')?'destroyed':c.id?.includes('-destroyed-')?'destroyed':c.id?.includes('-evacuated-')?'evacuated':null);
    if(!lost(status))continue;
    const r=record(s,{...p,status},c);(r.source==='covenant'&&r.day===ending.day?choice:earlier).push(r);
  }
  return {version:1,earlier,choice,reconstructed:true};
}
export function renderEndingLosses(s,ui){
  const v=endingLossLedger(s);if(!v||!v.earlier.length&&!v.choice.length)return '';
  const rows=list=>list.map(r=>`<li>${ui.e(r.name)} · ${ui.e(r.status)} · ${ui.e(r.source==='war'?'Earlier war':r.source==='covenant'?'Covenant record':'Cause unrecorded')}<p class="small-copy">${ui.e(r.detail)}</p></li>`).join('');
  return `<div class="ending-loss-ledger" data-ending-losses>${v.earlier.length?`<h3>Losses already present</h3><ul>${rows(v.earlier)}</ul>`:''}${v.choice.length?`<h3>Losses from the final decision</h3><ul>${rows(v.choice)}</ul>`:'<p class="small-copy">This decision added no recorded destruction or evacuation.</p>'}${v.reconstructed?'<p class="small-copy">Attribution follows the surviving dated accounts; the saved ending text is unchanged.</p>':''}</div>`;
}
export function validateEndingLosses(v,s,day){
  if(v===undefined)return true;
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),str=(x,n)=>typeof x==='string'&&x.length<=n;
  return obj(v)&&v.version===1&&['earlier','choice'].every(key=>Array.isArray(v[key])&&v[key].length<=s.world.locations.length&&new Set(v[key].map(r=>r.locationId)).size===v[key].length&&v[key].every(r=>obj(r)&&s.world.locations.some(p=>p.id===r.locationId)&&str(r.name,160)&&lost(r.status)&&['war','covenant','unrecorded'].includes(r.source)&&(r.sourceId===null||str(r.sourceId,240))&&(r.day===null||Number.isSafeInteger(r.day)&&r.day>=0&&r.day<=day)&&str(r.detail,2000)))&&v.choice.every(r=>r.source==='covenant'&&r.day===day);
}
