import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Level } from '../game/game';
import { cellKey, sheet as buildSheet } from '../game/game';
import type { Theme } from './theme';

interface Props {
  level: Level;
  shown: Set<string>;
  hinted: Set<string>;
  cell: number;
  theme: Theme;
}

export function Sheet({ level, shown, hinted, cell, theme }: Props) {
  const cells = React.useMemo(() => buildSheet(level), [level]);
  const gap = 4;

  return (
    <View style={[styles.paper, { backgroundColor: theme.panel, borderColor: theme.edge }]}>
      {Array.from({ length: level.rows }, (_, r) => (
        <View key={r} style={[styles.row, { marginBottom: r === level.rows - 1 ? 0 : gap }]}>
          {Array.from({ length: level.cols }, (_, c) => {
            const k = cellKey(r, c);
            const here = cells.get(k);
            const mr = c === level.cols - 1 ? 0 : gap;
            if (!here) {
              return <View key={c} style={{ width: cell, height: cell, marginRight: mr }} />;
            }
            const open = shown.has(k);
            const byHint = open && hinted.has(k);
            return (
              <View
                key={c}
                style={[
                  styles.cell,
                  {
                    width: cell, height: cell, marginRight: mr,
                    backgroundColor: open ? theme.tile : theme.slot,
                    borderColor: byHint ? theme.glow : open ? theme.edge : 'transparent',
                    borderWidth: open ? 1 : 0,
                  },
                ]}
              >
                {open && (
                  <Text
                    style={[
                      styles.letter,
                      { fontSize: cell * 0.52, color: byHint ? theme.glowInk : theme.ink },
                    ]}
                  >
                    {here.letter.toUpperCase()}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { padding: 16, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: 'row' },
  cell: { borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700', includeFontPadding: false },
});
