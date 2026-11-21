// =============================================================================
// utils.ts — Utility / Helper Functions (port dari js/utils.js)
// Keuangan Keluarga — React Native
// =============================================================================

import type { Language } from '../i18n/translations';

// ---------------------------------------------------------------------------
// Locale data
// ---------------------------------------------------------------------------
export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTH_NAMES_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export const DAY_NAMES_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTH_NAMES_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAY_NAMES_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const MONTH_NAMES = MONTH_NAMES_ID;
export const MONTH_NAMES_SHORT = MONTH_NAMES_SHORT_ID;
export const DAY_NAMES = DAY_NAMES_ID;

export function getMonthNames(lang: Language = 'id'): readonly string[] {
  return lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ID;
}

export function getMonthNamesShort(lang: Language = 'id'): readonly string[] {
  return lang === 'en' ? MONTH_NAMES_SHORT_EN : MONTH_NAMES_SHORT_ID;
}

export function getDayNames(lang: Language = 'id'): readonly string[] {
  return lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_ID;
}

// ---------------------------------------------------------------------------
// Currency & number formatting
// ---------------------------------------------------------------------------

/** Format angka ke Rupiah: "Rp 1.234.567" */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return 'Rp 0';
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (isNegative ? '-Rp ' : 'Rp ') + formatted;
}

/** Format string angka menjadi pemisah ribuan titik: "1.234.567" */
export function formatNumberString(val: string | number | null | undefined): string {
  if (val == null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Parse input nominal bergaya Indonesia: "1.000.500" → 1000500 */
export function parseAmount(str: string | number | null | undefined): number {
  if (str == null) return 0;
  let s = String(str).trim();
  s = s.replace(/^Rp\s*/i, '');
  s = s.replace(/\s/g, '');

  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else {
    const dotParts = s.split('.');
    if (dotParts.length > 2) {
      s = s.replace(/\./g, '');
    } else if (dotParts.length === 2 && dotParts[1].length === 3) {
      s = s.replace(/\./g, '');
    }
  }

  const num = parseFloat(s);
  return Number.isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Format ukuran file ke satuan yang mudah dibaca (KB / MB). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse "YYYY-MM-DD" → Date (tanpa masalah timezone) */
export function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2024-01-15" → "15 Jan 2024" */
export function formatDate(dateStr: string | null | undefined, lang: Language = 'id'): string {
  const dt = parseDate(dateStr);
  const months = getMonthNamesShort(lang);
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** "2024-01-15" → "Senin, 15 Januari 2024" */
export function formatDateFull(dateStr: string | null | undefined, lang: Language = 'id'): string {
  const dt = parseDate(dateStr);
  const days = getDayNames(lang);
  const months = getMonthNames(lang);
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Label grup transaksi: "Hari Ini" / "Kemarin" / "15 Januari 2024" */
export function formatDateGroup(dateStr: string | null | undefined, lang: Language = 'id'): string {
  const dt = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dt.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return lang === 'en' ? 'Today' : 'Hari Ini';
  if (diffDays === 1) return lang === 'en' ? 'Yesterday' : 'Kemarin';

  const months = getMonthNames(lang);
  return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** Nama bulan (1-12) */
export function getMonthName(month: number, lang: Language = 'id'): string {
  const months = getMonthNames(lang);
  return months[(month - 1 + 12) % 12];
}

/** "Januari 2024" */
export function getMonthYear(date?: Date, lang: Language = 'id'): string {
  const dt = date instanceof Date ? date : new Date();
  const months = getMonthNames(lang);
  return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function todayISO(): string {
  return toISO(new Date());
}

/** "2024-05" */
export function currentYearMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * Rentang periode kalender budget (sama dengan db.js getPeriodRange).
 * harian = hari ini, mingguan = Senin–Minggu, bulanan = 1 s/d akhir bulan.
 */
export function getPeriodRange(
  type: 'daily' | 'weekly' | 'monthly',
  ref: Date = new Date()
): { start: string; end: string; endDate: Date } {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let s = new Date(d);
  let e = new Date(d);
  if (type === 'weekly') {
    s = new Date(d);
    s.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    e = new Date(s);
    e.setDate(s.getDate() + 6);
  } else if (type === 'monthly') {
    s = new Date(d.getFullYear(), d.getMonth(), 1);
    e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }
  return { start: toISO(s), end: toISO(e), endDate: e };
}

/** Format angka ringkas untuk sumbu grafik: "Rp 1,2 jt" */
export function formatAxisLabel(value: number, lang: Language = 'id'): string {
  if (value === 0) return 'Rp 0';
  const abs = Math.abs(value);
  const mUnit = lang === 'en' ? 'B' : 'M';
  const kUnit = lang === 'en' ? 'k' : 'rb';
  const jUnit = lang === 'en' ? 'M' : 'jt';
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} ${mUnit}`;
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} ${jUnit}`;
  if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} ${kUnit}`;
  return `Rp ${value}`;
}
