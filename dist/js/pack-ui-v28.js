import { renderGearArt, renderPlayerInventory } from './inventory-ui.js';
export function gearArt(item,e=String){return renderGearArt(item,e);}
export function renderPackWorkspace(state,ui,options={}){return renderPlayerInventory(state,ui,options);}
