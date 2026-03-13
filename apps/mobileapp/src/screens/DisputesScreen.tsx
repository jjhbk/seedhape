import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image,
} from 'react-native';

import { paiseToRupees } from '../shared';
import Config from '../config';

const API_URL = Config.API_URL;

type Dispute = {
  id: string;
  orderId: string;
  amount: number;
  resolution: 'PENDING' | 'APPROVED' | 'REJECTED';
  screenshotUrl: string | null;
  resolutionNote: string | null;
  createdAt: string;
};

type Props = { apiKey: string };

export default function DisputesScreen({ apiKey }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadDisputes(); }, []);

  async function loadDisputes() {
    const res = await fetch(`${API_URL}/v1/merchant/disputes`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json() as { data: Dispute[] };
      setDisputes(data.data ?? []);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  }, []);

  async function resolve(disputeId: string, resolution: 'APPROVED' | 'REJECTED') {
    Alert.prompt(
      resolution === 'APPROVED' ? 'Approve Dispute' : 'Reject Dispute',
      'Add a resolution note (optional):',
      async (note) => {
        await fetch(`${API_URL}/v1/merchant/disputes/${disputeId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution, resolutionNote: note || undefined }),
        });
        await loadDisputes();
      },
      'plain-text',
    );
  }

  const renderItem = ({ item }: { item: Dispute }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>₹{paiseToRupees(item.amount)}</Text>
        <View style={[
          styles.badge,
          item.resolution === 'PENDING' ? styles.badgePending :
          item.resolution === 'APPROVED' ? styles.badgeApproved : styles.badgeRejected,
        ]}>
          <Text style={[
            styles.badgeText,
            { color: item.resolution === 'PENDING' ? '#92400e' : item.resolution === 'APPROVED' ? '#166534' : '#991b1b' },
          ]}>
            {item.resolution}
          </Text>
        </View>
      </View>

      <Text style={styles.orderId} numberOfLines={1}>{item.orderId}</Text>
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>

      {item.screenshotUrl && (
        <Image source={{ uri: item.screenshotUrl }} style={styles.screenshot} resizeMode="cover" />
      )}
      {item.resolutionNote && <Text style={styles.note}>{item.resolutionNote}</Text>}

      {item.resolution === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => resolve(item.id, 'REJECTED')}>
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => resolve(item.id, 'APPROVED')}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disputes</Text>
      <FlatList
        data={disputes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No disputes</Text>
            <Text style={styles.emptyText}>All payments have been matched automatically.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 20, fontWeight: '700', color: '#111' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgePending: { backgroundColor: '#fef9c3' },
  badgeApproved: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fef2f2' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  orderId: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 4 },
  date: { fontSize: 12, color: '#d1d5db', marginBottom: 8 },
  screenshot: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  note: { fontSize: 13, color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#fef2f2' },
  rejectBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  approveBtn: { backgroundColor: '#dcfce7' },
  approveBtnText: { color: '#16a34a', fontWeight: '600', fontSize: 14 },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
