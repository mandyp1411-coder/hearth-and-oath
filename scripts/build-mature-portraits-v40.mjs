import {readFile,writeFile} from 'node:fs/promises';

// Rebuild the catalog from the observed native grid, not from the requested layout.
const observed=JSON.parse(await readFile(new URL('../docs/art-v40/mature-observed-grids.json',import.meta.url),'utf8'));
const receipts=JSON.parse(await readFile(new URL('../docs/art-v40/mature-registration.json',import.meta.url),'utf8'));
const ancestries=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const presentations=new Set(['masculine','feminine','androgynous']);
const atlases=[];
for(const ancestry of ancestries){
  const grid=observed.find(g=>g.ancestry===ancestry),receipt=receipts.find(r=>r.ancestry===ancestry);
  if(!grid||!receipt)throw Error('Missing observed portrait sheet for '+ancestry);
  const {width,height,rows,columns}=grid;
  if(width!==receipt.width||height!==receipt.height||grid.entries.length!==rows*columns||grid.rowBoundaries.length!==rows+1)throw Error('Incorrect native geometry for '+ancestry);
  const inset=grid.recommendedInsetPx;
  const cells=grid.entries.map(({cell})=>{
    const r=Math.floor(cell/columns),c=cell%columns,xs=grid.columnsByRow?.[r]||grid.columnBoundaries;
    if(xs.length!==columns+1)throw Error('Missing native column boundaries for '+ancestry+' row '+r);
    const x=xs[c]+inset,y=grid.rowBoundaries[r]+inset,w=xs[c+1]-xs[c]-2*inset,h=grid.rowBoundaries[r+1]-grid.rowBoundaries[r]-2*inset;
    if(x<0||y<0||w<64||h<64||x+w>width||y+h>height)throw Error('Invalid crop for '+ancestry+':'+cell);
    return [x*100/width,y*100/height,w*100/width,h*100/height];
  });
  const entries=grid.entries.map(entry=>{
    if(!presentations.has(entry.presentation)||entry.cell<0||entry.cell>=cells.length)throw Error('Invalid observed phenotype for '+ancestry+':'+entry.cell);
    if(['human','elf'].includes(ancestry)&&!['light','medium','deep'].includes(entry.complexion))throw Error('Missing actual complexion for '+ancestry+':'+entry.cell);
    if(ancestry==='beastfolk'&&(!['canine','feline','bear','horned','long_eared','other'].includes(entry.morphology)||!['dark','light','mixed'].includes(entry.furTone)||entry.morphology==='other'&&entry.speciesFamily!=='mustelid'))throw Error('Unknown Beastfolk cohort at '+entry.cell);
    return {...entry,stage:'mature',modern:true,archetype:entry.archetype||'wanderer'};
  });
  atlases.push({id:receipt.id,ancestry,src:'./'+receipt.target,width,height,rows,columns,modern:true,cells,entries});
}
const source='// 40–54 portrait expansion; each native grid is registered from the final inspected image.\n'+
  'export const MATURE_PORTRAIT_ATLASES_V40 = '+JSON.stringify(atlases,null,2)+';\n';
await writeFile(new URL('../dist/js/mature-portraits-v40.js',import.meta.url),source);
console.log(`${atlases.length} observed atlases; ${atlases.reduce((n,a)=>n+a.entries.length,0)} mature portraits`);
