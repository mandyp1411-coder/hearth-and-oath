import {readFile,writeFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../docs/art-v39/'+name,import.meta.url),'utf8').then(JSON.parse);
const foeAudit=await read('foe-grids.json'),portraitAudit=await read('observed-grids.json');
const foeAtlases={};
for(const record of foeAudit.records){
  if(record.rows!==8||record.cols!==8||record.panelBounds.length!==64)throw Error('Incomplete enemy illustration grid: '+record.id);
  foeAtlases[record.atlasGroup]={src:`./art/foes/${record.atlasGroup}.avif`,width:record.width,height:record.height,
    cells:record.panelBounds.map(p=>[p.x*100/record.width,p.y*100/record.height,p.width*100/record.width,p.height*100/record.height])};
}
await writeFile(new URL('../dist/js/grounded-foe-registration-v39.js',import.meta.url),'// Native divider-excluding crops, measured from the finished illustrations.\nexport const GROUNDED_FOE_REGISTRATION_V39 = '+JSON.stringify(foeAtlases,null,2)+';\n');
const replacements={};
for(const record of portraitAudit.filter(r=>r.id.startsWith('replacement-'))){
  if(record.observedRows!==8||record.observedColumns!==8)throw Error('Incomplete faithful transformation redraw: '+record.id);
  const id=record.id.replace('replacement-',''),xs=record.columnBoundaries,ys=record.rowBoundaries,inset=record.recommendedInsetPx||2;
  replacements[id]={src:`./art/curses/${id}-39.avif`,width:record.width,height:record.height,cells:Array.from({length:64},(_,i)=>{
    const c=i%8,r=Math.floor(i/8);return[(xs[c]+inset)*100/record.width,(ys[r]+inset)*100/record.height,(xs[c+1]-xs[c]-inset*2)*100/record.width,(ys[r+1]-ys[r]-inset*2)*100/record.height];
  })};
}
if(Object.keys(replacements).length!==3)throw Error('All three blurred transformation sheets must be replaced.');
await writeFile(new URL('../dist/js/curse-style-v39.js',import.meta.url),'// Faithful redraws replace blurred source art while preserving logical identity/form IDs.\nexport const CURSE_STYLE_OVERRIDES_V39 = '+JSON.stringify(replacements,null,2)+';\n');
console.log('Registered six enemy atlases and three faithful transformation redraws.');
