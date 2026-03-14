import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';

import Config from '../config';
import SeedhaPeMark from '../components/SeedhaPeMark';
import {
  verifyApiKey,
  saveApiKey,
  isForegroundNotificationEnabled,
  openAppNotificationSettings,
} from '../services/api';

type Props = { onSuccess: (apiKey: string) => void };

export default function ApiKeyScreen({ onSuccess }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

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
        'Enable app notifications',
        'Background sync notification is hidden because app notifications are disabled. Please enable notifications for seedhape.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppNotificationSettings() },
        ],
      );
    }
    onSuccess(trimmed);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.hero}>
          <SeedhaPeMark />
          <Text style={styles.title}>Turn this phone into your payment verifier</Text>
          <Text style={styles.subtitle}>Paste your API key from the dashboard to connect and start auto-verification.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder="sp_live_..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.btn, (!key.trim() || loading) && styles.btnDisabled]}
            onPress={handleConnect}
            disabled={!key.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Connect Device</Text>}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Dashboard → Settings → API Keys
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  inner: { paddingHorizontal: 20, paddingTop: 72, paddingBottom: 28, gap: 18 },
  hero: { paddingHorizontal: 8, gap: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', lineHeight: 34 },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 22, maxWidth: 320 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 18,
    shadowColor: '#052e16',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 0.4, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
    color: '#111', backgroundColor: '#f9fffb', fontFamily: 'monospace', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
