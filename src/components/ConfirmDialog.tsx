// =============================================================================
// ConfirmDialog.tsx — Dialog konfirmasi (pengganti showConfirm DOM)
// =============================================================================

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';

export function ConfirmHost() {
  const { confirmState, resolveConfirm } = useApp();
  const { c } = useTheme();

  return (
    <Modal
      visible={!!confirmState}
      transparent
      animationType="fade"
      onRequestClose={() => resolveConfirm(false)}
    >
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: c.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.dangerSoft }]}>
            <FontAwesome6 name="trash-can" solid size={20} color={c.danger} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>{confirmState?.title}</Text>
          <Text style={[styles.message, { color: c.subtext }]}>{confirmState?.message}</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => resolveConfirm(false)}
              style={[styles.btn, { backgroundColor: c.cardAlt, borderColor: c.borderStrong }]}
            >
              <Text style={[styles.btnText, { color: c.subtext }]}>Batal</Text>
            </Pressable>
            <Pressable
              onPress={() => resolveConfirm(true)}
              style={[styles.btn, { backgroundColor: '#e11d48' }]}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>Ya, Lanjutkan</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
