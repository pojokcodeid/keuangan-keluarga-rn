// =============================================================================
// LockScreen.tsx — Layar kunci PIN (keypad + titik, verifikasi SHA-256)
// Mendukung PIN dinamis 4–6 digit angka sesuai pengaturan pengguna.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeContext';
import { useApp } from '../state/AppContext';
import { useLanguage } from '../state/LanguageContext';
import { PinDots, PinKeypad } from './PinKeypad';
import { getPinLength, getPinLengthSync, verifyPin } from '../lib/auth';

const MIN_PIN = 4;
const MAX_PIN = 6;

export function LockScreen() {
  const { c } = useTheme();
  const { unlock } = useApp();
  const { t, interpolate } = useLanguage();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [expectedLen, setExpectedLen] = useState<number | null>(() => getPinLengthSync());
  const shake = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let alive = true;
    getPinLength().then((len) => {
      if (alive && len) {
        setExpectedLen(len);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const doShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  }, [shake]);

  const attempt = useCallback(
    async (value: string) => {
      if (checking || value.length < MIN_PIN) return;
      setChecking(true);
      try {
        const ok = await verifyPin(value);
        if (ok) {
          unlock();
        } else {
          setError(true);
          doShake();
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 550);
        }
      } catch {
        setError(true);
        doShake();
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 550);
      } finally {
        setChecking(false);
      }
    },
    [checking, doShake, unlock]
  );

  const silentAttempt = useCallback(
    async (value: string) => {
      if (checking || value.length < MIN_PIN) return;
      try {
        const ok = await verifyPin(value);
        if (ok) {
          unlock();
        }
      } catch {
        // Abaikan jika belum cocok, user mungkin sedang mengetik digit ke-5 atau 6
      }
    },
    [checking, unlock]
  );

  const press = useCallback(
    (key: string) => {
      if (!key) return;
      if (key === 'del') {
        if (!checking) {
          setPin((p) => p.slice(0, -1));
        }
        return;
      }
      if (key === 'ok') {
        if (!checking && pin.length >= (expectedLen ?? MIN_PIN)) {
          attempt(pin);
        }
        return;
      }

      const maxAllowed = expectedLen ?? MAX_PIN;
      if (pin.length >= maxAllowed || checking) return;

      const next = pin + key;
      setPin(next);

      if (expectedLen) {
        if (next.length === expectedLen) {
          attempt(next);
        }
      } else {
        // Panjang PIN belum tersimpan di metadata (data lama)
        if (next.length === MAX_PIN) {
          attempt(next);
        } else if (next.length >= MIN_PIN) {
          silentAttempt(next);
        }
      }
    },
    [attempt, checking, expectedLen, pin, silentAttempt]
  );

  // Mencegah tombol back Android keluar dari aplikasi saat terkunci:
  // layar lock dirender sebagai root pengganti konten utama.

  const totalDots = expectedLen ?? Math.max(MIN_PIN, Math.min(MAX_PIN, pin.length || MIN_PIN));
  const canSubmit = pin.length >= (expectedLen ?? MIN_PIN);

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: c.primary }]}>
          <FontAwesome6 name="wallet" solid size={30} color="#fff" />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{t.lockScreen.title}</Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          {error
            ? t.lockScreen.wrongPin
            : expectedLen
            ? interpolate(t.lockScreen.promptWithLen, { len: expectedLen })
            : t.lockScreen.promptDefault}
        </Text>
      </View>

      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <PinDots value={pin} length={totalDots} error={error} />
      </Animated.View>

      <PinKeypad
        onDigit={(digit) => press(digit)}
        onDelete={() => press('del')}
        onConfirm={() => press('ok')}
        busy={checking}
        confirmDisabled={!canSubmit}
      />

      <View style={styles.reloadHint}>
        <Text style={[styles.reloadText, { color: c.muted }]}>{t.lockScreen.footerHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  sub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  reloadHint: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  reloadText: {
    fontSize: 11,
  },
});
