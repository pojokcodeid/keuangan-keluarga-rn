// =============================================================================
// backup.ts — Backup & Restore database + lampiran foto (port dari FR-14 / FR-15)
//
// Dua format didukung dan dideteksi otomatis dari magic number berkas:
//   1. .zip   — database.sqlite + seluruh foto folder attachments/ (format utama)
//   2. .sqlite — database saja (format lama, kompatibel dengan versi web)
// =============================================================================

import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { unzipSync, zipSync, Unzipped, Zippable } from 'fflate';
import {
  closeDatabase,
  databaseFile,
  importDatabase,
  initDatabase,
  isSqliteBytes,
  remapAttachmentUris,
} from './db';
import { beginExternalActivity, endExternalActivity } from './auth';
import { pad2 } from './utils';

/** Nama entri database di dalam ZIP. */
const ZIP_DB_ENTRY = 'database.sqlite';
/** Prefiks folder lampiran di dalam ZIP. */
const ZIP_ATTACH_PREFIX = 'attachments/';
/** Tingkat kompresi ZIP (6 = seimbang; foto JPEG memang tak banyak menyusut). */
const ZIP_LEVEL = 6;

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Magic number ZIP: "PK\x03\x04" (ada isi) atau "PK\x05\x06" (kosong). */
function isZipBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const third = bytes[2];
  const fourth = bytes[3];
  return (third === 0x03 && fourth === 0x04) || (third === 0x05 && fourth === 0x06);
}

/** Bagikan berkas dari cache ke panel berbagi sistem (tahan auto-lock). */
async function shareBackup(
  file: File,
  mimeType: string,
  uti: string,
  dialogTitle: string
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Fitur berbagi berkas tidak tersedia di perangkat ini');
  }

  // Tahan auto-lock: panel berbagi sistem memindahkan aplikasi ke background
  beginExternalActivity();
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType,
      dialogTitle,
      UTI: uti,
    });
  } finally {
    endExternalActivity();
  }
}

export interface BackupResult {
  /** Jumlah foto lampiran yang ikut masuk ke backup. */
  photos: number;
}

/**
 * Buat backup lengkap (database + seluruh foto lampiran) sebagai berkas ZIP,
 * lalu bagikan (unduh) ke user.
 * Nama berkas: keuangan_keluarga_YYYY-MM-DD.zip
 */
export async function backupDatabase(): Promise<BackupResult> {
  // Pastikan semua transaksi sudah tertulis ke berkas utama
  const { getDB } = await import('./db');
  try {
    await getDB().execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    /* WAL mungkin tidak aktif — abaikan */
  }

  const src = databaseFile();
  if (!src.exists) throw new Error('Berkas database tidak ditemukan');

  const entries: Zippable = {};
  entries[ZIP_DB_ENTRY] = await src.bytes();

  // Kumpulkan seluruh foto lampiran
  let photos = 0;
  const attachmentsDir = new Directory(Paths.document, 'attachments');
  if (attachmentsDir.exists) {
    for (const item of attachmentsDir.list()) {
      if (item instanceof Directory) continue;
      try {
        entries[ZIP_ATTACH_PREFIX + item.name] = await item.bytes();
        photos++;
      } catch (err) {
        // Satu foto rusak tidak boleh menggagalkan seluruh backup
        console.warn('Lampiran dilewati saat backup:', item.name, err);
      }
    }
  }

  const zipBytes = zipSync(entries, { level: ZIP_LEVEL });

  const filename = `keuangan_keluarga_${todayStamp()}.zip`;
  const dest = new File(Paths.cache, filename);
  if (dest.exists) dest.delete();
  await dest.write(zipBytes);

  await shareBackup(dest, 'application/zip', 'public.zip-archive', 'Simpan Backup (Database + Foto)');
  return { photos };
}

/**
 * Backup database saja (tanpa foto) sebagai berkas .sqlite — format lama,
 * kompatibel dengan aplikasi web. Masih bisa dipulihkan oleh restore.
 */
export async function backupDatabaseSqlite(): Promise<void> {
  // Pastikan semua transaksi sudah tertulis ke berkas utama
  const { getDB } = await import('./db');
  try {
    await getDB().execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {
    /* WAL mungkin tidak aktif — abaikan */
  }

  const src = databaseFile();
  if (!src.exists) throw new Error('Berkas database tidak ditemukan');

  const filename = `keuangan_keluarga_${todayStamp()}.sqlite`;
  const dest = new File(Paths.cache, filename);
  if (dest.exists) dest.delete();
  await src.copy(dest);

  await shareBackup(dest, 'application/octet-stream', 'public.database', 'Simpan Backup Database');
}

export interface RestoreResult {
  /** true bila restore benar-benar dilakukan (bukan batal memilih berkas). */
  restored: boolean;
  /** Format berkas yang dipulihkan. */
  format: 'zip' | 'sqlite';
  /** Jumlah foto lampiran yang ikut dipulihkan. */
  photos: number;
}

const RESTORE_NOTHING: RestoreResult = { restored: false, format: 'sqlite', photos: 0 };

/**
 * Pilih berkas backup (.zip atau .sqlite) lalu timpa database + lampiran
 * aplikasi dengan isinya. Format dideteksi otomatis dari isi berkas.
 */
export async function restoreDatabase(): Promise<RestoreResult> {
  // Tahan auto-lock: pemilih berkas sistem memindahkan aplikasi ke background
  beginExternalActivity();
  let result;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
  } finally {
    endExternalActivity();
  }

  if (result.canceled || !result.assets || result.assets.length === 0) return RESTORE_NOTHING;

  const asset = result.assets[0];
  const picked = new File(asset.uri);
  const bytes = await picked.bytes();
  if (!bytes.length) throw new Error('File backup kosong');

  if (isZipBytes(bytes)) return restoreFromZip(bytes);
  if (isSqliteBytes(bytes)) {
    await importDatabase(bytes);
    // Path lampiran disesuaikan bila berkasnya memang ada di perangkat ini
    await remapAttachmentUris();
    return { restored: true, format: 'sqlite', photos: 0 };
  }

  throw new Error('Format file tidak dikenali — pilih file backup .zip atau .sqlite');
}

/** Pulihkan database + foto dari berkas ZIP backup. */
async function restoreFromZip(bytes: Uint8Array): Promise<RestoreResult> {
  let entries: Unzipped;
  try {
    // Hanya dekompresi entri yang dikenal — berkas asing diabaikan
    entries = unzipSync(bytes, {
      filter: (f) => f.name === ZIP_DB_ENTRY || f.name.startsWith(ZIP_ATTACH_PREFIX),
    });
  } catch {
    throw new Error('File backup ZIP rusak atau tidak didukung');
  }

  const dbBytes = entries[ZIP_DB_ENTRY];
  if (!dbBytes) throw new Error(`ZIP tidak berisi ${ZIP_DB_ENTRY}`);
  if (!isSqliteBytes(dbBytes)) throw new Error('Isi ZIP bukan database SQLite yang valid');

  // Tulis foto dulu — bila gagal, database lama tidak ikut hilang
  const photos = await extractAttachments(entries);

  await importDatabase(dbBytes);

  // Path lampiran di database menunjuk ke perangkat lama — arahkan ke perangkat ini
  await remapAttachmentUris();

  return { restored: true, format: 'zip', photos };
}

/** Salin seluruh berkas `attachments/*` dari ZIP ke folder lampiran aplikasi. */
async function extractAttachments(entries: Unzipped): Promise<number> {
  const attachmentsDir = new Directory(Paths.document, 'attachments');
  if (!attachmentsDir.exists) attachmentsDir.create();

  let count = 0;
  for (const key of Object.keys(entries)) {
    if (!key.startsWith(ZIP_ATTACH_PREFIX)) continue;

    // Ambil nama berkasnya saja — tolak jalur berbahaya (../ dst.)
    const raw = key.slice(ZIP_ATTACH_PREFIX.length);
    const name = raw.split('/').pop() || '';
    if (!name || name === '.' || name === '..') continue;

    try {
      const dest = new File(attachmentsDir, name);
      if (dest.exists) dest.delete();
      await dest.write(entries[key]);
      count++;
    } catch (err) {
      // Satu foto gagal tidak menggagalkan restore sisanya
      console.warn('Gagal menulis lampiran hasil restore:', name, err);
    }
  }
  return count;
}

/** Tutup database (dipakai sebelum proses restore eksternal). */
export { closeDatabase, initDatabase };
