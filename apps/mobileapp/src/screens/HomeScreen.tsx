import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';

import SeedhaPeMark from '../components/SeedhaPeMark';
import { getMerchantProfile, getTransactions } from '../services/api';
import { checkNotificationPermission, requestNotificationPermission } from '../services/notification-bridge';
import { paiseToRupees } from '../shared';

type Merchant = {
  businessName: string;
  upiId: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'SUSPENDED';
  plan: string;
  monthlyTxCount: number;
};

type Transaction = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  utr: string | null;
  upiApp: string | null;
};

type Props = { apiKey: string };

export default function HomeScreen({ apiKey }: Props) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    checkPermission();
  }, []);

  async function loadData() {
    const [profile, txData] = await Promise.all([
      getMerchantProfile(apiKey),
      getTransactions(apiKey, 1),
    ]);
    setMerchant(profile);
    setRecentTxs((txData?.data ?? []).slice(0, 5));
  }

  async function checkPermission() {
    const granted = await checkNotificationPermission();
    setHasPermission(granted);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const statusColor = merchant?.status === 'ONLINE' ? '#16a34a' : '#dc2626';
  const statusBg    = merchant?.status === 'ONLINE' ? '#f0fdf4' : '#fef2f2';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 92 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerCard}>
        <SeedhaPeMark />
        <Text style={styles.businessName}>{merchant?.businessName ?? 'seedhape merchant'}</Text>
        <Text style={styles.headerSub}>Live device verification for UPI payments</Text>
        {merchant && (
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{merchant.status}</Text>
          </View>
        )}
      </View>

      {!hasPermission && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => { requestNotificationPermission(); setTimeout(checkPermission, 2000); }}
        >
          <Text style={styles.warningTitle}>Notification access required</Text>
          <Text style={styles.warningText}>Tap to grant permission to automatically verify UPI payments.</Text>
        </TouchableOpacity>
      )}

      {merchant && !merchant.upiId && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Set your UPI ID in Settings to start accepting payments.</Text>
        </View>
      )}

      {merchant && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchant.monthlyTxCount}</Text>
            <Text style={styles.statLabel}>This month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchant.plan}</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {recentTxs.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet</Text>
      ) : (
        recentTxs.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View>
              <Text style={styles.txAmount}>₹{paiseToRupees(tx.amount)}</Text>
              <Text style={styles.txApp}>{tx.upiApp ?? 'Unknown app'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={[styles.txStatus, { backgroundColor: tx.status === 'VERIFIED' ? '#dcfce7' : '#fef9c3' }]}>
                <Text style={[styles.txStatusText, { color: tx.status === 'VERIFIED' ? '#166534' : '#854d0e' }]}>
                  {tx.status}
                </Text>
              </View>
              <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 44,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: 18,
    gap: 8,
    shadowColor: '#052e16',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  businessName: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  warningBanner: { margin: 16, padding: 16, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 4 },
  warningText: { fontSize: 13, color: '#b91c1c' },
  infoBanner: { margin: 16, padding: 14, backgroundColor: '#fefce8', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  infoText: { fontSize: 13, color: '#92400e' },
  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#dcfce7' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#9ca3af' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginHorizontal: 16, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  txAmount: { fontSize: 17, fontWeight: '700', color: '#111' },
  txApp: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  txStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  txStatusText: { fontSize: 11, fontWeight: '600' },
  txDate: { fontSize: 11, color: '#d1d5db' },
});
