// Keep one machine-readable line per actual Node test result. Never infer PASS
// from a text assertion, fake-DOM geometry or an old audit report.
export default async function* reporter(events) {
  for await (const {type,data} of events) {
    if(type==='test:pass'||type==='test:fail')yield JSON.stringify({type,name:data.name,file:data.file,line:data.line,nesting:data.nesting,durationMs:data.details?.duration_ms??null,skip:data.skip||false,todo:data.todo||false,error:data.details?.error?.message||null,failureType:data.details?.error?.failureType||null,signal:data.details?.error?.signal||null,exitCode:data.details?.error?.exitCode??null})+'\n';
    else if(type==='test:stdout'||type==='test:stderr')yield JSON.stringify({type,message:data.message})+'\n';
  }
}
