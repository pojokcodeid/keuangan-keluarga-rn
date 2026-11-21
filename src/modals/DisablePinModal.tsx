// =============================================================================
// DisablePinModal.tsx — Nonaktifkan proteksi PIN (keypad 3×4)
// =============================================================================

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import { ModalSheet } from '../components/ModalSheet';
import { FieldLabel } from '../components/form';
import { PinDots, PinKeypad } from '../components/PinKeypad';
import { disablePin, getPinLength } from '../lib/auth';

export function DisablePinModal() {
  const { modal, closeModal, showToast } = useApp();
  const { c } = useTheme();
  const { t, language } = useLanguage();
  const [pin, setPin] = useState('');
  const [pinLen, setPinLen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    setPin('');
    setBusy(false);
    closeModal();
  };

  useEffect(() => {
    if (modal?.key !== 'disablePin') return;
    let alive = true;
    // State tidak di-reset di sini: modal hanya di-mount selama terbuka.
    getPinLength()
      .then((len) => {
        if (alive && len) setPinLen(len);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [modal?.key]);

  const onDigit = (digit: string) => {
    if (busy) return;
    setPin((v) => (v.length >= 6 ? v : v + digit));
  };

  const onDelete = () => {
    if (busy) return;
    setPin((v) => v.slice(0, -1));
  };

  const submit = async () => {
    if (busy) return;
    if (!pin) return showToast(t.disablePinModal.prompt, 'warning');
    setBusy(true);
    try {
      await disablePin(pin);
      showToast(t.disablePinModal.disabledSuccess, 'info');
      handleClose();
    } catch (err: any) {
      showToast(t.disablePinModal.disableFailed + ': ' + (err?.message || String(err)), 'error');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'disablePin'}
      title={t.disablePinModal.title}
      onClose={handleClose}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 12, color: c.subtext, lineHeight: 18 }}>
          {t.disablePinModal.hint}
        </Text>
        <FieldLabel>{t.pinModal.currentStep}</FieldLabel>
        <PinDots value={pin} length={pinLen ?? 6} />
        <Text style={[styles.hint, { color: c.muted }]}>
          {language === 'en'
            ? 'Enter PIN then press ✓ to disable'
            : 'Masukkan PIN lalu tekan ✓ untuk menonaktifkan'}
        </Text>
      </View>

      <PinKeypad onDigit={onDigit} onDelete={onDelete} onConfirm={submit} busy={busy} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
