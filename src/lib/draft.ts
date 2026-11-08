// =============================================================================
// draft.ts — Penyimpanan sementara isi form modal di memori.
//
// Aplikasi merender ulang (unmount) form saat terkunci layar PIN, sehingga
// seluruh useState di dalamnya ikut hilang — termasuk foto lampiran yang sudah
// dipilih dari kamera/galeri. Draft menahan isi form tersebut agar bisa
// dipulihkan kembali setelah PIN dimasukkan.
//
// Draft dihapus saat form ditutup secara sengaja (tombol X, backdrop,
// simpan, hapus) dan TIDAK dihapus saat unmount karena kunci aplikasi.
// =============================================================================

type DraftData = Record<string, unknown>;

const drafts = new Map<string, DraftData>();

/** Baca draft terakhir untuk key tersebut (null jika tidak ada). */
export function readDraft<T extends DraftData>(key: string): Partial<T> | null {
  const value = drafts.get(key);
  return value ? ({ ...value } as Partial<T>) : null;
}

/** Simpan/timpa draft. */
export function writeDraft(key: string, data: DraftData): void {
  drafts.set(key, { ...data });
}

/** Hapus draft (dipanggil saat form ditutup atau berhasil disimpan). */
export function clearDraft(key: string): void {
  drafts.delete(key);
}
