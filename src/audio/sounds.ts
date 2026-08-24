import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Sound, backed by files rendered ahead of time by tools/render-audio.js.
 *
 * The browser build synthesised these live in WebAudio. React Native has no
 * WebAudio, and expo-audio plays files rather than generating them, so the
 * synthesis moved offline and this just plays the results.
 *
 * Players are created once and replayed by seeking to zero - creating one per
 * tap would leak, and letter picks fire several times a second.
 */
const BLIPS = [
  require('../../assets/audio/blip0.wav'),
  require('../../assets/audio/blip1.wav'),
  require('../../assets/audio/blip2.wav'),
  require('../../assets/audio/blip3.wav'),
  require('../../assets/audio/blip4.wav'),
  require('../../assets/audio/blip5.wav'),
  require('../../assets/audio/blip6.wav'),
  require('../../assets/audio/blip7.wav'),
];
const GOOD = require('../../assets/audio/good.wav');
const BAD = require('../../assets/audio/bad.wav');
const WIN = require('../../assets/audio/win.wav');
const PAD = require('../../assets/audio/pad.wav');

let blips: AudioPlayer[] = [];
let good: AudioPlayer | null = null;
let bad: AudioPlayer | null = null;
let winner: AudioPlayer | null = null;
let pad: AudioPlayer | null = null;
let ready = false;
let enabled = false;

export async function prepare(): Promise<void> {
  if (ready) return;
  try {
    // keep playing when the ringer is silent - this is background texture,
    // not a notification
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    blips = BLIPS.map(src => createAudioPlayer(src));
    good = createAudioPlayer(GOOD);
    bad = createAudioPlayer(BAD);
    winner = createAudioPlayer(WIN);
    pad = createAudioPlayer(PAD);
    pad.loop = true;
    pad.volume = 0.5;
    ready = true;
  } catch (e) {
    // never let a missing codec take the game down with it
    ready = false;
  }
}

const fire = (p: AudioPlayer | null) => {
  if (!enabled || !p) return;
  try { p.seekTo(0); p.play(); } catch {}
};

export const isEnabled = () => enabled;

export async function setEnabled(on: boolean): Promise<void> {
  enabled = on;
  if (on) {
    await prepare();
    try { pad?.play(); } catch {}
  } else {
    try { pad?.pause(); } catch {}
  }
}

export const blip = (step: number) => fire(blips[Math.min(step, blips.length - 1)] ?? null);
export const chimeGood = () => fire(good);
export const chimeBad = () => fire(bad);

/**
 * Finishing a sheet. Ducks the loop under the chime rather than talking over
 * it, then brings it back - the celebration is the point for those 3 seconds.
 */
export function chimeWin(): void {
  if (!enabled) return;
  try {
    if (pad) pad.volume = 0.18;
    fire(winner);
    setTimeout(() => { try { if (pad) pad.volume = 0.5; } catch {} }, 3200);
  } catch {}
}

export function release(): void {
  for (const p of [...blips, good, bad, winner, pad]) {
    try { p?.remove(); } catch {}
  }
  blips = []; good = bad = winner = pad = null; ready = false;
}
