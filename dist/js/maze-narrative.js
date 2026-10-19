// New story-maze prose is trusted only after its exact live owner validates.
// The engine supplies the validator; this leaf adds no import cycle or global
// exemption for old RPG/Journal producers.
export function mazeJournal(s,m,ctx,title,text,tag,meta={},allowed=true) {
 const current=allowed&&s.maze===m&&m?.version===2&&ctx.validateMazeNarrative?.(m)===true;
 if(current)(ctx.journalLiteral||ctx.journal)?.(title,text,tag,{...meta,narrativeEdition:30});
 else if(Object.keys(meta).length)ctx.journal?.(title,text,tag,meta);
 else ctx.journal?.(title,text,tag);
}

// Emit unmarked literal drafts at their real positions/timestamps. After the
// typed settlement validates, mark only those same still-owned, unchanged rows.
// Unrelated calendar rows never enter this list and are never moved or stamped.
export function bufferMazeJournal(s,m,ctx) {
 const rows=[],capture=(title,text,tag,meta={})=>{
  const before=s.journal?.length||0,row=(ctx.journalLiteral||ctx.journal)?.(title,text,tag,meta);
  if(s.journal?.indexOf(row)>=before&&row?.title===String(title)&&row.text===String(text)&&row.tag===tag)
   rows.push({row,title:row.title,text:row.text,tag:row.tag,day:row.day,age:row.age,generation:row.generation});
 };
 return {context:{...ctx,journal:capture,journalLiteral:capture},flush(){
  if(s.maze===m&&m?.version===2&&ctx.validateMazeNarrative?.(m)===true)
   for(const saved of rows)if(s.journal?.includes(saved.row)&&['title','text','tag','day','age','generation'].every(key=>saved.row[key]===saved[key]))saved.row.narrativeEdition=30;
  rows.length=0;
 }};
}
