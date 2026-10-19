import { getGearItem, slotFits } from './gear.js';
import { equipmentActionReason } from './engine.js';
/** Validate again at release: a drag never changes ownership, gold or equipment. */
export function equipmentDropReason(s,id,slot){
 if(!s?.equipment?.owned?.includes(id))return 'Only equipment you carry can be equipped.';
 const item=getGearItem(s,id);if(!slotFits(item,slot)||item.slot!==slot)return 'That item belongs in a different slot.';
 return equipmentActionReason(s);
}
export function installInventoryDrag(root,{getState,onEquip,announce=()=>{}}){
 let held=null,touch=null,timer=null;
 const slots=()=>root.querySelectorAll('[data-equipment-slot]');
 const clear=()=>{clearTimeout(timer);slots().forEach(n=>{n.classList.remove('drop-ready');n.classList.remove('drop-over');});root.querySelectorAll('[data-draggable-gear]').forEach(n=>n.classList.remove('gear-held'));held=null;touch=null;};
 const prepare=id=>{held=id;slots().forEach(n=>n.classList.toggle('drop-ready',!equipmentDropReason(getState(),id,n.dataset.equipmentSlot)));};
 const release=slot=>{if(!held||!slot)return;const s=getState(),reason=equipmentDropReason(s,held,slot.dataset.equipmentSlot);if(reason)announce(reason);else onEquip(held);};
 root.addEventListener('dragstart',event=>{const item=event.target.closest?.('[data-draggable-gear]');if(!item||equipmentActionReason(getState())){event.preventDefault();return;}prepare(item.dataset.draggableGear);event.dataTransfer?.setData('text/plain',held);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';item.classList.add('gear-held');});
 root.addEventListener('dragover',event=>{const slot=event.target.closest?.('[data-equipment-slot]');if(!slot||!held||equipmentDropReason(getState(),held,slot.dataset.equipmentSlot))return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';slot.classList.add('drop-over');});
 root.addEventListener('dragleave',event=>event.target.closest?.('[data-equipment-slot]')?.classList.remove('drop-over'));
 root.addEventListener('drop',event=>{const slot=event.target.closest?.('[data-equipment-slot]');if(!slot)return;event.preventDefault();release(slot);clear();});
 root.addEventListener('dragend',clear);
 // Hold briefly on a touchscreen, then drag. An ordinary swipe still scrolls.
 root.addEventListener('pointerdown',event=>{const item=event.target.closest?.('[data-draggable-gear]');if(event.pointerType!=='touch'||!item||equipmentActionReason(getState()))return;touch={id:event.pointerId,x:event.clientX,y:event.clientY,item,active:false};timer=setTimeout(()=>{if(!touch)return;touch.active=true;prepare(item.dataset.draggableGear);item.classList.add('gear-held');item.setPointerCapture?.(event.pointerId);announce('Drag the item to a highlighted equipment slot.');},220);});
 root.addEventListener('pointermove',event=>{if(!touch||event.pointerId!==touch.id)return;if(!touch.active){if(Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>9)clear();return;}event.preventDefault();const slot=document.elementFromPoint?.(event.clientX,event.clientY)?.closest?.('[data-equipment-slot]');slots().forEach(n=>n.classList.toggle('drop-over',n===slot&&!equipmentDropReason(getState(),held,n.dataset.equipmentSlot)));});
 root.addEventListener('pointerup',event=>{if(!touch||event.pointerId!==touch.id)return;if(touch.active){event.preventDefault();const slot=document.elementFromPoint?.(event.clientX,event.clientY)?.closest?.('[data-equipment-slot]');release(slot);}clear();});
 root.addEventListener('pointercancel',clear);
 return clear;
}
