// Camera state is presentation-only. None of these handlers offer or execute travel.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function mapCenter(view){
 const canvas=view?.querySelector('[data-map-canvas]');if(!canvas?.clientWidth||!canvas.clientHeight)return null;
 return {x:clamp((view.scrollLeft+view.clientWidth/2)/canvas.clientWidth,0,1),y:clamp((view.scrollTop+view.clientHeight/2)/canvas.clientHeight,0,1)};
}
export function placeMapCenter(view,point){
 const canvas=view?.querySelector('[data-map-canvas]');if(!canvas?.clientWidth||!point)return;
 view.scrollLeft=clamp(point.x*canvas.clientWidth-view.clientWidth/2,0,Math.max(0,canvas.clientWidth-view.clientWidth));
 view.scrollTop=clamp(point.y*canvas.clientHeight-view.clientHeight/2,0,Math.max(0,canvas.clientHeight-view.clientHeight));
}
export function installMapCamera(root,{zoom,home,cancelInspection=()=>{}}={}){
 let remembered=null,drag=null,suppressUntil=0;
 const viewport=()=>root.querySelector('[data-map-viewport]');
 const clearDrag=()=>{const old=drag;drag=null;if(old){old.view.classList.remove('is-panning');if(old.capture.hasPointerCapture?.(old.id))old.capture.releasePointerCapture(old.id);}};
 root.addEventListener('pointerdown',event=>{
  const view=event.target.closest?.('[data-map-viewport]');if(!view||drag||event.isPrimary===false||event.button!==undefined&&![0,1].includes(event.button))return;
  // Leave native side/bottom scrollbar gestures to the browser.
  const bounds=view.getBoundingClientRect();
  if(view.clientWidth&&view.clientHeight&&(event.clientX>=bounds.left+(view.clientLeft||0)+view.clientWidth||event.clientY>=bounds.top+(view.clientTop||0)+view.clientHeight))return;
  // Keep short clicks on the original hex while capturing edge drags immediately.
  const capture=event.target.closest?.('[data-op="hex-select"],[data-op="destination-select"],[data-op="journey-current"]')||view;
  drag={view,capture,id:event.pointerId,x:event.clientX,y:event.clientY,left:view.scrollLeft,top:view.scrollTop,moved:false};
  capture.setPointerCapture?.(event.pointerId);
 });
 root.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.moved&&Math.hypot(dx,dy)<6)return;
  if(!drag.moved){drag.moved=true;cancelInspection();drag.view.classList.add('is-panning');}
  event.preventDefault();drag.view.scrollLeft=clamp(drag.left-dx,0,Math.max(0,drag.view.scrollWidth-drag.view.clientWidth));drag.view.scrollTop=clamp(drag.top-dy,0,Math.max(0,drag.view.scrollHeight-drag.view.clientHeight));
  remembered=mapCenter(drag.view);
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,event=>{
  if(!drag||drag.id!==event.pointerId)return;if(drag.moved){suppressUntil=Date.now()+500;remembered=mapCenter(drag.view);}clearDrag();
 });
 root.addEventListener('wheel',event=>{
  const view=event.target.closest?.('[data-map-viewport]');if(!view||event.ctrlKey||event.metaKey||!event.deltaY)return;
  event.preventDefault();zoom?.(event.deltaY<0?'in':'out',{view,x:event.clientX,y:event.clientY});
 },{passive:false});
 root.addEventListener('keydown',event=>{
  if(!event.target.matches?.('[data-map-viewport]')&&!event.target.dataset?.mapViewport)return;
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  const v=event.target,pan={ArrowLeft:[-90,0],ArrowRight:[90,0],ArrowUp:[0,-90],ArrowDown:[0,90]}[event.key];
  if(pan){event.preventDefault();v.scrollLeft=clamp(v.scrollLeft+pan[0],0,Math.max(0,v.scrollWidth-v.clientWidth));v.scrollTop=clamp(v.scrollTop+pan[1],0,Math.max(0,v.scrollHeight-v.clientHeight));remembered=mapCenter(v);}
  else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();event.key==='Home'?home?.():zoom?.(event.key==='-'?'out':'in');}
 });
 return {
  capture(){const point=mapCenter(viewport());if(point)remembered=point;},
  restore(fallback){clearDrag();if(remembered)placeMapCenter(viewport(),remembered);else fallback?.();},
  forget(){remembered=null;clearDrag();},
  isDragClick(event){return Boolean(event.target.closest?.('[data-map-viewport]')&&event.detail>0&&Date.now()<suppressUntil);},
  zoomAround(apply,anchor){
   const view=anchor?.view||viewport(),canvas=view?.querySelector('[data-map-canvas]');if(!view||!canvas)return;
   let point=mapCenter(view),offset={x:view.clientWidth/2,y:view.clientHeight/2};
   if(anchor&&canvas.clientWidth&&canvas.clientHeight){const c=canvas.getBoundingClientRect(),v=view.getBoundingClientRect();point={x:clamp((anchor.x-c.left)/canvas.clientWidth,0,1),y:clamp((anchor.y-c.top)/canvas.clientHeight,0,1)};offset={x:anchor.x-v.left,y:anchor.y-v.top};}
   apply();if(point){view.scrollLeft=clamp(point.x*canvas.clientWidth-offset.x,0,Math.max(0,canvas.clientWidth-view.clientWidth));view.scrollTop=clamp(point.y*canvas.clientHeight-offset.y,0,Math.max(0,canvas.clientHeight-view.clientHeight));remembered=mapCenter(view);}
  }
 };
}
