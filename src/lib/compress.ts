// =============================================================================
// compress.ts — Kompresi gambar lampiran sebelum disimpan permanen.
//
// Foto dari kamera/galeri modern beresolusi 8–12 MP (2–6 MB). Untuk bukti
// transaksi, sisi terpanjang 1600 px + JPEG quality 0.7 sudah sangat cukup
// untuk dibaca di layar HP, sementara ukuran file turun drastis (biasanya
// 80–95%). Ini juga mempercepat muat daftar transaksi & backup database.
// =============================================================================

import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Sisi terpanjang hasil kompresi (px). */
export const MAX_DIMENSION = 1600;
/** Kualitas JPEG hasil kompresi (0 = terkecil, 1 = terbaik). */
export const JPEG_QUALITY = 0.7;
/** Di bawah ukuran ini file dilewat apa adanya (tidak perlu decode ulang). */
const SKIP_BELOW_BYTES = 150 * 1024;

export interface CompressResult {
  /** URI hasil — file sementara di cache bila `compressed` true. */
  uri: string;
  /** Ukuran file sumber dalam byte. */
  originalSize: number;
  /** Ukuran file hasil dalam byte. */
  size: number;
  /** true bila gambar benar-benar dikompresi (bukan file sumber). */
  compressed: boolean;
}

/** Baca ukuran file (0 bila tidak ada / tidak terbaca). */
export function getFileSize(uri: string | null | undefined): number {
  if (!uri) return 0;
  try {
    const f = new File(uri);
    return f.exists ? f.size : 0;
  } catch {
    return 0;
  }
}

/**
 * Kompresi gambar: batasi sisi terpanjang ke MAX_DIMENSION lalu simpan sebagai
 * JPEG quality JPEG_QUALITY. Hasil berada di direktori cache — pemanggil bertanggung
 * jawab memindahkan lalu menghapusnya (lihat saveAttachmentImage di db.ts).
 *
 * Bila sumber sudah kecil, fungsi ini melewatinya apa adanya (`compressed: false`).
 * Bila kompresi gagal, fungsi ini melempar error agar pemanggil bisa fallback.
 */
export async function compressImage(sourceUri: string): Promise<CompressResult> {
  const originalSize = getFileSize(sourceUri);
  if (originalSize > 0 && originalSize <= SKIP_BELOW_BYTES) {
    return { uri: sourceUri, originalSize, size: originalSize, compressed: false };
  }

  // maxWidth/maxHeight men-downsample saat decode, sehingga foto resolusi sangat
  // tinggi tidak pernah dimuat penuh ke memori (mencegah OOM di HP kelas bawah).
  const context = ImageManipulator.manipulate(sourceUri, {
    maxWidth: MAX_DIMENSION,
    maxHeight: MAX_DIMENSION,
  });
  let image = await context.renderAsync();

  // Jaga-jaga: bila platform tidak menghormati downsampling decode, resize eksplisit.
  if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(image.width, image.height);
    const retry = ImageManipulator.manipulate(sourceUri, {
      maxWidth: MAX_DIMENSION,
      maxHeight: MAX_DIMENSION,
    });
    retry.resize({
      width: Math.max(1, Math.round(image.width * scale)),
      height: Math.max(1, Math.round(image.height * scale)),
    });
    image = await retry.renderAsync();
  }

  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });
  return { uri: saved.uri, originalSize, size: getFileSize(saved.uri), compressed: true };
}
