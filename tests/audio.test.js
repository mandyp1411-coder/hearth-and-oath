import test from 'node:test';
import assert from 'node:assert/strict';

let fixtureId = 0;

async function audioFixture(t, saved = null, options = {}) {
  const originals = new Map();
  function replace(key, value) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const intervals = new Map(), timeouts = new Map(), contexts = [], sources = [];
  let timerId = 0, clock = 0;
  const activation = { isActive: false, hasBeenActive: false };
  const handlers = {};
  const document = { hidden: false, addEventListener: (name, fn) => { handlers[name] = fn; } };
  let remembered = saved;
  const storage = {
    getItem: () => { if (options.deniedStorage) throw new Error('Denied'); return remembered; },
    setItem: (key, value) => { if (options.deniedStorage) throw new Error('Denied'); remembered = value; },
  };
  const param = () => ({
    value: 0, events: [],
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); },
    linearRampToValueAtTime(value, time) { this.events.push(['linear', value, time]); },
    exponentialRampToValueAtTime(value, time) { this.events.push(['exponential', value, time]); },
    cancelAndHoldAtTime(time) { this.events.push(['hold', time]); },
  });
  function node(type) {
    return {
      type, kind: type, disconnected: false, connections: [],
      connect(target) { this.connections.push(target); return target; },
      disconnect() { this.disconnected = true; this.connections = []; },
    };
  }
  function source(type) {
    const value = Object.assign(node(type), {
      frequency: param(), detune: param(), started: false, ended: false, endAt: Infinity,
      start(at = clock) { this.started = true; this.startAt = at; },
      stop(at) { this.endAt = at ?? clock; if (at === undefined) this.ended = true; },
    });
    sources.push(value);
    return value;
  }
  class FakeContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 400; this.destination = node('destination'); if(options.recordings)this.decodeAudioData=async bytes=>({recording:true,bytes}); contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createOscillator() { return source('oscillator'); }
    createBufferSource() { return source('buffer'); }
    createGain() { return Object.assign(node('gain'), { gain: param() }); }
    createBiquadFilter() { return Object.assign(node('filter'), { frequency: param(), Q: param() }); }
    createConvolver() { return node('convolver'); }
    createDynamicsCompressor() { return Object.assign(node('compressor'), Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, param()]))); }
    createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: channel => data[channel] }; }
  }
  if(options.recordings)replace('fetch',options.fetcher||(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})));
  replace('AudioContext', options.unsupported ? undefined : FakeContext);
  replace('webkitAudioContext', undefined);
  replace('navigator', { userActivation: activation });
  replace('document', document);
  replace('localStorage', storage);
  replace('setInterval', fn => { const id = ++timerId; intervals.set(id, fn); return id; });
  replace('clearInterval', id => intervals.delete(id));
  replace('setTimeout', (fn, delay) => { const id = ++timerId; timeouts.set(id, { fn, at: clock + delay / 1000 }); return id; });
  replace('clearTimeout', id => timeouts.delete(id));
  t.after(() => {
    for (const [key, original] of originals) {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    }
  });
  const audio = await import(`../dist/js/audio.js?audio-fixture=${++fixtureId}`);
  function advance(seconds) {
    for (let elapsed = 0; elapsed < seconds; elapsed += 0.2) {
      clock += 0.2;
      for (const context of contexts) if (context.state === 'running') context.currentTime += 0.2;
      for (const item of sources) if (!item.ended && item.endAt <= clock) { item.ended = true; item.onended?.(); }
      for (const [id, timer] of timeouts) if (timer.at <= clock) { timeouts.delete(id); timer.fn(); }
      for (const callback of intervals.values()) callback();
    }
  }
  return { audio, contexts, sources, intervals, timeouts, activation, document, advance, remembered: () => JSON.parse(remembered || 'null'), visibility: () => handlers.visibilitychange?.() };
}

test('saved audio preferences never autoplay; sound and music remain independent', async t => {
  const f = await audioFixture(t, JSON.stringify({ enabled: true, volume: 0.18 }));
  assert.deepEqual(f.audio.getAudioSettings(), { enabled: true, volume: 0.18, musicEnabled: true, musicVolume: 0.42 });
  f.audio.setAudioScene('creation');
  f.audio.setMusicVolume(0.8);
  assert.equal(await f.audio.unlockAudio(), false);
  assert.equal(f.audio.playUISound('choice'), false);
  assert.equal(f.contexts.length, 0);
  f.audio.setSoundEnabled(false);
  assert.equal(f.audio.getAudioSettings().musicEnabled, true);
  f.audio.setMusicEnabled(false);
  f.audio.setSoundEnabled(true);
  assert.deepEqual(f.remembered(), { enabled: true, volume: 0.18, musicEnabled: false, musicVolume: 0.8 });
  const copy = f.audio.getAudioSettings(); copy.musicEnabled = true;
  assert.equal(f.audio.getAudioSettings().musicEnabled, false);
});

test('a player gesture starts a continuous melodic score and scene switches keep one scheduler', async t => {
  const f = await audioFixture(t);
  f.activation.isActive = true;
  assert.equal(await f.audio.unlockAudio(), true);
  assert.equal(f.contexts.length, 1);
  assert.equal(f.intervals.size, 1);
  f.advance(6);
  const tones = new Set(f.sources.filter(source => source.type !== 'buffer').map(source => source.frequency.value.toFixed(1)));
  assert.ok(tones.size >= 8, 'score has separate chord tones, bass, and changing melody pitches');
  assert.ok(f.sources.some(source => source.startAt > 3), 'music continues beyond the opening sound');
  for (let i = 0; i < 30; i++) {
    f.audio.setAudioScene(i % 2 ? 'battle' : 'travel');
    assert.equal(f.intervals.size, 1);
    assert.ok(f.timeouts.size <= 1, 'only one scene can be retiring');
    assert.ok(f.sources.filter(source => !source.ended).length < 50, 'rapid switches release old audio graphs');
  }
  f.advance(2);
  assert.equal(f.timeouts.size, 0);
  assert.ok(f.sources.some(source => source.disconnected));
  f.audio.setMusicEnabled(false);
  assert.equal(f.intervals.size, 0);
  f.advance(2);
  assert.equal(f.sources.filter(source => !source.ended).length, 0);
});

test('hidden tabs pause music and resume at the current scene without accumulating timers', async t => {
  const f = await audioFixture(t);
  f.activation.isActive = true;
  await f.audio.unlockAudio();
  const context = f.contexts[0];
  f.document.hidden = true;
  f.visibility();
  assert.equal(context.state, 'suspended');
  assert.equal(f.intervals.size, 0);
  f.audio.setAudioScene('battle');
  const sourceCount = f.sources.length;
  f.advance(60);
  assert.equal(f.sources.length, sourceCount, 'hidden tabs do not schedule notes');
  f.document.hidden = false;
  f.activation.isActive = false;
  f.visibility();
  await Promise.resolve();
  assert.equal(context.state, 'running');
  assert.equal(f.intervals.size, 1);
  assert.ok(f.sources.length > sourceCount, 'a scene selected while hidden starts on return');
  f.audio.setMusicVolume(0);
  assert.equal(f.intervals.size, 0);
  f.audio.setMusicVolume(0.5);
  assert.equal(f.intervals.size, 1);
});

test('UI sound still works with music disabled and repeat taps are bounded', async t => {
  const f = await audioFixture(t);
  f.audio.setMusicEnabled(false);
  f.audio.setSoundEnabled(true);
  f.activation.isActive = true;
  assert.equal(f.audio.playUISound('choice'), true);
  assert.equal(f.audio.playUISound('choice'), false);
  await Promise.resolve();
  assert.equal(f.intervals.size, 0);
  assert.ok(f.sources.some(source => source.frequency.value === 294));
  f.advance(0.1);
  assert.equal(f.audio.playUISound('age'), true);
  f.audio.setSoundEnabled(false);
  assert.ok(f.sources.every(source => source.ended));
  assert.equal(f.audio.playUISound('error'), false);
});

test('missing WebAudio or unavailable preference storage keeps the game usable', async t => {
  const f = await audioFixture(t, null, { unsupported: true, deniedStorage: true });
  f.activation.isActive = true;
  assert.equal(await f.audio.unlockAudio(), false);
  assert.doesNotThrow(() => f.audio.setSoundEnabled(true));
  assert.doesNotThrow(() => f.audio.setMusicEnabled(false));
  assert.doesNotThrow(() => f.audio.setMusicVolume('bad'));
  assert.equal(f.audio.getAudioSettings().musicVolume, 0.42);
  assert.equal(f.audio.setMusicVolume(10).musicVolume, 1);
  assert.equal(f.audio.setSoundVolume(-1).volume, 0);
  assert.equal(f.audio.playUISound(), false);
  assert.equal(f.contexts.length, 0);
});

test('a closed audio context resets its clock and all UI tones use the shared limiter',async t=>{
 const f=await audioFixture(t);f.activation.isActive=true;await f.audio.unlockAudio();f.audio.setSoundEnabled(true);f.advance(20);assert.equal(f.audio.playUISound('choice'),true);const old=f.contexts[0];old.state='closed';
 assert.equal(f.audio.playUISound('error'),true);assert.equal(f.contexts.length,2);assert.equal(f.contexts[1].currentTime,0);
 for(const source of f.sources.filter(s=>s.type==='oscillator'&&s.started))for(const gain of source.connections)assert.ok(!gain.connections.includes(f.contexts.at(-1).destination),'UI tones must enter the shared limited output');
});

const flushAudio=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('a pending recorded menu score plays no synthesized prelude before the recording is ready',async t=>{
 let deliver;const f=await audioFixture(t,null,{recordings:true,fetcher:()=>new Promise(resolve=>{deliver=resolve;})});f.activation.isActive=true;await f.audio.unlockAudio();f.advance(2);assert.equal(f.sources.filter(s=>s.started).length,0);assert.equal(f.intervals.size,0);deliver({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await flushAudio();const music=f.sources.filter(s=>s.started&&!s.ended);assert.equal(music.length,1);assert.equal(music[0].buffer.recording,true);assert.equal(f.sources.filter(s=>s.kind==='oscillator').length,0);assert.equal(f.intervals.size,0);
});
test('returning to the title stops the previous recording and its retiring score before menu playback',async t=>{
 const f=await audioFixture(t,null,{recordings:true});f.activation.isActive=true;await f.audio.unlockAudio();await flushAudio();f.audio.setAudioScene('creation');await flushAudio();f.audio.setAudioScene('title');await flushAudio();assert.equal(f.sources.filter(s=>s.started&&!s.ended).length,1);assert.equal(f.sources.filter(s=>s.kind==='oscillator').length,0);assert.equal(f.intervals.size,0);
});
test('a failed recording uses one local synthesis scheduler and never starts both scores',async t=>{
 const f=await audioFixture(t,null,{recordings:true,fetcher:async()=>({ok:false})});f.activation.isActive=true;await f.audio.unlockAudio();await flushAudio();f.advance(6);assert.equal(f.intervals.size,1);assert.ok(f.sources.some(s=>s.kind==='oscillator'&&s.started));assert.ok(!f.sources.some(s=>s.buffer?.recording));f.audio.setMusicVolume(.6);assert.equal(f.intervals.size,1);
});
test('a score decoded while hidden waits for visibility without starting a synthesis overlay',async t=>{
 let deliver;const f=await audioFixture(t,null,{recordings:true,fetcher:()=>new Promise(resolve=>{deliver=resolve;})});f.activation.isActive=true;await f.audio.unlockAudio();f.document.hidden=true;f.visibility();deliver({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await flushAudio();assert.equal(f.sources.filter(s=>s.started&&!s.ended).length,0);f.document.hidden=false;f.visibility();await flushAudio();assert.equal(f.sources.filter(s=>s.started&&!s.ended).length,1);assert.equal(f.sources.filter(s=>s.kind==='oscillator').length,0);assert.equal(f.intervals.size,0);
});

test('notification chimes use two quiet tones and respect sound settings independently of music',async t=>{
 const f=await audioFixture(t);f.activation.isActive=true;f.audio.setSoundEnabled(true);f.audio.setMusicEnabled(false);await f.audio.unlockAudio();f.advance(1);const start=f.sources.length;assert.equal(f.audio.playUISound('notification'),true);const notes=f.sources.slice(start);assert.equal(notes.length,2);assert.deepEqual(notes.map(n=>n.frequency.value),[392,523]);assert.ok(notes.every(n=>n.started&&Number.isFinite(n.endAt)));f.advance(1);f.audio.setSoundEnabled(false);const count=f.sources.length;assert.equal(f.audio.playUISound('notification'),false);assert.equal(f.sources.length,count);f.audio.setSoundEnabled(true);f.audio.setSoundVolume(0);assert.equal(f.audio.playUISound('notification'),false);
});
