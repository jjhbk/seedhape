import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView, Pressable,
} from 'react-native';

import { getTransactions } from '../services/api';
import { paiseToRupees } from '../shared';
import { C, STATUS_SCHEME } from '../theme';

type Transaction = {
  id: string;
  amount: number;
  originalAmount: number;
  status: string;
  description: string | null;
  createdAt: string;
  verifiedAt: string | null;
  utr: string | null;
  upiApp: string | null;
  senderName: string | null;
  matchedVia: string | null;
  rawNotification: Record<string, unknown> | null;
};

type Props = { apiKey: string };

const UPI_APP_SHORT: Record<string, string> = {
  PhonePe: 'PP',
  'Google Pay': 'GP',
  Paytm: 'PT',
  BHIM: 'BH',
  'Amazon Pay': 'AP',
  CRED: 'CR',
  'WhatsApp Pay': 'WA',
};

function AppBadge({ app }: { app: string | null }) {
  const label = app ? (UPI_APP_SHORT[app] ?? app.slice(0, 2).toUpperCase()) : '—';
  return (
    <View style={styles.appBadge}>
      <Text style={styles.appBadgeText}>{label}</Text>
    </View>
  );
}

export default function TransactionsScreen({ apiKey }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => { loadPage(1, true); }, []);

  async function loadPage(p: number, reset = false) {
    if (loading) return;
    setLoading(true);
    const data = await getTransactions(apiKey, p) as { data: Transaction[] } | null;
    const rows = data?.data ?? [];
    setTransactions(prev => reset ? rows : [...prev, ...rows]);
    setHasMore(rows.length === 20);
    setPage(p);
    setLoading(false);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(1, true);
    setRefreshing(false);
  }, []);

  const onEndReached = useCallback(() => {
    if (hasMore && !loading) loadPage(page + 1);
  }, [hasMore, loading, page]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const scheme = STATUS_SCHEME[item.status] ?? STATUS_SCHEME.EXPIRED;
    return (
      <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <AppBadge app={item.upiApp} />
        <View style={styles.rowMiddle}>
          <Text style={styles.amount}>₹{paiseToRupees(item.amount)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.senderName ?? item.utr ?? item.upiApp ?? '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <View style={[styles.badge, { backgroundColor: scheme.surface, borderColor: scheme.border }]}>
            <Text style={[styles.badgeText, { color: scheme.text }]}>{item.status}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments</Text>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textMuted} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No payments yet</Text>
          </View>
        ) : null}
        ListFooterComponent={loading ? (
          <ActivityIndicator style={{ padding: 20 }} color={C.textMuted} />
        ) : null}
      />

      {/* Detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Transaction</Text>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <DetailRow label="Amount" value={`₹${paiseToRupees(selected.amount)}`} highlight />
                {selected.originalAmount !== selected.amount && (
                  <DetailRow label="Original" value={`₹${paiseToRupees(selected.originalAmount)}`} />
                )}
                <DetailRow label="Status" value={selected.status} />
                {selected.senderName && <DetailRow label="Sender" value={selected.senderName} />}
                {selected.upiApp && <DetailRow label="App" value={selected.upiApp} />}
                {selected.utr && <DetailRow label="UTR" value={selected.utr} mono />}
                {selected.description && <DetailRow label="Note" value={selected.description} />}
                {selected.matchedVia && (
                  <DetailRow
                    label="Matched via"
                    value={selected.matchedVia === 'tn_field' ? 'Order ID in note' : 'Amount + time window'}
                  />
                )}
                {selected.rawNotification?.body ? (
                  <DetailRow label="Notification" value={String(selected.rawNotification.body)} mono />
                ) : null}
                {selected.rawNotification?.packageName ? (
                  <DetailRow label="Package" value={String(selected.rawNotification.packageName)} mono />
                ) : null}
                <DetailRow label="Order ID" value={selected.id} mono />
                <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString('en-IN')} />
                {selected.verifiedAt && (
                  <DetailRow label="Verified" value={new Date(selected.verifiedAt).toLocaleString('en-IN')} />
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        mono && styles.mono,
        highlight && { fontSize: 22, fontWeight: '800', color: C.greenBright },
      ]} numberOfLines={mono ? 2 : 3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 26, fontWeight: '800', color: C.text, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: C.borderDim,
  },
  appBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  appBadgeText: { fontSize: 11, fontWeight: '800', color: C.textSub },
  rowMiddle: { flex: 1 },
  amount: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 3 },
  meta: { fontSize: 12, color: C.textMuted },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  date: { fontSize: 11, color: C.textMuted },

  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.textMuted },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '82%',
    borderTopWidth: 1, borderColor: C.border,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 16 },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.borderDim,
  },
  detailLabel: { fontSize: 13, color: C.textMuted, flex: 1 },
  detailValue: { fontSize: 14, color: C.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11, color: C.textSub },

  closeBtn: {
    backgroundColor: C.surfaceHigh, borderRadius: 14, padding: 15,
    alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: C.border,
  },
  closeBtnText: { fontWeight: '700', color: C.text, fontSize: 15 },
});
