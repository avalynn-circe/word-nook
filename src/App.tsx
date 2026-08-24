import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, useColorScheme, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useGame, HINT_COST } from './state/useGame';
import { Sheet } from './ui/Sheet';
import { Wheel } from './ui/Wheel';
import { BuildStamp } from './ui/BuildStamp';
import { DARK, LIGHT, sideLabel, trackName } from './ui/theme';

export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === 'light' ? LIGHT : DARK;
  const { width, height } = useWindowDimensions();
  const { state, actions } = useGame();
  const [flash, setFlash] = useState<'good' | 'dud' | 'dupe' | null>(null);

  const wheelSize = Math.min(300, Math.max(198, Math.min(width * 0.74, height * 0.3)));
  const boardW = Math.min(width - 28, 460) - 36;
  const cell = Math.max(22, Math.min(46,
    Math.floor((boardW - (state.level.cols - 1) * 4) / state.level.cols)));

  const release = () => {
    if (!state.selection.length) return;
    const v = actions.submit();
    const kind = v.kind === 'onSheet' || v.kind === 'bonus' ? 'good'
               : v.kind === 'already' ? 'dupe' : 'dud';
    setFlash(kind);
    setTimeout(() => setFlash(null), 420);
  };

  const bubbleColor = flash === 'good' ? theme.moss
                    : flash === 'dud' ? theme.glowInk
                    : theme.ink;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.ground }]}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />

        <View style={styles.deck}>
          <Pressable style={[styles.pill, { backgroundColor: theme.panel, borderColor: theme.edge }]}>
            <Text style={{ color: theme.ink }}>{state.levelIndex + 1}</Text>
          </Pressable>
          <View style={styles.deckMid}>
            <Text style={[styles.deckLabel, { color: theme.dim }]}>
              {sideLabel(state.levelIndex).toUpperCase()}
            </Text>
            <Text style={[styles.deckWord, { color: theme.ink }]} numberOfLines={1}>
              {trackName(state.levelIndex)}
            </Text>
            <View style={[styles.meter, { backgroundColor: theme.edge }]}>
              <View style={{
                height: 3, borderRadius: 99, backgroundColor: theme.glow,
                width: `${(100 * state.found.size) / state.level.words.length}%`,
              }} />
            </View>
          </View>
          <Pressable
            onPress={actions.toggleSound}
            accessibilityRole="switch"
            accessibilityState={{ checked: state.sound }}
            accessibilityLabel={state.sound ? 'Turn the music off' : 'Turn the music on'}
            style={[styles.pill, {
              backgroundColor: state.sound ? theme.glowWash : theme.panel,
              borderColor: state.sound ? theme.glow : theme.edge,
            }]}
          >
            <Text style={{ color: state.sound ? theme.glowInk : theme.dim }}>
              {state.sound ? '♪' : '♪̸'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Sheet
            level={state.level}
            shown={state.shown}
            hinted={state.hinted}
            cell={cell}
            theme={theme}
          />
          <View style={styles.tray}>
            <View style={[styles.pill, { backgroundColor: theme.panel, borderColor: theme.edge }]}>
              <Text style={{ color: theme.ink }}>✦ {state.bonus.size} bonus</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: theme.panel, borderColor: theme.edge }]}>
              <Text style={{ color: theme.ink }}>◍ {state.coins}</Text>
            </View>
          </View>
        </View>

        <View style={styles.lamp}>
          <View style={styles.bubbleSlot}>
            {state.word.length > 0 && (
              <View style={[styles.bubble, { backgroundColor: theme.panel, borderColor: bubbleColor }]}>
                <Text style={[styles.bubbleText, { color: bubbleColor }]}>
                  {state.word.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Wheel
            letters={state.wheel}
            selection={state.selection}
            size={wheelSize}
            theme={theme}
            onPick={actions.pick}
            onRelease={release}
          />

          <View style={styles.tools}>
            <Pressable
              onPress={actions.shuffle}
              style={[styles.pill, { backgroundColor: theme.panel, borderColor: theme.edge }]}
            >
              <Text style={{ color: theme.ink }}>↻ shuffle</Text>
            </Pressable>
            <Pressable
              onPress={actions.hint}
              style={[styles.pill, {
                backgroundColor: theme.panel,
                borderColor: state.coins >= HINT_COST ? theme.edge : theme.faint,
              }]}
            >
              <Text style={{ color: state.coins >= HINT_COST ? theme.ink : theme.faint }}>
                ✧ hint · {HINT_COST}
              </Text>
            </Pressable>
          </View>
        </View>

        <BuildStamp theme={theme} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 14 },
  deck: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  deckMid: { flex: 1, alignItems: 'center' },
  deckLabel: { fontSize: 11, letterSpacing: 1.6 },
  deckWord: { fontSize: 19, fontWeight: '700', marginTop: 1 },
  meter: { width: 160, height: 3, borderRadius: 99, marginTop: 6, overflow: 'hidden' },
  pill: {
    minHeight: 36, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  tray: { flexDirection: 'row', gap: 8 },
  lamp: { alignItems: 'center', gap: 10, paddingBottom: 4 },
  bubbleSlot: { height: 44, justifyContent: 'center' },
  bubble: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  bubbleText: { fontSize: 19, fontWeight: '700', letterSpacing: 2 },
  tools: { flexDirection: 'row', gap: 8 },
});
