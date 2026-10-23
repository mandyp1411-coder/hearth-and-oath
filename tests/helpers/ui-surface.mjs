import assert from 'node:assert/strict';

// This is a handler integration test, not a browser or layout test. The small
// surface supplies successful form controls and the DOM methods the shell uses.
const decode = text => String(text).replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity]);
let offlineMediaDocument=null;
/** Install the inert media element from the actual shipped HTML. This supplies
 * document data, never rewritten code or substitute game modules. */
export function installOfflineDocument(html){
 const tag='<script type="application/json" id="offline-media">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
 assert.ok(start>=0&&end>start,'The exact standalone includes its inert media element.');
 // Copy a flat ASCII string so a small script slice need not retain the whole
 // UTF-16 HTML document in every disposable VM.
 offlineMediaDocument=Object.freeze({textContent:Buffer.from(html.slice(start+tag.length,end),'utf8').toString('utf8')});
 return html;
}
function attributes(markup) {
  const result = {};
  for (const match of markup.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) result[match[1]] = match[2] === undefined ? true : decode(match[2]);
  return result;
}
export function fakeSurface() {
  const listeners = new Map(), documentListeners = new Map(), values = new Map(), bodyClasses = new Set(), pendingClicks = new Set();
  const listen = (collection, type, handler) => { const rows = collection.get(type) || []; rows.push(handler); collection.set(type, rows); };
  const documentStyle = new Map();
  const document = { hidden: false, activeElement: null, addEventListener(type, handler) { listen(documentListeners, type, handler); }, body: { classList: { add(...names){names.forEach(name=>bodyClasses.add(name));}, remove(...names){names.forEach(name=>bodyClasses.delete(name));}, toggle(name, on) { on ? bodyClasses.add(name) : bodyClasses.delete(name); }, contains(name) { return bodyClasses.has(name); } } }, documentElement: { style: { setProperty(name, value) { documentStyle.set(name, value); } }, setAttribute(name, value) { this[name] = value; } } };
  const node = (attrs = {}, form = null, tag = '') => ({
    ...attrs, dataset: Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith('data-')).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value])),
    tagName: tag.toUpperCase(), disabled: attrs.disabled === true, checked: attrs.checked === true, value: attrs.value ?? '', textContent: '', hidden: attrs.hidden === true,
    classList: (()=>{const names=new Set(String(attrs.class||'').split(' '));return {contains(name){return names.has(name);},add(name){names.add(name);},remove(name){names.delete(name);},toggle(name,on){const next=on??!names.has(name);next?names.add(name):names.delete(name);return next;}};})(),
    matches(selector){return matches(this,selector);},
    closest(selector) { if (selector === 'form' && form) return form; for (let current = this; current; current = current.parentElement) if (matches(current, selector)) return current; return null; },
    setAttribute(name, value) { this[name] = value; }, getAttribute(name) { return this[name] ?? null; }, removeAttribute(name) { delete this[name]; },
    // Geometry is deliberately absent: this fixture never measures CSS visibility.
    getClientRects() { return this.hidden ? [] : [{}]; },
    getBoundingClientRect() { return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }; },
    focus() { if(this.isConnected&&!this.disabled&&!this.hidden)document.activeElement = this; }, click() { const work = fire('click', this); pendingClicks.add(work); work.finally(() => pendingClicks.delete(work)); return work; },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) { return root.nodes.filter(item => { for (let parent = item.parentElement; parent; parent = parent.parentElement) if (parent === this) return matches(item, selector); return false; }); },
    children: [], scrollTop: 0, scrollLeft: 0, scrollHeight: 0, clientWidth: 0, clientHeight: 0, isConnected: true, style: { setProperty() {} },
  });
  const simpleMatch = (item, selector) => {
    if (selector.includes(':not(:disabled)') && item.disabled) return false;
    if (selector.includes(':not([hidden])') && item.hidden) return false;
    selector = selector.replace(/:not\([^)]*\)|:focus-visible/g, '');
    const tag = selector.match(/^[a-z][\w-]*/i)?.[0]; if (tag && item.tagName !== tag.toUpperCase()) return false;
    for (const match of selector.matchAll(/#([\w-]+)/g)) if (item.id !== match[1]) return false;
    for (const match of selector.matchAll(/\.([\w-]+)/g)) if (!item.classList?.contains(match[1])) return false;
    for (const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
      if (item[match[1]] === undefined || item[match[1]] === null) return false;
      if (match[2] !== undefined && String(item[match[1]]) !== match[2]) return false;
    }
    return true;
  };
  const matches = (item, selector) => selector.split(/,(?![^\[]*\])/).some(part => {
    const segments = part.trim().split(/\s+(?![^\[]*\])/).filter(Boolean);
    if (!segments.length || !simpleMatch(item, segments.at(-1))) return false;
    let parent = item.parentElement;
    for (let i = segments.length - 2; i >= 0; i--) { while (parent && !simpleMatch(parent, segments[i])) parent = parent.parentElement; if (!parent) return false; parent = parent.parentElement; }
    return true;
  });
  async function fire(type, target, extra = {}) { const event = { target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra }; for (const handler of listeners.get(type) || []) await handler(event); return event; }
  const toast = node({ id: 'toast' }), viewStatus=node({id:'view-status',role:'status','aria-live':'polite','aria-atomic':'true'}), preview = node(), previewName = node(),ageValue=node(),ageDescription=node(),progress=node();
  let originMarkup='';
  const root = {
    markup: '', form: null, controls: [], nodes: [],
    addEventListener(type, handler) { const rows = listeners.get(type) || []; rows.push(handler); listeners.set(type, rows); },
    set innerHTML(markup) {
      // A replaced subtree cannot retain browser focus on a detached control.
      if(this.nodes.includes(document.activeElement))document.activeElement=document.body;
      for(const old of this.nodes)old.isConnected=false;
      this.markup = markup;
      const match = markup.match(/<form\b[^>]*id="character-form"[^>]*>([\s\S]*?)<\/form>/);
      this.form = match ? { id: 'character-form', tagName: 'FORM', controls: [] } : null;
      this.controls = [];
      const parse = (html, form = null) => {
        const result = [];
        for (const match of html.matchAll(/<(input|select|button|textarea)\b([^>]*?)(?:>([\s\S]*?)<\/\1>|\s*\/?>)/g)) {
          const attrs = attributes(match[2]), control = node(attrs, form, match[1]);
          control.sourceOffset = match.index;
          if(match[1]==='textarea')control.value=decode(match[3]||'');
          if (match[1] === 'select') {
            const options = [...(match[3] || '').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(option => attributes(option[1]));
            control.value = (options.find(option => option.selected) || options[0] || {}).value ?? '';
          }
          result.push(control);
        }
        return result;
      };
      this.parse=parse;
      originMarkup=markup.match(/<div class="creator-origin-grid" data-origin-options[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
      this.controls = parse(markup);
      if (this.form) this.form.controls = parse(match[1], this.form);
      // Track semantic ancestry, headings and containers so handlers can focus
      // their real targets. This is not a CSS or browser layout implementation.
      const controlByOffset = new Map(this.controls.map(control => [control.sourceOffset, control])), stack = [];
      this.nodes = [];let textStart=0;
      for (const token of markup.matchAll(/<\/?([a-z][\w:-]*)\b([^>]*)>/gi)) {
        const text=decode(markup.slice(textStart,token.index));
        for(const parent of stack)parent.textContent+=text;
        textStart=token.index+token[0].length;
        const tag = token[1].toLowerCase();
        if (token[0].startsWith('</')) { const index = stack.findLastIndex(item => item.tagName === tag.toUpperCase()); if (index >= 0) stack.length = index; continue; }
        const current = controlByOffset.get(token.index) || node(attributes(token[2]), null, tag);
        current.parentElement = stack.at(-1) || null;
        if (current.parentElement) { current.previousElementSibling = current.parentElement.children.at(-1) || null; current.parentElement.children.push(current); }
        this.nodes.push(current);
        if (current.id === 'character-form' && this.form) { this.form.parentElement = current.parentElement; }
        if (!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag) && !token[0].endsWith('/>')) stack.push(current);
      }
      // Non-creator forms use their real semantic ancestry too. This lets road
      // planning submit the same successful controls as the delegated handler.
      for(const form of this.nodes.filter(n=>n.tagName==='FORM'&&n.id!=='character-form'))form.controls=this.controls.filter(control=>control.closest('form')===form);
      const name=markup.match(/<h2 data-preview-name>([^]*?)<\/h2>/);if(name)previewName.textContent=decode(name[1]);
    },
    get innerHTML() { return this.markup; },
    querySelector(selector) {
      if (selector === '#character-form') return this.form;
      if (selector === '[data-avatar-preview]') return preview;
      if (selector === '[data-preview-name]') return previewName;
      if (selector === '[data-start-age]') return ageValue;
      if (selector === '[data-age-description]') return ageDescription;
      if (selector === '[data-creation-progress]') return progress;
      if (selector === '#character-form .begin-button') return this.form?.controls.find(c=>c.classList.contains('begin-button'))||null;
      if (selector === '[data-portrait-controls]') return {set innerHTML(html){
        if(!root.form)return;
        // The attributes panel has no successful controls.

      }};
      if (selector === '[data-origin-options]') return {get innerHTML(){return originMarkup;},set innerHTML(html){
        originMarkup=html;if(!root.form)return;
        const keep=c=>c.name!=='originId';
        root.form.controls=[...root.form.controls.filter(keep),...root.parse(html,root.form)];
        root.controls=[...root.controls.filter(keep),...root.parse(html,root.form)];
      }};
      if (selector === '#toast') return toast;
      if (selector === '#view-status') return viewStatus;
      const name = selector.match(/^\[name="([^"]+)"\]$/);
      if (name) return this.form?.controls.find(control => control.name === name[1]) || null;
      const id = selector.match(/^#([\w-]+)$/);
      if (id) return [...(this.form?.controls||[]),...this.controls,...this.nodes].find(control => control.id === id[1]) || null;
      if (selector === '.modal .modal-close') return this.controls.find(control => control.classList.contains('modal-close')) || null;
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) { return selector === '[data-op]' ? this.nodes.filter(control => control.dataset.op) : this.nodes.filter(item => matches(item, selector)); },
  };
  document.getElementById = id => id === 'app' ? root : id === 'toast' ? toast : id==='view-status'?viewStatus:id==='offline-media'?offlineMediaDocument:null;
  const storage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
  class FormData {
    constructor(form) { this.values = new Map((form?.controls || []).filter(control => control.name && !control.disabled && !control.closest?.('fieldset')?.disabled && (!['radio','checkbox'].includes(control.type) || control.checked)).map(control => [control.name, String(control.value)])); }
    get(key) { return this.values.get(key) ?? null; }
    has(key) { return this.values.has(key); }
    entries() { return this.values.entries(); }
    [Symbol.iterator]() { return this.entries(); }
  }
  return {
    root, document, storage, FormData, bodyClasses, values, toast, viewStatus, documentStyle,
    // End a disposable standalone session without retaining its VM via listeners.
    dispose(){listeners.clear();documentListeners.clear();pendingClicks.clear();document.activeElement=null;root.innerHTML='';values.clear();},
    fire,
    async key(key, { target = document.activeElement, shiftKey = false, ...modifiers } = {}) {
      const event = await fire('keydown',target,{key,shiftKey,...modifiers});
      for (const handler of documentListeners.get('keydown') || []) await handler(event);
      // Model native button activation after the bubbling key handlers. This verifies
      // the delegated app handler, not a browser's keyboard implementation.
      if (['Enter',' '].includes(key) && !event.defaultPrevented && !event.repeat && target?.tagName === 'BUTTON' && !target.disabled) await target.click();
      await Promise.all([...pendingClicks]); await Promise.resolve(); return event;
    },
    async click(op, id) {
      const control = [...(root.form?.controls || []),...root.nodes].find(control => control.dataset.op === op && (id === undefined || String(control.dataset.id) === String(id)));
      assert.ok(control && !control.disabled, `visible enabled command ${op}/${id ?? ''}`);
      await this.fire('click', control);
      this.flushSpatialClicks?.();
    },
    set(name, value) {
      const controls = root.form?.controls.filter(control => control.name === name) || [];
      assert.ok(controls.length, `successful control ${name}`);
      if (controls[0].type === 'radio') { assert.ok(controls.some(control => control.value === value)); controls.forEach(control => { control.checked = control.value === value; }); }
      else controls[0].value = value;
    },
    async submit() { assert.ok(root.form); await this.fire('submit', root.form); },
    lives() { return JSON.parse(storage.getItem('hearth-and-oath-legacy:slots:v1')).slots.map(slot => slot.state); },
    current() { return JSON.parse(storage.getItem('hearth-and-oath-legacy:life:v1')); },
    preview,previewName,ageValue,ageDescription,progress,
    async import(text) { const control = root.querySelector('#save-file'); control.files = [{ size: text.length, text: async () => text }]; await this.fire('change', control); },
  };
}

let importedApps = 0;

/** Install one isolated handler surface. No browser or CSS geometry is modeled. */
export async function mountApp(t, { states = [], activeSlot = 0, width = 1440, height = 900, storageEntries = [], locks = null } = {}) {
  const surface = fakeSurface(), originals = new Map(), windowListeners = new Map();
  surface.windowEvent = async (type, extra = {}) => { const event = { defaultPrevented:false, preventDefault(){this.defaultPrevented=true;}, ...extra }; for(const handler of windowListeners.get(type)||[])await handler(event); return event; };
  const spatialTimers=new Map(),touchTimers=new Map();let timerId=0;
  surface.flushSpatialClicks=()=>{const pending=[...spatialTimers.values()];spatialTimers.clear();for(const callback of pending)callback();};
  // Inventory touch holds are a separate native timer from spatial double
  // clicks. Flush only when the caller explicitly exercises a held touch.
  surface.flushTouchHolds=()=>{const pending=[...touchTimers.values()];touchTimers.clear();for(const callback of pending)callback();};
  if (states.length) {
    surface.storage.setItem('hearth-and-oath-legacy:slots:v1', JSON.stringify({ version: 1, activeSlot, backups: {}, slots: Array.from({ length: 3 }, (_, id) => ({ id, state: states[id] || null, updatedAt: states[id] ? '2026-10-12T00:00:00.000Z' : null })) }));
    if (states[activeSlot]) surface.storage.setItem('hearth-and-oath-legacy:life:v1', JSON.stringify(states[activeSlot]));
  }
  for (const [key, value] of storageEntries) surface.storage.setItem(key, value);
  const globals = {
    document: surface.document, localStorage: surface.storage, FormData: surface.FormData,
    window: { innerWidth: width, innerHeight: height, scrollTo() {}, scrollBy() {}, ...(locks ? { navigator: { locks } } : {}), addEventListener(type,handler){const handlers=windowListeners.get(type)||[];handlers.push(handler);windowListeners.set(type,handlers);} },
    requestAnimationFrame: callback => { callback(); return 1; },
    getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
    setTimeout: (callback,delay) => {const id=++timerId;if(delay===520)spatialTimers.set(id,callback);if(delay===220)touchTimers.set(id,callback);return id;}, clearTimeout(id) {spatialTimers.delete(id);touchTimers.delete(id);},
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => { for (const [key, descriptor] of originals) descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]; });
  const source = new URL('../../dist/js/app.js', import.meta.url);
  source.searchParams.set('handler-surface', String(++importedApps));
  await import(source.href);
  await Promise.resolve();
  return surface;
}

