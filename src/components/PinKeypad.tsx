// =============================================================================
// PinKeypad.tsx — Tampilan titik PIN + keypad angka 3 kolom × 4 baris
//   1 2 3
//   4 5 6
//   7 8 9
//   ⌫ 0 ✓
// Dipakai popup atur/ubah PIN dan popup nonaktifkan PIN (tanpa keyboard bawaan).
// =============================================================================

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';

const KEY_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
];

const MIN_PAD = 44;
const MAX_PAD = 300;
const MAX_KEY = 72;

/** Deretan titik yang menunjukkan jumlah digit PIN yang sudah dimasukkan. */
export function PinDots({
  value,
  length = 6,
  error = false,
}: {
  value: string;
  length?: number;
  /** Saat true (PIN salah) titik terisi berubah merah. */
  error?: boolean;
}) {
  const { c } = useTheme();
  const total = Math.max(length, value.length);
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < value.length;
        const color = error ? c.danger : c.primary;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: filled ? color : 'transparent',
                borderColor: error ? c.danger : filled ? color : c.borderStrong,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Keypad angka 3 kolom × 4 baris untuk input PIN tanpa keyboard. */
export function PinKeypad({
  onDigit,
  onDelete,
  onConfirm,
  busy = false,
  confirmDisabled = false,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  /** Saat true (proses verifikasi/simpan) seluruh tombol dinonaktifkan. */
  busy?: boolean;
  /** Saat true tombol ✓ tampil redup dan tidak bereaksi (mis. PIN belum lengkap). */
  confirmDisabled?: boolean;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();

  const padWidth = Math.min(width - 48, MAX_PAD);
  const gap = padWidth < 260 ? 8 : 12;
  const keySize = Math.min(MAX_KEY, Math.max(MIN_PAD, Math.floor((padWidth - gap * 2) / 3)));
  const fontSize = Math.min(26, Math.max(18, Math.round(keySize * 0.38)));
  const iconSize = Math.min(22, Math.max(16, Math.round(keySize * 0.32)));

  const press = (key: string) => {
    if (busy) return;
    if (key === 'del') onDelete();
    else if (key === 'ok') {
      if (!confirmDisabled) onConfirm();
    } else onDigit(key);
  };

  return (
    <View style={[styles.pad, { width: keySize * 3 + gap * 2, gap }]}>
      {KEY_ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap }]}>
          {row.map((key) => {
            const isDel = key === 'del';
            const isOk = key === 'ok';

            return (
              <Pressable
                key={key}
                onPress={() => press(key)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={
                  isDel ? 'Hapus digit' : isOk ? 'Konfirmasi' : `Angka ${key}`
                }
                style={({ pressed }) => [
                  styles.key,
                  {
                    width: keySize,
                    height: keySize,
                    borderRadius: Math.round(keySize / 2),
                    backgroundColor: isOk
                      ? pressed
                        ? c.primaryDark
                        : c.primary
                      : isDel
                      ? pressed
                        ? c.primarySoft
                        : 'transparent'
                      : pressed
                      ? c.primarySoft
                      : c.inputBg,
                    borderColor: isOk ? c.primary : isDel ? 'transparent' : c.inputBorder,
                    opacity: busy ? (isOk ? 0.6 : 0.5) : isOk && confirmDisabled ? 0.35 : 1,
                  },
                ]}
              >
                {isOk && busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : isDel ? (
                  <FontAwesome6 name="delete-left" size={iconSize} color={c.subtext} />
                ) : isOk ? (
                  <FontAwesome6 name="check" solid size={iconSize} color="#fff" />
                ) : (
                  <Text style={[styles.keyText, { color: c.text, fontSize }]}>{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  key: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    minHeight: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
});
