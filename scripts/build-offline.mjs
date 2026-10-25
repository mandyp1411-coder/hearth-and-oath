import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Script } from 'node:vm';
import {runtimeIdentity, gitIdentity, sha256} from './lib/release-identity.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(project, 'dist');
const sourceIdentity=await runtimeIdentity(project),buildGit=gitIdentity(project);
const read = name => readFile(path.join(dist, name), 'utf8');
const embeddedAssets=new Map();
const imageData = async name => {
  if(embeddedAssets.has(name))return embeddedAssets.get(name).marker;
  const mime={'.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ogg':'audio/ogg'}[path.extname(name).toLowerCase()];
  if(!mime)throw new Error(`Unsupported offline image: ${name}`);
  const bytes=await readFile(path.join(dist,name)),hash=sha256(bytes),marker=`__HO_ASSET_${hash.slice(0,16)}_${String(embeddedAssets.size).padStart(4,'0')}__`;
  embeddedAssets.set(name,{file:name,mime,bytes:bytes.length,sha256:hash,marker,data:`data:${mime};base64,${bytes.toString('base64')}`});
  return marker;
};
let bundle = '';
const modules = [];
const visited = new Set();
const visiting = new Set();
const OFFLINE_MODULE_URL = 'about:hearth-and-oath-offline';
const moduleVariable = name =>`__${name.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
async function discover(module) {
  if (visited.has(module)) return;
  if (visiting.has(module)) throw new Error(`Circular offline dependency: ${module}`);
  visiting.add(module);
  const source = await read(`js/${module}.js`);
  for (const match of source.matchAll(/^import\s+\{[^}]+\}\s+from\s+'\.\/([^']+)\.js';\s*$/gm)) await discover(match[1]);
  visiting.delete(module);
  visited.add(module);
  modules.push({module, source});
}
await discover('app');
const identities=await import(pathToFileURL(path.join(dist,'js/portrait-identity-v20.js')).href);
if(identities.LIFECYCLE_SUPPLEMENTS_V20.length!==7)throw new Error('Incomplete lifecycle artwork.');
const catalog=await import(pathToFileURL(path.join(dist,'js/portrait-catalog.js')).href);
if(catalog.DRAFT_CATALOG||Object.keys(catalog.PORTRAIT_CATALOG).length!==160||catalog.AGE_SUPPLEMENT_CATALOG.length!==1)throw new Error('Only the complete final portrait catalog can be bundled.');
const { MATURE_PORTRAIT_ATLASES_V40 }=await import(pathToFileURL(path.join(dist,'js/mature-portraits-v40.js')).href);
const { LIFECYCLE_PORTRAIT_ATLASES_V40 }=await import(pathToFileURL(path.join(dist,'js/lifecycle-portraits-v40.js')).href);
const { AGED_PORTRAIT_ATLASES_V57 }=await import(pathToFileURL(path.join(dist,'js/aged-portraits-v57.js')).href);
const expansionAssets=new Set([...MATURE_PORTRAIT_ATLASES_V40,...LIFECYCLE_PORTRAIT_ATLASES_V40,...AGED_PORTRAIT_ATLASES_V57].map(a=>a.src.slice(2)));
if(new Set(modules.map(entry=>moduleVariable(entry.module))).size!==modules.length)throw new Error('Offline module identifiers collide.');
for (const entry of modules) {
  const module = entry.module;
  let source = entry.source;
  let names = [...source.matchAll(/^export\s+(?:function|const)\s+(\w+)/gm)].map(match => match[1]);
  if (module !== 'app') {
    const implementation = await import(pathToFileURL(path.join(dist, `js/${module}.js`)).href);
    names = Object.keys(implementation);
    for (const name of names) {
      if (implementation[name] === undefined) throw new Error(`Incomplete module ${module}: missing ${name}`);
    }
  }
  source = source.replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([^']+)\.js';\s*$/gm,
    (_, symbols, dependency) => `const {${symbols.replace(/\b(\w+)\s+as\s+(\w+)\b/g, '$1: $2')}} = ${moduleVariable(dependency)};`);
  source = source.replace(/^export\s+/gm, '');
  // The bundle is not a module graph, and the downloaded file is never the
  // test harness: app.js reads its own URL only for `harnessRulebooks`, so the
  // offline file gets a fixed address that admits the new rules only.
  if (module === 'app') source = source.replaceAll('import.meta.url', JSON.stringify(OFFLINE_MODULE_URL));
  if (/\bimport\.meta\b/.test(source)) throw new Error(`Offline module ${module} reads import.meta, which the bundle cannot carry.`);
  const result = names.length ? `return {${names.join(',')}};` : '';
  // The entry awaits its save database before rendering, so it runs as an
  // async IIFE awaited at the top level of the inline module script.
  bundle += module === 'app'
    ? `await (async () => {\n${source}\n})();\n`
    : `const ${moduleVariable(module)} = (() => {\n${source}\n${result}\n})();\n`;
}
// Parse the translated module graph before embedding the large media payload.
// This catches alias/import conversion errors without needing a browser session.
// The bundle uses top-level await (a module script), so check its syntax
// inside an async function body, which accepts the same constructs.
new Script(`(async () => {\n${bundle}\n})`, { filename: 'hearth-and-oath-offline.js' });
// Complete illustrated portraits: embed every catalog atlas for the standalone game.
const portraitAssets=new Set([...bundle.matchAll(/["']\.\/(art\/(?:presets|foes)\/[^"']+\.avif)["']/g)].map(match=>match[1]));
if(portraitAssets.size!==221+expansionAssets.size||[...expansionAssets].some(p=>!portraitAssets.has(p)))throw new Error(`Expected 221 established character/enemy atlases and all ${expansionAssets.size} expansion atlases; found ${portraitAssets.size}.`);
for(const asset of portraitAssets){const data=JSON.stringify(await imageData(asset));bundle=bundle.replaceAll(`'./${asset}'`,data).replaceAll(`"./${asset}"`,data);}
// Transformation paths are selected at runtime, so keep an explicit complete
// asset table rather than leaving templated portrait URLs in the download.
const curseAssets=new Set([...bundle.matchAll(/["']\.\/(art\/curses\/[^"']+\.avif)["']/g)].map(match=>match[1]));
if(curseAssets.size!==67)throw new Error(`Expected all 67 transformation atlases; found ${curseAssets.size}.`);
for(const asset of curseAssets){const data=JSON.stringify(await imageData(asset));bundle=bundle.replaceAll(`'./${asset}'`,data).replaceAll(`"./${asset}"`,data);}
// Inventory art is also chosen in JavaScript, including gear inherited by loot.
const inventoryAssets=new Set([...bundle.matchAll(/["']\.\/(art\/(?:gear|supplies)-atlas-v39\.webp)["']/g)].map(match=>match[1]));
if(inventoryAssets.size!==2)throw new Error('Incomplete grounded inventory illustrations.');
for(const asset of inventoryAssets){const data=JSON.stringify(await imageData(asset));bundle=bundle.replaceAll(`'./${asset}'`,data).replaceAll(`"./${asset}"`,data);}
// Original paper is shared by all seeded charts; the standalone game must not
// request a hosted texture after download.
const parchmentAsset='art/parchment-v22.png';
if(bundle.includes(`'./${parchmentAsset}'`)||bundle.includes(`"./${parchmentAsset}"`)){
  const data=JSON.stringify(await imageData(parchmentAsset));
  bundle=bundle.replaceAll(`'./${parchmentAsset}'`,data).replaceAll(`"./${parchmentAsset}"`,data);
}
const audioAssets=new Set([...bundle.matchAll(/["']\.\/(audio\/[^"']+\.ogg)["']/g)].map(m=>m[1]));
if(audioAssets.size!==15)throw Error('Incomplete original score');
for(const asset of audioAssets){const data=JSON.stringify(await imageData(asset));bundle=bundle.replaceAll("'./"+asset+"'",data).replaceAll('"./'+asset+'"',data);}
bundle = bundle.replace(/<\/script/gi, '<\\/script');
// Media belongs in inert data, not in a hundreds-of-megabytes JavaScript AST.
// Keep the exact same bytes and offline recipe markers, with one shared lookup.
const moduleMedia={},moduleMediaKeys=new Map();
bundle=bundle.replace(/(["'])(__HO_ASSET_[a-f0-9]{16}_\d{4}__)\1/g,(_whole,_quote,marker)=>{
 let key=moduleMediaKeys.get(marker);if(!key){key='media-'+moduleMediaKeys.size;moduleMediaKeys.set(marker,key);moduleMedia[key]=marker;}
 return `__offlineMedia[${JSON.stringify(key)}]`;
});
if(/__HO_ASSET_[a-f0-9]{16}_\d{4}__/.test(bundle))throw Error('Unconverted executable media marker.');
bundle=`const __offlineMedia=JSON.parse(document.getElementById('offline-media').textContent);\n${bundle}`;
let css = await read('styles.css');
for (const match of [...css.matchAll(/url\(['"]?\.\/([^'"()]+\.(?:svg|webp|png|jpe?g))['"]?\)/g)]) {
  css = css.replaceAll(match[0], `url('${await imageData(match[1])}')`);
}
let html = await read('index.html');
html = html.replace('./art/emblem.svg', await imageData('art/emblem.svg'));
html = html.replace('<link rel="stylesheet" href="./styles.css" />', () => `<style>${css}</style>`);
html = html.replace('<script type="module" src="./js/app.js"></script>', () => `<script type="application/json" id="offline-media">${JSON.stringify(moduleMedia)}</script>\n<script type="module">\n${bundle}\n</script>`);
const template=html,markerAssets=new Map([...embeddedAssets.values()].map(asset=>[asset.marker,asset])),occurrences=new Map();
html=template.replace(/__HO_ASSET_[a-f0-9]{16}_\d{4}__/g,marker=>{
  const asset=markerAssets.get(marker);if(!asset)throw Error('Unknown offline media marker.');
  occurrences.set(marker,(occurrences.get(marker)||0)+1);return asset.data;
});
const recipeAssets=[...embeddedAssets.values()].map(({data,...asset})=>({...asset,occurrences:occurrences.get(asset.marker)||0}));
if(recipeAssets.some(asset=>!asset.occurrences))throw Error('An offline recipe asset was not embedded in its template.');
// The player still downloads one complete HTML file. Store its bytes in small
// source/hosting assets so richer portrait art cannot exceed per-file limits.
const artifactDir=path.join(project,'artifacts'),partsDir=path.join(dist,'offline');
await mkdir(artifactDir,{recursive:true});await mkdir(partsDir,{recursive:true});
await writeFile(path.join(artifactDir,'hearth-and-oath.html'),html);
const bytes=Buffer.from(html,'utf8'),size=8*1024*1024,parts=[];
if(bytes.length>512*1024*1024)throw Error('Complete offline HTML exceeds the bounded 512MiB loader limit.');
for(const file of await readdir(partsDir))if(/^(game|template)-\d{2}\.part$/.test(file))await rm(path.join(partsDir,file));
for(let offset=0,index=1;offset<bytes.length;offset+=size,index++){
  const file=`game-${String(index).padStart(2,'0')}.part`,part=bytes.subarray(offset,offset+size);
  await writeFile(path.join(partsDir,file),part);parts.push({file,bytes:part.length,sha256:sha256(part)});
}
const {version}=JSON.parse(await readFile(path.join(project,'package.json'),'utf8'));
await writeFile(path.join(dist,'hearth-and-oath.html'),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hearth &amp; Oath</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#10100f;color:#d5cbbb;font:18px Georgia,serif}p{padding:24px;text-align:center}</style></head><body><p role="status">Opening Hearth &amp; Oath…</p><script type="module">
import {loadOfflineGame} from './js/offline.js';
try{const game=await loadOfflineGame();const html=await game.text();document.open();document.write(html);document.close();}
catch{document.querySelector('[role="status"]').textContent='The game could not be opened. Please reload to try again.';}
</script></body></html>`);
await writeFile(path.join(partsDir,'manifest.json'),JSON.stringify({schemaVersion:2,version,bytes:bytes.length,sha256:sha256(bytes),loaderSha256:sha256(await read('hearth-and-oath.html')),source:sourceIdentity,buildGit,parts},null,2)+'\n');
const templateBytes=Buffer.from(template,'utf8'),templateParts=[];
for(let offset=0,index=1;offset<templateBytes.length;offset+=size,index++){
  const file=`template-${String(index).padStart(2,'0')}.part`,part=templateBytes.subarray(offset,offset+size);
  await writeFile(path.join(partsDir,file),part);templateParts.push({file,bytes:part.length,sha256:sha256(part)});
}
const inputBytes=templateBytes.length+recipeAssets.reduce((n,asset)=>n+asset.bytes,0);
await writeFile(path.join(partsDir,'recipe.json'),JSON.stringify({schemaVersion:3,version,bytes:bytes.length,sha256:sha256(bytes),loaderSha256:sha256(await read('hearth-and-oath.html')),source:sourceIdentity,buildGit,templateBytes:templateBytes.length,templateSha256:sha256(templateBytes),inputBytes,templateParts,assets:recipeAssets},null,2)+'\n');
if((await runtimeIdentity(project)).sha256!==sourceIdentity.sha256)throw Error('Runtime source changed during the offline build. Discard this artifact and rebuild.');
console.log(`Built self-contained offline game: artifacts/hearth-and-oath.html (${parts.length} stored parts)`);
