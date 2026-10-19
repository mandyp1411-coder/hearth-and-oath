const key='hearth-and-oath:display:v1';
const defaults={scale:1,font:'serif',singleKeyShortcuts:true};
export function normalizeDisplay(v={}){const n=Number(v.scale);return {scale:Number.isFinite(n)?Math.max(1,Math.min(1.5,n)):1,font:v.font==='plain'?'plain':'serif',singleKeyShortcuts:v.singleKeyShortcuts!==false,...(v.reducedMotion===true?{reducedMotion:true}:{})};}
export function displayPreset(id){return normalizeDisplay(id==='clear'?{scale:1.3,font:'plain',singleKeyShortcuts:false,reducedMotion:true}:id==='quiet'?{scale:1.1,font:'serif',singleKeyShortcuts:false,reducedMotion:true}:defaults);}
export function readDisplay(storage=globalThis.localStorage){try{return normalizeDisplay(JSON.parse(storage?.getItem(key)||'{}'));}catch{return {...defaults};}}
export function saveDisplay(value,storage=globalThis.localStorage){const settings=normalizeDisplay(value);try{storage?.setItem(key,JSON.stringify(settings));}catch{}return settings;}
export function applyDisplay(settings,document=globalThis.document){document?.documentElement?.style?.setProperty?.('--reading-scale',String(settings.scale));document?.documentElement?.setAttribute?.('data-reading-font',settings.font);document?.documentElement?.setAttribute?.('data-reading-motion',settings.reducedMotion?'reduced':'system');}

export function readWorkspace(state,storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(`hearth-and-oath:workspace:${state.seed}:${state.dynasty?.generation||1}`)||'null');return v&&typeof v==='object'?v:null;}catch{return null;}}
export function saveWorkspace(state,value,storage=globalThis.localStorage){try{storage?.setItem(`hearth-and-oath:workspace:${state.seed}:${state.dynasty?.generation||1}`,JSON.stringify(value));}catch{}}
