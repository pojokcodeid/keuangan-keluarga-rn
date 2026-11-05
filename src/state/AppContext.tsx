// =============================================================================
// AppContext.tsx — State global aplikasi: database (snapshot), navigasi tab,
// modal, toast, konfirmasi, dan kunci aplikasi (PIN).
// =============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { initDatabase, loadSnapshot, Snapshot } from '../lib/db';
import {
  evaluateLockOnBackground,
  evaluateLockOnForeground,
  isPinEnabled,
  isSessionUnlocked,
  lockSession,
  touchActivity,
} from '../lib/auth';

export type TabKey = 'dashboard' | 'transaksi' | 'budget' | 'laporan' | 'pengaturan';

export type ModalKey =
  | 'transaction'
  | 'budget'
  | 'account'
  | 'category'
  | 'setPin'
  | 'disablePin';

export interface ModalState {
  key: ModalKey;
  /** id entitas yang diedit (null = tambah baru) */
  param: number | null;
  /** tipe kategori default saat tambah baru */
  extra?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  title: string;
  message: string;
  resolve: (ok: boolean) => void;
}

interface AppContextValue {
  ready: boolean;
  initError: string | null;
  retryInit: () => void;
  snap: Snapshot;
  refresh: () => Promise<void>;

  tab: TabKey;
  setTab: (t: TabKey) => void;

  modal: ModalState | null;
  openModal: (key: ModalKey, param?: number | null, extra?: string) => void;
  closeModal: () => void;

  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;

  confirm: (title: string, message: string) => Promise<boolean>;
  confirmState: ConfirmState | null;
  resolveConfirm: (ok: boolean) => void;

  locked: boolean;
  lock: () => void;
  unlock: () => void;
}

const emptySnapshot: Snapshot = { accounts: [], categories: [], transactions: [], budgets: [] };

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot);
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [locked, setLocked] = useState(false);
  const [initNonce, setInitNonce] = useState(0);
  const toastIdRef = useRef(1);

  // --- Inisialisasi database ---
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await initDatabase();
        const snapshot = await loadSnapshot();
        if (!alive) return;
        setSnap(snapshot);
        setReady(true);

        const pinEnabled = await isPinEnabled();
        if (!alive) return;
        if (pinEnabled && !(await isSessionUnlocked())) {
          setLocked(true);
        } else if (pinEnabled) {
          touchActivity();
        }
      } catch (err: any) {
        if (!alive) return;
        console.error('Init error:', err);
        setInitError(err?.message || 'Terjadi kesalahan saat menginisialisasi database SQLite lokal.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [initNonce]);

  const retryInit = useCallback(() => {
    setReady(false);
    setInitError(null);
    setSnap(emptySnapshot);
    setInitNonce((n) => n + 1);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await loadSnapshot();
      setSnap(snapshot);
    } catch (err) {
      console.error('Gagal memuat ulang data:', err);
    }
  }, []);

  // --- Toast ---
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = toastIdRef.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismissToast(id), 3000);
    },
    [dismissToast]
  );

  // --- Konfirmasi ---
  const confirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ title, message, resolve });
    });
  }, []);

  const resolveConfirm = useCallback((ok: boolean) => {
    setConfirmState((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  // --- Modal ---
  const openModal = useCallback((key: ModalKey, param: number | null = null, extra?: string) => {
    setModal({ key, param, extra });
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  // --- Lock ---
  const lock = useCallback(() => {
    lockSession();
    setLocked(true);
  }, []);
  const unlock = useCallback(() => {
    touchActivity();
    setLocked(false);
  }, []);

  // --- Auto-lock: saat aplikasi pindah latar / kembali ---
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background' || state === 'inactive') {
        if (await evaluateLockOnBackground()) setLocked(true);
      } else if (state === 'active') {
        if (await evaluateLockOnForeground()) setLocked(true);
        else touchActivity();
      }
    });
    return () => sub.remove();
  }, []);

  // --- Cek berkala (15 detik) seperti versi web ---
  useEffect(() => {
    const timer = setInterval(async () => {
      if (await isPinEnabled()) {
        if (!(await isSessionUnlocked())) setLocked(true);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      initError,
      retryInit,
      snap,
      refresh,
      tab,
      setTab,
      modal,
      openModal,
      closeModal,
      toasts,
      showToast,
      dismissToast,
      confirm,
      confirmState,
      resolveConfirm,
      locked,
      lock,
      unlock,
    }),
    [
      ready, initError, retryInit, snap, refresh, tab, modal, openModal, closeModal,
      toasts, showToast, dismissToast, confirm, confirmState, resolveConfirm, locked, lock, unlock,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus dipakai di dalam AppProvider');
  return ctx;
}
