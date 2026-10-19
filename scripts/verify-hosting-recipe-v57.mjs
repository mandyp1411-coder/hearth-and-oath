import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {loadOfflineGame} from '../dist/js/offline.js';

// Exercise the shipped loader with the exact hosting payload, independently of
// the schema2 byte parts retained for the compiled release validator.
export async function verifyHostingRecipe(project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')){
  const out=path.join(project,'out');
  const recipe=JSON.parse(await readFile(path.join(out,'offline/manifest.json'),'utf8'));
  const local=JSON.parse(await readFile(path.join(project,'dist/offline/manifest.json'),'utf8'));
  if(recipe.schemaVersion!==3||local.schemaVersion!==2)throw Error('Expected hosted schema3 and retained schema2 manifests.');
  for(const key of ['bytes','sha256','loaderSha256'])if(recipe[key]!==local[key])throw Error(`Hosted recipe and retained artifact disagree on ${key}.`);
  if(JSON.stringify(recipe.source)!==JSON.stringify(local.source))throw Error('Hosted recipe and retained artifact have different source identities.');
  const fetcher=async(url,{signal}={})=>{
    if(signal?.aborted)throw Object.assign(new Error('Cancelled.'),{name:'AbortError'});
    if(typeof url!=='string'||!url.startsWith('./')||url.includes('..')||url.includes('\\')||/[?#]/.test(url))throw Error('Unexpected recipe resource path.');
    return new Response(await readFile(path.join(out,url.slice(2))));
  };
  const game=await loadOfflineGame(fetcher),actual=Buffer.from(await game.arrayBuffer());
  const expected=await readFile(path.join(project,'artifacts/hearth-and-oath.html'));
  if(!actual.equals(expected))throw Error('Hosted recipe does not reconstruct the exact complete offline HTML.');
  const sha256=createHash('sha256').update(actual).digest('hex');
  return {verified:true,bytes:actual.length,sha256,assets:recipe.assets.length,templateParts:recipe.templateParts.length,source:recipe.source?.sha256};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyHostingRecipe(process.argv[2]?path.resolve(process.argv[2]):undefined),null,2));
