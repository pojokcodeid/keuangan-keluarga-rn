// =============================================================================
// AccountModal.tsx — Tambah / edit akun (port dari modal-account)
// =============================================================================

import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { ModalSheet } from '../components/ModalSheet';
import {
  AppTextInput,
  FieldLabel,
  NumberInput,
  PrimaryButton,
  SelectField,
} from '../components/form';
import { addAccount, AccountPayload, updateAccount } from '../lib/db';
import { formatNumberString, parseAmount } from '../lib/utils';
import { View } from 'react-native';

const ACCOUNT_TYPES = [
  { value: 'wallet', label: '💰 Dompet / Tunai' },
  { value: 'bank', label: '🏦 Rekening Bank' },
  { value: 'e-wallet', label: '📱 E-Wallet' },
  { value: 'savings', label: '🐷 Tabungan' },
  { value: 'other', label: '📦 Lainnya' },
];

export function AccountModal() {
  const { modal, closeModal, snap, refresh, showToast } = useApp();

  const editingId = modal?.key === 'account' ? modal.param : null;
  const existing = editingId ? snap.accounts.find((a) => a.id === editingId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [balanceText, setBalanceText] = useState(
    existing ? formatNumberString(Math.round(existing.initial_balance)) : '0'
  );
  const [type, setType] = useState(existing?.type || 'wallet');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return showToast('Nama akun harus diisi', 'warning');
    const payload: AccountPayload = {
      name: name.trim(),
      type,
      initial_balance: parseAmount(balanceText) || 0,
      icon: type,
    };

    setSaving(true);
    try {
      if (editingId) await updateAccount(editingId, payload, existing!);
      else await addAccount(payload);
      await refresh();
      showToast(editingId ? 'Akun berhasil diperbarui' : 'Akun berhasil ditambahkan', 'success');
      closeModal();
    } catch (err: any) {
      showToast('Gagal menyimpan akun: ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'account'}
      title={editingId ? 'Edit Akun' : 'Tambah Akun'}
      onClose={closeModal}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>Nama Akun</FieldLabel>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Dompet, BCA, GoPay"
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Saldo Awal (Rp)</FieldLabel>
        <NumberInput value={balanceText} onValueChange={setBalanceText} placeholder="0" />
      </View>

      <SelectField
        label="Jenis Akun"
        value={type}
        options={ACCOUNT_TYPES}
        onChange={setType}
        placeholder="Pilih Jenis"
      />

      <PrimaryButton
        label={editingId ? 'Perbarui Akun' : 'Simpan Akun'}
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
