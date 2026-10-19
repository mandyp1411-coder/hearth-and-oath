import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {once} from 'node:events';

/** One subprocess group at a time, including its Node test VM descendants. */
export async function runReleaseProcess(command,args,{cwd,log,timeoutMs,onChild=()=>{}}) {
  const start=Date.now(),stream=createWriteStream(log),chunks=[];
  const child=spawn(command,args,{cwd,env:process.env,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let error=null,timedOut=false,forceTimer=null,stopping=false;
  const terminate=signal=>{try{if(process.platform!=='win32')process.kill(-child.pid,signal);else child.kill(signal);}catch{}};
  const stop=()=>{if(stopping)return;stopping=true;terminate('SIGTERM');forceTimer=setTimeout(()=>terminate('SIGKILL'),2000);};
  onChild({stop});
  child.stdout.on('data',chunk=>{stream.write(chunk);chunks.push(chunk);});
  child.stderr.on('data',chunk=>stream.write(chunk));
  child.on('error',cause=>{error=cause.message;});
  const timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
  const [code,signal]=await new Promise(resolve=>child.once('close',(code,signal)=>resolve([code,signal])));
  clearTimeout(timer);clearTimeout(forceTimer);onChild(null);stream.end();await once(stream,'finish');
  return {code,signal,error:timedOut?`Command exceeded its declared ${timeoutMs} ms budget; no PASS is possible.`:error,timedOut,durationMs:Date.now()-start,stdout:Buffer.concat(chunks).toString('utf8')};
}
