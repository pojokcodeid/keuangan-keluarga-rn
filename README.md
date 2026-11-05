# Keuangan Keluarga — React Native (Expo)

Aplikasi akuntansi rumah tangga versi mobile, port dari aplikasi web PWA
[`../keuangan-keluarga`](../keuangan-keluarga) dengan **paritas fitur penuh**.

Dibangun dengan **Expo SDK 58** + **TypeScript**, database lokal **expo-sqlite**
(skema identik dengan versi web sehingga file backup `.sqlite` saling kompatibel),
grafik native **react-native-svg** (tanpa WebView/Chart.js).

## Menjalankan

```bash
npm install          # sudah dijalankan saat scaffolding
npx expo start       # dev server (Expo Go / emulator)
npx expo run:android # build native lokal (butuh Android Studio)
npx expo run:ios     # build native lokal (butuh Xcode)
```

Pemeriksaan kualitas:

```bash
npx tsc --noEmit   # typecheck
npx expo lint      # eslint
npx expo-doctor    # dependensi & konfigurasi
```

## Fitur (sama dengan versi web)

| Fitur | Keterangan |
| --- | --- |
| Dashboard | Total saldo, pemasukan/pengeluaran bulan ini, peringatan budget (≥75%), 5 transaksi terakhir |
| Transaksi | Filter bulan/akun/kategori, daftar dikelompokkan per tanggal, tambah/edit/hapus (pemasukan, pengeluaran, transfer) |
| Budget | Harian / mingguan / bulanan, indikator tonal (hijau <75%, amber 75–99%, merah ≥100%), sisa & batas aman/hari |
| Laporan | Tab Ringkasan (ringkasan bulanan + penggunaan anggaran) & Grafik (donut per kategori, budget vs realisasi, batang pemasukan vs pengeluaran 6 bulan), ekspor Excel |
| Pengaturan | Tema Terang/Gelap/Otomatis, PIN + auto-lock, akun & dompet, kategori (pemasukan/pengeluaran), backup/restore `.sqlite`, export `.xlsx` |
| Keamanan | PIN SHA-256 + salt (expo-crypto), layar kunci keypad, kunci otomatis saat aplikasi ke latar (mode "segera") |

## Struktur

```
App.tsx                     # cangkang: header, tab, FAB, nav bawah, lock, modal, toast
index.ts                    # registerRootComponent
src/
  state/
    AppContext.tsx          # snapshot DB, navigasi tab, modal, toast, konfirmasi, lock
    ThemeContext.tsx        # mode terang/gelap/otomatis
  lib/
    db.ts                   # skema + CRUD (identik js/db.js), backup/restore bytes
    selectors.ts            # turunan: saldo, ringkasan bulanan, budget, grafik
    auth.ts                 # PIN, sesi, auto-lock
    excel.ts / backup.ts    # ekspor .xlsx, backup/restore .sqlite
    icons.tsx / utils.ts    # ikon FA6 + kompatibilitas data lama, format rupiah/tanggal
  components/               # form, date picker, modal sheet, chart SVG, toast, lock, dsb.
  modals/                   # transaksi, budget, akun, kategori, set/PIN, nonaktifkan PIN
  screens/                  # dashboard, transaksi, budget, laporan, pengaturan
```

## Catatan kompatibilitas

- Skema tabel `accounts`, `categories`, `transactions`, `budgets` identik dengan
  sql.js di versi web → file backup `.sqlite` dapat dipindahkan dua arah.
- Ikon tersimpan sebagai `"fa-solid fa-utensils|#F97316"`; nama ikon lama (lucide)
  dan emoji mentah tetap dirender lewat `parseIcon()`.
- Data awal (2 akun, kategori, migrasi batas anggaran kategori → budget) mengikuti
  perilaku `js/db.js` persis.
