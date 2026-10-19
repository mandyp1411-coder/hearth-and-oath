import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(), manifest=JSON.parse(fs.readFileSync(path.join(root,'reference-art/foes-v18/generation.json'),'utf8'));
const atlases={};
for(const group of ['beasts','undead','spirits','constructs','aberrations','bosses']){
  const name=group+'-00', reg=JSON.parse(fs.readFileSync(path.join(root,'reference-art/foes-v18/registration',name+'.json'),'utf8'));
  const bytes=fs.readFileSync(path.join(root,'dist/art/foes',name+'.avif'));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==reg.sha256||reg.cells.length!==64)throw Error('Invalid enemy atlas '+name);
  atlases[group]={src:'./art/foes/'+name+'.avif',width:reg.width,height:reg.height,cells:reg.cells.map(c=>c.source)};
}
fs.writeFileSync('dist/js/foe-catalog.js','// Generated from six illustrated, registered enemy atlases.\nexport const FOE_ATLASES = '+JSON.stringify(atlases)+';\n');
console.log('Registered 384 enemy illustrations.');
