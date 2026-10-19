// Controlled Web Audio boundary, not a sound/voice or listening test. Real
// audio.js still selects and schedules every note; music is disabled by the
// caller so this probe never fetches a recording or starts a scheduler.
export function uiSoundProbe() {
  const tones = [], contexts = [];
  const param = (record = false) => ({ value: 0, setValueAtTime(value) { this.value = value; if (record) tones.push(value); }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, cancelAndHoldAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {} });
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 100; this.sampleRate = 8; this.destination = node(); contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createOscillator() { return { ...node(), frequency: param(true), start() {}, stop() {} }; }
    createGain() { return { ...node(), gain: param() }; }
    createDynamicsCompressor() { return { ...node(), ...Object.fromEntries(['threshold', 'knee', 'ratio', 'attack', 'release'].map(key => [key, param()])) }; }
    createConvolver() { return node(); }
    createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { getChannelData: index => data[index] }; }
  }
  return { AudioContext, tones, advance() { for (const context of contexts) context.currentTime++; }, close() { for (const context of contexts) context.state = 'closed'; } };
}
