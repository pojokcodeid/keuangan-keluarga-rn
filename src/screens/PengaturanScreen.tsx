// =============================================================================
// PengaturanScreen.tsx — Tema, Keamanan/PIN, Akun, Kategori, Data & Backup
// Port dari renderSettings() di js/ui.js
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme, ThemeMode } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import { Language } from '../i18n/translations';
import { ActionRow, Card, Chip, IconBtn, SectionTitle } from '../components/ui';
import { SegmentedControl, SelectField } from '../components/form';
import { ResetDataSheet } from '../components/ResetDataSheet';
import { IconBadge } from '../lib/icons';
import { formatCurrency } from '../lib/utils';
import { deleteAccount, deleteCategory } from '../lib/db';
import { getAccountBalance } from '../lib/selectors';
import { getAutolockSetting, isPinEnabled, setAutolockSetting } from '../lib/auth';
import { backupDatabase, backupDatabaseSqlite, restoreDatabase } from '../lib/backup';
import { exportToExcel } from '../lib/excel';

type CatTab = 'income' | 'expense';

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
    modal,
    lock,
  } = useApp();
  const { c, mode, setMode } = useTheme();
  const { t, language, setLanguage, interpolate } = useLanguage();

  const [pinOn, setPinOn] = useState(false);
  const [autolock, setAutolock] = useState('immediate');
  const [catTab, setCatTab] = useState<CatTab>('expense');
  const [busy, setBusy] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const autolockOptions = useMemo(
    () => [
      { value: 'immediate', label: t.pengaturan.autolockImmediate },
      { value: '5', label: t.pengaturan.autolock5m },
      { value: '15', label: t.pengaturan.autolock15m },
      { value: 'never', label: t.pengaturan.autolockNever },
    ],
    [t]
  );

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
  }, [modal, resetOpen]);

  // --- Aksi keamanan ---
  const handleAutolock = async (v: string) => {
    setAutolock(v);
    await setAutolockSetting(v);
    showToast(t.pengaturan.autolockSaved, 'success');
  };

  const handleLockNow = async () => {
    if (!(await isPinEnabled())) return;
    lock();
  };

  // --- Akun ---
  const handleDeleteAccount = async (id: number) => {
    const ok = await confirm(
      t.pengaturan.deleteAccountTitle,
      t.pengaturan.deleteAccountConfirm
    );
    if (!ok) return;
    try {
      await deleteAccount(id, snap.transactions);
      showToast(t.pengaturan.accountDeletedSuccess, 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || t.pengaturan.accountDeleteFailed, 'error');
    }
  };

  // --- Kategori ---
  const handleDeleteCategory = async (id: number) => {
    const ok = await confirm(
      t.pengaturan.deleteCategoryTitle,
      t.pengaturan.deleteCategoryConfirm
    );
    if (!ok) return;
    try {
      await deleteCategory(id, snap.transactions);
      showToast(t.pengaturan.categoryDeletedSuccess, 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || t.pengaturan.categoryDeleteFailed, 'error');
    }
  };

  // --- Data & backup ---
  const runBackup = async (format: 'zip' | 'sqlite') => {
    if (busy) return;
    setBusy('backup');
    try {
      if (format === 'zip') {
        const { photos } = await backupDatabase();
        showToast(
          photos > 0
            ? (language === 'en'
                ? `Complete backup created (database + ${photos} photos)`
                : `Backup lengkap dibuat (database + ${photos} foto)`)
            : (language === 'en'
                ? 'Database backup created successfully'
                : 'Backup database berhasil dibuat'),
          'success'
        );
      } else {
        await backupDatabaseSqlite();
        showToast(
          language === 'en'
            ? 'SQLite database backup created successfully'
            : 'Backup database SQLite berhasil dibuat',
          'success'
        );
      }
    } catch (err: any) {
      showToast(
        (language === 'en' ? 'Failed to create backup: ' : 'Gagal membuat backup: ') +
          (err?.message || String(err)),
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleBackup = () => {
    if (busy) return;
    Alert.alert(
      t.pengaturan.backupPromptTitle,
      t.pengaturan.backupPromptMsg,
      [
        { text: t.pengaturan.backupOptionZip, onPress: () => runBackup('zip') },
        { text: t.pengaturan.backupOptionSqlite, onPress: () => runBackup('sqlite') },
        { text: t.common.cancel, style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleRestore = async () => {
    if (busy) return;
    const ok = await confirm(
      t.pengaturan.restoreConfirmTitle,
      t.pengaturan.restoreConfirmMsg
    );
    if (!ok) return;
    setBusy('restore');
    try {
      const result = await restoreDatabase();
      if (result.restored) {
        await refresh();
        showToast(
          result.format === 'zip' && result.photos > 0
            ? interpolate(t.pengaturan.restoreSuccessZip, { count: result.photos })
            : t.pengaturan.restoreSuccessSqlite,
          'success'
        );
      }
    } catch (err: any) {
      showToast(
        t.pengaturan.restoreFailed + ': ' + (err?.message || String(err)),
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleExcel = async () => {
    if (busy) return;
    setBusy('excel');
    try {
      await exportToExcel(snap);
      showToast(t.laporan.exportExcelSuccess, 'success');
    } catch (err: any) {
      showToast(
        t.laporan.exportExcelFailed + ': ' + (err?.message || String(err)),
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleResetDone = async (message: string) => {
    await refresh();
    // Reset total menghapus PIN — muat ulang status keamanan di layar ini
    try {
      setPinOn(await isPinEnabled());
      setAutolock(await getAutolockSetting());
    } catch {
      /* abaikan */
    }
    showToast(message, 'success');
  };

  const categories = snap.categories.filter((cat) => cat.type === catTab);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ============================= Tampilan ============================= */}
      <View>
        <SectionTitle icon="palette">{t.pengaturan.appearanceTitle}</SectionTitle>
        <Card style={styles.block}>
          <Text style={[styles.blockTitle, { color: c.text }]}>{t.pengaturan.appTheme}</Text>
          <Text style={[styles.blockSub, { color: c.muted }]}>
            {mode === 'auto'
              ? t.pengaturan.themeAutoDesc
              : mode === 'dark'
              ? t.pengaturan.themeDarkDesc
              : t.pengaturan.themeLightDesc}
          </Text>
          <SegmentedControl<ThemeMode>
            value={mode}
            onChange={setMode}
            activeColor={c.primary}
            activeSoft={c.primarySoft}
            options={[
              { value: 'light', label: t.pengaturan.themeLight, icon: 'sun' },
              { value: 'dark', label: t.pengaturan.themeDark, icon: 'moon' },
              { value: 'auto', label: t.pengaturan.themeAuto, icon: 'desktop' },
            ]}
          />
        </Card>

        {/* Pilihan Bahasa Aplikasi */}
        <Card style={[styles.block, { marginTop: 10 }]}>
          <Text style={[styles.blockTitle, { color: c.text }]}>{t.pengaturan.appLanguage}</Text>
          <Text style={[styles.blockSub, { color: c.muted }]}>
            {language === 'id' ? t.pengaturan.langIdDesc : t.pengaturan.langEnDesc}
          </Text>
          <SegmentedControl<Language>
            value={language}
            onChange={setLanguage}
            activeColor={c.primary}
            activeSoft={c.primarySoft}
            options={[
              { value: 'id', label: t.pengaturan.langId, icon: 'globe' },
              { value: 'en', label: t.pengaturan.langEn, icon: 'globe' },
            ]}
          />
        </Card>
      </View>

      {/* ============================ Keamanan ============================= */}
      <View>
        <SectionTitle icon="shield-halved">{t.pengaturan.securityTitle}</SectionTitle>
        <Card>
          <View style={[styles.secRow, { borderBottomColor: c.border }]}>
            <View style={[styles.secIcon, { backgroundColor: c.primarySoft }]}>
              <FontAwesome6 name="key" solid size={15} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.blockTitle, { color: c.text }]}>{t.pengaturan.pinProtection}</Text>
              <Text
                style={[
                  styles.blockSub,
                  { color: pinOn ? c.success : c.warning, fontWeight: '600' },
                ]}
              >
                {pinOn ? t.pengaturan.pinActive : t.pengaturan.pinInactive}
              </Text>
            </View>
            <View style={styles.secActions}>
              <PressableBtn
                label={pinOn ? t.pengaturan.changePin : t.pengaturan.setPin}
                color={c.primary}
                onPress={() => openModal('setPin')}
              />
              {pinOn ? (
                <PressableBtn
                  label={t.pengaturan.disablePin}
                  color={c.danger}
                  soft
                  onPress={() => openModal('disablePin')}
                />
              ) : null}
            </View>
          </View>

          <View style={[styles.secRow, styles.secCol, { borderBottomColor: c.border }]}>
            <Text style={[styles.blockTitle, { color: c.text }]}>{t.pengaturan.autolockTitle}</Text>
            <Text style={[styles.blockSub, { color: c.muted }]}>
              {t.pengaturan.autolockSub}
            </Text>
            <SelectField value={autolock} options={autolockOptions} onChange={handleAutolock} />
          </View>

          {pinOn ? (
            <ActionRow
              icon="lock"
              iconBg={c.dangerSoft}
              iconColor={c.danger}
              title={t.pengaturan.lockNow}
              subtitle={t.pengaturan.lockNowSub}
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
            <SmallBtn label={t.pengaturan.addAccountBtn} onPress={() => openModal('account')} />
          }
        >
          {t.pengaturan.accountsTitle}
        </SectionTitle>
        <Card>
          {snap.accounts.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.muted }]}>{t.pengaturan.noAccounts}</Text>
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
                      {t.pengaturan.balanceLabel}:{' '}
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
          action={<SmallBtn label={t.pengaturan.addCategoryBtn} onPress={() => openModal('category', null, catTab)} />}
        >
          {t.pengaturan.categoriesTitle}
        </SectionTitle>
        <View style={[styles.tabWrap, { backgroundColor: c.card, borderColor: c.border }]}>
          <SegmentedControl<CatTab>
            value={catTab}
            onChange={setCatTab}
            activeColor={catTab === 'income' ? c.success : c.danger}
            activeSoft={catTab === 'income' ? c.successSoft : c.dangerSoft}
            options={[
              { value: 'income', label: t.common.income, icon: 'arrow-trend-up' },
              { value: 'expense', label: t.common.expense, icon: 'arrow-trend-down' },
            ]}
          />
        </View>
        <Card style={{ marginTop: 10 }}>
          {categories.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.muted }]}>
              {interpolate(t.pengaturan.noCategories, {
                type: catTab === 'income' ? t.pengaturan.categoryIncome : t.pengaturan.categoryExpense,
              })}
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
                      {t.pengaturan.budgetLimitLabel}:{' '}
                      <Text style={{ color: c.subtext, fontWeight: '700' }}>
                        {formatCurrency(cat.budget_limit)}
                      </Text>
                      {t.pengaturan.perMonth}
                    </Text>
                  ) : (
                    <Text style={[styles.blockSub, { color: c.borderStrong }]}>{t.pengaturan.noBudgetLimit}</Text>
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
        <SectionTitle icon="database">{t.pengaturan.dataBackupTitle}</SectionTitle>
        <Card>
          <ActionRow
            icon="box-archive"
            iconBg={c.primarySoft}
            iconColor={c.primary}
            title={t.pengaturan.downloadBackupTitle}
            subtitle={
              busy === 'backup'
                ? t.pengaturan.preparingBackup
                : t.pengaturan.downloadBackupSub
            }
            onPress={handleBackup}
          />
          <View style={[styles.hairline, { backgroundColor: c.border }]} />
          <ActionRow
            icon="upload"
            iconBg={c.warningSoft}
            iconColor={c.warning}
            title={t.pengaturan.restoreBackupTitle}
            subtitle={
              busy === 'restore' ? t.pengaturan.restoringBackup : t.pengaturan.restoreBackupSub
            }
            onPress={handleRestore}
          />
          <View style={[styles.hairline, { backgroundColor: c.border }]} />
          <ActionRow
            icon="file-excel"
            iconBg={c.successSoft}
            iconColor={c.success}
            title={t.pengaturan.exportExcelTitle}
            subtitle={busy === 'excel' ? t.laporan.exporting : t.pengaturan.exportExcelSub}
            onPress={handleExcel}
          />
          <View style={[styles.hairline, { backgroundColor: c.border }]} />
          <ActionRow
            icon="trash-can"
            iconBg={c.dangerSoft}
            iconColor={c.danger}
            title={t.pengaturan.resetDataTitle}
            titleColor={c.danger}
            subtitle={t.pengaturan.resetDataSub}
            onPress={() => setResetOpen(true)}
          />
        </Card>
      </View>

      {/* ============================ Info app ============================= */}
      <View style={styles.info}>
        <Text style={[styles.blockSub, { color: c.muted }]}>{t.pengaturan.appVersion}</Text>
        <Text style={[styles.blockSub, { color: c.borderStrong }]}>
          {t.pengaturan.privacyNote}
        </Text>
        <View style={{ marginTop: 8 }}>
          <Chip
            label={
              language === 'en'
                ? `${snap.transactions.length} transactions · ${snap.accounts.length} accounts`
                : `${snap.transactions.length} transaksi · ${snap.accounts.length} akun`
            }
            color={c.subtext}
            icon="database"
          />
        </View>
      </View>

      <ResetDataSheet
        visible={resetOpen}
        onClose={() => setResetOpen(false)}
        onDone={handleResetDone}
        onError={(msg) => showToast(msg, 'error')}
      />
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
