import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),assets=process.argv[2];
if(!assets)throw Error('Pass a canonical expansion asset directory as the first argument.');
await fs.mkdir(path.join(root,'content/expansion-v27'),{recursive:true});
for(const [file,module,name] of [['regional_stories_v27','regional-stories-v27','REGIONAL_STORIES_V27'],['personal_stories_v27','personal-stories-v27','PERSONAL_STORIES_V27'],['encounter_design_v27','encounter-design-v27','ENCOUNTER_DESIGN_V27']]){
 const data=JSON.parse(await fs.readFile(path.join(assets,file+'.json'),'utf8'));
 await fs.copyFile(path.join(assets,file+'.json'),path.join(root,'content/expansion-v27',file+'.json'));
 await fs.writeFile(path.join(root,'dist/js',module+'.js'),'// Authored content. Gameplay applies typed effects and saves decisions separately.\nexport const '+name+' = '+JSON.stringify(data,null,2)+';\n');
}
const music=JSON.parse(await fs.readFile(path.join(assets,'music_v27/manifest.json'),'utf8'));
await fs.mkdir(path.join(root,'dist/audio'),{recursive:true});
for(const file of await fs.readdir(path.join(assets,'music_v27')))if(file.endsWith('.ogg'))await fs.copyFile(path.join(assets,'music_v27',file),path.join(root,'dist/audio',file));
await fs.mkdir(path.join(root,'reference-art/music-v27'),{recursive:true});
await fs.copyFile(path.join(assets,'music_v27/manifest.json'),path.join(root,'reference-art/music-v27/manifest.json'));
await fs.copyFile(path.join(assets,'music_v27/compose_score_v27.py'),path.join(root,'reference-art/music-v27/compose_score_v27.py'));
await fs.writeFile(path.join(root,'dist/js/music-recordings-v27.js'),'export const MUSIC_RECORDINGS_V27 = '+JSON.stringify(Object.fromEntries(music.tracks.map(t=>[t.id,{src:'./audio/'+path.basename(t.localPath),duration:t.seconds,title:t.title}])),null,2)+';\n');
console.log('Restored canonical story, encounter and original score assets.');
