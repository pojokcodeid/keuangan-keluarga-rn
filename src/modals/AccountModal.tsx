// =============================================================================
// AccountModal.tsx — Tambah / edit akun (port dari modal-account)
// =============================================================================

import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useLanguage } from '../state/LanguageContext';
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

export function AccountModal() {
  const { modal, closeModal, snap, refresh, showToast } = useApp();
  const { t, language } = useLanguage();

  const accountTypes = useMemo(
    () => [
      { value: 'wallet', label: t.accountModal.typeWallet },
      { value: 'bank', label: t.accountModal.typeBank },
      { value: 'e-wallet', label: t.accountModal.typeEwallet },
      { value: 'savings', label: t.accountModal.typeSavings },
      { value: 'other', label: t.accountModal.typeOther },
    ],
    [t]
  );

  const editingId = modal?.key === 'account' ? modal.param : null;
  const existing = editingId ? snap.accounts.find((a) => a.id === editingId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [balanceText, setBalanceText] = useState(
    existing ? formatNumberString(Math.round(existing.initial_balance)) : '0'
  );
  const [type, setType] = useState(existing?.type || 'wallet');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return showToast(t.accountModal.nameWarning, 'warning');
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
      showToast(editingId ? t.accountModal.updatedSuccess : t.accountModal.savedSuccess, 'success');
      closeModal();
    } catch (err: any) {
      showToast(t.accountModal.saveFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'account'}
      title={editingId ? t.accountModal.editTitle : t.accountModal.addTitle}
      onClose={closeModal}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>{t.accountModal.nameLabel}</FieldLabel>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder={t.accountModal.namePlaceholder}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>{t.accountModal.balanceLabel} (Rp)</FieldLabel>
        <NumberInput value={balanceText} onValueChange={setBalanceText} placeholder="0" />
      </View>

      <SelectField
        label={t.accountModal.typeLabel}
        value={type}
        options={accountTypes}
        onChange={setType}
        placeholder={language === 'en' ? 'Select Type' : 'Pilih Jenis'}
      />

      <PrimaryButton
        label={editingId ? (language === 'en' ? 'Update Account' : 'Perbarui Akun') : t.accountModal.saveBtn}
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
