// =============================================================================
// Toast.tsx — Notifikasi toast melayang di atas (pengganti showToast DOM)
// =============================================================================

import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { ToastItem, useApp } from '../state/AppContext';

const CONFIG: Record<string, { bg: string; icon: string }> = {
  success: { bg: '#059669', icon: 'circle-check' },
  error: { bg: '#dc2626', icon: 'circle-xmark' },
  warning: { bg: '#d97706', icon: 'triangle-exclamation' },
  info: { bg: '#0284c7', icon: 'circle-info' },
};

function ToastRow({ item }: { item: ToastItem }) {
  const cfg = CONFIG[item.type] || CONFIG.info;
  const anim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: cfg.bg, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
      ]}
    >
      <FontAwesome6 name={cfg.icon as any} solid size={16} color="#fff" />
      <Text style={styles.toastText} numberOfLines={3}>
        {item.message}
      </Text>
    </Animated.View>
  );
}

export function ToastHost() {
  const { toasts } = useApp();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
