import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';

import Config from '../config';
import {
  verifyApiKey,
  saveApiKey,
  isForegroundNotificationEnabled,
  openAppNotificationSettings,
} from '../services/api';
import { C } from '../theme';

type Props = { onSuccess: (apiKey: string) => void };

export default function ApiKeyScreen({ onSuccess }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleConnect() {
    const trimmed = key.trim();
    if (!trimmed.startsWith('sp_live_') && !trimmed.startsWith('sp_test_')) {
      Alert.alert('Invalid key', 'API key must start with sp_live_ or sp_test_');
      return;
    }

    setLoading(true);
    let profile: Awaited<ReturnType<typeof verifyApiKey>> | null = null;
    try {
      profile = await verifyApiKey(trimmed);
    } catch {
      Alert.alert('Cannot reach server', `Check API URL and Wi-Fi connectivity.\n${Config.API_URL}`);
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!profile) {
      Alert.alert('Invalid API key', 'Could not connect to your account. Check the key and try again.');
      return;
    }

    await saveApiKey(trimmed);
    const notifEnabled = await isForegroundNotificationEnabled();
    if (!notifEnabled) {
      Alert.alert(
        'Enable notifications',
        'Allow SeedhaPe to show notifications so background sync stays active.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppNotificationSettings() },
        ],
      );
    }
    onSuccess(trimmed);
  }

  const isValid = key.trim().startsWith('sp_live_') || key.trim().startsWith('sp_test_');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <View style={styles.leafLeft} />
            <View style={styles.leafRight} />
            <View style={styles.stem} />
          </View>
        </View>

        {/* Hero text */}
        <View style={styles.hero}>
          <Text style={styles.title}>Turn this phone into your payment verifier</Text>
          <Text style={styles.subtitle}>
            Paste your API key from the dashboard to start auto-verifying UPI payments.
          </Text>
        </View>

        {/* Key card */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>API Key</Text>
          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={key}
            onChangeText={setKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="sp_live_..."
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleConnect}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.text} />
              : <Text style={styles.btnText}>Connect Device</Text>}
          </TouchableOpacity>

          <Text style={styles.hint}>Dashboard → Settings → API Keys</Text>
        </View>

        {/* How it works */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>How it works</Text>
          {[
            { n: '1', text: 'Customer pays via any UPI app' },
            { n: '2', text: 'This phone captures the notification' },
            { n: '3', text: 'Payment verified instantly — zero fees' },
          ].map(({ n, text }) => (
            <View key={n} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{n}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 40, gap: 20 },

  logoWrap: { alignItems: 'center', marginBottom: 8 },
  logoMark: {
    width: 60, height: 60, borderRadius: 17,
    backgroundColor: C.greenSurface, borderWidth: 1, borderColor: C.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  leafLeft: {
    position: 'absolute', top: 12, left: 12,
    width: 13, height: 13,
    borderTopRightRadius: 11, borderBottomLeftRadius: 11,
    backgroundColor: C.green, transform: [{ rotate: '-35deg' }],
  },
  leafRight: {
    position: 'absolute', top: 12, right: 12,
    width: 13, height: 13,
    borderTopLeftRadius: 11, borderBottomRightRadius: 11,
    backgroundColor: C.greenBright, transform: [{ rotate: '35deg' }],
  },
  stem: {
    position: 'absolute', bottom: 9, width: 3, height: 20,
    backgroundColor: C.green, borderRadius: 2,
  },

  hero: { gap: 8 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, lineHeight: 36, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: C.textSub, lineHeight: 22 },

  card: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, padding: 20, gap: 4,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: C.text,
    fontFamily: 'monospace', marginBottom: 12,
  },
  inputFocused: { borderColor: C.greenDim },
  btn: {
    backgroundColor: C.greenDim, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: C.greenBorder,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: C.text, fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  stepsCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.borderDim, padding: 20, gap: 14,
  },
  stepsTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.greenSurface, borderWidth: 1, borderColor: C.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: '800', color: C.greenBright },
  stepText: { fontSize: 13, color: C.textSub, flex: 1, lineHeight: 20 },
});
