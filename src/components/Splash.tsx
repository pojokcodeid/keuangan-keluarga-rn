// =============================================================================
// Splash.tsx — Layar pemuatan awal & layar galat inisialisasi database
// =============================================================================

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';
import { PrimaryButton } from './form';

export function SplashView() {
  const { c } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={[styles.logo, { backgroundColor: c.primary }]}>
        <FontAwesome6 name="wallet" solid size={34} color="#fff" />
      </View>
      <Text style={[styles.title, { color: c.text }]}>Keuangan Keluarga</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Akuntansi Rumah Tangga</Text>
      <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
      <Text style={[styles.sub, { color: c.muted, marginTop: 8 }]}>Menyiapkan data…</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={[styles.logo, { backgroundColor: c.dangerSoft }]}>
        <FontAwesome6 name="triangle-exclamation" solid size={32} color={c.danger} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>Gagal Memuat Data</Text>
      <Text style={[styles.errMsg, { color: c.subtext, borderColor: c.border }]}>
        {message}
      </Text>
      <View style={{ width: '100%', maxWidth: 320 }}>
        <PrimaryButton label="Coba Lagi" icon="rotate" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  sub: {
    fontSize: 13,
    marginTop: 4,
  },
  errMsg: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    backgroundColor: 'rgba(128,128,128,0.06)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 18,
  },
});
