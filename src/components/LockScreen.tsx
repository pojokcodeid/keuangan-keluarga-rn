// =============================================================================
// LockScreen.tsx — Layar kunci PIN (keypad + titik, verifikasi SHA-256)
// Mendukung PIN dinamis 4–6 digit angka sesuai pengaturan pengguna.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeContext';
import { useApp } from '../state/AppContext';
import { getPinLength, getPinLengthSync, verifyPin } from '../lib/auth';

const MIN_PIN = 4;
const MAX_PIN = 6;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ok', '0', 'del'];

export function LockScreen() {
  const { c } = useTheme();
  const { unlock } = useApp();
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
  const dotsFilled = Math.min(pin.length, totalDots);
  const canSubmit = pin.length >= (expectedLen ?? MIN_PIN);

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: c.primary }]}>
          <FontAwesome6 name="wallet" solid size={30} color="#fff" />
        </View>
        <Text style={[styles.title, { color: c.text }]}>Keuangan Keluarga</Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          {error
            ? 'PIN salah, coba lagi'
            : expectedLen
            ? `Masukkan ${expectedLen} digit PIN untuk membuka aplikasi`
            : 'Masukkan PIN untuk membuka aplikasi'}
        </Text>
      </View>

      <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: totalDots }).map((_, i) => {
          const filled = i < dotsFilled;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? (error ? c.danger : c.primary) : 'transparent',
                  borderColor: error ? c.danger : filled ? c.primary : c.borderStrong,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={styles.pad}>
        {KEYS.map((key) => {
          const isDel = key === 'del';
          const isOk = key === 'ok';

          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={isOk && !canSubmit}
              style={({ pressed }) => [
                styles.key,
                {
                  backgroundColor: pressed
                    ? c.primarySoft
                    : isDel || isOk
                    ? 'transparent'
                    : c.card,
                  borderColor: isDel || isOk ? 'transparent' : c.border,
                  opacity: isOk && !canSubmit ? 0.3 : 1,
                },
              ]}
            >
              {isDel ? (
                <FontAwesome6 name="delete-left" size={20} color={c.subtext} />
              ) : isOk ? (
                <FontAwesome6
                  name="check"
                  size={20}
                  color={canSubmit ? c.primary : c.borderStrong}
                />
              ) : (
                <Text style={[styles.keyText, { color: c.text }]}>{key}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.reloadHint}>
        <Text style={[styles.reloadText, { color: c.muted }]}>Lindungi data keuangan keluarga Anda</Text>
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
  dots: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  pad: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  key: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
  },
  reloadHint: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  reloadText: {
    fontSize: 11,
  },
});
