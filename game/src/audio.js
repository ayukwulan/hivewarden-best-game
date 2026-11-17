// Synthesised WebAudio for HIVEWARDEN: no sound files, every effect is a
// short oscillator or noise burst built at runtime. M toggles mute.
let audioCtx = null;
let muted = false;
let humNodes = null;

export function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    // A soft bee hum underneath everything while playing.
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 190;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.012;
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 11;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    lfo.start();
    humNodes = { osc, gain, lfo };
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (humNodes) humNodes.gain.gain.value = muted ? 0 : 0.012;
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (!audioCtx || muted) return;
  try {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {}
}

function noise(dur, vol, lowpass) {
  if (!audioCtx || muted) return;
  try {
    const t0 = audioCtx.currentTime;
    const len = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol || 0.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(t0);
  } catch {}
}

/** Play one game event. Unknown events are silent. */
export function playEvent(event) {
  if (!audioCtx || muted) return;
  switch (event.type) {
    case 'click': tone(660, 0.07, 'triangle', 0.07); break;
    case 'sting': noise(0.09, 0.12, 3200); break;
    case 'sting-hit': tone(220, 0.08, 'square', 0.06, 110); break;
    case 'kill': tone(520, 0.12, 'triangle', 0.09, 780); break;
    case 'nectar': tone(880, 0.1, 'sine', 0.07, 1320); break;
    case 'honey': tone(740, 0.16, 'sine', 0.09, 1100); tone(1108, 0.16, 'sine', 0.05, 1500); break;
    case 'swarm': tone(440, 0.2, 'sawtooth', 0.05, 660); break;
    case 'wall': tone(300, 0.12, 'triangle', 0.08, 240); break;
    case 'burst': noise(0.25, 0.14, 900); tone(180, 0.25, 'sine', 0.08, 60); break;
    case 'guard': tone(520, 0.3, 'sine', 0.08, 780); break;
    case 'hive-chew': noise(0.12, 0.1, 500); tone(140, 0.12, 'square', 0.05, 90); break;
    case 'bee-stung': tone(320, 0.18, 'sawtooth', 0.09, 120); break;
    case 'day-clear': tone(523, 0.14, 'triangle', 0.09); setTimeout(() => tone(659, 0.14, 'triangle', 0.09), 120); setTimeout(() => tone(784, 0.22, 'triangle', 0.09), 240); break;
    case 'queen': tone(98, 0.5, 'sawtooth', 0.12, 65); noise(0.4, 0.08, 400); break;
    case 'queen-call': tone(196, 0.15, 'sawtooth', 0.06, 130); break;
    case 'queen-down': tone(523, 0.2, 'triangle', 0.1); setTimeout(() => tone(659, 0.2, 'triangle', 0.1), 150); setTimeout(() => tone(784, 0.2, 'triangle', 0.1), 300); setTimeout(() => tone(1046, 0.4, 'triangle', 0.1), 450); break;
    case 'hive-down': tone(220, 0.6, 'sawtooth', 0.12, 55); break;
    case 'wall-chew': noise(0.08, 0.07, 700); break;
    case 'wall-down': noise(0.2, 0.1, 600); break;
    case 'guard-block': tone(1200, 0.06, 'sine', 0.05); break;
    default: break;
  }
}
