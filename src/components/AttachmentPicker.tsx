// =============================================================================
// AttachmentPicker.tsx — Lampiran gambar (kamera langsung & galeri HP)
// =============================================================================

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeContext';
import { deleteAttachmentFile, saveAttachmentImage } from '../lib/db';
import { beginExternalActivity, endExternalActivity } from '../lib/auth';
import { FieldLabel } from './form';

interface Props {
  value: string | null | undefined;
  onChange: (uri: string | null) => void;
  label?: string;
}

export function AttachmentPicker({
  value,
  onChange,
  label = 'Foto / Bukti Transaksi (opsional)',
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  // --- Ambil foto langsung dari Kamera ---
  const handleCamera = async () => {
    setPickerModalOpen(false);
    // Tahan auto-lock: membuka kamera membuat aplikasi pindah ke background
    beginExternalActivity();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Kamera Ditolak',
          'Aplikasi membutuhkan izin akses kamera untuk mengambil foto bukti transaksi secara langsung. Silakan aktifkan izin di Pengaturan HP Anda.'
        );
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        const savedUri = await saveAttachmentImage(sourceUri);
        // Hapus file lama jika ada
        if (value && value !== savedUri) {
          deleteAttachmentFile(value);
        }
        onChange(savedUri);
      }
    } catch (err: any) {
      Alert.alert('Gagal Mengambil Foto', err?.message || 'Terjadi kesalahan saat membuka kamera');
    } finally {
      endExternalActivity();
      setLoading(false);
    }
  };

  // --- Pilih foto dari Galeri HP ---
  const handleGallery = async () => {
    setPickerModalOpen(false);
    // Tahan auto-lock: pemilih galeri sistem juga membuat aplikasi pindah background
    beginExternalActivity();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Izin Galeri Ditolak',
          'Aplikasi membutuhkan izin akses galeri foto untuk memilih foto bukti transaksi. Silakan aktifkan izin di Pengaturan HP Anda.'
        );
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        const savedUri = await saveAttachmentImage(sourceUri);
        if (value && value !== savedUri) {
          deleteAttachmentFile(value);
        }
        onChange(savedUri);
      }
    } catch (err: any) {
      Alert.alert('Gagal Memilih Foto', err?.message || 'Terjadi kesalahan saat membuka galeri');
    } finally {
      endExternalActivity();
      setLoading(false);
    }
  };

  // --- Hapus Lampiran ---
  const handleRemove = () => {
    Alert.alert('Hapus Bukti Foto', 'Apakah Anda yakin ingin menghapus foto lampiran ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          if (value) {
            deleteAttachmentFile(value);
          }
          onChange(null);
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 8 }}>
      <FieldLabel>{label}</FieldLabel>

      {loading ? (
        <View style={[styles.loadingBox, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={{ fontSize: 13, color: c.muted, fontWeight: '500' }}>
            Memproses foto...
          </Text>
        </View>
      ) : value ? (
        /* Preview Foto Terlampir */
        <View style={[styles.previewCard, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
          <Pressable onPress={() => setViewerOpen(true)} style={styles.thumbnailWrap}>
            <Image source={{ uri: value }} style={styles.thumbnail} resizeMode="cover" />
            <View style={styles.zoomBadge}>
              <FontAwesome6 name="magnifying-glass-plus" size={11} color="#fff" />
            </View>
          </Pressable>

          <View style={styles.previewInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FontAwesome6 name="circle-check" solid size={14} color={c.success} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
                Bukti Foto Terlampir
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: c.muted }}>Ketuk foto untuk memperbesar</Text>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => setPickerModalOpen(true)}
                style={[styles.smallBtn, { backgroundColor: c.primarySoft }]}
              >
                <FontAwesome6 name="camera-rotate" size={12} color={c.primary} />
                <Text style={[styles.smallBtnText, { color: c.primary }]}>Ganti</Text>
              </Pressable>

              <Pressable
                onPress={handleRemove}
                style={[styles.smallBtn, { backgroundColor: c.dangerSoft }]}
              >
                <FontAwesome6 name="trash-can" size={12} color={c.danger} />
                <Text style={[styles.smallBtnText, { color: c.danger }]}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* Tombol Pilihan: Kamera & Galeri */
        <View style={styles.btnRow}>
          <Pressable
            onPress={handleCamera}
            style={({ pressed }) => [
              styles.pickerBtn,
              {
                backgroundColor: pressed ? c.primarySoft : c.cardAlt,
                borderColor: pressed ? c.primary : c.inputBorder,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: c.primarySoft }]}>
              <FontAwesome6 name="camera" solid size={16} color={c.primary} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.btnTitle, { color: c.text }]}>Kamera Langsung</Text>
              <Text style={[styles.btnSub, { color: c.muted }]}>Ambil foto bukti</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleGallery}
            style={({ pressed }) => [
              styles.pickerBtn,
              {
                backgroundColor: pressed ? c.infoSoft : c.cardAlt,
                borderColor: pressed ? '#3b82f6' : c.inputBorder,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: c.infoSoft }]}>
              <FontAwesome6 name="image" solid size={16} color="#3b82f6" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.btnTitle, { color: c.text }]}>Galeri HP</Text>
              <Text style={[styles.btnSub, { color: c.muted }]}>Pilih dari album</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Modal Pilihan saat tombol "Ganti" ditekan */}
      <Modal
        visible={pickerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalOpen(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: c.overlay }]}
          onPress={() => setPickerModalOpen(false)}
        >
          <View style={[styles.modalDialog, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Ganti Foto Bukti Transaksi</Text>
            <Text style={[styles.modalSub, { color: c.muted }]}>
              Pilih cara pengambilan foto bukti transaksi:
            </Text>

            <View style={{ gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={handleCamera}
                style={[styles.dialogOption, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: c.primarySoft }]}>
                  <FontAwesome6 name="camera" solid size={16} color={c.primary} />
                </View>
                <View>
                  <Text style={[styles.btnTitle, { color: c.text }]}>Buka Kamera</Text>
                  <Text style={[styles.btnSub, { color: c.muted }]}>Ambil foto baru langsung</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleGallery}
                style={[styles.dialogOption, { backgroundColor: c.cardAlt, borderColor: c.border }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: c.infoSoft }]}>
                  <FontAwesome6 name="image" solid size={16} color="#3b82f6" />
                </View>
                <View>
                  <Text style={[styles.btnTitle, { color: c.text }]}>Pilih dari Galeri</Text>
                  <Text style={[styles.btnSub, { color: c.muted }]}>Ambil dari foto tersimpan</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setPickerModalOpen(false)}
                style={[styles.cancelBtn, { backgroundColor: c.cardAlt }]}
              >
                <Text style={{ color: c.subtext, fontWeight: '700', fontSize: 14 }}>Batal</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Fullscreen Lightbox Foto */}
      {value ? (
        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerOpen(false)}
          statusBarTranslucent
          navigationBarTranslucent
        >
          <View style={styles.viewerBackdrop}>
            {/* Header viewer */}
            <View
              style={[
                styles.viewerHeader,
                { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 6) },
              ]}
            >
              <Text style={styles.viewerTitle}>Bukti Transaksi</Text>
              <Pressable
                onPress={() => setViewerOpen(false)}
                hitSlop={12}
                style={styles.viewerCloseBtn}
              >
                <FontAwesome6 name="xmark" size={16} color="#fff" />
              </Pressable>
            </View>

            {/* Gambar utama */}
            <View style={styles.viewerImageWrap}>
              <Image source={{ uri: value }} style={styles.viewerImage} resizeMode="contain" />
            </View>

            {/* Footer viewer */}
            <View style={[styles.viewerFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                onPress={() => {
                  setViewerOpen(false);
                  setTimeout(() => setPickerModalOpen(true), 250);
                }}
                style={styles.viewerBtn}
              >
                <FontAwesome6 name="camera-rotate" size={14} color="#fff" />
                <Text style={styles.viewerBtnText}>Ganti Foto</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setViewerOpen(false);
                  handleRemove();
                }}
                style={[styles.viewerBtn, { backgroundColor: 'rgba(225,29,72,0.85)' }]}
              >
                <FontAwesome6 name="trash-can" size={14} color="#fff" />
                <Text style={styles.viewerBtnText}>Hapus</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnSub: {
    fontSize: 10,
    marginTop: 1,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  thumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dialogOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  viewerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
