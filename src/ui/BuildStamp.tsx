import React from 'react';
import { Text, StyleSheet } from 'react-native';
import type { Theme } from './theme';
import { BUILD } from '../build';

/**
 * Small, dim, always on screen. Your workflow doc calls this the single most
 * valuable thing you added - a fix that is correct in source looks broken when
 * the device is running a different bundle, and nothing else in the UI says
 * which bundle that is. Do not move it behind a tab.
 */
export function BuildStamp({ theme }: { theme: Theme }) {
  return <Text style={[styles.text, { color: theme.faint }]}>{BUILD}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.6,
    paddingBottom: 2,
    fontVariant: ['tabular-nums'],
  },
});
