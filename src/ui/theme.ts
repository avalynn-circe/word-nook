/** Wordnook's palette. Late-night desk under one lamp, and the same desk by day. */
export interface Theme {
  dark: boolean;
  ground: string;
  ground2: string;
  panel: string;
  slot: string;
  tile: string;
  edge: string;
  ink: string;
  dim: string;
  faint: string;
  glow: string;
  glowInk: string;
  glowWash: string;
  moss: string;
  lampCore: string;
}

export const LIGHT: Theme = {
  dark: false,
  ground: '#DCD7E3',
  ground2: '#CFC9D9',
  panel: '#F3F1F6',
  slot: '#DBD3E7',
  tile: '#FFFFFF',
  edge: '#C6BFD4',
  ink: '#241F2E',
  dim: '#6A6178',
  faint: '#9E96AC',
  glow: '#B96C21',
  glowInk: '#8A4F14',
  glowWash: 'rgba(185,108,33,0.14)',
  moss: '#3F7350',
  lampCore: 'rgba(255,214,160,0.55)',
};

export const DARK: Theme = {
  dark: true,
  ground: '#16141D',
  ground2: '#0E0D14',
  panel: '#221F2B',
  slot: '#17151F',
  tile: '#332E41',
  edge: '#373245',
  ink: '#EFE9E0',
  dim: '#9A92A8',
  faint: '#6A6379',
  glow: '#F0B47A',
  glowInk: '#F6CA9C',
  glowWash: 'rgba(240,180,122,0.12)',
  moss: '#9BC5A5',
  lampCore: 'rgba(255,197,132,0.16)',
};

/** Track names, in place of level numbers. */
export const TRACKS = [
  'rain on the fire escape', 'tape hiss, no rush', 'two sugars', 'the long way home',
  'porch light still on', 'a chair by the window', 'dust in the projector', 'slow kettle',
  'borrowed cardigan', 'snow on the antenna', 'last bus, empty', 'paper lanterns',
  'cold coffee, warm room', 'the record skips here', 'half-finished letter',
  'someone practising upstairs', 'fog off the river', 'one lamp, one book',
  'walking home in October', 'the sound of a fan', 'peaches in the sink',
  'a train two streets over', 'blue hour', 'unmatched socks', 'tuesday, nothing planned',
  'the cat found the sun', 'open window, april', 'typewriter in the attic',
  'second-hand sweater weather', 'the kettle again',
];

export const trackName = (level: number) => TRACKS[level % TRACKS.length];
export const sideLabel = (level: number) =>
  `side ${Math.floor(level / 15) % 2 ? 'b' : 'a'} · track ${(level % 15) + 1}`;
