import React, {useEffect, useState} from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {ChevronRight, CircleDot, X} from 'lucide-react-native';

import {NativePressable} from './NativePressable';
import {StatusDot, EliseoStatus, normalizeEliseoStatus} from './StatusDot';
import {
  auth,
  listenToUserProfile,
  updateUserStatus,
} from '../services/firebase';
import {colors, radii} from '../theme';

const OPTIONS: Array<{value: EliseoStatus; label: string}> = [
  {value: 'online', label: 'Online'},
  {value: 'busy', label: 'Ocupado'},
  {value: 'offline', label: 'Offline'},
];

export function ProfileStatusRow() {
  const uid = auth.currentUser?.uid ?? '';
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<EliseoStatus>('offline');

  useEffect(() => {
    if (!uid) return;
    return listenToUserProfile(uid, profile => {
      setStatus(normalizeEliseoStatus(profile?.status));
    });
  }, [uid]);

  async function choose(next: EliseoStatus) {
    if (!uid || saving) return;
    try {
      setSaving(true);
      await updateUserStatus(uid, next);
      setStatus(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const label = OPTIONS.find(item => item.value === status)?.label ?? 'Offline';

  return (
    <>
      <NativePressable haptic onPress={() => setOpen(true)} style={styles.row}>
        <View style={styles.rowInner}>
          <View style={styles.rowIcon}>
            <CircleDot size={20} color={colors.blue} />
          </View>
          <View style={styles.labelWrap}>
            <Text style={styles.rowLabel}>Status</Text>
            <View style={styles.valueRow}>
              <StatusDot status={status} size={12} />
              <Text style={styles.value}>{label}</Text>
            </View>
          </View>
          <ChevronRight size={19} color={colors.faint} />
        </View>
      </NativePressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.title}>Status</Text>
                <Text style={styles.subtitle}>Escolha como você quer aparecer.</Text>
              </View>
              <NativePressable haptic onPress={() => setOpen(false)} style={styles.close}>
                <View style={styles.closeInner}>
                  <X size={18} color={colors.textSoft} />
                </View>
              </NativePressable>
            </View>

            {OPTIONS.map(option => (
              <NativePressable
                key={option.value}
                haptic
                disabled={saving}
                onPress={() => void choose(option.value)}
                style={styles.option}
              >
                <View style={styles.optionInner}>
                  <StatusDot status={option.value} size={15} />
                  <Text style={styles.optionText}>{option.label}</Text>
                  {status === option.value && <Text style={styles.active}>Ativo</Text>}
                </View>
              </NativePressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {minHeight: 58, marginBottom: 9},
  rowInner: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.panel2,
  },
  labelWrap: {flex: 1, gap: 3},
  rowLabel: {color: colors.text, fontSize: 13, fontWeight: '700'},
  valueRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  value: {color: colors.muted, fontSize: 10},
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    padding: 18,
    paddingBottom: 28,
    gap: 9,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.panel,
  },
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5},
  title: {color: colors.text, fontSize: 18, fontWeight: '800'},
  subtitle: {marginTop: 3, color: colors.muted, fontSize: 11},
  close: {width: 36, height: 36},
  closeInner: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.panel2},
  option: {minHeight: 52},
  optionInner: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.panel2},
  optionText: {flex: 1, color: colors.textSoft, fontSize: 13, fontWeight: '700'},
  active: {color: colors.blue, fontSize: 10, fontWeight: '800'},
});
