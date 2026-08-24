import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LEVELS, LEVEL_COUNT, judge, isComplete, revealed, hintTargets,
  sheet, shuffled, cellKey, type Level, type Verdict,
} from '../game/game';
import { emptyProgress, load, save, type Progress } from './storage';
import * as Sound from '../audio/sounds';

export const HINT_COST = 15;

export interface GameState {
  level: Level;
  levelIndex: number;
  wheel: string[];
  selection: number[];
  word: string;
  found: Set<string>;
  bonus: Set<string>;
  hinted: Set<string>;
  shown: Set<string>;
  coins: number;
  complete: boolean;
  lastVerdict: Verdict | null;
  sound: boolean;
  loaded: boolean;
}

export function useGame() {
  const progress = useRef<Progress>(emptyProgress());
  const [levelIndex, setLevelIndex] = useState(0);
  const [wheel, setWheel] = useState<string[]>(() => shuffled(LEVELS[0].letters));
  const [selection, setSelection] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [bonus, setBonus] = useState<Set<string>>(new Set());
  const [hinted, setHinted] = useState<Set<string>>(new Set());
  const [coins, setCoins] = useState(30);
  const [lastVerdict, setVerdict] = useState<Verdict | null>(null);
  const [sound, setSoundOn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const p = await load();
      if (!live) return;
      progress.current = p;
      const n = Math.min(Math.max(p.level, 0), LEVEL_COUNT - 1);
      setLevelIndex(n);
      setWheel(shuffled(LEVELS[n].letters));
      setFound(new Set(p.found[n] ?? []));
      setBonus(new Set(p.bonus[n] ?? []));
      setHinted(new Set(p.hinted[n] ?? []));
      setCoins(p.coins);
      setSoundOn(p.sound);
      if (p.sound) void Sound.setEnabled(true);
      setLoaded(true);
    })();
    return () => { live = false; };
  }, []);

  const level = LEVELS[levelIndex];
  const word = selection.map(i => wheel[i]).join('');
  const shown = useMemo(
    () => revealed(level, found, hinted), [level, found, hinted]);
  const complete = useMemo(() => isComplete(level, found), [level, found]);
  const cells = useMemo(() => sheet(level), [level]);

  const persist = useCallback((patch: Partial<Progress>) => {
    progress.current = { ...progress.current, ...patch };
    void save(progress.current);
  }, []);

  // coins live outside the per-level maps, so save them whenever they move
  useEffect(() => {
    if (!loaded) return;
    persist({ coins });
  }, [coins, loaded, persist]);

  const pick = useCallback((i: number) => {
    setSelection(sel => {
      if (sel.includes(i)) return sel;
      Sound.blip(sel.length);
      return [...sel, i];
    });
  }, []);

  const back = useCallback(() => setSelection(sel => sel.slice(0, -1)), []);
  const clear = useCallback(() => setSelection([]), []);

  const submit = useCallback(() => {
    const w = selection.map(i => wheel[i]).join('');
    const v = judge(level, w, found, bonus);
    setVerdict(v);
    if (v.kind === 'notAWord' || v.kind === 'tooShort') Sound.chimeBad();
    if (v.kind === 'onSheet') {
      const next = new Set(found); next.add(v.word);
      // the word that finishes the sheet gets the celebration, not the usual tick
      if (isComplete(level, next)) Sound.chimeWin();
      else Sound.chimeGood();
      setFound(next); setCoins(c => c + v.coins);
      persist({ found: { ...progress.current.found, [levelIndex]: [...next] } });
    } else if (v.kind === 'bonus') {
      Sound.chimeGood();
      const next = new Set(bonus); next.add(v.word);
      setBonus(next); setCoins(c => c + v.coins);
      persist({ bonus: { ...progress.current.bonus, [levelIndex]: [...next] } });
    }
    setSelection([]);
    return v;
  }, [selection, wheel, level, found, bonus, levelIndex, persist]);

  const shuffle = useCallback(() => {
    setSelection([]);
    setWheel(w => shuffled(w));
  }, []);

  const hint = useCallback(() => {
    if (coins < HINT_COST) return false;
    const targets = hintTargets(level, found, hinted);
    if (!targets.length) return false;
    const k = targets[Math.floor(Math.random() * targets.length)];
    const next = new Set(hinted); next.add(k);
    setHinted(next);
    setCoins(c => c - HINT_COST);
    persist({ hinted: { ...progress.current.hinted, [levelIndex]: [...next] } });
    return true;
  }, [coins, level, found, hinted, levelIndex, persist]);

  const toggleSound = useCallback(() => {
    const next = !sound;
    setSoundOn(next);
    void Sound.setEnabled(next);
    persist({ sound: next });
    return next;
  }, [sound, persist]);

  const goTo = useCallback((i: number) => {
    const n = ((i % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT;
    setLevelIndex(n);
    setWheel(shuffled(LEVELS[n].letters));
    setSelection([]);
    setVerdict(null);
    const p = progress.current;
    setFound(new Set(p.found[n] ?? []));
    setBonus(new Set(p.bonus[n] ?? []));
    setHinted(new Set(p.hinted[n] ?? []));
    persist({ level: n });
  }, [persist]);

  return {
    state: { level, levelIndex, wheel, selection, word, found, bonus, hinted,
             shown, coins, complete, lastVerdict, sound, loaded } as GameState,
    cells,
    cellKey,
    actions: { pick, back, clear, submit, shuffle, hint, goTo, toggleSound,
               next: () => goTo(levelIndex + 1) },
  };
}
