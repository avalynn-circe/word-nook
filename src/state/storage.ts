import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Saved progress.
 *
 * AsyncStorage is a native module, so this is one of the changes that needs a
 * new dev client before anyone can open the app - see the rebuild rule.
 */
const KEY = 'wordnook.v1';

export interface Progress {
  level: number;
  coins: number;
  sound: boolean;
  seen: boolean;
  found: Record<number, string[]>;
  bonus: Record<number, string[]>;
  hinted: Record<number, string[]>;
}

export const emptyProgress = (): Progress => ({
  level: 0, coins: 30, sound: false, seen: false,
  found: {}, bonus: {}, hinted: {},
});

export async function load(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return { ...emptyProgress(), ...parsed };
  } catch {
    return emptyProgress();          // corrupt or unreadable - start fresh
  }
}

export async function save(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // out of space or storage unavailable; play on unsaved rather than crash
  }
}
