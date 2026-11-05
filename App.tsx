// =============================================================================
// App.tsx — Cangkang aplikasi: header, konten tab, navigasi bawah, FAB,
// layar kunci PIN, modal, toast & konfirmasi.
// Setara dengan tata letak index.html + initUI() di js/ui.js (versi web).
// =============================================================================

import React, { useEffect, useMemo } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome6 } from '@expo/vector-icons';

import { AppProvider, TabKey, useApp } from './src/state/AppContext';
import { ThemeProvider, useTheme } from './src/state/ThemeContext';
import { SplashView, ErrorView } from './src/components/Splash';
import { LockScreen } from './src/components/LockScreen';
import { ToastHost } from './src/components/Toast';
import { ConfirmHost } from './src/components/ConfirmDialog';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { TransaksiScreen } from './src/screens/TransaksiScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { LaporanScreen } from './src/screens/LaporanScreen';
import { PengaturanScreen } from './src/screens/PengaturanScreen';

import { TransactionModal } from './src/modals/TransactionModal';
import { BudgetModal } from './src/modals/BudgetModal';
import { AccountModal } from './src/modals/AccountModal';
import { CategoryModal } from './src/modals/CategoryModal';
import { PinModal } from './src/modals/PinModal';
import { DisablePinModal } from './src/modals/DisablePinModal';

import { formatCurrency } from './src/lib/utils';
import { getTotalBalance } from './src/lib/selectors';
import { isPinEnabled, touchActivity } from './src/lib/auth';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'gauge' },
  { key: 'transaksi', label: 'Transaksi', icon: 'receipt' },
  { key: 'budget', label: 'Budget', icon: 'bullseye' },
  { key: 'laporan', label: 'Laporan', icon: 'chart-simple' },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'gear' },
];

function Shell() {
  const {
    ready,
    initError,
    retryInit,
    snap,
    tab,
    setTab,
    modal,
    openModal,
    lock,
    showToast,
    locked,
  } = useApp();
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // --- Kunci aplikasi (Android): kembali ke Dashboard dulu, baru keluar ---
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locked || !ready) return true;
      if (tab !== 'dashboard') {
        setTab('dashboard');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [locked, ready, tab, setTab]);

  // --- Status bar mengikuti tema ---
  const statusBarStyle = isDark ? 'light' : 'dark';

  const totalBalance = useMemo(
    () => (ready ? getTotalBalance(snap.accounts, snap.transactions) : 0),
    [ready, snap.accounts, snap.transactions]
  );

  const handleLockPress = async () => {
    try {
      if (await isPinEnabled()) {
        lock();
      } else {
        showToast('Atur PIN dulu di menu Pengaturan untuk mengunci aplikasi', 'info');
      }
    } catch {
      showToast('Gagal memeriksa status PIN', 'error');
    }
  };

  // --- FAB: di Budget membuat budget, selain itu menambah transaksi ---
  const fabVisible = ready && !locked && (tab === 'dashboard' || tab === 'transaksi' || tab === 'budget');
  const handleFab = () => {
    if (tab === 'budget') openModal('budget');
    else openModal('transaction');
  };

  const showApp = ready && !initError && !locked;

  return (
    <View
      style={[styles.root, { backgroundColor: c.bg }]}
      onStartShouldSetResponderCapture={() => {
        touchActivity();
        return false;
      }}
    >
      <StatusBar style={statusBarStyle as any} />

      {initError ? (
        <ErrorView message={initError} onRetry={retryInit} />
      ) : !ready ? (
        <SplashView />
      ) : locked ? (
        <LockScreen />
      ) : (
        <>
          {/* ====================== HEADER ====================== */}
          <View
            style={[
              styles.header,
              {
                paddingTop: insets.top + 10,
                backgroundColor: c.navBg,
                borderBottomColor: c.border,
              },
            ]}
          >
            <View style={styles.headerBrand}>
              <Text style={styles.headerEmoji}>💰</Text>
              <View>
                <Text style={[styles.headerTitle, { color: c.text }]}>Keuangan Keluarga</Text>
                <Text style={[styles.headerSub, { color: c.muted }]}>Akuntansi Rumah Tangga</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.headerSaldoLabel, { color: c.muted }]}>Total Saldo</Text>
                <Text style={[styles.headerSaldo, { color: c.primary }]} numberOfLines={1}>
                  {formatCurrency(totalBalance)}
                </Text>
              </View>
              <Pressable
                onPress={handleLockPress}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.lockBtn,
                  { backgroundColor: pressed ? c.borderStrong : c.cardAlt },
                ]}
              >
                <FontAwesome6 name="lock" size={14} color={c.subtext} />
              </Pressable>
            </View>
          </View>

          {/* ====================== KONTEN ====================== */}
          <View style={styles.content}>
            <View style={[styles.pane, { display: tab === 'dashboard' ? 'flex' : 'none' }]}>
              <DashboardScreen />
            </View>
            <View style={[styles.pane, { display: tab === 'transaksi' ? 'flex' : 'none' }]}>
              <TransaksiScreen />
            </View>
            <View style={[styles.pane, { display: tab === 'budget' ? 'flex' : 'none' }]}>
              <BudgetScreen />
            </View>
            <View style={[styles.pane, { display: tab === 'laporan' ? 'flex' : 'none' }]}>
              <LaporanScreen />
            </View>
            <View style={[styles.pane, { display: tab === 'pengaturan' ? 'flex' : 'none' }]}>
              <PengaturanScreen />
            </View>
          </View>

          {/* ==================== TOMBOL + (FAB) ==================== */}
          {fabVisible ? (
            <Pressable
              onPress={handleFab}
              style={({ pressed }) => [
                styles.fab,
                {
                  backgroundColor: c.primary,
                  bottom: insets.bottom + 66 + 16,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <FontAwesome6 name="plus" size={22} color="#fff" />
            </Pressable>
          ) : null}

          {/* ==================== NAVIGASI BAWAH ==================== */}
          <View
            style={[
              styles.nav,
              {
                backgroundColor: c.navBg,
                borderTopColor: c.border,
                paddingBottom: insets.bottom || 6,
              },
            ]}
          >
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={styles.navItem}
                  hitSlop={4}
                >
                  <View
                    style={[
                      styles.navIndicator,
                      { backgroundColor: active ? c.primary : 'transparent' },
                    ]}
                  />
                  <FontAwesome6
                    name={t.icon as any}
                    solid
                    size={17}
                    color={active ? c.primary : c.muted}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      { color: active ? c.primary : c.muted, fontWeight: active ? '700' : '500' },
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* ==================== MODAL (dirender terbuka saja) ==================== */}
      {showApp && modal?.key === 'transaction' ? (
        <TransactionModal key={`tx-${modal.param}`} />
      ) : null}
      {showApp && modal?.key === 'budget' ? (
        <BudgetModal key={`budget-${modal.param}`} />
      ) : null}
      {showApp && modal?.key === 'account' ? (
        <AccountModal key={`acc-${modal.param}`} />
      ) : null}
      {showApp && modal?.key === 'category' ? (
        <CategoryModal key={`cat-${modal.param}-${modal.extra || ''}`} />
      ) : null}
      {showApp && modal?.key === 'setPin' ? <PinModal key="pin" /> : null}
      {showApp && modal?.key === 'disablePin' ? <DisablePinModal key="disable-pin" /> : null}

      <ToastHost />
      <ConfirmHost />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  headerSub: {
    fontSize: 10,
    marginTop: -1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerSaldoLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  headerSaldo: {
    fontSize: 14,
    fontWeight: '800',
  },
  lockBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  pane: {
    ...StyleSheet.absoluteFill,
  },
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 30,
  },
  nav: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navIndicator: {
    position: 'absolute',
    top: 0,
    width: 30,
    height: 3,
    borderRadius: 3,
  },
  navLabel: {
    fontSize: 10,
  },
});
