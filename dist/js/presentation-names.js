const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const cache=new WeakMap();
export function properPlaceName(value){return String(value??'').replace(/[\p{L}\p{N}][\p{L}\p{N}'’]*(?:-[\p{L}\p{N}'’]+)*/gu,word=>word.split('-').map(part=>part[0].toLocaleUpperCase()+part.slice(1)).join('-'));}
export function formatPlaceMarkup(markup,state){
 const world=state?.world;if(!world)return markup;
 let data=cache.get(world);
 if(!data){const names=[world.name,...(world.locations||[]).map(p=>p.name),...(state.realm?.regions||[]).map(p=>p.name)].filter(s=>typeof s==='string'&&s.length>2);const replacements=new Map(names.filter(n=>properPlaceName(n)!==n).map(n=>[escape(n),escape(properPlaceName(n))]));data={replacements,pattern:replacements.size?new RegExp([...replacements.keys()].sort((a,b)=>b.length-a.length).map(regex).join('|'),'g'):null};cache.set(world,data);}
 if(!data.pattern)return markup;
 // Only rendered prose changes. Textarea contents are successful form values,
 // not display prose. Personal reminders explicitly retain their exact wording.
 const stack=[];
 return String(markup).split(/(<[^>]*>)/g).map((part,i)=>{
  if(i%2){
   const closing=/^<\/([a-z][\w:-]*)/i.exec(part),opening=/^<([a-z][\w:-]*)\b/i.exec(part);
   if(closing){const at=stack.findLastIndex(t=>t.name===closing[1].toLowerCase());if(at>=0)stack.length=at;}
   else if(opening&&!/\/\s*>$/.test(part)&&! /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(opening[1]))stack.push({name:opening[1].toLowerCase(),verbatim:stack.at(-1)?.verbatim||opening[1].toLowerCase()==='textarea'||/\bdata-verbatim(?:\s|=|>)/i.test(part)});
   return part;
  }
  return stack.at(-1)?.verbatim?part:part.replace(data.pattern,name=>data.replacements.get(name));
 }).join('');
}
