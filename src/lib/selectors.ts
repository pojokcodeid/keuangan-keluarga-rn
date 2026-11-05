// =============================================================================
// selectors.ts — Perhitungan derivasi dari snapshot (port dari query laporan db.js)
// =============================================================================

import { Account, Budget, Category, Snapshot, TransactionRow } from './db';
import { getCurrentMonth, getCurrentYear, getPeriodRange, MONTH_NAMES_SHORT } from './utils';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/**
 * Saldo akun = saldo awal + pemasukan − pengeluaran + transfer masuk − transfer keluar.
 */
export function getAccountBalance(
  accounts: Account[],
  txs: TransactionRow[],
  id: number
): number {
  const account = accounts.find((a) => a.id === id);
  if (!account) throw new Error('Akun tidak ditemukan');

  const initial = account.initial_balance || 0;
  let income = 0;
  let expense = 0;
  let transferIn = 0;
  let transferOut = 0;

  for (const t of txs) {
    if (t.account_id === id) {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      else if (t.type === 'transfer') transferOut += t.amount;
    }
    if (t.to_account_id === id && t.type === 'transfer') {
      transferIn += t.amount;
    }
  }

  return initial + income - expense + transferIn - transferOut;
}

export function getTotalBalance(accounts: Account[], txs: TransactionRow[]): number {
  return accounts.reduce((sum, acc) => sum + getAccountBalance(accounts, txs, acc.id), 0);
}

// ---------------------------------------------------------------------------
// Filter transaksi
// ---------------------------------------------------------------------------

export interface TxFilters {
  month?: number | null;
  year?: number | null;
  accountId?: number | null;
  categoryId?: number | null;
  type?: 'income' | 'expense' | 'transfer' | null;
}

export function filterTransactions(txs: TransactionRow[], f: TxFilters = {}): TransactionRow[] {
  return txs.filter((t) => {
    if (f.month != null || f.year != null) {
      const [y, m] = (t.transaction_date || '').split('-').map(Number);
      if (f.month != null && m !== f.month) return false;
      if (f.year != null && y !== f.year) return false;
    }
    if (f.accountId != null && t.account_id !== f.accountId && t.to_account_id !== f.accountId) {
      return false;
    }
    if (f.categoryId != null && t.category_id !== f.categoryId) return false;
    if (f.type && t.type !== f.type) return false;
    return true;
  });
}

function inMonth(t: TransactionRow, month: number, year: number): boolean {
  const [y, m] = (t.transaction_date || '').split('-').map(Number);
  return m === month && y === year;
}

// ---------------------------------------------------------------------------
// Ringkasan bulanan
// ---------------------------------------------------------------------------

export function getMonthlyIncome(txs: TransactionRow[], month: number, year: number): number {
  return txs
    .filter((t) => t.type === 'income' && inMonth(t, month, year))
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthlyExpense(txs: TransactionRow[], month: number, year: number): number {
  return txs
    .filter((t) => t.type === 'expense' && inMonth(t, month, year))
    .reduce((s, t) => s + t.amount, 0);
}

export function getMonthlySummary(txs: TransactionRow[], month: number, year: number) {
  const totalIncome = getMonthlyIncome(txs, month, year);
  const totalExpense = getMonthlyExpense(txs, month, year);
  const transactionCount = txs.filter((t) => inMonth(t, month, year)).length;
  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    transactionCount,
  };
}

// ---------------------------------------------------------------------------
// Grafik
// ---------------------------------------------------------------------------

export interface ExpenseByCategoryRow {
  categoryId: number | null;
  categoryName: string;
  icon: string | null;
  total: number;
}

/** Total pengeluaran per kategori (untuk pie chart). */
export function getExpenseByCategory(
  txs: TransactionRow[],
  categories: Category[],
  month: number,
  year: number
): ExpenseByCategoryRow[] {
  const map = new Map<number, ExpenseByCategoryRow>();
  for (const t of txs) {
    if (t.type !== 'expense' || !inMonth(t, month, year)) continue;
    const key = t.category_id ?? 0;
    const cat = t.category_id ? categories.find((c) => c.id === t.category_id) : null;
    const existing = map.get(key);
    if (existing) {
      existing.total += t.amount;
    } else {
      map.set(key, {
        categoryId: t.category_id ?? null,
        categoryName: t.category_name || cat?.name || 'Tanpa Kategori',
        icon: t.category_icon || cat?.icon || null,
        total: t.amount,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export interface MonthlySeries {
  month: number;
  year: number;
  income: number;
  expense: number;
}

/** Pemasukan vs pengeluaran N bulan terakhir (termasuk bulan ini). */
export function getIncomeVsExpense(txs: TransactionRow[], months = 6): MonthlySeries[] {
  const results: MonthlySeries[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    results.push({
      month: m,
      year: y,
      income: getMonthlyIncome(txs, m, y),
      expense: getMonthlyExpense(txs, m, y),
    });
  }
  return results;
}

export const SHORT_MONTHS = MONTH_NAMES_SHORT;

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetStatus extends Budget {
  start: string;
  end: string;
  spent: number;
  remaining: number;
  daysLeft: number;
  percentage: number;
  dailySafe: number;
}

/**
 * Status real-time setiap budget pada periode berjalan:
 * terpakai, persentase, sisa, dan batas aman per hari.
 */
export function getBudgetStatuses(snap: Snapshot, onlyActive = false): BudgetStatus[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return snap.budgets
    .filter((b) => !onlyActive || b.is_active)
    .map((b) => {
      const { start, end, endDate } = getPeriodRange(b.period_type, now);
      let spent = 0;
      for (const t of snap.transactions) {
        if (t.type !== 'expense') continue;
        if (t.transaction_date < start || t.transaction_date > end) continue;
        if (b.category_id && t.category_id !== b.category_id) continue;
        spent += t.amount;
      }
      const remaining = b.amount_limit - spent;
      const daysLeft = Math.max(1, Math.round((endDate.getTime() - today.getTime()) / 864e5) + 1);
      return {
        ...b,
        start,
        end,
        spent,
        remaining,
        daysLeft,
        percentage: b.amount_limit > 0 ? (spent / b.amount_limit) * 100 : 0,
        dailySafe: Math.max(0, remaining) / daysLeft,
      };
    });
}

export interface BudgetForTransaction extends Budget {
  start: string;
  end: string;
  spent: number;
  after: number;
  remaining: number;
  percentage: number;
}

/**
 * Budget yang terdampak oleh sebuah pengeluaran (global + kategori yang sama),
 * dihitung pada periode yang memuat tanggal transaksi.
 * `amount` ditambahkan ke terpakai (simulasi); `excludeId` dipakai saat edit.
 */
export function getBudgetsForTransaction(
  snap: Snapshot,
  opts: {
    date: string;
    categoryId?: number | null;
    amount?: number;
    excludeId?: number | null;
  }
): BudgetForTransaction[] {
  const { date, categoryId = null, amount = 0, excludeId = null } = opts;
  const [y, m, d] = date.split('-').map(Number);
  const ref = new Date(y, m - 1, d);

  return snap.budgets
    .filter((b) => b.is_active && (!b.category_id || b.category_id === categoryId))
    .map((b) => {
      const { start, end } = getPeriodRange(b.period_type, ref);
      let spent = 0;
      for (const t of snap.transactions) {
        if (t.type !== 'expense') continue;
        if (excludeId && t.id === excludeId) continue;
        if (t.transaction_date < start || t.transaction_date > end) continue;
        if (b.category_id && t.category_id !== b.category_id) continue;
        spent += t.amount;
      }
      const after = spent + (amount || 0);
      return {
        ...b,
        start,
        end,
        spent,
        after,
        remaining: b.amount_limit - after,
        percentage: (after / b.amount_limit) * 100,
      };
    });
}

// ---------------------------------------------------------------------------
// Penggunaan anggaran kategori (laporan ringkasan)
// ---------------------------------------------------------------------------

export interface BudgetUsageRow {
  categoryId: number;
  categoryName: string;
  budgetLimit: number;
  spent: number;
  percentage: number;
}

/** Penggunaan batas anggaran per kategori (budget_limit kategori) pada bulan tertentu. */
export function getBudgetUsage(
  txs: TransactionRow[],
  categories: Category[],
  month: number,
  year: number
): BudgetUsageRow[] {
  return categories
    .filter((c) => c.type === 'expense' && c.budget_limit > 0)
    .map((c) => {
      const spent = txs
        .filter((t) => t.type === 'expense' && t.category_id === c.id && inMonth(t, month, year))
        .reduce((s, t) => s + t.amount, 0);
      return {
        categoryId: c.id,
        categoryName: c.name,
        budgetLimit: c.budget_limit,
        spent,
        percentage:
          c.budget_limit > 0 ? Math.round((spent / c.budget_limit) * 100 * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

// ---------------------------------------------------------------------------
// Pengelompokan transaksi per tanggal (daftar transaksi)
// ---------------------------------------------------------------------------

export interface TxGroup {
  date: string;
  txs: TransactionRow[];
  dailyIncome: number;
  dailyExpense: number;
}

export function groupTransactions(txs: TransactionRow[]): TxGroup[] {
  const groups = new Map<string, TransactionRow[]>();
  for (const tx of txs) {
    const key = tx.transaction_date || 'Tanpa Tanggal';
    const arr = groups.get(key);
    if (arr) arr.push(tx);
    else groups.set(key, [tx]);
  }

  const out: TxGroup[] = [];
  groups.forEach((arr, date) => {
    let dailyIncome = 0;
    let dailyExpense = 0;
    for (const t of arr) {
      if (t.type === 'income') dailyIncome += t.amount;
      if (t.type === 'expense') dailyExpense += t.amount;
    }
    out.push({ date, txs: arr, dailyIncome, dailyExpense });
  });
  return out;
}

/** Saldo semua akun hari ini (untuk header). */
export function currentBalances(snap: Snapshot): { account: Account; balance: number }[] {
  return snap.accounts.map((account) => ({
    account,
    balance: getAccountBalance(snap.accounts, snap.transactions, account.id),
  }));
}

export function currentMonthYear(): { month: number; year: number } {
  return { month: getCurrentMonth(), year: getCurrentYear() };
}
