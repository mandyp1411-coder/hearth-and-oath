// Local diagnostic timings only. Nothing is uploaded or added to a saved life.
const rows=[];
const now=()=>globalThis.performance?.now?.()??Date.now();
export function beginUiMeasure(name){const start=now();return ()=>{rows.push({name,milliseconds:Math.max(0,now()-start)});if(rows.length>60)rows.shift();};}
export function recentUiMeasures(){return rows.map(r=>({...r}));}
