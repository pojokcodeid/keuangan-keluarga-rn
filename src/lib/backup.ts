// =============================================================================
// backup.ts — Backup & Restore database SQLite (port dari fitur FR-14 / FR-15)
// =============================================================================

import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { closeDatabase, databaseFile, importDatabase, initDatabase } from './db';
import { pad2 } from './utils';

/**
 * Salin berkas database ke cache lalu bagikan (unduh) ke user.
 * Nama berkas sama dengan versi web: keuangan_keluarga_YYYY-MM-DD.sqlite
 */
export async function backupDatabase(): Promise<void> {
  // Pastikan semua transaksi sudah tertulis ke berkas utama
  const { getDB } = await import('./db');
  try {
    await getDB().execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    /* WAL mungkin tidak aktif — abaikan */
  }

  const src = databaseFile();
  if (!src.exists) throw new Error('Berkas database tidak ditemukan');

  const today = new Date();
  const filename = `keuangan_keluarga_${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(
    today.getDate()
  )}.sqlite`;

  const dest = new File(Paths.cache, filename);
  if (dest.exists) dest.delete();
  await src.copy(dest);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi berkas tidak tersedia di perangkat ini');
  }

  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Simpan Backup Database',
    UTI: 'public.database',
  });
}

/**
 * Pilih berkas .sqlite lalu timpa database aplikasi dengan isinya.
 * @returns true jika restore dilakukan
 */
export async function restoreDatabase(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) return false;

  const asset = result.assets[0];
  const picked = new File(asset.uri);
  const bytes = await picked.bytes();

  await importDatabase(bytes);
  return true;
}

/** Tutup database (dipakai sebelum proses restore eksternal). */
export { closeDatabase, initDatabase };
