import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';

import { getMerchantProfile, getTransactions } from '../services/api';
import { checkNotificationPermission, requestNotificationPermission } from '../services/notification-bridge';
import { paiseToRupees } from '../shared';
import { C, STATUS_SCHEME } from '../theme';
import type { LastNotification } from '../App';

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
  senderName: string | null;
};

type Props = { apiKey: string; lastNotification: LastNotification | null };

function PulsingDot({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [active]);

  const color = active ? C.green : C.textMuted;

  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View style={{
          position: 'absolute',
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: C.green,
          transform: [{ scale }], opacity,
        }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function NotificationFlash({ notification }: { notification: LastNotification }) {
  const slideY = useRef(new Animated.Value(-8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideY.setValue(-8);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(slideY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [notification.receivedAt]);

  return (
    <Animated.View style={[styles.flashCard, { opacity: fadeIn, transform: [{ translateY: slideY }] }]}>
      <View style={styles.flashHeader}>
        <View style={styles.flashDot} />
        <Text style={styles.flashTitle}>Payment captured</Text>
        <Text style={styles.flashTime}>
          {new Date(notification.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.flashAmount}>₹{paiseToRupees(notification.amount)}</Text>
      <Text style={styles.flashSub}>
        {notification.senderName ?? 'Unknown payer'}
        {notification.upiApp ? ` · ${notification.upiApp}` : ''}
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen({ apiKey, lastNotification }: Props) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [hasPermission, setHasPermission] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    checkNotificationPermission().then(setHasPermission);
  }, []);

  async function loadData() {
    const [profile, txData] = await Promise.all([
      getMerchantProfile(apiKey),
      getTransactions(apiKey, 1),
    ]);
    setMerchant(profile as Merchant);
    setRecentTxs(((txData as { data: Transaction[] })?.data ?? []).slice(0, 5));
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const status = merchant?.status ?? 'OFFLINE';
  const isOnline = status === 'ONLINE';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textMuted} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>seedhape</Text>
          <Text style={styles.businessName} numberOfLines={1}>
            {merchant?.businessName ?? '—'}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <PulsingDot active={isOnline} />
          <Text style={[styles.statusText, { color: isOnline ? C.green : C.textMuted }]}>{status}</Text>
        </View>
      </View>

      {/* Permission warning */}
      {!hasPermission && (
        <TouchableOpacity
          style={styles.warningCard}
          activeOpacity={0.8}
          onPress={() => { requestNotificationPermission(); setTimeout(() => checkNotificationPermission().then(setHasPermission), 2000); }}
        >
          <Text style={styles.warningIcon}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Notification access required</Text>
            <Text style={styles.warningBody}>Tap to grant permission to auto-verify UPI payments.</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* UPI not set */}
      {merchant && !merchant.upiId && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Set your UPI ID in Settings to start accepting payments.</Text>
        </View>
      )}

      {/* Live notification flash */}
      {lastNotification && <NotificationFlash notification={lastNotification} />}

      {/* Stats */}
      {merchant && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{merchant.monthlyTxCount.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>This month</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={[styles.statValue, { color: C.greenBright }]}>{merchant.plan}</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </View>
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent</Text>
      </View>

      {recentTxs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No payments yet</Text>
        </View>
      ) : (
        recentTxs.map((tx) => {
          const scheme = STATUS_SCHEME[tx.status] ?? STATUS_SCHEME.EXPIRED;
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txAmount}>₹{paiseToRupees(tx.amount)}</Text>
                <Text style={styles.txMeta} numberOfLines={1}>
                  {tx.senderName ?? tx.upiApp ?? 'Unknown'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <View style={[styles.badge, { backgroundColor: scheme.surface, borderColor: scheme.border }]}>
                  <Text style={[styles.badgeText, { color: scheme.text }]}>{tx.status}</Text>
                </View>
                <Text style={styles.txDate}>
                  {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20,
  },
  brand: { fontSize: 11, fontWeight: '700', color: C.greenDim, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  businessName: { fontSize: 22, fontWeight: '800', color: C.text, maxWidth: 220 },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.amberSurface, borderRadius: 14, borderWidth: 1, borderColor: C.amberBorder,
    padding: 14,
  },
  warningIcon: { fontSize: 18, color: C.amber, marginTop: 1 },
  warningTitle: { fontSize: 13, fontWeight: '700', color: C.amber, marginBottom: 3 },
  warningBody: { fontSize: 12, color: C.textSub, lineHeight: 18 },

  infoCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.blueSurface, borderRadius: 14, borderWidth: 1, borderColor: C.blueBorder,
    padding: 14,
  },
  infoText: { fontSize: 13, color: C.blue },

  flashCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.greenSurface, borderRadius: 16, borderWidth: 1, borderColor: C.greenBorder,
    padding: 16,
  },
  flashHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  flashDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  flashTitle: { fontSize: 11, fontWeight: '700', color: C.greenBright, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  flashTime: { fontSize: 11, color: C.textMuted },
  flashAmount: { fontSize: 28, fontWeight: '800', color: C.greenBright, marginBottom: 2 },
  flashSub: { fontSize: 13, color: C.textSub },

  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  statCardAccent: { borderColor: C.greenBorder, backgroundColor: C.greenSurface },
  statValue: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionRow: { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.textMuted },

  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.borderDim, padding: 14,
  },
  txLeft: { flex: 1, marginRight: 12 },
  txAmount: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  txMeta: { fontSize: 12, color: C.textMuted },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  txDate: { fontSize: 11, color: C.textMuted },
});
