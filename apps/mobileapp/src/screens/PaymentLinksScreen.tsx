import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';

import { C } from '../theme';
import {
  createPaymentLink,
  getPaymentLinks,
  updatePaymentLink,
  type CreatePaymentLinkInput,
  type PaymentLinkData,
} from '../services/api';

type Props = { apiKey: string };

function toPaise(raw: string): number | undefined {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * 100);
}

export default function PaymentLinksScreen({ apiKey }: Props) {
  const [linkType, setLinkType] = useState<'REUSABLE' | 'ONE_TIME'>('REUSABLE');
  const [amountType, setAmountType] = useState<'fixed' | 'variable'>('fixed');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<PaymentLinkData | null>(null);
  const [links, setLinks] = useState<PaymentLinkData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadLinks();
  }, []);

  async function loadLinks() {
    const res = await getPaymentLinks(apiKey, 1);
    const sorted = [...res.data].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setLinks(sorted);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadLinks();
    setRefreshing(false);
  }

  async function handleCreate() {
    const effectiveAmountType = linkType === 'ONE_TIME' ? 'fixed' : amountType;
    const titleValue = title.trim();

    if (!titleValue) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    if (effectiveAmountType === 'fixed') {
      if (!toPaise(fixedAmount)) {
        Alert.alert('Validation', 'Please enter a valid fixed amount.');
        return;
      }
    }

    if (linkType === 'ONE_TIME' && customerEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
        Alert.alert('Validation', 'Enter a valid email address.');
        return;
      }
    }

    if (linkType === 'ONE_TIME' && customerPhone.trim()) {
      if (!/^[6-9]\d{9}$/.test(customerPhone.trim())) {
        Alert.alert('Validation', 'Enter a valid 10-digit Indian mobile number.');
        return;
      }
    }

    const payload: CreatePaymentLinkInput = {
      linkType,
      title: titleValue,
    };

    if (description.trim()) payload.description = description.trim();

    if (effectiveAmountType === 'fixed') {
      payload.amount = toPaise(fixedAmount);
    } else {
      const min = toPaise(minAmount);
      const max = toPaise(maxAmount);
      if (min) payload.minAmount = min;
      if (max) payload.maxAmount = max;
    }

    if (linkType === 'ONE_TIME') {
      if (customerName.trim()) payload.customerName = customerName.trim();
      if (customerEmail.trim()) payload.customerEmail = customerEmail.trim();
      if (customerPhone.trim()) payload.customerPhone = customerPhone.trim();
    }

    try {
      setSubmitting(true);
      const link = await createPaymentLink(apiKey, payload);
      setCreated(link);
      await loadLinks();
      Alert.alert('Link Created', 'Payment link is ready to share.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create payment link.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    if (!created?.shareUrl) return;
    await Share.share({
      message: created.shareUrl,
      url: created.shareUrl,
      title: 'Payment Link',
    });
  }

  async function handleToggle(link: PaymentLinkData) {
    try {
      await updatePaymentLink(apiKey, link.id, { isActive: !link.isActive });
      await loadLinks();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update link.');
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.textMuted} />}
    >
      <Text style={styles.title}>Payment Links</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, linkType === 'REUSABLE' && styles.segmentActive]}
            onPress={() => setLinkType('REUSABLE')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, linkType === 'REUSABLE' && styles.segmentTextActive]}>
              Reusable
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, linkType === 'ONE_TIME' && styles.segmentActive]}
            onPress={() => {
              setLinkType('ONE_TIME');
              setAmountType('fixed');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, linkType === 'ONE_TIME' && styles.segmentTextActive]}>
              One-time
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Invoice #1042"
          placeholderTextColor={C.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional details shown to customer"
          placeholderTextColor={C.textMuted}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        {linkType === 'REUSABLE' && (
          <>
            <Text style={styles.sectionLabel}>Amount Mode</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segment, amountType === 'fixed' && styles.segmentActive]}
                onPress={() => setAmountType('fixed')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, amountType === 'fixed' && styles.segmentTextActive]}>
                  Fixed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, amountType === 'variable' && styles.segmentActive]}
                onPress={() => setAmountType('variable')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, amountType === 'variable' && styles.segmentTextActive]}>
                  Customer Enters
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {(linkType === 'ONE_TIME' || amountType === 'fixed') ? (
          <>
            <Text style={styles.label}>Amount (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              value={fixedAmount}
              onChangeText={setFixedAmount}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Min Amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              value={minAmount}
              onChangeText={setMinAmount}
            />
            <Text style={styles.label}>Max Amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
              value={maxAmount}
              onChangeText={setMaxAmount}
            />
          </>
        )}

        {linkType === 'ONE_TIME' && (
          <>
            <Text style={styles.sectionLabel}>Customer Details (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Customer name"
              placeholderTextColor={C.textMuted}
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextInput
              style={styles.input}
              placeholder="customer@example.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={customerEmail}
              onChangeText={setCustomerEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              value={customerPhone}
              onChangeText={setCustomerPhone}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={() => void handleCreate()}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <Text style={styles.submitText}>Create Link</Text>
          )}
        </TouchableOpacity>
      </View>

      {created && (
        <View style={styles.successCard}>
          <Text style={styles.successTag}>Latest Link</Text>
          <Text style={styles.successTitle}>{created.title}</Text>
          <Text style={styles.successUrl}>{created.shareUrl}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={() => void handleShare()} activeOpacity={0.8}>
            <Text style={styles.shareText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listWrap}>
        <Text style={styles.listTitle}>Recent Links</Text>
        {links.length === 0 ? (
          <Text style={styles.emptyText}>No links created yet.</Text>
        ) : (
          links.map((link) => (
            <View key={link.id} style={styles.linkRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkName} numberOfLines={1}>{link.title}</Text>
                <Text style={styles.linkMeta}>
                  {link.linkType} · {new Date(link.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.rowShareBtn}
                onPress={() => Share.share({ message: link.shareUrl, url: link.shareUrl, title: 'Payment Link' })}
                activeOpacity={0.8}
              >
                <Text style={styles.rowShareText}>Share</Text>
              </TouchableOpacity>
              {link.linkType === 'REUSABLE' && (
                <TouchableOpacity
                  style={[styles.rowToggleBtn, link.isActive ? styles.rowDeactivateBtn : styles.rowActivateBtn]}
                  onPress={() => void handleToggle(link)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rowToggleText, link.isActive ? styles.rowDeactivateText : styles.rowActivateText]}>
                    {link.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 110 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 8,
  },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceHigh,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: C.greenBorder,
    backgroundColor: C.greenSurface,
  },
  segmentText: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  segmentTextActive: { color: C.greenBright },
  label: { fontSize: 12, fontWeight: '600', color: C.textSub, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
    marginBottom: 10,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' as const },
  submitBtn: {
    marginTop: 8,
    backgroundColor: C.greenDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: C.text, fontWeight: '700', fontSize: 15 },
  successCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.greenSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.greenBorder,
    padding: 16,
  },
  successTag: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: C.greenBright,
    fontWeight: '700',
    marginBottom: 6,
  },
  successTitle: { fontSize: 16, color: C.text, fontWeight: '700', marginBottom: 6 },
  successUrl: { fontSize: 12, color: C.textSub, lineHeight: 17 },
  shareBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceHigh,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  shareText: { color: C.text, fontWeight: '700', fontSize: 13 },
  listWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderDim,
    padding: 16,
  },
  listTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
  emptyText: { fontSize: 13, color: C.textMuted },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  linkName: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  linkMeta: { fontSize: 12, color: C.textMuted },
  rowShareBtn: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowShareText: { fontSize: 12, color: C.text, fontWeight: '700' },
  rowToggleBtn: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowDeactivateBtn: { borderColor: C.redBorder, backgroundColor: C.redSurface },
  rowActivateBtn: { borderColor: C.greenBorder, backgroundColor: C.greenSurface },
  rowToggleText: { fontSize: 12, fontWeight: '700' },
  rowDeactivateText: { color: C.red },
  rowActivateText: { color: C.greenBright },
});
