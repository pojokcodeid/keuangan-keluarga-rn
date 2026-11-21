// =============================================================================
// PinModal.tsx — Atur / ubah PIN keamanan (keypad 3×4, input bertahap)
// =============================================================================

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import { ModalSheet } from '../components/ModalSheet';
import { FieldLabel } from '../components/form';
import { PinDots, PinKeypad } from '../components/PinKeypad';
import { getPinLength, isPinEnabled, setupNewPin, verifyPin } from '../lib/auth';

type Step = 'current' | 'next' | 'confirm';

export function PinModal() {
  const { modal, closeModal, showToast } = useApp();
  const { c } = useTheme();
  const { t, language } = useLanguage();

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [currentLen, setCurrentLen] = useState<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const stepLabels: Record<Step, string> = {
    current: t.pinModal.currentStep,
    next: t.pinModal.nextStep,
    confirm: t.pinModal.confirmStep,
  };

  const stepHints: Record<Step, string> = {
    current: t.pinModal.currentHint,
    next: t.pinModal.nextHint,
    confirm: t.pinModal.confirmHint,
  };

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

    if (step === 'current') {
      if (!current) return showToast(language === 'en' ? 'Enter current PIN' : 'Masukkan PIN saat ini', 'warning');
      setBusy(true);
      try {
        const ok = await verifyPin(current);
        if (!ok) return showToast(t.pinModal.wrongCurrentError, 'error');
        setStepIndex(idx + 1);
      } catch (err: any) {
        return showToast(t.pinModal.setupFailed + ': ' + (err?.message || String(err)), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === 'next') {
      if (next.length < 4 || next.length > 6) {
        return showToast(
          language === 'en' ? 'New PIN must be 4–6 digits' : 'PIN baru harus terdiri dari 4–6 digit angka',
          'warning'
        );
      }
      setStepIndex(idx + 1);
      return;
    }

    if (next !== confirm) return showToast(t.pinModal.mismatchError, 'warning');
    setBusy(true);
    try {
      await setupNewPin(next);
      showToast(isChanging ? t.pinModal.changeSuccess : t.pinModal.setSuccess, 'success');
      handleClose();
    } catch (err: any) {
      showToast(t.pinModal.setupFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'setPin'}
      title={isChanging ? t.pengaturan.changePin : t.pengaturan.setPin}
      onClose={handleClose}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <View style={styles.labelRow}>
          <FieldLabel>{stepLabels[step]}</FieldLabel>
          {idx > 0 ? (
            <Pressable
              onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={busy}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={language === 'en' ? 'Back to previous step' : 'Kembali ke langkah sebelumnya'}
            >
              <Text style={[styles.back, { color: c.subtext }]}>
                {language === 'en' ? 'Back' : 'Kembali'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {steps.length > 1 ? (
          <Text style={[styles.step, { color: c.primary }]}>
            {language === 'en'
              ? `Step ${idx + 1} of ${steps.length}`
              : `Langkah ${idx + 1} dari ${steps.length}`}
          </Text>
        ) : null}

        <PinDots
          value={value}
          length={step === 'current' ? currentLen ?? 6 : 6}
        />

        <Text style={[styles.hint, { color: c.muted }]}>{stepHints[step]}</Text>
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
