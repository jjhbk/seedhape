import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';

import { UPI_APP_PACKAGES } from '../shared.js';
import { getMerchantProfile, clearApiKey } from '../services/api.js';
import Config from '../config.js';

const API_URL = Config.API_URL;

const MONITORED_APPS = [
  { key: UPI_APP_PACKAGES.PHONEPE,     label: 'PhonePe' },
  { key: UPI_APP_PACKAGES.GPAY,        label: 'Google Pay' },
  { key: UPI_APP_PACKAGES.PAYTM,       label: 'Paytm' },
  { key: UPI_APP_PACKAGES.BHIM,        label: 'BHIM UPI' },
  { key: UPI_APP_PACKAGES.AMAZON_PAY,  label: 'Amazon Pay' },
  { key: UPI_APP_PACKAGES.CRED,        label: 'CRED' },
];

type Profile = {
  businessName: string;
  upiId: string | null;
  webhookUrl: string | null;
  settings: { notificationApps?: string[] } | null;
};

type Props = { apiKey: string; onSignOut: () => void };

export default function SettingsScreen({ apiKey, onSignOut }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabledApps, setEnabledApps] = useState<Set<string>>(
    new Set(Object.values(UPI_APP_PACKAGES)),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const data = await getMerchantProfile(apiKey) as Profile | null;
    if (data) {
      setProfile(data);
      setBusinessName(data.businessName);
      setUpiId(data.upiId ?? '');
      setWebhookUrl(data.webhookUrl ?? '');
      if (data.settings?.notificationApps) {
        setEnabledApps(new Set(data.settings.notificationApps));
      }
    }
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`${API_URL}/v1/merchant/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        upiId: upiId || undefined,
        webhookUrl: webhookUrl || null,
        settings: { notificationApps: Array.from(enabledApps) },
      }),
    });
    setSaving(false);
    Alert.alert(res.ok ? 'Saved' : 'Error', res.ok ? 'Settings updated.' : 'Failed to save.');
  }

  function toggleApp(pkg: string) {
    setEnabledApps(prev => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg); else next.add(pkg);
      return next;
    });
  }

  function handleSignOut() {
    Alert.alert('Disconnect Device', 'This will remove your API key from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: async () => {
        await clearApiKey();
        onSignOut();
      }},
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{profile?.businessName ?? '—'}</Text>
          <Text style={[styles.email, { fontFamily: 'monospace', fontSize: 11, color: '#9ca3af', marginTop: 4 }]}>
            {apiKey.slice(0, 16)}{'•'.repeat(8)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Your Store Name" />
          <Text style={[styles.label, { marginTop: 12 }]}>UPI ID</Text>
          <TextInput
            style={[styles.input, styles.mono]} value={upiId} onChangeText={setUpiId}
            placeholder="yourname@ybl" autoCapitalize="none" keyboardType="email-address"
          />
          <Text style={styles.hint}>Money is sent directly to this UPI ID — no SeedhaPe cut.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Webhook</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Webhook URL</Text>
          <TextInput
            style={styles.input} value={webhookUrl} onChangeText={setWebhookUrl}
            placeholder="https://yourapp.com/webhooks/seedhape"
            autoCapitalize="none" keyboardType="url"
          />
          <Text style={styles.hint}>We POST here when a payment is verified or expires.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monitored UPI Apps</Text>
        <View style={styles.card}>
          {MONITORED_APPS.map(({ key, label }) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Switch
                value={enabledApps.has(key)}
                onValueChange={() => toggleApp(key)}
                trackColor={{ true: '#16a34a' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Disconnect Device</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  email: { fontSize: 14, color: '#374151' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111' },
  mono: { fontFamily: 'monospace' },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  switchLabel: { fontSize: 14, color: '#374151' },
  saveBtn: { marginHorizontal: 16, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signOutBtn: { marginHorizontal: 16, marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
});
