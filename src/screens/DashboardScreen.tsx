// =============================================================================
// DashboardScreen.tsx — Layar Dashboard (port dari renderDashboard di js/ui.js)
// =============================================================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { Card, Chip, EmptyState, SectionTitle } from '../components/ui';
import { TransactionRowItem } from '../components/TransactionRow';
import { tone } from '../components/charts';
import {
  currentMonthYear,
  getAccountBalance,
  getMonthlyExpense,
  getMonthlyIncome,
  getBudgetStatuses,
} from '../lib/selectors';
import { formatCurrency } from '../lib/utils';
import { IconBadge, resolveBudgetIcon } from '../lib/icons';

const PERIOD: Record<string, { label: string; icon: string; color: string }> = {
  daily: { label: 'Harian', icon: 'sun', color: '#F59E0B' },
  weekly: { label: 'Mingguan', icon: 'calendar-week', color: '#3B82F6' },
  monthly: { label: 'Bulanan', icon: 'calendar-days', color: '#8B5CF6' },
};

/** Ikon akun mengikuti jenisnya (sama dengan Pengaturan → Akun & Dompet) */
const accountIcon = (type: string): string => {
  if (type === 'bank') return 'building-columns';
  if (type === 'e-wallet') return 'mobile-screen-button';
  return 'wallet';
};

const ACCOUNT_TYPE: Record<string, string> = {
  cash: 'Dompet / Kas Tunai',
  wallet: 'Dompet / Kas Tunai',
  bank: 'Rekening Bank',
  'e-wallet': 'E-Wallet',
  savings: 'Tabungan',
  other: 'Lainnya',
};

export function DashboardScreen() {
  const { snap, setTab, openModal } = useApp();
  const { c } = useTheme();

  const { month, year } = currentMonthYear();
  const income = getMonthlyIncome(snap.transactions, month, year);
  const expense = getMonthlyExpense(snap.transactions, month, year);

  const activeBudgets = getBudgetStatuses(snap, true);
  const alerts = activeBudgets
    .filter((b) => b.percentage >= 75)
    .sort((a, b) => b.percentage - a.percentage);
  const recent = snap.transactions.slice(0, 5);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Kartu rincian sisa saldo tiap akun & dompet */}
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <Text style={styles.heroLabel}>Sisa Saldo Semua Akun & Dompet</Text>
        {snap.accounts.length === 0 ? (
          <Text style={styles.heroEmpty}>
            Belum ada akun atau dompet. Tambahkan lewat menu Pengaturan → Akun & Dompet.
          </Text>
        ) : (
          <View style={styles.heroList}>
            {snap.accounts.map((acc, i) => {
              const balance = getAccountBalance(snap.accounts, snap.transactions, acc.id);
              return (
                <View
                  key={acc.id}
                  style={[styles.heroAcc, i > 0 ? styles.heroAccDiv : null]}
                >
                  <View style={styles.heroAccIcon}>
                    <FontAwesome6 name={accountIcon(acc.type) as any} solid size={13} color="#fff" />
                  </View>
                  <View style={styles.heroAccBody}>
                    <Text style={styles.heroAccName} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={styles.heroAccType} numberOfLines={1}>
                      {ACCOUNT_TYPE[acc.type] || 'Akun'}
                    </Text>
                  </View>
                  <Text
                    style={styles.heroAccBal}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(balance)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.heroRow}>
          <View style={styles.heroTile}>
            <View style={styles.heroTileHead}>
              <FontAwesome6 name="arrow-trend-up" solid size={12} color="#a7f3d0" />
              <Text style={styles.heroTileLabel}>Pemasukan</Text>
            </View>
            <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(income)}
            </Text>
            <Text style={styles.heroTileSub}>Bulan ini</Text>
          </View>
          <View style={styles.heroTile}>
            <View style={styles.heroTileHead}>
              <FontAwesome6 name="arrow-trend-down" solid size={12} color="#fecdd3" />
              <Text style={styles.heroTileLabel}>Pengeluaran</Text>
            </View>
            <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(expense)}
            </Text>
            <Text style={styles.heroTileSub}>Bulan ini</Text>
          </View>
        </View>
      </View>

      {/* Peringatan anggaran */}
      <View>
        <SectionTitle icon="shield-halved">Peringatan Anggaran</SectionTitle>
        <View style={{ gap: 8 }}>
          {activeBudgets.length === 0 ? (
            <Card style={styles.alertCard}>
              <IconBadge icon="fa-solid fa-bullseye|#6366F1" size={32} />
              <Text style={[styles.alertMuted, { color: c.muted }]}>
                Belum ada budget. Buat di menu Budget.
              </Text>
            </Card>
          ) : alerts.length === 0 ? (
            <Card style={styles.alertCard}>
              <IconBadge icon="fa-solid fa-shield-heart|#10B981" size={32} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: c.text }]}>Semua Budget Aman</Text>
                <Text style={[styles.alertMuted, { color: c.muted }]}>
                  Pengeluaran masih di bawah 75% dari batas.
                </Text>
              </View>
            </Card>
          ) : (
            alerts.map((b) => {
              const pct = Math.round(b.percentage);
              const t = tone(b.percentage);
              const P = PERIOD[b.period_type] || PERIOD.monthly;
              return (
                <Card key={b.id} style={styles.alertFull}>
                  <View style={styles.alertHead}>
                    <IconBadge icon={resolveBudgetIcon(b)} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.alertTitle, { color: c.text }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={[styles.alertPeriod, { color: c.muted }]}>{P.label}</Text>
                    </View>
                    <Chip
                      label={`${pct}% ${b.percentage >= 100 ? 'Melebihi' : 'Hampir habis'}`}
                      color={t.c1}
                      icon={t.icon}
                    />
                  </View>
                  <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.min(pct, 100)}%` as any,
                          backgroundColor: t.c1,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.alertFoot}>
                    <Text style={[styles.alertMuted, { color: c.muted }]}>
                      Terpakai: {formatCurrency(b.spent)}
                    </Text>
                    <Text style={[styles.alertMuted, { color: c.muted }]}>
                      Batas: {formatCurrency(b.amount_limit)}
                    </Text>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </View>

      {/* Transaksi terakhir */}
      <View>
        <SectionTitle
          icon="clock-rotate-left"
          action={
            <Text
              onPress={() => setTab('transaksi')}
              style={[styles.link, { color: c.primary }]}
            >
              Lihat Semua →
            </Text>
          }
        >
          Transaksi Terakhir
        </SectionTitle>
        <Card>
          {recent.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Belum ada transaksi"
              subtitle="Ketuk tombol + untuk menambah transaksi pertama"
            />
          ) : (
            recent.map((tx, i) => (
              <TransactionRowItem
                key={tx.id}
                tx={tx}
                divider={i < recent.length - 1}
                onPress={() => openModal('transaction', tx.id)}
              />
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  hero: {
    borderRadius: 18,
    padding: 20,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroEmpty: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  heroList: {
    marginTop: 8,
  },
  heroAcc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  heroAccDiv: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroAccIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAccBody: {
    flex: 1,
    minWidth: 0,
  },
  heroAccName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  heroAccType: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 1,
  },
  heroAccBal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  heroTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 12,
  },
  heroTileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTileLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroTileValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },
  heroTileSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  alertFull: {
    padding: 14,
    gap: 8,
  },
  alertHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertPeriod: {
    fontSize: 10,
    marginTop: 1,
  },
  alertMuted: {
    fontSize: 11,
    flexShrink: 1,
  },
  alertFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
  },
});
