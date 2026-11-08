// =============================================================================
// PinModal.tsx — Atur / ubah PIN keamanan (keypad 3×4, input bertahap)
// =============================================================================

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { ModalSheet } from '../components/ModalSheet';
import { FieldLabel } from '../components/form';
import { PinDots, PinKeypad } from '../components/PinKeypad';
import { getPinLength, isPinEnabled, setupNewPin, verifyPin } from '../lib/auth';

type Step = 'current' | 'next' | 'confirm';

const STEP_LABEL: Record<Step, string> = {
  current: 'PIN Saat Ini',
  next: 'PIN Baru (4–6 digit angka)',
  confirm: 'Konfirmasi PIN Baru',
};

const STEP_HINT: Record<Step, string> = {
  current: 'Masukkan PIN saat ini, lalu tekan ✓',
  next: 'Buat PIN baru 4–6 digit, lalu tekan ✓',
  confirm: 'Ulangi PIN baru, lalu tekan ✓ untuk menyimpan',
};

export function PinModal() {
  const { modal, closeModal, showToast } = useApp();
  const { c } = useTheme();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [currentLen, setCurrentLen] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setStepIndex(0);
    setBusy(false);
    closeModal();
  };

  React.useEffect(() => {
    if (modal?.key !== 'setPin') return;
    let alive = true;
    // State sengaja tidak di-reset di sini: App.tsx hanya me-mount modal ini
    // selama terbuka, sehingga state selalu dimulai bersih saat dibuka lagi.
    isPinEnabled()
      .then((v) => {
        if (alive) setEnabled(v);
      })
      .catch(() => {});
    getPinLength()
      .then((len) => {
        if (alive && len) setCurrentLen(len);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [modal?.key]);

  const isEnabled = enabled === true;
  const isChanging = isEnabled;

  // Daftar langkah: mode ubah PIN memverifikasi PIN lama lebih dulu
  const steps: Step[] = isChanging ? ['current', 'next', 'confirm'] : ['next', 'confirm'];
  const idx = Math.min(stepIndex, steps.length - 1);
  const step = steps[idx];

  const value = step === 'current' ? current : step === 'next' ? next : confirm;

  const onDigit = (digit: string) => {
    if (busy) return;
    const append = (v: string) => (v.length >= 6 ? v : v + digit);
    if (step === 'current') setCurrent(append);
    else if (step === 'next') setNext(append);
    else setConfirm(append);
  };

  const onDelete = () => {
    if (busy) return;
    if (step === 'current') setCurrent((v) => v.slice(0, -1));
    else if (step === 'next') setNext((v) => v.slice(0, -1));
    else setConfirm((v) => v.slice(0, -1));
  };

  const confirmStep = async () => {
    if (busy) return;

    // Langkah 1: verifikasi PIN saat ini (mode ubah PIN)
    if (step === 'current') {
      if (!current) return showToast('Masukkan PIN saat ini', 'warning');
      setBusy(true);
      try {
        const ok = await verifyPin(current);
        if (!ok) return showToast('PIN saat ini tidak cocok', 'error');
        setStepIndex(idx + 1);
      } catch (err: any) {
        return showToast('Gagal memverifikasi PIN: ' + (err?.message || String(err)), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Langkah isi PIN baru: panjang harus 4–6 digit
    if (step === 'next') {
      if (next.length < 4 || next.length > 6) {
        return showToast('PIN baru harus terdiri dari 4–6 digit angka', 'warning');
      }
      setStepIndex(idx + 1);
      return;
    }

    // Langkah terakhir: konfirmasi lalu simpan
    if (next !== confirm) return showToast('Konfirmasi PIN baru tidak cocok', 'warning');
    setBusy(true);
    try {
      await setupNewPin(next);
      showToast('PIN keamanan berhasil disimpan! Aplikasi kini terlindungi.', 'success');
      handleClose();
    } catch (err: any) {
      showToast('Gagal mengatur PIN: ' + (err?.message || String(err)), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'setPin'}
      title={isChanging ? 'Ubah PIN Keamanan' : 'Atur PIN Keamanan'}
      onClose={handleClose}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <FieldLabel>{STEP_LABEL[step]}</FieldLabel>
          {idx > 0 ? (
            <Pressable
              onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={busy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke langkah sebelumnya"
            >
              <Text style={[styles.back, { color: c.subtext }]}>Kembali</Text>
            </Pressable>
          ) : null}
        </View>

        {steps.length > 1 ? (
          <Text style={[styles.step, { color: c.primary }]}>
            Langkah {idx + 1} dari {steps.length}
          </Text>
        ) : null}

        <PinDots
          value={value}
          length={step === 'current' ? currentLen ?? 6 : 6}
        />

        <Text style={[styles.hint, { color: c.muted }]}>{STEP_HINT[step]}</Text>
      </View>

      <PinKeypad onDigit={onDigit} onDelete={onDelete} onConfirm={confirmStep} busy={busy} />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  back: {
    fontSize: 12,
    fontWeight: '600',
  },
  step: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
