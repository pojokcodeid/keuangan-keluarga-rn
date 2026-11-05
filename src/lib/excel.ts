// =============================================================================
// excel.ts — Ekspor laporan Excel (SheetJS / xlsx), port dari js/export.js
// Berkas ditulis ke cache lalu dibagikan lewat share sheet perangkat.
// =============================================================================

import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Account, Snapshot } from './db';
import { getAccountBalance } from './selectors';
import { getCurrentMonth, getCurrentYear, getMonthName, pad2 } from './utils';

const TYPE_LABELS: Record<string, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer Antar-Akun',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: 'Dompet / Kas Tunai',
  wallet: 'Dompet / Kas Tunai',
  bank: 'Rekening Bank',
  'e-wallet': 'E-Wallet',
  savings: 'Tabungan',
  other: 'Lainnya',
};

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

/**
 * Ekspor data keuangan ke workbook .xlsx (3 lembar) lalu bagikan ke user.
 */
export async function exportToExcel(snap: Snapshot, filters?: { month?: number; year?: number }): Promise<void> {
  const wb = XLSX.utils.book_new();

  // ==================================================================
  // Worksheet 1: Detail Transaksi
  // ==================================================================
  let transactions = snap.transactions;
  if (filters && filters.month != null && filters.year != null) {
    transactions = transactions.filter((t) => {
      const [y, m] = (t.transaction_date || '').split('-').map(Number);
      return m === filters.month && y === filters.year;
    });
  }

  const txHeaders = ['No', 'Tanggal', 'Jenis', 'Akun Asal', 'Akun Tujuan', 'Kategori', 'Nominal (Rp)', 'Catatan'];
  let txRows: (string | number)[][] = [];

  if (transactions.length === 0) {
    txRows = [['-', '-', 'Belum ada data transaksi', '-', '-', '-', 0, '-']];
  } else {
    txRows = transactions.map((tx, idx) => [
      idx + 1,
      tx.transaction_date || '',
      TYPE_LABELS[tx.type] || tx.type,
      tx.account_name || '-',
      tx.to_account_name || '-',
      tx.category_name || (tx.type === 'transfer' ? 'Transfer' : 'Tanpa Kategori'),
      Number(tx.amount) || 0,
      tx.note || '',
    ]);
  }

  const wsTransactions = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
  wsTransactions['!cols'] = [
    { wch: 6 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 35 },
  ];
  if (transactions.length > 0) {
    wsTransactions['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: txRows.length, c: txHeaders.length - 1 },
      }),
    };
  }
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Detail Transaksi');

  // ==================================================================
  // Worksheet 2: Ringkasan Bulanan
  // ==================================================================
  const monthlyMap = new Map<string, { year: number; month: number; income: number; expense: number }>();
  for (const t of snap.transactions) {
    const [y, m] = (t.transaction_date || '').split('-').map(Number);
    if (!y || !m) continue;
    const key = `${y}-${m}`;
    let row = monthlyMap.get(key);
    if (!row) {
      row = { year: y, month: m, income: 0, expense: 0 };
      monthlyMap.set(key, row);
    }
    if (t.type === 'income') row.income += t.amount;
    else if (t.type === 'expense') row.expense += t.amount;
  }

  let monthlySummaries = Array.from(monthlyMap.values()).sort((a, b) =>
    a.year === b.year ? b.month - a.month : b.year - a.year
  );

  if (monthlySummaries.length === 0) {
    monthlySummaries = [{ year: getCurrentYear(), month: getCurrentMonth(), income: 0, expense: 0 }];
  }

  const msHeaders = ['Bulan', 'Tahun', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Selisih Bersih (Rp)'];
  let totalAllIncome = 0;
  let totalAllExpense = 0;

  const msRows = monthlySummaries.map((row) => {
    const income = Number(row.income) || 0;
    const expense = Number(row.expense) || 0;
    totalAllIncome += income;
    totalAllExpense += expense;
    return [getMonthName(row.month), row.year, income, expense, income - expense];
  });
  msRows.push(['TOTAL KESELURUHAN', '', totalAllIncome, totalAllExpense, totalAllIncome - totalAllExpense]);

  const wsSummary = XLSX.utils.aoa_to_sheet([msHeaders, ...msRows]);
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 24 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

  // ==================================================================
  // Worksheet 3: Saldo Akun & Dompet
  // ==================================================================
  const accounts: Account[] = snap.accounts;
  const acHeaders = ['No', 'Nama Akun / Rekening', 'Jenis Akun', 'Saldo Awal (Rp)', 'Saldo Saat Ini (Rp)'];
  let acRows: (string | number)[][] = [];
  let totalInitial = 0;
  let totalCurrent = 0;

  if (accounts.length === 0) {
    acRows = [['-', 'Belum ada akun', '-', 0, 0]];
  } else {
    acRows = accounts.map((acc, idx) => {
      const currentBalance = getAccountBalance(snap.accounts, snap.transactions, acc.id);
      const initial = Number(acc.initial_balance) || 0;
      totalInitial += initial;
      totalCurrent += currentBalance;
      return [
        idx + 1,
        acc.name || '',
        ACCOUNT_TYPE_LABELS[acc.type] || acc.type || 'Umum',
        initial,
        currentBalance,
      ];
    });
    acRows.push(['TOTAL SALDO', '', '', totalInitial, totalCurrent]);
  }

  const wsAccounts = XLSX.utils.aoa_to_sheet([acHeaders, ...acRows]);
  wsAccounts['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Saldo Akun');

  // ==================================================================
  // Generate & bagikan berkas
  // ==================================================================
  const today = new Date();
  const filename = `Laporan_Keuangan_${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(
    today.getDate()
  )}.xlsx`;

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer | Uint8Array;
  const bytes = toUint8Array(out);

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  await file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Bagikan Laporan Excel',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  } else {
    throw new Error('Fitur berbagi berkas tidak tersedia di perangkat ini');
  }
}
