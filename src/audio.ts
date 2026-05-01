import type { Rarity } from './types';

let ctx: AudioContext | null = null;
let torchGain: GainNode | null = null;
let watcherWhineGain: GainNode | null = null;
let watcherWhineOsc: OscillatorNode | null = null;

// ── HTML5 Audio (MP3 files) ───────────────────────────────────────────────────
let bgMusic: HTMLAudioElement | null = null;
let insectMusic: HTMLAudioElement | null = null;
let scaryBg: HTMLAudioElement | null = null;
let roomClearAudio: HTMLAudioElement | null = null;
let winAudio: HTMLAudioElement | null = null;

export function startBackgroundMusic() {
  bgMusic = new Audio('/audio/background-music.mp3');
  bgMusic.loop = true; bgMusic.volume = 0.28;
  bgMusic.play().catch(() => {});

  insectMusic = new Audio('/audio/insect01.mp3');
  insectMusic.loop = true; insectMusic.volume = 0.14;
  insectMusic.play().catch(() => {});
}

export function stopBackgroundMusic() {
  bgMusic?.pause();
  insectMusic?.pause();
}

export function resumeBackgroundMusic() {
  bgMusic?.play().catch(() => {});
  insectMusic?.play().catch(() => {});
}

export function playRoomClearMusic(index: number, onEnded: () => void) {
  const files = ['/audio/end-round-01.mp3', '/audio/end-round-02.mp3', '/audio/round03end.mp3'];
  stopBackgroundMusic();
  roomClearAudio?.pause();
  scaryBg?.pause();

  scaryBg = new Audio('/audio/scary-bg.mp3');
  scaryBg.loop = true; scaryBg.volume = 0.18;
  scaryBg.play().catch(() => {});

  roomClearAudio = new Audio(files[index] ?? files[0]);
  roomClearAudio.volume = 0.72;
  roomClearAudio.onended = onEnded;
  roomClearAudio.play().catch(() => { setTimeout(onEnded, 3500); });
}

export function stopRoomClearMusic() {
  roomClearAudio?.pause();
  scaryBg?.pause();
  roomClearAudio = null;
  scaryBg = null;
}

export function playWinMusic() {
  stopBackgroundMusic();
  stopRoomClearMusic();
  winAudio = new Audio('/audio/winnning.mp3');
  winAudio.loop = false; winAudio.volume = 0.6;
  winAudio.play().catch(() => {});
}

export function playCreak() {
  const a = new Audio('/audio/wood-creek01.mp3');
  a.volume = 0.28 + Math.random() * 0.28;
  a.play().catch(() => {});
}

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function initAudio() {
  const ac = getCtx();
  torchGain = ac.createGain();
  torchGain.gain.value = 0.035;
  torchGain.connect(ac.destination);
  scheduleCrackle(ac);
}

function scheduleCrackle(ac: AudioContext) {
  if (!torchGain) return;
  const buf = ac.createBuffer(1, ac.sampleRate * 0.07, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.25));
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = 0.3 + Math.random() * 0.7;
  src.connect(g);
  g.connect(torchGain);
  src.start();
  setTimeout(() => scheduleCrackle(ac), 90 + Math.random() * 130);
}

// ── Dark ambient horror score ─────────────────────────────────────────────────
export function startAmbient() {
  const ac = getCtx();

  // Sub-bass drone (slow LFO on pitch)
  const sub = ac.createOscillator();
  const subG = ac.createGain();
  sub.type = 'sine';
  sub.frequency.value = 36;
  subG.gain.setValueAtTime(0, ac.currentTime);
  subG.gain.linearRampToValueAtTime(0.06, ac.currentTime + 5);
  sub.connect(subG);
  subG.connect(ac.destination);
  sub.start();

  const lfo = ac.createOscillator();
  const lfoG = ac.createGain();
  lfo.frequency.value = 0.08;
  lfoG.gain.value = 5;
  lfo.connect(lfoG);
  lfoG.connect(sub.frequency);
  lfo.start();

  // Devil's interval tritone pad (130 Hz + 184 Hz = unsettling dissonance)
  [130, 184].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.009, ac.currentTime + 9 + i * 3);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
  });

  // Mid-low secondary drone
  const mid = ac.createOscillator();
  const midG = ac.createGain();
  mid.type = 'sine';
  mid.frequency.value = 55;
  midG.gain.setValueAtTime(0, ac.currentTime);
  midG.gain.linearRampToValueAtTime(0.028, ac.currentTime + 7);
  mid.connect(midG);
  midG.connect(ac.destination);
  mid.start();

  // Watcher whine (silent until watcher spawns)
  watcherWhineOsc = ac.createOscillator();
  watcherWhineGain = ac.createGain();
  watcherWhineOsc.type = 'sine';
  watcherWhineOsc.frequency.value = 700;
  watcherWhineGain.gain.value = 0;
  watcherWhineOsc.connect(watcherWhineGain);
  watcherWhineGain.connect(ac.destination);
  watcherWhineOsc.start();

  // Random deep procedural thumps — the building breathing
  scheduleThump(ac);
}

function scheduleThump(ac: AudioContext) {
  const len = Math.floor(ac.sampleRate * 0.22);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.07));
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 55;
  const g = ac.createGain();
  g.gain.value = 0.22 + Math.random() * 0.12;
  src.connect(filt);
  filt.connect(g);
  g.connect(ac.destination);
  src.start();
  setTimeout(() => scheduleThump(ac), 7000 + Math.random() * 15000);
}

// proximity: 0 = far, 1 = touching
export function setWatcherAudio(proximity: number) {
  if (!watcherWhineGain || !watcherWhineOsc) return;
  const ac = getCtx();
  watcherWhineGain.gain.setTargetAtTime(proximity * 0.05, ac.currentTime, 0.4);
  watcherWhineOsc.frequency.setTargetAtTime(500 + proximity * 900, ac.currentTime, 0.4);
}

// lub-dub heartbeat — call from main loop based on proximity
export function playHeartbeat(proximity: number) {
  const ac = getCtx();
  const vol = 0.28 + proximity * 0.45;
  [0, 0.16].forEach(offset => {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(58, ac.currentTime + offset);
    osc.frequency.exponentialRampToValueAtTime(26, ac.currentTime + offset + 0.2);
    g.gain.setValueAtTime(vol, ac.currentTime + offset);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + offset + 0.24);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(ac.currentTime + offset);
    osc.stop(ac.currentTime + offset + 0.28);
  });
}

export function playPickup(rarity: Rarity) {
  const ac = getCtx();
  const noteMap: Record<Rarity, number[]> = {
    common:      [440],
    rare:        [261, 392],
    'ultra-rare':[220, 261, 330],
    legendary:   [261, 329, 392, 523],
  };
  noteMap[rarity].forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = rarity === 'legendary' ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.13;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

export function playFootstep() {
  const ac = getCtx();
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.06), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.22));
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 380;
  const g = ac.createGain();
  g.gain.value = 0.22;
  src.connect(filt);
  filt.connect(g);
  g.connect(ac.destination);
  src.start();
}

export function playUnlock() {
  const ac = getCtx();
  [330, 440, 554].forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  });
}

export function playBuzzer() {
  const ac = getCtx();
  // Three-stage descending thud — "you lose"
  [240, 170, 110].forEach((freq, i) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}

export function playScream() {
  const ac = getCtx();

  // Sub-bass slam
  const sub = ac.createOscillator();
  const subG = ac.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(60, ac.currentTime);
  sub.frequency.exponentialRampToValueAtTime(25, ac.currentTime + 1.1);
  subG.gain.setValueAtTime(1.2, ac.currentTime);
  subG.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.1);
  sub.connect(subG);
  subG.connect(ac.destination);
  sub.start();
  sub.stop(ac.currentTime + 1.1);

  // Upward shriek
  const shriek = ac.createOscillator();
  const shriekG = ac.createGain();
  shriek.type = 'sawtooth';
  shriek.frequency.setValueAtTime(90, ac.currentTime);
  shriek.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.6);
  shriekG.gain.setValueAtTime(0.65, ac.currentTime);
  shriekG.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.9);
  shriek.connect(shriekG);
  shriekG.connect(ac.destination);
  shriek.start();
  shriek.stop(ac.currentTime + 0.9);

  // White noise burst (the "static shock")
  const bufLen = Math.floor(ac.sampleRate * 0.7);
  const nBuf = ac.createBuffer(1, bufLen, ac.sampleRate);
  const nd   = nBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
  }
  const nSrc  = ac.createBufferSource();
  nSrc.buffer = nBuf;
  const nGain = ac.createGain();
  nGain.gain.value = 0.8;
  nSrc.connect(nGain);
  nGain.connect(ac.destination);
  nSrc.start();
}

export function resumeAudio() {
  ctx?.resume();
}

// ── Sporadic horror ambience ─────────────────────────────────────────────────
// Silence → insect burst → short silence → creak → long silence → repeat
let ambientActive = false;

function playOnce(src: string, vol: number) {
  const a = new Audio(src);
  a.volume = vol;
  a.play().catch(() => {});
}

function scheduleAmbient() {
  if (!ambientActive) return;
  const firstDelay = (22 + Math.random() * 18) * 1000; // 22–40s silence
  setTimeout(() => {
    if (!ambientActive) return;
    playOnce('/audio/insect01.mp3', 0.48 + Math.random() * 0.32);
    const secondDelay = (8 + Math.random() * 10) * 1000; // 8–18s gap
    setTimeout(() => {
      if (!ambientActive) return;
      playOnce('/audio/wood-creek01.mp3', 0.42 + Math.random() * 0.28);
      scheduleAmbient();
    }, secondDelay);
  }, firstDelay);
}

export function startAmbientSounds() {
  ambientActive = true;
  scheduleAmbient();
}

export function stopAmbientSounds() {
  ambientActive = false;
}
