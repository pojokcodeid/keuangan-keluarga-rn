// =============================================================================
// ResetDataSheet.tsx — Sheet reset data: pilih cakupan lalu ketik "RESET".
//
// Tiga tingkat reset:
// 1. Transaksi & budget saja (akun, kategori, PIN tetap)
// 2. Semua data keuangan (akun & kategori ikut; PIN & pengaturan tetap)
// 3. Seluruh database / reset pabrik (termasuk PIN & pengaturan keamanan)
// =============================================================================

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';
import { ModalSheet } from './ModalSheet';
import { AppTextInput, FieldLabel, PrimaryButton } from './form';
import { ResetScope, resetData } from '../lib/db';
import { clearAuthSettings } from '../lib/auth';
import { clearAllDrafts } from '../lib/draft';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Dipanggil setelah reset berhasil (untuk refresh snapshot + toast). */
  onDone: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}

interface ScopeOption {
  value: ResetScope;
  title: string;
  desc: string;
  icon: string;
}

const OPTIONS: ScopeOption[] = [
  {
    value: 'transactions',
    title: 'Transaksi & Budget Saja',
    desc: 'Hapus semua transaksi, budget, dan foto lampiran. Akun, kategori, dan PIN tetap aman.',
    icon: 'receipt',
  },
  {
    value: 'all',
    title: 'Semua Data Keuangan',
    desc: 'Hapus transaksi, budget, akun, kategori, dan lampiran. PIN & pengaturan tetap aman.',
    icon: 'layer-group',
  },
  {
    value: 'database',
    title: 'Seluruh Database (Reset Pabrik)',
    desc: 'Hapus semua data, PIN, dan pengaturan keamanan. Aplikasi kembali seperti baru terpasang.',
    icon: 'triangle-exclamation',
  },
];

export function ResetDataSheet({ visible, onClose, onDone, onError }: Props) {
  const { c } = useTheme();
  const [scope, setScope] = useState<ResetScope>('transactions');
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === 'RESET';

  const handleClose = () => {
    if (busy) return;
    setConfirmText('');
    setScope('transactions');
    onClose();
  };

  const handleReset = async () => {
    if (busy || !confirmed) return;
    setBusy(true);
    try {
      await resetData(scope);
      clearAllDrafts();
      if (scope === 'database') await clearAuthSettings();
      const message =
        scope === 'transactions'
          ? 'Semua transaksi & budget berhasil dihapus'
          : scope === 'all'
          ? 'Semua data keuangan berhasil dihapus'
          : 'Database direset total — aplikasi seperti baru';
      setConfirmText('');
      setScope('transactions');
      onClose();
      await onDone(message);
    } catch (err: any) {
      onError('Gagal mereset data: ' + (err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet visible={visible} title="Reset Data" onClose={handleClose} maxWidth={440}>
      <View style={[styles.warn, { backgroundColor: c.dangerSoft }]}>
        <FontAwesome6 name="triangle-exclamation" solid size={15} color={c.danger} />
        <Text style={[styles.warnText, { color: c.text }]}>
          Reset tidak dapat dibatalkan. Disarankan membuat backup terlebih dahulu.
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <FieldLabel>Pilih Cakupan Reset</FieldLabel>
        {OPTIONS.map((opt) => {
          const active = opt.value === scope;
          const danger = opt.value === 'database';
          return (
            <Pressable
              key={opt.value}
              onPress={() => setScope(opt.value)}
              style={[
                styles.option,
                {
                  backgroundColor: active
                    ? danger
                      ? c.dangerSoft
                      : c.primarySoft
                    : c.cardAlt,
                  borderColor: active ? (danger ? c.danger : c.primary) : c.inputBorder,
                },
              ]}
            >
              <FontAwesome6
                name={(active ? 'circle-dot' : 'circle') as any}
                solid
                size={15}
                color={active ? (danger ? c.danger : c.primary) : c.borderStrong}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: active ? (danger ? c.danger : c.primary) : c.text },
                  ]}
                >
                  {opt.title}
                </Text>
                <Text style={[styles.optionDesc, { color: c.muted }]}>{opt.desc}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Ketik RESET untuk mengonfirmasi</FieldLabel>
        <AppTextInput
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder="RESET"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <PrimaryButton
        label="Hapus Data Sekarang"
        icon="trash-can"
        color={c.danger}
        disabled={!confirmed}
        loading={busy}
        onPress={handleReset}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  warn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
