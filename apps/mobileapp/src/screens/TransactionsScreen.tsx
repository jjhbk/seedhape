import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
} from 'react-native';

import { getTransactions } from '../services/api.js';
import { paiseToRupees } from '../shared.js';

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
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  VERIFIED:  { bg: '#dcfce7', text: '#166534' },
  PENDING:   { bg: '#fef9c3', text: '#854d0e' },
  CREATED:   { bg: '#f3f4f6', text: '#374151' },
  DISPUTED:  { bg: '#fff7ed', text: '#9a3412' },
  EXPIRED:   { bg: '#f3f4f6', text: '#6b7280' },
  REJECTED:  { bg: '#fef2f2', text: '#991b1b' },
  RESOLVED:  { bg: '#eff6ff', text: '#1d4ed8' },
};

type Props = { apiKey: string };

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
    const data = await getTransactions(apiKey, p);
    const rows: Transaction[] = data?.data ?? [];
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
    const colors = STATUS_COLORS[item.status] ?? { bg: '#f3f4f6', text: '#374151' };
    return (
      <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View>
          <Text style={styles.amount}>₹{paiseToRupees(item.amount)}</Text>
          <Text style={styles.app}>{item.upiApp ?? item.utr ?? '—'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.status}</Text>
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
      <Text style={styles.title}>Transactions</Text>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No transactions yet</Text> : null}
        ListFooterComponent={loading ? <ActivityIndicator style={{ padding: 16 }} color="#16a34a" /> : null}
      />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transaction Detail</Text>
            {selected && (
              <ScrollView>
                <DetailRow label="Amount" value={`₹${paiseToRupees(selected.amount)}`} />
                {selected.originalAmount !== selected.amount && (
                  <DetailRow label="Original" value={`₹${paiseToRupees(selected.originalAmount)}`} />
                )}
                <DetailRow label="Status" value={selected.status} />
                <DetailRow label="Order ID" value={selected.id} mono />
                {selected.utr && <DetailRow label="UTR" value={selected.utr} mono />}
                {selected.upiApp && <DetailRow label="UPI App" value={selected.upiApp} />}
                {selected.senderName && <DetailRow label="Sender" value={selected.senderName} />}
                {selected.description && <DetailRow label="Description" value={selected.description} />}
                <DetailRow label="Created" value={new Date(selected.createdAt).toLocaleString('en-IN')} />
                {selected.verifiedAt && (
                  <DetailRow label="Verified" value={new Date(selected.verifiedAt).toLocaleString('en-IN')} />
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  amount: { fontSize: 17, fontWeight: '700', color: '#111' },
  app: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 11, color: '#d1d5db' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 13, color: '#6b7280', flex: 1 },
  detailValue: { fontSize: 13, color: '#111', fontWeight: '500', flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  closeBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  closeBtnText: { fontWeight: '600', color: '#374151' },
});
