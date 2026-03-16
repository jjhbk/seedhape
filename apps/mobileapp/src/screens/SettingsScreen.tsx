import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, ActivityIndicator,
} from 'react-native';

import { UPI_APP_PACKAGES } from '../shared';
import { getMerchantProfile, clearApiKey } from '../services/api';
import Config from '../config';
import { C } from '../theme';

const API_URL = Config.API_URL;

const MONITORED_APPS = [
  { key: UPI_APP_PACKAGES.PHONEPE,    label: 'PhonePe',     icon: 'PP' },
  { key: UPI_APP_PACKAGES.GPAY,       label: 'Google Pay',  icon: 'GP' },
  { key: UPI_APP_PACKAGES.PAYTM,      label: 'Paytm',       icon: 'PT' },
  { key: UPI_APP_PACKAGES.BHIM,       label: 'BHIM UPI',    icon: 'BH' },
  { key: UPI_APP_PACKAGES.AMAZON_PAY, label: 'Amazon Pay',  icon: 'AP' },
  { key: UPI_APP_PACKAGES.CRED,       label: 'CRED',        icon: 'CR' },
];

type Profile = {
  businessName: string;
  upiId: string | null;
  webhookUrl: string | null;
  settings: { notificationApps?: string[] } | null;
};

type Props = { apiKey: string; onSignOut: () => void };

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function FieldBlock({ children }: { children: React.ReactNode }) {
  return <View style={styles.fieldBlock}>{children}</View>;
}

export default function SettingsScreen({ apiKey, onSignOut }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enabledApps, setEnabledApps] = useState<Set<string>>(
    new Set(Object.values(UPI_APP_PACKAGES)),
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setSaveSuccess(false);
    try {
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
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 8000);
      } else {
        Alert.alert('Error', 'Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
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
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          await clearApiKey();
          onSignOut();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>

      {/* Account card */}
      <SectionLabel label="Account" />
      <FieldBlock>
        <Text style={styles.accountName}>{profile?.businessName ?? '—'}</Text>
        <Text style={styles.apiKeyMask}>
          {apiKey.slice(0, 14)}{'•'.repeat(10)}
        </Text>
      </FieldBlock>

      {/* Business profile */}
      <SectionLabel label="Business Profile" />
      <FieldBlock>
        <Text style={styles.fieldLabel}>Business Name</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Your Store Name"
          placeholderTextColor={C.textMuted}
        />
        <View style={styles.divider} />
        <Text style={styles.fieldLabel}>UPI ID</Text>
        <TextInput
          style={[styles.input, styles.mono]}
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@ybl"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.hint}>Money flows directly to this UPI ID — no SeedhaPe cut.</Text>
      </FieldBlock>

      {/* Webhook */}
      <SectionLabel label="Webhook" />
      <FieldBlock>
        <Text style={styles.fieldLabel}>Webhook URL</Text>
        <TextInput
          style={styles.input}
          value={webhookUrl}
          onChangeText={setWebhookUrl}
          placeholder="https://yourapp.com/webhooks/seedhape"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text style={styles.hint}>We POST here when a payment is verified or expires.</Text>
      </FieldBlock>

      {/* UPI Apps */}
      <SectionLabel label="Monitored UPI Apps" />
      <FieldBlock>
        {MONITORED_APPS.map(({ key, label, icon }, idx) => (
          <View key={key} style={[styles.switchRow, idx < MONITORED_APPS.length - 1 && styles.switchBorder]}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>{icon}</Text>
            </View>
            <Text style={styles.switchLabel}>{label}</Text>
            <Switch
              value={enabledApps.has(key)}
              onValueChange={() => toggleApp(key)}
              trackColor={{ false: C.surfaceHigh, true: C.greenDim }}
              thumbColor={enabledApps.has(key) ? C.greenBright : C.textMuted}
            />
          </View>
        ))}
      </FieldBlock>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, saveSuccess && styles.saveBtnSuccess]}
        onPress={save}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={C.text} />
        ) : (
          <Text style={styles.saveBtnText}>{saveSuccess ? '✓ Saved' : 'Save Changes'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
        <Text style={styles.signOutText}>Disconnect Device</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginHorizontal: 20, marginTop: 24, marginBottom: 8,
  },
  fieldBlock: {
    marginHorizontal: 16,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.borderDim, padding: 16,
  },
  divider: { height: 1, backgroundColor: C.borderDim, marginVertical: 14 },

  accountName: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6 },
  apiKeyMask: { fontFamily: 'monospace', fontSize: 12, color: C.textMuted },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 8 },
  input: {
    backgroundColor: C.surfaceHigh, borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: C.text,
  },
  mono: { fontFamily: 'monospace' },
  hint: { fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 16 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  switchBorder: { borderBottomWidth: 1, borderBottomColor: C.borderDim },
  appIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: C.surfaceHigh,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  appIconText: { fontSize: 10, fontWeight: '800', color: C.textSub },
  switchLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },

  saveBtn: {
    marginHorizontal: 16, marginTop: 24,
    backgroundColor: C.greenDim, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1, borderColor: C.greenBorder,
  },
  saveBtnSuccess: { backgroundColor: C.greenSurface },
  saveBtnText: { color: C.text, fontWeight: '700', fontSize: 15 },

  signOutBtn: { marginHorizontal: 16, marginTop: 12, paddingVertical: 15, alignItems: 'center' },
  signOutText: { color: C.red, fontWeight: '600', fontSize: 14 },
});
