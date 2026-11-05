// =============================================================================
// PengaturanScreen.tsx — Tema, Keamanan/PIN, Akun, Kategori, Data & Backup
// Port dari renderSettings() di js/ui.js
// =============================================================================

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme, ThemeMode } from '../state/ThemeContext';
import { ActionRow, Card, Chip, IconBtn, SectionTitle } from '../components/ui';
import { SegmentedControl, SelectField } from '../components/form';
import { IconBadge } from '../lib/icons';
import { formatCurrency } from '../lib/utils';
import { deleteAccount, deleteCategory } from '../lib/db';
import { getAccountBalance } from '../lib/selectors';
import { getAutolockSetting, isPinEnabled, setAutolockSetting } from '../lib/auth';
import { backupDatabase, restoreDatabase } from '../lib/backup';
import { exportToExcel } from '../lib/excel';

type CatTab = 'income' | 'expense';

const AUTOLOCK_OPTIONS = [
  { value: 'immediate', label: 'Segera saat aplikasi ditutup' },
  { value: '5', label: 'Setelah 5 menit tidak aktif' },
  { value: '15', label: 'Setelah 15 menit tidak aktif' },
  { value: 'never', label: 'Jangan kunci otomatis' },
];

const accountIcon = (type: string): string => {
  if (type === 'bank') return 'fa-solid fa-building-columns|#3B82F6';
  if (type === 'e-wallet') return 'fa-solid fa-mobile-screen-button|#A855F7';
  return 'fa-solid fa-wallet|#10B981';
};

export function PengaturanScreen() {
  const {
    snap,
    refresh,
    showToast,
    confirm,
    openModal,
    lock,
  } = useApp();
  const { c, mode, setMode } = useTheme();

  const [pinOn, setPinOn] = useState(false);
  const [autolock, setAutolock] = useState('immediate');
  const [catTab, setCatTab] = useState<CatTab>('expense');
  const [busy, setBusy] = useState<string | null>(null);

  // Muat status PIN & pengaturan auto-lock (asinkron, tanpa reset sinkron)
  useEffect(() => {
    let alive = true;
    isPinEnabled()
      .then((v) => {
        if (alive) setPinOn(v);
      })
      .catch(() => {});
    getAutolockSetting()
      .then((v) => {
        if (alive) setAutolock(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // --- Aksi keamanan ---
  const handleAutolock = async (v: string) => {
    setAutolock(v);
    await setAutolockSetting(v);
    showToast('Pengaturan kunci otomatis disimpan', 'success');
  };

  const handleLockNow = async () => {
    if (!(await isPinEnabled())) return;
    lock();
  };

  // --- Akun ---
  const handleDeleteAccount = async (id: number) => {
    const ok = await confirm(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun ini? Akun yang memiliki riwayat transaksi tidak dapat dihapus.'
    );
    if (!ok) return;
    try {
      await deleteAccount(id, snap.transactions);
      showToast('Akun berhasil dihapus', 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus akun', 'error');
    }
  };

  // --- Kategori ---
  const handleDeleteCategory = async (id: number) => {
    const ok = await confirm(
      'Hapus Kategori',
      'Apakah Anda yakin ingin menghapus kategori ini? Kategori yang memiliki transaksi tidak dapat dihapus.'
    );
    if (!ok) return;
    try {
      await deleteCategory(id, snap.transactions);
      showToast('Kategori berhasil dihapus', 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus kategori', 'error');
    }
  };

  // --- Data & backup ---
  const handleBackup = async () => {
    if (busy) return;
    setBusy('backup');
    try {
      await backupDatabase();
      showToast('Backup database SQLite berhasil dibuat', 'success');
    } catch (err: any) {
      showToast('Gagal membuat backup: ' + (err?.message || String(err)), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    const ok = await confirm(
      'Restore Database',
      'Data saat ini akan ditimpa dengan isi file backup. Lanjutkan?'
    );
    if (!ok) return;
    setBusy('restore');
    try {
      const done = await restoreDatabase();
      if (done) {
        await refresh();
        showToast('Database berhasil dipulihkan!', 'success');
      }
    } catch (err: any) {
      showToast('Gagal memulihkan database: ' + (err?.message || String(err)), 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleExcel = async () => {
    if (busy) return;
    setBusy('excel');
    try {
      await exportToExcel(snap);
      showToast('Laporan Excel berhasil dibagikan', 'success');
    } catch (err: any) {
      showToast('Gagal mengekspor Excel: ' + (err?.message || String(err)), 'error');
    } finally {
      setBusy(null);
    }
  };

  const categories = snap.categories.filter((cat) => cat.type === catTab);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ============================= Tampilan ============================= */}
      <View>
        <SectionTitle icon="palette">Tampilan</SectionTitle>
        <Card style={styles.block}>
          <Text style={[styles.blockTitle, { color: c.text }]}>Tema Aplikasi</Text>
          <Text style={[styles.blockSub, { color: c.muted }]}>
            {mode === 'auto'
              ? 'Mengikuti pengaturan sistem (Otomatis)'
              : mode === 'dark'
              ? 'Tema gelap aktif'
              : 'Tema terang aktif'}
          </Text>
          <SegmentedControl<ThemeMode>
            value={mode}
            onChange={setMode}
            activeColor={c.primary}
            activeSoft={c.primarySoft}
            options={[
              { value: 'light', label: 'Terang', icon: 'sun' },
              { value: 'dark', label: 'Gelap', icon: 'moon' },
              { value: 'auto', label: 'Otomatis', icon: 'desktop' },
            ]}
          />
        </Card>
      </View>

      {/* ============================ Keamanan ============================= */}
      <View>
        <SectionTitle icon="shield-halved">Keamanan & Kunci Aplikasi</SectionTitle>
        <Card>
          <View style={[styles.secRow, { borderBottomColor: c.border }]}>
            <View style={[styles.secIcon, { backgroundColor: c.primarySoft }]}>
              <FontAwesome6 name="key" solid size={15} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.blockTitle, { color: c.text }]}>Proteksi PIN Keamanan</Text>
              <Text
                style={[
                  styles.blockSub,
                  { color: pinOn ? c.success : c.warning, fontWeight: '600' },
                ]}
              >
                {pinOn ? 'Aktif · Terlindungi PIN' : 'Nonaktif · Aplikasi Terbuka Bebas'}
              </Text>
            </View>
            <View style={styles.secActions}>
              <PressableBtn
                label={pinOn ? 'Ubah PIN' : 'Atur PIN'}
                color={c.primary}
                onPress={() => openModal('setPin')}
              />
              {pinOn ? (
                <PressableBtn
                  label="Nonaktifkan"
                  color={c.danger}
                  soft
                  onPress={() => openModal('disablePin')}
                />
              ) : null}
            </View>
          </View>

          <View style={[styles.secRow, styles.secCol, { borderBottomColor: c.border }]}>
            <Text style={[styles.blockTitle, { color: c.text }]}>Kunci Otomatis (Auto-Lock)</Text>
            <Text style={[styles.blockSub, { color: c.muted }]}>
              Kunci aplikasi setelah periode inaktivitas
            </Text>
            <SelectField value={autolock} options={AUTOLOCK_OPTIONS} onChange={handleAutolock} />
          </View>

          {pinOn ? (
            <ActionRow
              icon="lock"
              iconBg={c.dangerSoft}
              iconColor={c.danger}
              title="Kunci Aplikasi Sekarang"
              subtitle="Kunci layar dan lindungi data pribadi"
              rightColor={c.borderStrong}
              onPress={handleLockNow}
            />
          ) : null}
        </Card>
      </View>

      {/* ========================= Akun & Dompet =========================== */}
      <View>
        <SectionTitle
          icon="landmark"
          action={
            <SmallBtn label="+ Tambah Akun" onPress={() => openModal('account')} />
          }
        >
          Akun & Dompet
        </SectionTitle>
        <Card>
          {snap.accounts.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.muted }]}>Belum ada akun dompet atau rekening</Text>
          ) : (
            snap.accounts.map((acc, i) => {
              const balance = getAccountBalance(snap.accounts, snap.transactions, acc.id);
              return (
                <View
                  key={acc.id}
                  style={[
                    styles.listRow,
                    { borderBottomColor: i < snap.accounts.length - 1 ? c.border : 'transparent' },
                  ]}
                >
                  <IconBadge icon={accountIcon(acc.type)} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={[styles.blockSub, { color: c.muted }]}>
                      Saldo:{' '}
                      <Text style={{ color: c.primary, fontWeight: '700' }}>
                        {formatCurrency(balance)}
                      </Text>
                    </Text>
                  </View>
                  <IconBtn name="pen-to-square" color={c.primary} onPress={() => openModal('account', acc.id)} />
                  <IconBtn name="trash-can" color={c.danger} onPress={() => handleDeleteAccount(acc.id)} />
                </View>
              );
            })
          )}
        </Card>
      </View>

      {/* ============================ Kategori ============================= */}
      <View>
        <SectionTitle
          icon="tags"
          action={<SmallBtn label="+ Tambah Kategori" onPress={() => openModal('category', null, catTab)} />}
        >
          Kategori
        </SectionTitle>
        <View style={[styles.tabWrap, { backgroundColor: c.card, borderColor: c.border }]}>
          <SegmentedControl<CatTab>
            value={catTab}
            onChange={setCatTab}
            activeColor={catTab === 'income' ? c.success : c.danger}
            activeSoft={catTab === 'income' ? c.successSoft : c.dangerSoft}
            options={[
              { value: 'income', label: 'Pemasukan', icon: 'arrow-trend-up' },
              { value: 'expense', label: 'Pengeluaran', icon: 'arrow-trend-down' },
            ]}
          />
        </View>
        <Card style={{ marginTop: 10 }}>
          {categories.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.muted }]}>
              Belum ada kategori {catTab === 'income' ? 'pemasukan' : 'pengeluaran'}
            </Text>
          ) : (
            categories.map((cat, i) => (
              <View
                key={cat.id}
                style={[
                  styles.listRow,
                  { borderBottomColor: i < categories.length - 1 ? c.border : 'transparent' },
                ]}
              >
                <IconBadge icon={cat.icon} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {cat.type === 'expense' && cat.budget_limit > 0 ? (
                    <Text style={[styles.blockSub, { color: c.muted }]}>
                      Anggaran:{' '}
                      <Text style={{ color: c.subtext, fontWeight: '700' }}>
                        {formatCurrency(cat.budget_limit)}
                      </Text>
                      /bln
                    </Text>
                  ) : (
                    <Text style={[styles.blockSub, { color: c.borderStrong }]}>Tanpa batas anggaran</Text>
                  )}
                </View>
                <IconBtn name="pen-to-square" color={c.primary} onPress={() => openModal('category', cat.id)} />
                <IconBtn name="trash-can" color={c.danger} onPress={() => handleDeleteCategory(cat.id)} />
              </View>
            ))
          )}
        </Card>
      </View>

      {/* ========================== Data & Backup ========================== */}
      <View>
        <SectionTitle icon="database">Data & Backup</SectionTitle>
        <Card>
          <ActionRow
            icon="box-archive"
            iconBg={c.primarySoft}
            iconColor={c.primary}
            title="Download Backup"
            subtitle="Simpan database sebagai file .sqlite"
            onPress={handleBackup}
          />
          <View style={[styles.hairline, { backgroundColor: c.border }]} />
          <ActionRow
            icon="upload"
            iconBg={c.warningSoft}
            iconColor={c.warning}
            title="Restore / Import Backup"
            subtitle={busy === 'restore' ? 'Memulihkan…' : 'Muat ulang data dari file .sqlite'}
            onPress={handleRestore}
          />
          <View style={[styles.hairline, { backgroundColor: c.border }]} />
          <ActionRow
            icon="file-excel"
            iconBg={c.successSoft}
            iconColor={c.success}
            title="Export ke Excel"
            subtitle={busy === 'excel' ? 'Menyiapkan…' : 'Bagikan semua data dalam format .xlsx'}
            onPress={handleExcel}
          />
        </Card>
      </View>

      {/* ============================ Info app ============================= */}
      <View style={styles.info}>
        <Text style={[styles.blockSub, { color: c.muted }]}>Keuangan Keluarga v1.0</Text>
        <Text style={[styles.blockSub, { color: c.borderStrong }]}>
          Data tersimpan di perangkat Anda (SQLite lokal)
        </Text>
        <View style={{ marginTop: 8 }}>
          <Chip label={`${snap.transactions.length} transaksi · ${snap.accounts.length} akun`} color={c.subtext} icon="database" />
        </View>
      </View>
    </ScrollView>
  );
}

/** Tombol teks kecil (Tambah Akun / Tambah Kategori) */
function SmallBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[styles.smallBtn, { backgroundColor: c.primary, color: '#fff' }]}
    >
      {label}
    </Text>
  );
}

/** Tombol pil kecil (Atur PIN / Nonaktifkan) */
function PressableBtn({
  label,
  color,
  soft,
  onPress,
}: {
  label: string;
  color: string;
  soft?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Text
      onPress={onPress}
      style={[
        styles.pillBtn,
        soft
          ? { backgroundColor: c.dangerSoft, color: c.danger }
          : { backgroundColor: color, color: '#fff' },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  block: {
    padding: 16,
    gap: 6,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  blockSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  secCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  secIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  pillBtn: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    overflow: 'hidden',
    textAlign: 'center',
  },
  smallBtn: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  info: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
  },
});
