// =============================================================================
// PinModal.tsx — Atur / ubah PIN keamanan (port dari modal-set-pin)
// =============================================================================

import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ModalSheet } from '../components/ModalSheet';
import { AppTextInput, FieldLabel, PrimaryButton } from '../components/form';
import { isPinEnabled, setupNewPin, verifyPin } from '../lib/auth';

export function PinModal() {
  const { modal, closeModal, showToast } = useApp();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setSaving(false);
    closeModal();
  };

  React.useEffect(() => {
    if (modal?.key !== 'setPin') return;
    let alive = true;
    isPinEnabled()
      .then((v) => {
        if (alive) setEnabled(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [modal?.key]);

  const isEnabled = enabled === true;
  const isChanging = isEnabled;

  const submit = async () => {
    if (isChanging) {
      if (!current) return showToast('Masukkan PIN saat ini', 'warning');
      const ok = await verifyPin(current);
      if (!ok) return showToast('PIN saat ini tidak cocok', 'error');
    }
    if (!next || next.length < 4 || next.length > 6) {
      return showToast('PIN baru harus terdiri dari 4–6 digit angka', 'warning');
    }
    if (next !== confirm) return showToast('Konfirmasi PIN baru tidak cocok', 'warning');

    setSaving(true);
    try {
      await setupNewPin(next);
      showToast('PIN keamanan berhasil disimpan! Aplikasi kini terlindungi.', 'success');
      handleClose();
    } catch (err: any) {
      showToast('Gagal mengatur PIN: ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'setPin'}
      title={isChanging ? 'Ubah PIN Keamanan' : 'Atur PIN Keamanan'}
      onClose={handleClose}
      maxWidth={440}
    >
      {isChanging ? (
        <View style={{ gap: 6 }}>
          <FieldLabel>PIN Saat Ini</FieldLabel>
          <AppTextInput
            value={current}
            onChangeText={(v) => setCurrent(v.replace(/\D/g, ''))}
            placeholder="••••••"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: '700' }}
          />
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <FieldLabel>PIN Baru (4–6 digit angka)</FieldLabel>
        <AppTextInput
          value={next}
          onChangeText={(v) => setNext(v.replace(/\D/g, ''))}
          placeholder="••••••"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: '700' }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Konfirmasi PIN Baru</FieldLabel>
        <AppTextInput
          value={confirm}
          onChangeText={(v) => setConfirm(v.replace(/\D/g, ''))}
          placeholder="••••••"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: '700' }}
        />
      </View>

      <PrimaryButton
        label={isChanging ? 'Perbarui PIN' : 'Simpan PIN'}
        icon="shield-check"
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
