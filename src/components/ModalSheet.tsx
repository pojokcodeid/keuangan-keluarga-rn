// =============================================================================
// ModalSheet.tsx — Bottom sheet modal (pengganti modal DOM)
// =============================================================================

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeContext';
import { touchActivity } from '../lib/auth';
import { SheetFocusContext } from './sheetFocus';
import type { HostInstance, ScrollViewInstance } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

/** Jarak minimum bagian bawah input terhadap puncak keyboard (px). */
const KEYBOARD_GAP = 16;

export function ModalSheet({ visible, title, onClose, children, maxWidth = 480 }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Platform.OS === 'android' && insets.bottom === 0 ? 24 : insets.bottom;

  // --- Gulir otomatis ke input yang sedang fokus saat keyboard muncul ---
  const scrollRef = useRef<ScrollViewInstance>(null);
  const contentRef = useRef<HostInstance>(null);
  const pendingTagRef = useRef<number | null>(null);
  const keyboardYRef = useRef<number | null>(null);

  const scrollInputIntoView = useCallback((nodeHandle: number) => {
    const scroll = scrollRef.current;
    const scrollTag = scroll ? findNodeHandle(scroll) : null;
    const contentTag = contentRef.current ? findNodeHandle(contentRef.current) : null;
    if (!scroll || scrollTag == null || contentTag == null) return;

    const keyboardY = keyboardYRef.current ?? Keyboard.metrics()?.screenY ?? null;
    if (keyboardY == null) return;

    // Posisi layar input = (posisi layar ScrollView) + (posisi di dalam konten)
    // - (scroll offset). Gulir agar bagian bawah input berhenti sedikit di atas
    // keyboard. Jika pengukuran gagal, biarkan — pengguna masih bisa menggulir.
    UIManager.measure(scrollTag, (_x, boxY) => {
      UIManager.measureLayout(
        nodeHandle,
        contentTag,
        () => {},
        (_left, top, _width, height) => {
          const target = Math.max(0, boxY + top + height - keyboardY + KEYBOARD_GAP);
          scroll.scrollTo({ y: target, animated: true });
        }
      );
    });
  }, []);

  const handleInputFocus = useCallback(
    (nodeHandle: number | null) => {
      if (nodeHandle == null) return;
      pendingTagRef.current = nodeHandle;
      // Jika keyboard sudah terbuka (pindah antar input), gulir langsung.
      // Jika belum, tunggu event keyboard agar posisinya sudah diketahui.
      const keyboardY = keyboardYRef.current ?? Keyboard.metrics()?.screenY ?? null;
      if (keyboardY != null) scrollInputIntoView(nodeHandle);
    },
    [scrollInputIntoView]
  );

  const focusValue = useMemo(() => ({ onInputFocus: handleInputFocus }), [handleInputFocus]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardYRef.current = e.endCoordinates.screenY;
      const tag = pendingTagRef.current;
      if (tag != null) scrollInputIntoView(tag);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardYRef.current = null;
      pendingTagRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollInputIntoView]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SheetFocusContext.Provider value={focusValue}>
        <View
          style={styles.flex}
          // Modal dirender di jendela terpisah, sehingga sentuhan di dalamnya
          // tidak terdeteksi root App. Perbarui timer auto-lock di sini agar
          // form tidak terkunci di tengah pengisian.
          onStartShouldSetResponderCapture={() => {
            touchActivity();
            return false;
          }}
        >
          <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
          {/* behavior="padding" berlaku di iOS & Android: sheet terangkat tepat
              di atas keyboard tanpa menumpuk (perhitungan KAV menyesuaikan
              sendiri bila window sempat ikut mengecil). */}
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.sheetWrap}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: c.card,
                  maxWidth,
                  paddingBottom: Math.max(bottomInset, 16),
                },
              ]}
            >
              <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={[styles.closeBtn, { backgroundColor: c.cardAlt }]}
                >
                  <FontAwesome6 name="xmark" size={14} color={c.subtext} />
                </Pressable>
              </View>
              <ScrollView
                ref={scrollRef}
                style={styles.body}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {/* Konten dibungkus View agar posisinya bisa diukur relatif
                    terhadap konten (bukan viewport) saat menggulir ke input) */}
                <View ref={contentRef} style={styles.bodyContent}>
                  {children}
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SheetFocusContext.Provider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    alignSelf: 'center',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingTop: 18,
    paddingBottom: 20,
    gap: 16,
  },
});
