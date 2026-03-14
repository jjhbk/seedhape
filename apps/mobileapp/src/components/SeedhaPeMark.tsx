import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { C } from '../theme';

type Props = {
  withWordmark?: boolean;
  size?: number;
};

export default function SeedhaPeMark({ withWordmark = true, size = 36 }: Props) {
  const r = size * 0.27;
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}>
        {/* Left leaf */}
        <View style={[styles.leafLeft, { width: r, height: r, borderTopRightRadius: r, borderBottomLeftRadius: r, top: size * 0.22, left: size * 0.2 }]} />
        {/* Right leaf */}
        <View style={[styles.leafRight, { width: r, height: r, borderTopLeftRadius: r, borderBottomRightRadius: r, top: size * 0.22, right: size * 0.2 }]} />
        {/* Stem */}
        <View style={[styles.stem, { width: size * 0.08, height: size * 0.36, bottom: size * 0.14, borderRadius: size * 0.04 }]} />
      </View>
      {withWordmark && <Text style={styles.wordmark}>seedhape</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: {
    backgroundColor: C.greenSurface,
    borderWidth: 1,
    borderColor: C.greenBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leafLeft: {
    position: 'absolute',
    backgroundColor: C.green,
    transform: [{ rotate: '-35deg' }],
  },
  leafRight: {
    position: 'absolute',
    backgroundColor: C.greenBright,
    transform: [{ rotate: '35deg' }],
  },
  stem: {
    position: 'absolute',
    backgroundColor: C.green,
  },
  wordmark: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
});
