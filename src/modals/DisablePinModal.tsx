// =============================================================================
// DisablePinModal.tsx — Nonaktifkan proteksi PIN (port dari modal-disable-pin)
// =============================================================================

import React, { useState } from 'react';
import { Text } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { ModalSheet } from '../components/ModalSheet';
import { AppTextInput, PrimaryButton } from '../components/form';
import { disablePin } from '../lib/auth';

export function DisablePinModal() {
  const { modal, closeModal, showToast } = useApp();
  const { c } = useTheme();
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setPin('');
    setSaving(false);
    closeModal();
  };

  const submit = async () => {
    if (!pin) return showToast('Masukkan PIN untuk konfirmasi', 'warning');
    setSaving(true);
    try {
      await disablePin(pin);
      showToast('Proteksi PIN telah dinonaktifkan', 'info');
      handleClose();
    } catch (err: any) {
      showToast('Gagal mematikan PIN: ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'disablePin'}
      title="Nonaktifkan Kunci PIN"
      onClose={handleClose}
      maxWidth={440}
    >
      <Text style={{ fontSize: 12, color: c.subtext, lineHeight: 18 }}>
        Masukkan PIN saat ini untuk menonaktifkan proteksi aplikasi:
      </Text>

      <AppTextInput
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
        placeholder="••••••"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: '700' }}
      />

      <PrimaryButton
        label="Matikan Proteksi PIN"
        icon="shield-off"
        color="#e11d48"
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
