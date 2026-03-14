import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  withWordmark?: boolean;
  size?: number;
};

export default function SeedhaPeMark({ withWordmark = true, size = 36 }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <View style={styles.inner} />
      </View>
      {withWordmark && <Text style={styles.wordmark}>seedhape</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 16,
    height: 12,
    borderRadius: 3,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#064e3b',
    backgroundColor: '#34d399',
  },
  wordmark: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
});
