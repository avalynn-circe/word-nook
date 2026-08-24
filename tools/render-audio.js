/**
 * Render the game's sounds to WAV files.
 *
 * The browser version synthesised these live in WebAudio. React Native has no
 * WebAudio - expo-audio plays files, it does not synthesise - so the same DSP
 * is reimplemented here and rendered ahead of time. The tuning is carried over
 * unchanged; only where the samples come from has moved.
 *
 *   node tools/render-audio.js
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;                       // plenty for a mellow pad and blips
const OUT = path.join(__dirname, '..', 'assets', 'audio');

const midi = m => 440 * Math.pow(2, (m - 69) / 12);

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);               // PCM
  buf.writeUInt16LE(1, 22);               // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0.99 ? 0.99 / peak : 1;   // guard against clipping
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * gain * 32767))), 44 + i * 2);
  }
  const p = path.join(OUT, name);
  fs.writeFileSync(p, buf);
  return { name, seconds: (n / RATE).toFixed(2), kb: (buf.length / 1024).toFixed(0) };
}

/** Bring a buffer up to a sensible level. The browser applied a master gain
    after these voices; a rendered file has to carry its own. */
function normalize(buf, target) {
  let peak = 0;
  for (const v of buf) {
    if (!Number.isFinite(v)) throw new Error('NaN or Infinity in the buffer');
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak < 1e-6) throw new Error('refusing to write a silent file');
  const g = target / peak;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

/** One-pole lowpass, standing in for the browser's biquad. */
function lowpass(buf, cutoff) {
  const dt = 1 / RATE, rc = 1 / (2 * Math.PI * cutoff), a = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < buf.length; i++) { prev += a * (buf[i] - prev); buf[i] = prev; }
  return buf;
}
function highpass(buf, cutoff) {
  const dt = 1 / RATE, rc = 1 / (2 * Math.PI * cutoff), a = rc / (rc + dt);
  let prevIn = 0, prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    const out = a * (prevOut + buf[i] - prevIn);
    prevIn = buf[i]; prevOut = out; buf[i] = out;
  }
  return buf;
}

/* ---- the four-chord loop, with tape crackle underneath -------------------
   Same voicings and 3.6s spacing as the browser build.                     */
function pad() {
  const CHORDS = [[45,52,55,59,64],[41,48,52,57,60],[43,50,53,59,62],[40,47,52,55,59]];
  const step = 3.6, total = step * CHORDS.length;
  const n = Math.ceil(total * RATE);
  const buf = new Float32Array(n);

  CHORDS.forEach((notes, ci) => {
    const start = Math.floor(ci * step * RATE);
    const dur = 4.2;
    const len = Math.min(Math.ceil(dur * RATE), n * 2);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      // slow swell in, long tail out - matches the browser envelope
      // clamp BEFORE the pow: a negative base with a fractional exponent is
      // NaN, and Math.max(0, NaN) is NaN, so the guard below would not catch it
      const decay = Math.max(0, 1 - (t - 1.1) / 2.8);
      const env = t < 1.1 ? Math.pow(t / 1.1, 1.6) : Math.pow(decay, 1.8);
      if (!(env > 0)) continue;
      let s = 0;
      notes.forEach((note, k) => {
        const f = midi(note) * (1 + (k % 2 ? 0.0035 : -0.003));
        const amp = k === 0 ? 0.9 : 0.42 / Math.sqrt(k + 1);
        // triangle for the upper voices, sine for the root
        const ph = (f * t) % 1;
        const wave = k === 0 ? Math.sin(2 * Math.PI * f * t)
                             : 2 * Math.abs(2 * ph - 1) - 1;
        s += wave * amp;
      });
      buf[(start + i) % n] += s * env * 0.05;
    }
  });
  lowpass(buf, 900);

  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    noise[i] = (Math.random() * 2 - 1) * 0.06;
    if (Math.random() < 0.0004) noise[i] += (Math.random() * 2 - 1) * 0.6;
  }
  highpass(noise, 1400);
  for (let i = 0; i < n; i++) buf[i] += noise[i] * 0.16;

  // taper the seam so the loop does not click
  const fade = Math.floor(0.05 * RATE);
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    buf[i] *= g;
    buf[n - 1 - i] *= g;
  }
  return normalize(buf, 0.5);
}

/** Short pitched tick as a letter is picked up. */
function blip(step) {
  const scale = [0, 3, 5, 7, 10, 12, 15, 17];
  const f = midi(69 + scale[Math.min(step, scale.length - 1)]);
  const dur = 0.32, n = Math.ceil(dur * RATE);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = t < 0.012 ? t / 0.012 : Math.exp(-(t - 0.012) * 16);
    buf[i] = Math.sin(2 * Math.PI * f * t) * env;
  }
  return normalize(buf, 0.55);
}

/** Rising three-note chime on a good word; falling two-note on a dud. */
function chime(up) {
  const seq = up ? [72, 76, 79] : [67, 64];
  const dur = up ? 0.75 : 0.55, n = Math.ceil(dur * RATE);
  const buf = new Float32Array(n);
  seq.forEach((note, k) => {
    const start = Math.floor(k * 0.09 * RATE), f = midi(note);
    for (let i = 0; i + start < n; i++) {
      const t = i / RATE;
      const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 7);
      if (t > 0.02 && env < 0.0005) break;   // only give up during the decay
      const ph = (f * t) % 1;
      buf[start + i] += (2 * Math.abs(2 * ph - 1) - 1) * env * 0.42;
    }
  });
  return normalize(buf, 0.7);
}


/* ---- finishing a sheet ---------------------------------------------------
   A rising figure on the A minor pentatonic, the same world the pad lives in,
   landing on a sustained Am9 with a long shimmer. Bell-ish rather than a
   fanfare - this game is meant to be quiet.                                */
function bellTone(buf, startSec, note, gain, decay) {
  const f = midi(note);
  const start = Math.floor(startSec * RATE);
  // real bells have inharmonic partials, and the high ones die first
  const partials = [
    { mul: 1.0,  amp: 1.00, decay: decay },
    { mul: 2.01, amp: 0.48, decay: decay * 1.7 },
    { mul: 2.99, amp: 0.26, decay: decay * 2.4 },
    { mul: 4.24, amp: 0.13, decay: decay * 3.4 },
  ];
  for (let i = 0; start + i < buf.length; i++) {
    const t = i / RATE;
    const attack = t < 0.008 ? t / 0.008 : 1;
    let s = 0, alive = false;
    for (const p of partials) {
      const env = Math.exp(-t * p.decay);
      if (env < 0.0004) continue;
      alive = true;
      s += Math.sin(2 * Math.PI * f * p.mul * t) * p.amp * env;
    }
    if (!alive && t > 0.05) break;
    buf[start + i] += s * attack * gain;
  }
}

function win() {
  const dur = 3.2, n = Math.ceil(dur * RATE);
  const buf = new Float32Array(n);

  // the climb: A4 C5 E5 G5 A5
  const climb = [69, 72, 76, 79, 81];
  climb.forEach((note, k) => {
    bellTone(buf, k * 0.115, note, k === climb.length - 1 ? 0.5 : 0.34, 2.6);
  });

  // and the landing - an Am9 left to ring
  const chord = [57, 64, 69, 72, 76];
  chord.forEach((note, k) => {
    bellTone(buf, 0.6 + k * 0.02, note, 0.26 / Math.sqrt(k + 1), 1.1);
  });

  // a soft swell underneath so the tail has some body
  const swellStart = Math.floor(0.6 * RATE);
  for (let i = 0; swellStart + i < n; i++) {
    const t = i / RATE;
    const env = t < 0.5 ? Math.pow(t / 0.5, 1.4) : Math.max(0, Math.pow(1 - (t - 0.5) / 2.0, 1.6));
    if (!(env > 0)) continue;
    let s = 0;
    chord.forEach((note, k) => {
      s += Math.sin(2 * Math.PI * midi(note - 12) * t) * (0.5 / (k + 1));
    });
    buf[swellStart + i] += s * env * 0.16;
  }

  lowpass(buf, 5200);
  const fade = Math.floor(0.08 * RATE);
  for (let i = 0; i < fade; i++) buf[n - 1 - i] *= i / fade;
  return normalize(buf, 0.82);
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const made = [];
made.push(writeWav('pad.wav', pad()));
for (let i = 0; i < 8; i++) made.push(writeWav(`blip${i}.wav`, blip(i)));
made.push(writeWav('good.wav', chime(true)));
made.push(writeWav('bad.wav', chime(false)));
made.push(writeWav('win.wav', win()));

let total = 0;
for (const m of made) { total += Number(m.kb); console.log(`  ${m.name.padEnd(11)} ${m.seconds}s  ${m.kb} KB`); }
console.log(`${made.length} files, ${(total / 1024).toFixed(1)} MB total`);
