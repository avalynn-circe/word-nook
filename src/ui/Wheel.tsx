import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native';
import type { Theme } from './theme';

interface Props {
  letters: string[];
  selection: number[];
  size: number;
  theme: Theme;
  onPick: (i: number) => void;
  onRelease: () => void;
}

/**
 * The letter wheel.
 *
 * Uses PanResponder (React Native core) rather than react-native-gesture-
 * handler, and draws the trail with rotated Views rather than react-native-svg.
 * Both alternatives are native modules, and per the rebuild rule pulling one in
 * means nobody can open the app until they install a new dev client. This runs
 * on whatever dev client they already have.
 */
export function Wheel({ letters, selection, size, theme, onPick, onRelease }: Props) {
  const keySize = Math.round(size / (letters.length > 6 ? 3.5 : 3.15));
  const radius = size / 2 - keySize / 2 - 5;

  const spots = useMemo(
    () =>
      letters.map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / letters.length;
        return { x: size / 2 + radius * Math.cos(a), y: size / 2 + radius * Math.sin(a) };
      }),
    [letters.length, size, radius],
  );

  // read in the responder without re-creating it on every selection change
  const live = useRef({ selection, spots, keySize, onPick, onRelease });
  live.current = { selection, spots, keySize, onPick, onRelease };

  const hit = (x: number, y: number) => {
    const { spots: s, keySize: k } = live.current;
    for (let i = 0; i < s.length; i++) {
      const dx = x - s[i].x, dy = y - s[i].y;
      if (dx * dx + dy * dy < (k * 0.52) ** 2) return i;
    }
    return -1;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const i = hit(e.nativeEvent.locationX, e.nativeEvent.locationY);
          if (i >= 0) live.current.onPick(i);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const i = hit(e.nativeEvent.locationX, e.nativeEvent.locationY);
          if (i >= 0) live.current.onPick(i);
        },
        onPanResponderRelease: () => live.current.onRelease(),
        onPanResponderTerminate: () => live.current.onRelease(),
      }),
    [],
  );

  return (
    <View
      style={[styles.wheel, { width: size, height: size, backgroundColor: theme.glowWash }]}
      {...responder.panHandlers}
    >
      {selection.slice(1).map((to, n) => {
        const a = spots[selection[n]], b = spots[to];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        return (
          <View
            key={n}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: a.x, top: a.y - 3,
              width: len, height: 6, borderRadius: 3,
              backgroundColor: theme.glow,
              opacity: 0.55,
              transform: [
                { translateX: 0 }, { translateY: 0 },
                { rotate: `${Math.atan2(dy, dx)}rad` },
              ],
              transformOrigin: 'left center',
            }}
          />
        );
      })}
      {letters.map((ch, i) => {
        const lit = selection.includes(i);
        return (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.key,
              {
                width: keySize, height: keySize, borderRadius: keySize / 2,
                left: spots[i].x - keySize / 2, top: spots[i].y - keySize / 2,
                backgroundColor: lit ? theme.glow : theme.panel,
                borderColor: lit ? theme.glow : theme.edge,
              },
            ]}
          >
            <Text
              style={{
                fontSize: keySize * 0.44,
                fontWeight: '700',
                color: lit ? theme.panel : theme.ink,
                includeFontPadding: false,
              }}
            >
              {ch.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: { borderRadius: 999, position: 'relative' },
  key: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
