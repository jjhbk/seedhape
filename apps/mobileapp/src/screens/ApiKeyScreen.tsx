import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';

import Config from '../config';
import { verifyApiKey, saveApiKey } from '../services/api';

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
    onSuccess(trimmed);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>💸</Text>
        <Text style={styles.title}>SeedhaPe</Text>
        <Text style={styles.subtitle}>Paste your API key from the web dashboard to connect this device.</Text>

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
          Find your API key at:{'\n'}Dashboard → Settings → API Keys
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
    color: '#111', backgroundColor: '#fff', fontFamily: 'monospace', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
