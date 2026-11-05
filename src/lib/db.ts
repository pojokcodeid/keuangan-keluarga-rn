// =============================================================================
// db.ts — Database Module (expo-sqlite / SQLite native)
// Skema & perilaku identik dengan js/db.js (sql.js) agar backup .sqlite kompatibel.
// =============================================================================

import * as SQLite from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';

// ---------------------------------------------------------------------------
// Tipe data
// ---------------------------------------------------------------------------

export interface Account {
  id: number;
  name: string;
  type: string;
  initial_balance: number;
  icon: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  budget_limit: number;
  icon: string;
  created_at?: string;
}

export interface TransactionRow {
  id: number;
  account_id: number;
  to_account_id: number | null;
  category_id: number | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string;
  note: string | null;
  created_at?: string;
  account_name?: string | null;
  account_icon?: string | null;
  to_account_name?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
}

export interface Budget {
  id: number;
  name: string;
  category_id: number | null;
  period_type: 'daily' | 'weekly' | 'monthly';
  amount_limit: number;
  is_active: number;
  icon: string | null;
  created_at?: string;
  category_name?: string | null;
  category_icon?: string | null;
}

export interface Snapshot {
  accounts: Account[];
  categories: Category[];
  transactions: TransactionRow[];
  budgets: Budget[];
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const DB_NAME = 'keuangan-keluarga.db';
let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cash',
    initial_balance REAL DEFAULT 0.0,
    icon TEXT DEFAULT 'wallet',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    budget_limit REAL DEFAULT 0.0,
    icon TEXT DEFAULT 'tag',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    to_account_id INTEGER,
    category_id INTEGER,
    type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
    amount REAL NOT NULL,
    transaction_date DATE NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    period_type TEXT CHECK(period_type IN ('daily', 'weekly', 'monthly')) NOT NULL,
    amount_limit REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database belum diinisialisasi');
  return db;
}

export function databaseFile(): File {
  return new File(Paths.document, 'SQLite', DB_NAME);
}

async function run(sql: string, params: any[] = []): Promise<void> {
  try {
    await getDB().runAsync(sql, params);
  } catch (err: any) {
    console.error('Run error:', sql, err);
    throw new Error('Gagal menjalankan perintah: ' + (err?.message || String(err)));
  }
}

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    return await getDB().getAllAsync<T>(sql, params);
  } catch (err: any) {
    console.error('Query error:', sql, err);
    throw new Error('Gagal menjalankan query: ' + (err?.message || String(err)));
  }
}

async function scalar(sql: string, params: any[] = []): Promise<number | null> {
  const rows = await query<any>(sql, params);
  if (!rows || rows.length === 0) return null;
  const first = rows[0];
  const keys = Object.keys(first);
  if (keys.length === 0) return null;
  const v = first[keys[0]];
  return v == null ? null : Number(v);
}

// ---------------------------------------------------------------------------
// Schema & seed data
// ---------------------------------------------------------------------------

async function ensureBudgetColumns(): Promise<void> {
  const cols = (await query<{ name: string }>('PRAGMA table_info(budgets)')).map((c) => c.name);
  if (!cols.includes('icon')) await run('ALTER TABLE budgets ADD COLUMN icon TEXT');
}

// Migrasi satu kali: batas bulanan per kategori lama -> budget bulanan
async function migrateCategoryBudgets(): Promise<void> {
  await run(
    `INSERT INTO budgets (name, category_id, period_type, amount_limit, is_active)
     SELECT 'Budget ' || name, id, 'monthly', budget_limit, 1
     FROM categories WHERE type = 'expense' AND budget_limit > 0`
  );
}

async function seedData(): Promise<void> {
  const accountCount = (await scalar('SELECT COUNT(*) FROM accounts')) || 0;
  const categoryCount = (await scalar('SELECT COUNT(*) FROM categories')) || 0;

  if (accountCount === 0) {
    await run(
      'INSERT INTO accounts (name, type, icon, initial_balance) VALUES (?, ?, ?, ?)',
      ['Tunai', 'cash', 'wallet', 0]
    );
    await run(
      'INSERT INTO accounts (name, type, icon, initial_balance) VALUES (?, ?, ?, ?)',
      ['Bank BCA', 'bank', 'landmark', 0]
    );
  }

  if (categoryCount === 0) {
    const incomeCategories: [string, string, number, string][] = [
      ['Gaji', 'income', 0, 'briefcase'],
      ['Bonus', 'income', 0, 'gift'],
      ['Investasi', 'income', 0, 'trending-up'],
      ['Pendapatan Lain', 'income', 0, 'plus-circle'],
    ];
    for (const [name, type, budget, icon] of incomeCategories) {
      await run('INSERT INTO categories (name, type, budget_limit, icon) VALUES (?, ?, ?, ?)', [
        name, type, budget, icon,
      ]);
    }

    const expenseCategories: [string, string, number, string][] = [
      ['Belanja Harian', 'expense', 2000000, 'shopping-cart'],
      ['Makanan & Minuman', 'expense', 1500000, 'utensils'],
      ['Transportasi', 'expense', 500000, 'car'],
      ['Listrik & Air', 'expense', 500000, 'zap'],
      ['Internet & Telpon', 'expense', 300000, 'wifi'],
      ['Kesehatan', 'expense', 500000, 'heart-pulse'],
      ['Pendidikan', 'expense', 1000000, 'graduation-cap'],
      ['Hiburan', 'expense', 300000, 'gamepad-2'],
      ['Cicilan', 'expense', 0, 'landmark'],
      ['Lainnya', 'expense', 0, 'more-horizontal'],
    ];
    for (const [name, type, budget, icon] of expenseCategories) {
      await run('INSERT INTO categories (name, type, budget_limit, icon) VALUES (?, ?, ?, ?)', [
        name, type, budget, icon,
      ]);
    }
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export async function initDatabase(): Promise<void> {
  if (db) return;
  const database = await SQLite.openDatabaseAsync(DB_NAME);
  db = database;

  const hadBudgets =
    ((await scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='budgets'")) || 0) > 0;

  await database.execAsync(SCHEMA_SQL);
  await ensureBudgetColumns();

  await seedData();
  if (!hadBudgets) await migrateCategoryBudgets();
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
    } catch {
      /* ignore */
    }
    db = null;
  }
}

// ---------------------------------------------------------------------------
// Snapshot (dipakai oleh seluruh layar lewat DataContext)
// ---------------------------------------------------------------------------

const TX_SELECT = `
    SELECT
        t.*,
        a.name AS account_name,
        a.icon AS account_icon,
        ta.name AS to_account_name,
        c.name AS category_name,
        c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
`;

export async function loadSnapshot(): Promise<Snapshot> {
  const [accounts, categories, transactions, budgets] = await Promise.all([
    query<Account>('SELECT * FROM accounts ORDER BY id ASC'),
    query<Category>('SELECT * FROM categories ORDER BY id ASC'),
    query<TransactionRow>(TX_SELECT),
    query<Budget>(`
        SELECT b.*, c.name AS category_name, c.icon AS category_icon
        FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
        ORDER BY b.is_active DESC,
                 CASE b.period_type WHEN 'daily' THEN 1 WHEN 'weekly' THEN 2 ELSE 3 END, b.id DESC
    `),
  ]);
  return { accounts, categories, transactions, budgets };
}

// =============================================================================
// CRUD — Accounts
// =============================================================================

export interface AccountPayload {
  name: string;
  type?: string;
  initial_balance?: number;
  icon?: string;
}

export async function addAccount(p: AccountPayload): Promise<void> {
  if (!p.name || !p.name.trim()) throw new Error('Nama akun tidak boleh kosong');
  await run('INSERT INTO accounts (name, type, initial_balance, icon) VALUES (?, ?, ?, ?)', [
    p.name.trim(),
    p.type || 'cash',
    p.initial_balance || 0,
    p.icon || 'wallet',
  ]);
}

export async function updateAccount(id: number, p: AccountPayload, existing: Account): Promise<void> {
  if (!p.name || !p.name.trim()) throw new Error('Nama akun tidak boleh kosong');
  await run('UPDATE accounts SET name = ?, type = ?, initial_balance = ?, icon = ? WHERE id = ?', [
    p.name.trim(),
    p.type || existing.type || 'cash',
    p.initial_balance != null ? p.initial_balance : existing.initial_balance,
    p.icon || existing.icon || 'wallet',
    id,
  ]);
}

export async function deleteAccount(
  id: number,
  txs: TransactionRow[]
): Promise<void> {
  const refCount = txs.filter((t) => t.account_id === id || t.to_account_id === id).length;
  if (refCount > 0) {
    throw new Error('Akun tidak dapat dihapus karena masih memiliki transaksi terkait');
  }
  await run('DELETE FROM accounts WHERE id = ?', [id]);
}

// =============================================================================
// CRUD — Categories
// =============================================================================

export interface CategoryPayload {
  name: string;
  type: 'income' | 'expense';
  budget_limit?: number;
  icon?: string;
}

export async function addCategory(p: CategoryPayload): Promise<void> {
  if (!p.name || !p.name.trim()) throw new Error('Nama kategori tidak boleh kosong');
  if (!['income', 'expense'].includes(p.type)) {
    throw new Error('Tipe kategori harus income atau expense');
  }
  await run('INSERT INTO categories (name, type, budget_limit, icon) VALUES (?, ?, ?, ?)', [
    p.name.trim(),
    p.type,
    p.budget_limit || 0,
    p.icon || 'tag',
  ]);
}

export async function updateCategory(
  id: number,
  p: CategoryPayload,
  existing: Category
): Promise<void> {
  if (!p.name || !p.name.trim()) throw new Error('Nama kategori tidak boleh kosong');
  if (!['income', 'expense'].includes(p.type)) {
    throw new Error('Tipe kategori harus income atau expense');
  }
  await run('UPDATE categories SET name = ?, type = ?, budget_limit = ?, icon = ? WHERE id = ?', [
    p.name.trim(),
    p.type,
    p.budget_limit != null ? p.budget_limit : existing.budget_limit,
    p.icon || existing.icon || 'tag',
    id,
  ]);
}

export async function deleteCategory(id: number, txs: TransactionRow[]): Promise<void> {
  const refCount = txs.filter((t) => t.category_id === id).length;
  if (refCount > 0) {
    throw new Error('Kategori tidak dapat dihapus karena masih memiliki transaksi terkait');
  }
  await run('DELETE FROM budgets WHERE category_id = ?', [id]);
  await run('DELETE FROM categories WHERE id = ?', [id]);
}

// =============================================================================
// CRUD — Transactions
// =============================================================================

export interface TransactionPayload {
  account_id: number;
  to_account_id?: number | null;
  category_id?: number | null;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  transaction_date: string;
  note?: string | null;
}

function validateTransaction(p: TransactionPayload): void {
  if (!p.account_id) throw new Error('Akun harus dipilih');
  if (!['income', 'expense', 'transfer'].includes(p.type)) {
    throw new Error('Tipe transaksi tidak valid');
  }
  if (!p.amount || p.amount <= 0) throw new Error('Jumlah harus lebih dari 0');
  if (!p.transaction_date) throw new Error('Tanggal harus diisi');
  if (p.type === 'transfer' && !p.to_account_id) {
    throw new Error('Akun tujuan harus dipilih untuk transfer');
  }
  if (p.type === 'transfer' && p.account_id === p.to_account_id) {
    throw new Error('Akun asal dan tujuan tidak boleh sama');
  }
}

export async function addTransaction(p: TransactionPayload): Promise<void> {
  validateTransaction(p);
  await run(
    'INSERT INTO transactions (account_id, to_account_id, category_id, type, amount, transaction_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      p.account_id,
      p.to_account_id || null,
      p.type === 'transfer' ? null : p.category_id || null,
      p.type,
      p.amount,
      p.transaction_date,
      p.note || null,
    ]
  );
}

export async function updateTransaction(id: number, p: TransactionPayload): Promise<void> {
  validateTransaction(p);
  await run(
    'UPDATE transactions SET account_id = ?, to_account_id = ?, category_id = ?, type = ?, amount = ?, transaction_date = ?, note = ? WHERE id = ?',
    [
      p.account_id,
      p.to_account_id || null,
      p.type === 'transfer' ? null : p.category_id || null,
      p.type,
      p.amount,
      p.transaction_date,
      p.note || null,
      id,
    ]
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  await run('DELETE FROM transactions WHERE id = ?', [id]);
}

// =============================================================================
// Transactions terpilih (untuk modal edit)
// =============================================================================

export async function getTransactionById(id: number): Promise<TransactionRow | null> {
  const rows = await query<TransactionRow>(
    `
        SELECT
            t.*,
            a.name AS account_name,
            ta.name AS to_account_name,
            c.name AS category_name
        FROM transactions t
        LEFT JOIN accounts a ON t.account_id = a.id
        LEFT JOIN accounts ta ON t.to_account_id = ta.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
    `,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// =============================================================================
// Budget (harian / mingguan / bulanan)
// =============================================================================

export interface BudgetPayload {
  name: string;
  categoryId?: number | null;
  periodType: 'daily' | 'weekly' | 'monthly';
  amountLimit: number;
  isActive?: number;
  icon?: string | null;
}

function validateBudget(b: BudgetPayload): void {
  if (!b.name || !b.name.trim()) throw new Error('Nama budget tidak boleh kosong');
  if (!['daily', 'weekly', 'monthly'].includes(b.periodType)) {
    throw new Error('Periode budget tidak valid');
  }
  if (!(b.amountLimit > 0)) throw new Error('Batas budget harus lebih dari 0');
}

export async function addBudget(b: BudgetPayload): Promise<void> {
  validateBudget(b);
  await run(
    'INSERT INTO budgets (name, category_id, period_type, amount_limit, is_active, icon) VALUES (?, ?, ?, ?, ?, ?)',
    [b.name.trim(), b.categoryId || null, b.periodType, b.amountLimit, b.isActive === 0 ? 0 : 1, b.icon || null]
  );
}

export async function updateBudget(id: number, b: BudgetPayload): Promise<void> {
  validateBudget(b);
  await run(
    'UPDATE budgets SET name = ?, category_id = ?, period_type = ?, amount_limit = ?, is_active = ?, icon = ? WHERE id = ?',
    [b.name.trim(), b.categoryId || null, b.periodType, b.amountLimit, b.isActive === 0 ? 0 : 1, b.icon || null, id]
  );
}

export async function deleteBudget(id: number): Promise<void> {
  await run('DELETE FROM budgets WHERE id = ?', [id]);
}

// =============================================================================
// Backup & Restore (level file)
// =============================================================================

/** Validasi apakah buffer adalah file SQLite. */
export function isSqliteBytes(bytes: Uint8Array): boolean {
  const header = 'SQLite format 3\0';
  if (bytes.length < header.length) return false;
  for (let i = 0; i < header.length; i++) {
    if (bytes[i] !== header.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Ganti isi database dengan bytes file backup (setelah menutup koneksi lama),
 * lalu buka ulang dan pastikan skema + seed seperti perilaku web.
 */
export async function importDatabase(bytes: Uint8Array): Promise<void> {
  if (!bytes || bytes.length === 0) throw new Error('Data database tidak valid');
  if (!isSqliteBytes(bytes)) throw new Error('Bukan file backup SQLite yang valid');

  await closeDatabase();

  const target = databaseFile();
  if (target.exists) target.delete();

  // Hapus berkas sampingan WAL/SHM agar tidak mencampur data lama
  for (const suffix of ['-wal', '-shm']) {
    const side = new File(Paths.document, 'SQLite', DB_NAME + suffix);
    if (side.exists) side.delete();
  }

  await target.write(bytes);

  db = null;
  await initDatabase();
}
