import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Image, TextInput, Modal, Pressable, Linking,
} from 'react-native';

import { paiseToRupees } from '../shared';
import { getDisputes, resolveDispute } from '../services/api';
import { C } from '../theme';

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

function ResolutionModal({
  visible,
  action,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  action: 'APPROVED' | 'REJECTED' | null;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => { if (visible) setNote(''); }, [visible]);

  if (!action) return null;
  const isApprove = action === 'APPROVED';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>
            {isApprove ? 'Approve payment' : 'Reject dispute'}
          </Text>
          <Text style={styles.modalBody}>
            {isApprove
              ? 'This will mark the order as verified. Add a note if needed.'
              : 'This will reject the payment. Add a note if needed.'}
          </Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Resolution note (optional)"
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={2}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: isApprove ? C.greenDim : C.redSurface, borderColor: isApprove ? C.greenBorder : C.redBorder }]}
              onPress={() => onConfirm(note)}
            >
              <Text style={[styles.modalConfirmText, { color: isApprove ? C.greenBright : C.red }]}>
                {isApprove ? 'Approve' : 'Reject'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DisputesScreen({ apiKey }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);

  useEffect(() => { loadDisputes(); }, []);

  async function loadDisputes() {
    const data = await getDisputes(apiKey) as { data: Dispute[] };
    setDisputes(data?.data ?? []);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  }, []);

  async function handleConfirm(note: string) {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    setPendingAction(null);
    try {
      await resolveDispute(apiKey, id, action, note || undefined);
      await loadDisputes();
    } catch {
      Alert.alert('Failed', 'Could not resolve dispute. Please try again.');
    }
  }

  const renderItem = ({ item }: { item: Dispute }) => {
    const isPending = item.resolution === 'PENDING';
    const isApproved = item.resolution === 'APPROVED';

    const scheme = isPending
      ? { surface: C.amberSurface, text: C.amber, border: C.amberBorder }
      : isApproved
        ? { surface: C.greenSurface, text: C.greenBright, border: C.greenBorder }
        : { surface: C.redSurface, text: C.red, border: C.redBorder };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.amount}>₹{paiseToRupees(item.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: scheme.surface, borderColor: scheme.border }]}>
            <Text style={[styles.badgeText, { color: scheme.text }]}>{item.resolution}</Text>
          </View>
        </View>

        <Text style={styles.orderId} numberOfLines={1}>{item.orderId}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>

        {item.screenshotUrl && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL(item.screenshotUrl!)}
          >
            <Image source={{ uri: item.screenshotUrl }} style={styles.screenshot} resizeMode="cover" />
            <Text style={styles.screenshotHint}>Tap to view full screenshot</Text>
          </TouchableOpacity>
        )}
        {item.resolutionNote && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{item.resolutionNote}</Text>
          </View>
        )}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => setPendingAction({ id: item.id, action: 'REJECTED' })}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => setPendingAction({ id: item.id, action: 'APPROVED' })}
            >
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disputes</Text>
      <FlatList
        data={disputes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textMuted} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Text style={{ fontSize: 28 }}>✓</Text>
            </View>
            <Text style={styles.emptyTitle}>No disputes</Text>
            <Text style={styles.emptyBody}>All payments matched automatically.</Text>
          </View>
        }
      />

      <ResolutionModal
        visible={!!pendingAction}
        action={pendingAction?.action ?? null}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  title: { fontSize: 26, fontWeight: '800', color: C.text, paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.borderDim,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  amount: { fontSize: 22, fontWeight: '800', color: C.text },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  orderId: { fontSize: 11, color: C.textMuted, fontFamily: 'monospace', marginBottom: 4 },
  date: { fontSize: 12, color: C.textMuted, marginBottom: 10 },
  screenshot: { width: '100%', height: 140, borderRadius: 10, marginBottom: 4 },
  screenshotHint: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginBottom: 10 },
  noteBox: {
    backgroundColor: C.surfaceHigh, borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  noteText: { fontSize: 13, color: C.textSub, lineHeight: 19 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  rejectBtn: { backgroundColor: C.redSurface, borderColor: C.redBorder },
  rejectText: { color: C.red, fontWeight: '700', fontSize: 14 },
  approveBtn: { backgroundColor: C.greenSurface, borderColor: C.greenBorder },
  approveText: { color: C.greenBright, fontWeight: '700', fontSize: 14 },

  emptyWrap: { paddingTop: 72, alignItems: 'center', gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.greenSurface, borderWidth: 1, borderColor: C.greenBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyBody: { fontSize: 13, color: C.textMuted },

  // Resolution modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: C.surface,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
  modalBody: { fontSize: 13, color: C.textSub, lineHeight: 20, marginBottom: 16 },
  noteInput: {
    backgroundColor: C.surfaceHigh, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text,
    marginBottom: 18, minHeight: 64, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { fontWeight: '600', color: C.textSub, fontSize: 14 },
  modalConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1,
  },
  modalConfirmText: { fontWeight: '700', fontSize: 14 },
});
