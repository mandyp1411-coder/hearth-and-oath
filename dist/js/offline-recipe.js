// A hosted recipe reuses the ordinary runtime media; the downloaded HTML is complete.
const markerPattern=/__HO_ASSET_[a-f0-9]{16}_\d{4}__/g;
const markerValid=value=>typeof value==='string'&&/^__HO_ASSET_[a-f0-9]{16}_\d{4}__$/.test(value)&&!/[\s]/.test(value);
const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&value.length===64;
const plain=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const mimeFor=file=>({avif:'image/avif',webp:'image/webp',png:'image/png',svg:'image/svg+xml',jpg:'image/jpeg',jpeg:'image/jpeg',ogg:'audio/ogg'})[file.split('.').at(-1)];
const assetPath=file=>typeof file==='string'&&file.length<=240&&!/\s/.test(file)&&/^(art|audio)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$/.test(file)&&!file.split('/').some(part=>part==='.'||part==='..')&&Boolean(mimeFor(file));
const aborted=()=>Object.assign(new Error('Offline game download cancelled.'),{name:'AbortError'});
const check=signal=>{if(signal.aborted)throw aborted();};
function abortable(work,signal){
  check(signal);
  return new Promise((resolve,reject)=>{
    const abort=()=>{cleanup();reject(aborted());},cleanup=()=>signal.removeEventListener('abort',abort);
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(work).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    if(signal.aborted)abort();
  });
}
async function digest(bytes,signal){
  check(signal);
  if(!globalThis.crypto?.subtle)throw Error('Offline recipe checksum verification is unavailable.');
  const value=await abortable(globalThis.crypto.subtle.digest('SHA-256',bytes),signal);check(signal);
  return Array.from(new Uint8Array(value),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function base64(bytes,signal){
  const chunks=[];
  // Multiples of three allow independently encoded chunks to join exactly.
  for(let offset=0;offset<bytes.length;offset+=32766){check(signal);chunks.push(btoa(String.fromCharCode(...bytes.subarray(offset,offset+32766))));}
  return chunks.join('');
}

export async function loadOfflineRecipe(manifest,fetcher,{signal:external,onProgress,maxBytes=512*1024*1024}={}){
  const size=n=>Number.isSafeInteger(n)&&n>0&&n<=maxBytes;
  if(!plain(manifest)||manifest.schemaVersion!==3||!size(manifest.bytes)||!checksum(manifest.sha256)
      ||!size(manifest.templateBytes)||!checksum(manifest.templateSha256)||!size(manifest.inputBytes)
      ||!Array.isArray(manifest.templateParts)||manifest.templateParts.length<1||manifest.templateParts.length>64
      ||!Array.isArray(manifest.assets)||manifest.assets.length<1||manifest.assets.length>2048)throw Error('The offline recipe manifest is invalid.');
  let templateTotal=0,assetTotal=0;const files=new Set(),markers=new Set();
  for(const [index,part]of manifest.templateParts.entries()){
    if(!plain(part)||part.file!==`template-${String(index+1).padStart(2,'0')}.part`||!size(part.bytes)||!checksum(part.sha256))throw Error('The offline recipe manifest contains an invalid template part.');
    templateTotal+=part.bytes;if(!size(templateTotal))throw Error('The offline recipe manifest is too large.');
  }
  for(const asset of manifest.assets){
    if(!plain(asset)||!assetPath(asset.file)||asset.mime!==mimeFor(asset.file)||!size(asset.bytes)||!checksum(asset.sha256)
        ||!markerValid(asset.marker)||!Number.isSafeInteger(asset.occurrences)||asset.occurrences<1||asset.occurrences>100000
        ||files.has(asset.file)||markers.has(asset.marker))throw Error('The offline recipe manifest contains an invalid asset.');
    files.add(asset.file);markers.add(asset.marker);assetTotal+=asset.bytes;if(!size(assetTotal))throw Error('The offline recipe manifest is too large.');
  }
  if(templateTotal!==manifest.templateBytes||templateTotal+assetTotal!==manifest.inputBytes)throw Error('The offline recipe manifest has inconsistent byte counts.');
  // All replacements are ASCII. Reject dishonest occurrence/size declarations
  // before an enormous string could be allocated by a malformed manifest.
  let assembledBytes=templateTotal;
  for(const asset of manifest.assets){
    assembledBytes+=asset.occurrences*(4*Math.ceil(asset.bytes/3)+`data:${asset.mime};base64,`.length-asset.marker.length);
    if(!Number.isSafeInteger(assembledBytes)||assembledBytes<0||assembledBytes>maxBytes)throw Error('The offline recipe manifest has excessive assembled byte counts.');
  }
  if(assembledBytes!==manifest.bytes)throw Error('The offline recipe manifest has inconsistent assembled byte counts.');
  const controller=new AbortController(),signal=controller.signal,forwardAbort=()=>controller.abort();
  external?.addEventListener('abort',forwardAbort,{once:true});if(external?.aborted)controller.abort();
  let downloadedBytes=0,completedParts=0;
  const report=phase=>{check(signal);onProgress?.({phase,totalBytes:manifest.inputBytes,totalParts:manifest.templateParts.length+manifest.assets.length,downloadedBytes,completedParts,source:'hosted-recipe',artifactBytes:manifest.bytes});check(signal);};
  const request=url=>{check(signal);return abortable(fetcher(url,{signal}),signal);};
  async function receive(url,record){
    const response=await request(url);check(signal);if(!response?.ok)throw Error(`Offline recipe asset ${record.file} could not be downloaded.`);
    const chunks=[];let received=0;
    const accept=chunk=>{
      check(signal);if(!(chunk instanceof Uint8Array)||received+chunk.byteLength>record.bytes)throw Error(`Offline recipe asset ${record.file} has an unexpected byte count.`);
      received+=chunk.byteLength;downloadedBytes+=chunk.byteLength;chunks.push(chunk);report('loading');
    };
    if(typeof response.body?.getReader==='function'){
      const reader=response.body.getReader();let finished=false,cancelled=false;
      const cancel=()=>{if(cancelled)return;cancelled=true;try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}};
      signal.addEventListener('abort',cancel,{once:true});
      try{while(true){const next=await abortable(reader.read(),signal);check(signal);if(next.done){finished=true;break;}accept(next.value);}}
      finally{signal.removeEventListener('abort',cancel);if(!finished)cancel();try{reader.releaseLock();}catch{}}
    }else{
      const bytes=await abortable(response.arrayBuffer(),signal);if(!(bytes instanceof ArrayBuffer))throw Error('Offline recipe contains invalid bytes.');accept(new Uint8Array(bytes));
    }
    if(received!==record.bytes)throw Error(`Offline recipe asset ${record.file} has an unexpected byte count.`);
    const bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    if(await digest(bytes,signal)!==record.sha256)throw Error(`Offline recipe asset ${record.file} failed checksum verification.`);
    completedParts++;report('loading');return bytes;
  }
  try{
    report('loading');
    const templateBytes=new Uint8Array(manifest.templateBytes);let offset=0;
    for(const part of manifest.templateParts){const chunk=await receive('./offline/'+part.file,part);templateBytes.set(chunk,offset);offset+=chunk.length;}
    if(await digest(templateBytes,signal)!==manifest.templateSha256)throw Error('Offline recipe template failed checksum verification.');
    const template=new TextDecoder('utf-8',{fatal:true}).decode(templateBytes),values=new Map();let next=0;
    async function worker(){
      while(next<manifest.assets.length){check(signal);const asset=manifest.assets[next++],bytes=await receive('./'+asset.file,asset);values.set(asset.marker,`data:${asset.mime};base64,${base64(bytes,signal)}`);}
    }
    await Promise.all(Array.from({length:Math.min(4,manifest.assets.length)},()=>worker()));
    report('assembling');const counts=new Map();
    const html=template.replace(markerPattern,marker=>{check(signal);if(!values.has(marker))throw Error('Offline recipe has an unknown asset marker.');counts.set(marker,(counts.get(marker)||0)+1);return values.get(marker);});
    for(const asset of manifest.assets)if(counts.get(asset.marker)!==asset.occurrences)throw Error('Offline recipe asset marker counts do not match.');
    check(signal);const game=new Blob([html],{type:'text/html;charset=utf-8'});
    if(game.size!==manifest.bytes||await digest(await abortable(game.arrayBuffer(),signal),signal)!==manifest.sha256)throw Error('The assembled offline recipe differs from its complete HTML.');
    report('complete');return game;
  }catch(error){controller.abort();throw error;}
  finally{external?.removeEventListener('abort',forwardAbort);}
}
