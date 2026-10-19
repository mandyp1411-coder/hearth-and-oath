/** Content identity, not a claim that an uncommitted build came from HEAD. */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export async function hashFile(file) {
  const hash=createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function treeFiles(root, relative) {
  const result=[];
  for (const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
    const name=path.posix.join(relative,entry.name);
    if (entry.isSymbolicLink()) throw Error(`Release input cannot be a symlink: ${name}`);
    if (entry.isDirectory()) result.push(...await treeFiles(root,name));
    else if (entry.isFile()) result.push(name);
  }
  return result.sort();
}
export async function contentIdentity(root,files) {
  const rows=[];
  for (const file of [...new Set(files)].sort()) rows.push({file,bytes:(await stat(path.join(root,file))).size,sha256:await hashFile(path.join(root,file))});
  return {sha256:sha256(rows.map(row=>`${row.file}\0${row.bytes}\0${row.sha256}\n`).join('')),files:rows.length};
}
export async function runtimeIdentity(root) {
  const files=(await treeFiles(root,'dist')).filter(file=>!file.startsWith('dist/offline/')&&file!=='dist/hearth-and-oath.html');
  files.push('package.json','scripts/build-offline.mjs','scripts/lib/release-identity.mjs');
  return contentIdentity(root,files);
}
export async function verificationIdentity(root) {
  const files=[...await treeFiles(root,'tests'),...await treeFiles(root,'scripts')];
  files.push('release-contract.json');
  return contentIdentity(root,files);
}
export function gitIdentity(root) {
  try {
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    const changes=execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'}).trim();
    return {head,dirty:!!changes};
  } catch { return {head:null,dirty:null}; }
}
export async function validateOfflineIdentity(root) {
  const manifestBytes=await readFile(path.join(root,'dist/offline/manifest.json'));
  const manifest=JSON.parse(manifestBytes);
  const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
  if(manifest.schemaVersion!==2) throw Error('Offline manifest lacks current build provenance; rebuild with npm run build.');
  if(manifest.version!==version) throw Error(`Offline version ${manifest.version} does not match package ${version}.`);
  const source=await runtimeIdentity(root);
  if(manifest.source?.sha256!==source.sha256||manifest.source?.files!==source.files) throw Error('Offline artifact is stale: runtime/build-source identity differs. Rebuild it.');
  if(!/^[a-f0-9]{64}$/.test(manifest.sha256)||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<=0||!Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>64) throw Error('Invalid offline checksum/byte manifest.');
  const joined=createHash('sha256');let bytes=0;
  const actualPartNames=(await readdir(path.join(root,'dist/offline'))).filter(file=>/^game-\d+\.part$/.test(file)).sort();
  for(const [index,part] of manifest.parts.entries()) {
    if(part.file!==`game-${String(index+1).padStart(2,'0')}.part`||!/^[a-f0-9]{64}$/.test(part.sha256)) throw Error('Offline parts are not a unique ordered sequence with checksums.');
    const file=path.join(root,'dist/offline',part.file),info=await stat(file);
    if(info.size!==part.bytes||await hashFile(file)!==part.sha256) throw Error(`Offline part ${part.file} has different bytes/checksum.`);
    for await(const chunk of createReadStream(file))joined.update(chunk);
    bytes+=info.size;
  }
  if(JSON.stringify(actualPartNames)!==JSON.stringify(manifest.parts.map(part=>part.file))) throw Error('Offline directory has missing or extra game parts.');
  if(bytes!==manifest.bytes||joined.digest('hex')!==manifest.sha256) throw Error('Reconstructed offline bundle differs from its manifest.');
  const artifact=path.join(root,'artifacts/hearth-and-oath.html');
  if((await stat(artifact)).size!==bytes||await hashFile(artifact)!==manifest.sha256) throw Error('Standalone artifact differs from the hosted offline parts.');
  // This is a release label check, not execution or browser certification.
  const loader=path.join(root,'dist/hearth-and-oath.html');
  if(!/^[a-f0-9]{64}$/.test(manifest.loaderSha256)||await hashFile(loader)!==manifest.loaderSha256)throw Error('Hosted offline loader differs from its build manifest.');
  const app=await readFile(path.join(root,'dist/js/app.js'),'utf8');
  const labels=[...app.matchAll(/<(?:small|span)>v(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
  if(!labels.length||labels.some(label=>label!==version))throw Error(`App release labels do not all match package v${version}.`);
  return {version,bytes,sha256:manifest.sha256,parts:manifest.parts.length,manifestSha256:sha256(manifestBytes),loaderSha256:manifest.loaderSha256,source,buildGit:manifest.buildGit};
}
/** Recheck generated bytes too: runtime source deliberately excludes them. */
export async function validateUnchangedOfflineIdentity(root,before) {
  const after=await validateOfflineIdentity(root);
  if(JSON.stringify(after)!==JSON.stringify(before))throw Error('Offline artifact or provenance changed during verification; discard mixed-artifact evidence.');
  return after;
}
