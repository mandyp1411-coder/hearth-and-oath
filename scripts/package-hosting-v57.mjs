// Host runtime media once; keep full standalone HTML/byte parts in the local build.
import {cp,mkdir,readFile,readdir,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function packageHosting(project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')){
  const dist=path.join(project,'dist'),out=path.join(project,'out');
  const recipe=JSON.parse(await readFile(path.join(dist,'offline/recipe.json'),'utf8'));
  if(recipe.schemaVersion!==3||!Array.isArray(recipe.assets)||!Array.isArray(recipe.templateParts))throw Error('Build a complete schema3 offline recipe before preparing hosting.');
  await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
  await cp(dist,out,{recursive:true,filter:file=>{
    const relative=path.relative(dist,file).split(path.sep).join('/');
    return !/^offline\/game-\d{2}\.part$/.test(relative)&&!['offline/manifest.json','offline/recipe.json'].includes(relative);
  }});
  await writeFile(path.join(out,'offline/manifest.json'),JSON.stringify(recipe,null,2)+'\n');
  let bytes=0,files=0;
  async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){
    const name=path.join(directory,entry.name);if(entry.isSymbolicLink())throw Error('Hosting assets may not be symbolic links.');
    if(entry.isDirectory())await walk(name);else if(entry.isFile()){bytes+=(await stat(name)).size;files++;}
  }}
  await walk(out);
  if(bytes>256*1024*1024)throw Error(`Prepared hosting directory exceeds the 256MiB expanded limit: ${bytes} bytes.`);
  return {directory:'out',bytes,files,offlineSchema:3,standaloneBytes:recipe.bytes,reusedMedia:recipe.assets.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await packageHosting(),null,2));
