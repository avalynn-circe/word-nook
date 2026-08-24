/**
 * Wordnook rules and level state.
 *
 * Free of React, React Native and Expo imports on purpose, so it compiles
 * straight to CommonJS and runs in Node:
 *
 *   npm test      # compiles this, then re-derives every level through it
 *   npm run purity
 *
 * Keep it that way. It is what lets the rules be checked without a device.
 */

import rawLevels from './levels.json';
import rawWords from './dictionary.json';

export type Dir = 'H' | 'V';

export interface PlacedWord {
  word: string;
  row: number;
  col: number;
  dir: Dir;
}

export interface Level {
  index: number;
  letters: string[];
  rows: number;
  cols: number;
  words: PlacedWord[];
}

export const DICTIONARY: ReadonlySet<string> = new Set(rawWords as string[]);

export const LEVELS: Level[] = (rawLevels as any[]).map(l => ({
  index: l.i,
  letters: (l.letters as string).split(''),
  rows: l.rows,
  cols: l.cols,
  words: l.words as PlacedWord[],
}));

export const LEVEL_COUNT = LEVELS.length;

/** Where a word's letters land on the sheet. */
export function cellsOf(w: PlacedWord): Array<{ row: number; col: number; letter: string }> {
  const dr = w.dir === 'V' ? 1 : 0;
  const dc = w.dir === 'H' ? 1 : 0;
  return w.word.split('').map((letter, i) => ({
    row: w.row + dr * i,
    col: w.col + dc * i,
    letter,
  }));
}

export const cellKey = (row: number, col: number) => `${row},${col}`;

export interface SheetCell {
  letter: string;
  words: string[];
}

/** Every filled square on the sheet, keyed "row,col". */
export function sheet(level: Level): Map<string, SheetCell> {
  const out = new Map<string, SheetCell>();
  for (const w of level.words) {
    for (const c of cellsOf(w)) {
      const k = cellKey(c.row, c.col);
      const cur = out.get(k);
      if (cur) cur.words.push(w.word);
      else out.set(k, { letter: c.letter, words: [w.word] });
    }
  }
  return out;
}

/** Can `word` be spelt from `letters`, using each tile at most once? */
export function buildable(word: string, letters: string[]): boolean {
  const pool = new Map<string, number>();
  for (const ch of letters) pool.set(ch, (pool.get(ch) ?? 0) + 1);
  for (const ch of word) {
    const n = pool.get(ch) ?? 0;
    if (n === 0) return false;
    pool.set(ch, n - 1);
  }
  return true;
}

export type Verdict =
  | { kind: 'tooShort' }
  | { kind: 'notAWord' }
  | { kind: 'already' }
  | { kind: 'onSheet'; word: string; coins: number }
  | { kind: 'bonus'; word: string; coins: number };

export const MIN_LENGTH = 3;
export const BONUS_COINS = 2;

/**
 * Judge a word the player has spelt. `found` is the sheet words already
 * solved; `bonus` the bonus words already banked.
 */
export function judge(
  level: Level,
  word: string,
  found: ReadonlySet<string>,
  bonus: ReadonlySet<string>,
): Verdict {
  if (word.length < MIN_LENGTH) return { kind: 'tooShort' };
  const onSheet = level.words.some(w => w.word === word);
  if (onSheet && !found.has(word)) {
    return { kind: 'onSheet', word, coins: word.length };
  }
  if (onSheet || bonus.has(word)) return { kind: 'already' };
  if (DICTIONARY.has(word) && buildable(word, level.letters)) {
    return { kind: 'bonus', word, coins: BONUS_COINS };
  }
  return { kind: 'notAWord' };
}

export const isComplete = (level: Level, found: ReadonlySet<string>) =>
  level.words.every(w => found.has(w.word));

/** Squares to reveal, given the sheet words solved and any hinted squares. */
export function revealed(
  level: Level,
  found: ReadonlySet<string>,
  hinted: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>(hinted);
  for (const w of level.words) {
    if (!found.has(w.word)) continue;
    for (const c of cellsOf(w)) out.add(cellKey(c.row, c.col));
  }
  return out;
}

/** A square a hint could usefully uncover. */
export function hintTargets(
  level: Level,
  found: ReadonlySet<string>,
  hinted: ReadonlySet<string>,
): string[] {
  const shown = revealed(level, found, hinted);
  const out: string[] = [];
  for (const w of level.words) {
    if (found.has(w.word)) continue;
    for (const c of cellsOf(w)) {
      const k = cellKey(c.row, c.col);
      if (!shown.has(k) && !out.includes(k)) out.push(k);
    }
  }
  return out;
}

/** Every dictionary word this letter set can make. Used to size the jar. */
export function allBonusWords(level: Level): string[] {
  const onSheet = new Set(level.words.map(w => w.word));
  const out: string[] = [];
  for (const w of DICTIONARY) {
    if (!onSheet.has(w) && buildable(w, level.letters)) out.push(w);
  }
  return out.sort();
}

export function shuffled<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
