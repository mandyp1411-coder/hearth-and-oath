import { MUSIC_RECORDINGS_V27 } from './music-recordings-v27.js';
import { cartographyView } from './cartography.js';
/* An original, locally performed dungeon score. Preferences belong to the player,
   not their save. No downloads, audio permissions, or background autoplay. */
const STORAGE_KEY = 'hearth-and-oath:audio:v1';
const defaults = { enabled: true, volume: 0.35, musicEnabled: true, musicVolume: 0.42 };
let settings = { ...defaults };
let context = null;
let hasUnlockedAudio = false;
let lastSoundAt = -Infinity;
let activeSounds = [];
let sceneName = 'title';
let scene = null;
let retiringScene = null;
let scheduler = null;
let retirementTimer = null;
let output = null;
let reverb = null;
let room = null;
let noiseBuffer = null;

function clampVolume(value, fallback = defaults.volume) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

try {
  const saved = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    settings = {
      enabled: saved.enabled === true,
      volume: clampVolume(saved.volume),
      musicEnabled: typeof saved.musicEnabled === 'boolean' ? saved.musicEnabled : defaults.musicEnabled,
      musicVolume: clampVolume(saved.musicVolume ?? defaults.musicVolume, defaults.musicVolume),
    };
  }
} catch { /* Private browsing still keeps session preferences. */ }

function rememberSettings() {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Session settings still work. */ }
  return getAudioSettings();
}

export function getAudioSettings() { return { ...settings }; }

export function setSoundEnabled(enabled) {
  settings.enabled = enabled === true;
  if (!settings.enabled) stopSounds();
  return rememberSettings();
}

export function setSoundVolume(volume) {
  settings.volume = clampVolume(volume);
  if (!settings.volume) stopSounds();
  return rememberSettings();
}

export function setMusicEnabled(enabled) {
  settings.musicEnabled = enabled === true;
  reconcileMusic();
  return rememberSettings();
}

export function setMusicVolume(volume) {
  settings.musicVolume = clampVolume(volume, defaults.musicVolume);
  if (scene && context) fadeGain(scene.bus.gain, settings.musicVolume, 0.45);
  reconcileMusic();
  return rememberSettings();
}

// Minor/modal phrases written specifically for Hearth & Oath. Each scene has a
// melody, a four-chord movement, a soft organ bed, and a breath of dungeon air.
const scenes = {
  title: {
    root: 38, bpm: 48, pad: 0.013, bell: 0.036, wind: 0.009,
    chords: [[0, 7, 12, 15], [8, 15, 20, 24], [3, 10, 15, 19], [10, 17, 22, 26]],
    motif: [24, null, 31, null, 27, 26, null, 22, 24, null, 27, null, 31, 29, 26, null],
  },
  creation: {
    root: 41, bpm: 52, pad: 0.012, bell: 0.030, wind: 0.006,
    chords: [[0, 7, 12, 15], [5, 12, 17, 20], [8, 15, 20, 24], [0, 7, 12, 15]],
    motif: [24, null, 27, 31, null, 29, 27, null, 24, null, 22, 24, null, 27, 26, null],
  },
  story: {
    root: 38, bpm: 44, pad: 0.011, bell: 0.026, wind: 0.008,
    chords: [[0, 7, 12, 15], [3, 10, 15, 19], [5, 12, 17, 20], [0, 7, 12, 15]],
    motif: [24, null, null, 27, null, 26, null, 22, 24, null, 31, null, 29, null, 26, null],
  },
  travel: {
    root: 40, bpm: 60, pad: 0.010, bell: 0.032, wind: 0.013,
    chords: [[0, 7, 12, 15], [5, 12, 17, 20], [10, 17, 22, 26], [7, 14, 19, 22]],
    motif: [24, null, 27, 31, 29, null, 27, 22, 24, null, 26, 29, 31, 29, 27, null],
  },
  battle: {
    root: 38, bpm: 76, pad: 0.010, bell: 0.026, wind: 0.010,
    chords: [[0, 7, 12, 15], [1, 8, 13, 17], [5, 12, 17, 20], [0, 7, 12, 15]],
    motif: [12, 24, null, 19, 12, 27, null, 25, 12, 24, null, 19, 13, 25, 24, null],
  },
};

// Place cues share the same small, locally performed instrument set.
Object.assign(scenes,{
  town:{...scenes.story,root:43,bpm:54,wind:.004,motif:[24,null,28,null,31,28,null,26,24,null,19,null,26,28,null,24]},
  shrine:{...scenes.creation,root:36,bpm:40,wind:.003,motif:[24,null,null,null,31,null,29,null,27,null,null,null,24,null,22,null]},
  dungeon:{...scenes.story,root:33,bpm:42,wind:.015,motif:[12,null,null,13,null,null,19,null,12,null,null,17,null,null,13,null]},
  woodland:{...scenes.travel,root:40,bpm:50,wind:.01,motif:[24,null,26,null,31,null,null,29,27,null,26,null,24,null,null,null]},
  coast:{...scenes.story,root:41,bpm:46,wind:.016,motif:[24,null,31,null,29,null,26,null,24,null,19,null,22,null,26,null]},
});
const regionMotifs={bellwater:[24,null,27,31,null,29,27,null,24,null,22,null,19,null,24,null],saltreach:[24,31,null,null,29,null,26,null,22,null,19,26,null,29,null,24],highstone:[12,null,19,null,24,null,19,null,13,null,20,null,24,null,19,null],blackgrove:[24,null,26,null,null,31,null,29,27,null,26,null,24,null,null,22],rainward:[24,null,27,null,26,null,22,null,19,null,22,null,26,null,24,null],ashplain:[12,null,13,null,19,null,null,17,12,null,19,null,13,null,12,null]};
for(const [id,motif] of Object.entries(regionMotifs))scenes['region_'+id]={...scenes.town,motif,root:{bellwater:40,saltreach:41,highstone:35,blackgrove:38,rainward:39,ashplain:33}[id]};
for(const [i,id] of ['lantern','ancestors','wilds','forge','moon','ash'].entries())scenes['faith_'+id]={...scenes.shrine,root:34+i,motif:regionMotifs[Object.keys(regionMotifs)[i]],bell:.020};
scenes.curse={...scenes.dungeon,root:29,bpm:38,pad:.006,bell:.014,wind:.010,motif:[12,null,null,null,13,null,null,null,19,null,null,null,12,null,null,null]};
for(const id of Object.keys(MUSIC_RECORDINGS_V27))if(!scenes[id])scenes[id]=scenes.story;
const recordingScene=name=>({title:'menu',creation:'hearth',story:'hearth',travel:'woodland',battle:'combat',dungeon:'ruin',curse:'vampire',shrine:'court',faith_lantern:'hearth',faith_moon:'coast',faith_forge:'mountain',faith_wilds:'woodland',faith_veil:'ruin',faith_ancestor:'legacy',region_rainward:'marsh',region_saltreach:'coast',region_highstone:'mountain',region_blackgrove:'woodland',region_ashplain:'court',region_bellwater:'town'}[name]||name);
const recordingCache=new Map();
async function useRecording(instance){
 const key=recordingScene(instance.name),record=MUSIC_RECORDINGS_V27[key];
 try{
  let buffer=instance.recordingBuffer||recordingCache.get(key);
  if(!buffer){const response=await globalThis.fetch(record.src);if(!response.ok)throw Error('Score unavailable');buffer=await context.decodeAudioData(await response.arrayBuffer());recordingCache.set(key,buffer);while(recordingCache.size>3)recordingCache.delete(recordingCache.keys().next().value);}
  if(scene!==instance)return false;
  instance.recordingBuffer=buffer;
  if(!musicCanPlay()||context.state!=='running')return true;
  instance.recordingPending=false;clearScheduler();
  for(const node of instance.sources){stopSource(node);disconnect(node);}instance.sources.clear();
  const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(instance.bus);instance.sources.add(source);instance.recorded=true;source.start(context.currentTime+.03);return true;
 }catch{return false;}
}
export function audioSceneFor(state,screen='game') {
  if(screen==='creation')return 'creation';
  if(screen!=='game'||!state)return 'title';
  if(state.battle)return state.battle.context?.bossId&&state.battle.context.bossId!=='ordinary'?'boss':'battle';
  if(state.phase==='retired')return 'legacy';
  if(state.age<3)return 'hearth';
  if(state.age<18)return 'school';
  if(state.cartography?.interior?.roomId==='watch')return 'court';
  if(state.hero?.condition?.type==='vampire'&&state.hero.condition.stage==='changed')return 'vampire';
  if(state.hero?.condition?.form==='feral'||state.hero?.condition?.type==='lycanthrope'&&state.hero.condition.form!=='human'&&state.hero.condition.curseVersion===1)return state.hero.condition.type==='lycanthrope'?'werewolf':'curse';
  if(state.delve||state.maze)return 'dungeon';
  if(state.timeline?.journey||state.cartography?.pending)return 'travel';
  const regionId=state.realm?.sites?.[state.locationId]?.regionId,region=state.realm?.regions?.find(r=>r.id===regionId);
  if(state.cartography?.interior?.roomId==='shrine')return Object.hasOwn(scenes,'faith_'+region?.faithId)?'faith_'+region.faithId:'shrine';
  const site=state.world?.locations.find(p=>p.id===state.locationId);
  if(state.cartography?.offsite){const terrain=cartographyView(state)?.cells.find(c=>c.current)?.terrain;return ({forest:'woodland',marsh:'marsh',mountain:'mountain',water:'coast'}[terrain]||'woodland');}
  if(site?.type==='sanctuary')return Object.hasOwn(scenes,'faith_'+region?.faithId)?'faith_'+region.faithId:'shrine';
  if(site?.type==='marsh')return 'marsh';
  if(site?.type==='mountain')return 'mountain';
  if(site?.type==='coast')return 'coast';
  if(site?.type==='forest')return 'woodland';
  if(site?.servicesAvailable!==false&&!['destroyed','evacuated'].includes(site?.status)&&['city','village','camp','citadel','gate','tower'].includes(site?.type))return Object.hasOwn(scenes,'region_'+regionId)?'region_'+regionId:'town';
  return 'story';
}

/** Scene changes are safe before the first interaction and never autoplay. */
export function setAudioScene(name = 'story') {
  const next = Object.hasOwn(scenes, name) ? name : 'story';
  if (sceneName === next) return sceneName;
  sceneName = next;
  if (scene && musicCanPlay()) startScene();
  return sceneName;
}

function playerGesture() {
  const activation = globalThis.navigator?.userActivation;
  return activation ? activation.isActive === true : globalThis.event?.isTrusted === true;
}

function audioContext() {
  if (context?.state === 'closed') {
    stopMusic(false);
    stopSounds();
    lastSoundAt = -Infinity;
    context = null;
    output = reverb = room = noiseBuffer = null;
  }
  if (context) return context;
  if (!hasUnlockedAudio && !playerGesture()) return null;
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  try {
    context = new AudioContext();
    hasUnlockedAudio = true;
    return context;
  } catch { return null; }
}

/** Call from Begin, Load, or an audio-control click. Resolves false if unsupported. */
export async function unlockAudio() {
  // A persisted preference or a programmatic call is not permission to autoplay.
  if (!hasUnlockedAudio && !playerGesture()) return false;
  const audio = audioContext();
  if (!audio) return false;
  try {
    if (audio.state === 'suspended') await audio.resume();
    if (globalThis.document?.hidden) return false;
    reconcileMusic();
    return audio.state === 'running';
  } catch { return false; }
}

function musicCanPlay() {
  return hasUnlockedAudio && context && context.state === 'running'
    && !globalThis.document?.hidden && settings.musicEnabled && settings.musicVolume > 0;
}

function fadeGain(param, value, duration) {
  const now = context.currentTime;
  // Hold the instantaneous gain during fast scene changes, when supported.
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
  else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
  param.linearRampToValueAtTime(value, now + duration);
}

function makeRoom() {
  if (output) return;
  const audio = context;
  output = audio.createGain();
  output.gain.value = 0.72;
  // Gentle limiting protects against overlapping transitions and short UI tones.
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -18;
  limiter.knee.value = 18;
  limiter.ratio.value = 5;
  limiter.attack.value = 0.015;
  limiter.release.value = 0.3;
  output.connect(limiter);
  limiter.connect(audio.destination);
  reverb = audio.createConvolver();
  room = audio.createGain();
  room.gain.value = 0.26;
  const length = Math.floor(audio.sampleRate * 3.6);
  const impulse = audio.createBuffer(2, length, audio.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.1) * 0.32;
  }
  reverb.buffer = impulse;
  reverb.connect(room);
  room.connect(output);
  noiseBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 4), audio.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < noise.length; i++) {
    brown = (brown + Math.random() * 0.04 - 0.02) / 1.025;
    noise[i] = brown * 4;
  }
}

function disconnect(node) { try { node.disconnect(); } catch { /* Already released. */ } }
function stopSource(source) { try { source.stop(); } catch { /* Already ended. */ } }

function cleanScene(instance) {
  if (!instance) return;
  for (const source of instance.sources) { source.onended = null; stopSource(source); disconnect(source); }
  for (const node of instance.nodes) disconnect(node);
  instance.sources.clear();
  instance.nodes.clear();
}

function clearScheduler() {
  if (scheduler !== null) globalThis.clearInterval(scheduler);
  scheduler = null;
}

function retire(instance, fade = true) {
  // One retiring scene maximum, even when menus are changed rapidly.
  if (retirementTimer !== null) globalThis.clearTimeout(retirementTimer);
  retirementTimer = null;
  cleanScene(retiringScene);
  retiringScene = null;
  if (!instance) return;
  if (!fade || !context || context.state !== 'running') { cleanScene(instance); return; }
  fadeGain(instance.bus.gain, 0, 1.15);
  retiringScene = instance;
  retirementTimer = globalThis.setTimeout(() => {
    cleanScene(retiringScene);
    retiringScene = null;
    retirementTimer = null;
  }, 1250);
}

function stopMusic(fade = true) {
  clearScheduler();
  retire(scene, fade);
  scene = null;
}

function reconcileMusic() {
  if (!musicCanPlay()) {
    if (scene && (!settings.musicEnabled || !settings.musicVolume)) stopMusic();
    return;
  }
  try {
    if (!scene || scene.name !== sceneName) startScene();
    else if(!scene.recorded&&scene.recordingBuffer&&!scene.recordingPending)void useRecording(scene);
    else if (scheduler === null) beginScheduler();
  } catch { stopMusic(false); }
}

function startScene() {
  const carriedPhrase=scene?Math.floor(scene.step/16)*16:0;
  clearScheduler();
  retire(scene, sceneName!=='title');
  scene = null;
  makeRoom();
  const bus = context.createGain();
  bus.gain.setValueAtTime(0, context.currentTime);
  bus.gain.linearRampToValueAtTime(settings.musicVolume, context.currentTime + 1.8);
  bus.connect(output);
  bus.connect(reverb);
  const instance = {
    name: sceneName, profile: scenes[sceneName], bus,
    sources: new Set(), nodes: new Set([bus]),
    step: carriedPhrase, nextAt: context.currentTime + 0.08,
  };
  scene = instance;
  instance.recordingPending=Boolean(MUSIC_RECORDINGS_V27[recordingScene(instance.name)]&&typeof globalThis.fetch==='function'&&typeof context.decodeAudioData==='function');
  if(instance.recordingPending)void useRecording(instance).then(loaded=>{
    if(scene!==instance)return;instance.recordingPending=false;
    if(!loaded&&musicCanPlay())startSynthesis(instance);
  });
  else startSynthesis(instance);
}
function startSynthesis(instance){
  if(scene!==instance||instance.recorded||instance.synthesized)return;
  instance.synthesized=true;
  const wind = context.createBufferSource();
  wind.buffer = noiseBuffer;
  wind.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = instance.name === 'travel' ? 760 : 460;
  const windLevel = context.createGain();
  windLevel.gain.value = instance.profile.wind;
  wind.connect(lowpass); lowpass.connect(windLevel); windLevel.connect(instance.bus);
  instance.sources.add(wind); instance.nodes.add(lowpass); instance.nodes.add(windLevel);
  wind.start();
  beginScheduler();
}

function beginScheduler() {
  if (scheduler !== null || !scene || scene.recorded || scene.recordingPending) return;
  scheduleMusic();
  scheduler = globalThis.setInterval(scheduleMusic, 200);
}

const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);

function note(instance, midi, start, duration, level, voice = 'bell') {
  const audio = context;
  const envelope = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = voice === 'pad' ? 630 : 1700;
  filter.Q.value = 0.35;
  envelope.connect(filter); filter.connect(instance.bus);
  instance.nodes.add(envelope); instance.nodes.add(filter);
  const attack = voice === 'pad' ? Math.min(1.4, duration / 4) : 0.018;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(level, start + attack);
  if (voice === 'pad') envelope.gain.setValueAtTime(level * 0.76, start + duration * 0.58);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  const harmonics = voice === 'bell' ? [[1, 'sine', 0], [2.003, 'sine', 0]]
    : voice === 'pad' ? [[1, 'triangle', -5], [1, 'sine', 5]] : [[1, 'sine', 0]];
  let remaining = harmonics.length;
  for (const [harmonic, type, detune] of harmonics) {
    const oscillator = audio.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi) * harmonic, start);
    oscillator.detune.value = detune;
    oscillator.connect(envelope);
    instance.sources.add(oscillator);
    oscillator.onended = () => {
      instance.sources.delete(oscillator);
      disconnect(oscillator);
      if (--remaining === 0) {
        disconnect(envelope); disconnect(filter);
        instance.nodes.delete(envelope); instance.nodes.delete(filter);
      }
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }
}

function scheduleMusic() {
  if (!scene || !musicCanPlay()) return;
  const instance = scene;
  const profile = instance.profile;
  const halfBeat = 30 / profile.bpm;
  // Resume or a sleeping CPU must not catch up minutes of notes at once.
  if (instance.nextAt < context.currentTime - 0.2) instance.nextAt = context.currentTime + 0.04;
  let scheduled = 0;
  while (instance.nextAt < context.currentTime + 0.7 && scheduled++ < 4) {
    const position = instance.step % 16;
    const phrase = Math.floor(instance.step / 16);
    const form=[0,1,0,2,3,1,2,0];
    const chord = profile.chords[form[phrase%form.length]%profile.chords.length];
    const quiet=instance.name!=='battle' && phrase%8===5;
    const start = instance.nextAt;
    const silence=instance.name!=='battle'&&phrase%12===9;
    if (position === 0&&!silence) {
      for (const tone of chord) note(instance, profile.root + tone, start, halfBeat * 15.7, profile.pad, 'pad');
      note(instance, profile.root - 12 + chord[0], start, halfBeat * 6, 0.043, 'bass');
    }
    const pitch = profile.motif[position];
    if (pitch !== null && !quiet&&!silence) {
      // The second phrase answers an octave lower; later phrases resolve home.
      const answer = phrase % 8 === 1 || phrase % 8 === 6 ? -12 : 0;
      note(instance, profile.root + pitch + answer, start, halfBeat * (instance.name === 'battle' ? 1.6 : 3.8), profile.bell, 'bell');
    }
    if (instance.name === 'battle' && position % 4 === 2) {
      note(instance, profile.root - 12 + chord[0], start, 0.30, 0.042, 'bass');
    }
    instance.step++;
    instance.nextAt += halfBeat;
  }
}

function stopSounds() {
  for (const sound of activeSounds) for (const oscillator of sound.oscillators) stopSource(oscillator);
  activeSounds = [];
}

// [frequency, start offset, duration, relative level, waveform, end frequency]
const score = {
  notification: [[392,0,0.18,0.28,'sine'],[523,0.12,0.27,0.22,'triangle']],
  click: [[220, 0, 0.075, 0.52, 'sine', 155], [660, 0, 0.04, 0.08, 'triangle', 440]],
  choice: [[294, 0, 0.17, 0.42, 'triangle'], [392, 0.07, 0.19, 0.36, 'sine']],
  age: [[196, 0, 0.22, 0.34, 'triangle'], [294, 0.10, 0.25, 0.32, 'sine'], [392, 0.21, 0.31, 0.27, 'sine']],
  travel: [[220, 0, 0.12, 0.36, 'triangle', 185], [165, 0.12, 0.17, 0.35, 'sine']],
  'combat-success': [[196, 0, 0.19, 0.40, 'triangle'], [294, 0.07, 0.23, 0.32, 'sine'], [440, 0.16, 0.30, 0.25, 'sine']],
  error: [[146, 0, 0.14, 0.34, 'triangle'], [110, 0.09, 0.17, 0.32, 'sine']],
};

/** Call after a player interaction. Returns false if sound cannot or should not play. */
export function playUISound(kind = 'click') {
  if (!settings.enabled || settings.volume <= 0 || globalThis.document?.hidden) return false;
  const audio = audioContext();
  if (!audio) return false;
  if (audio.state === 'suspended') {
    try { audio.resume()?.then(() => reconcileMusic()).catch(() => {}); } catch { return false; }
  } else reconcileMusic();
  const now = audio.currentTime;
  if (now - lastSoundAt < 0.035) return false;
  lastSoundAt = now;
  activeSounds = activeSounds.filter(sound => sound.endsAt > now);
  if (activeSounds.length >= 3) for (const oscillator of activeSounds.shift().oscillators) stopSource(oscillator);
  const notes = score[kind] || score.click;
  const sound = { oscillators: [], endsAt: now };
  try {
    for (const [tone, offset, duration, level, waveform, endFrequency] of notes) {
      const start = now + 0.012 + offset;
      const end = start + duration;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = waveform;
      oscillator.frequency.setValueAtTime(tone, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.12 * settings.volume * level, start + Math.min(0.012, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      makeRoom(audio);
      gain.connect(output);
      oscillator.onended = () => { disconnect(oscillator); disconnect(gain); };
      oscillator.start(start);
      oscillator.stop(end + 0.01);
      sound.oscillators.push(oscillator);
      sound.endsAt = Math.max(sound.endsAt, end + 0.01);
    }
    activeSounds.push(sound);
    return true;
  } catch {
    for (const oscillator of sound.oscillators) stopSource(oscillator);
    return false;
  }
}

globalThis.document?.addEventListener?.('visibilitychange', () => {
  if (globalThis.document.hidden) {
    clearScheduler();
    // Fade retirement already completed or interrupted; release its graph now.
    if (retirementTimer !== null) globalThis.clearTimeout(retirementTimer);
    retirementTimer = null;
    cleanScene(retiringScene);
    retiringScene = null;
    stopSounds();
    try { context?.suspend()?.catch(() => {}); } catch { /* Older browsers may refuse. */ }
  } else if (hasUnlockedAudio && context?.state === 'suspended') {
    try { context.resume()?.then(() => reconcileMusic()).catch(() => {}); } catch { /* The next gesture retries. */ }
  } else reconcileMusic();
});
