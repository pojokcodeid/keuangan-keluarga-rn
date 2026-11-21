// =============================================================================
// DashboardScreen.tsx — Layar Dashboard (port dari renderDashboard di js/ui.js)
// =============================================================================

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
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

/** Ikon akun mengikuti jenisnya (sama dengan Pengaturan → Akun & Dompet) */
const accountIcon = (type: string): string => {
  if (type === 'bank') return 'building-columns';
  if (type === 'e-wallet') return 'mobile-screen-button';
  return 'wallet';
};

export function DashboardScreen() {
  const { snap, setTab, openModal } = useApp();
  const { c } = useTheme();
  const { t, language } = useLanguage();

  const { month, year } = currentMonthYear();
  const income = getMonthlyIncome(snap.transactions, month, year);
  const expense = getMonthlyExpense(snap.transactions, month, year);

  const activeBudgets = getBudgetStatuses(snap, true);
  const alerts = activeBudgets
    .filter((b) => b.percentage >= 75)
    .sort((a, b) => b.percentage - a.percentage);
  const recent = snap.transactions.slice(0, 5);

  const getPeriodLabel = (periodType: string) => {
    if (periodType === 'daily') return t.common.daily;
    if (periodType === 'weekly') return t.common.weekly;
    return t.common.monthly;
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Kartu rincian sisa saldo tiap akun & dompet */}
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <Text style={styles.heroLabel}>{t.dashboard.heroBalanceTitle}</Text>
        {snap.accounts.length === 0 ? (
          <Text style={styles.heroEmpty}>{t.dashboard.heroEmpty}</Text>
        ) : (
          <View style={styles.heroList}>
            {snap.accounts.map((acc, i) => {
              const balance = getAccountBalance(snap.accounts, snap.transactions, acc.id);
              const typeLabel =
                t.accountTypes[acc.type as keyof typeof t.accountTypes] ||
                (language === 'en' ? 'Account' : 'Akun');
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
                      {typeLabel}
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
              <Text style={styles.heroTileLabel}>{t.common.income}</Text>
            </View>
            <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(income)}
            </Text>
            <Text style={styles.heroTileSub}>{t.dashboard.thisMonth}</Text>
          </View>
          <View style={styles.heroTile}>
            <View style={styles.heroTileHead}>
              <FontAwesome6 name="arrow-trend-down" solid size={12} color="#fecdd3" />
              <Text style={styles.heroTileLabel}>{t.common.expense}</Text>
            </View>
            <Text style={styles.heroTileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(expense)}
            </Text>
            <Text style={styles.heroTileSub}>{t.dashboard.thisMonth}</Text>
          </View>
        </View>
      </View>

      {/* Peringatan anggaran */}
      <View>
        <SectionTitle icon="shield-halved">{t.dashboard.budgetAlertsTitle}</SectionTitle>
        <View style={{ gap: 8 }}>
          {activeBudgets.length === 0 ? (
            <Card style={styles.alertCard}>
              <IconBadge icon="fa-solid fa-bullseye|#6366F1" size={32} />
              <Text style={[styles.alertMuted, { color: c.muted }]}>
                {t.dashboard.noBudgets}
              </Text>
            </Card>
          ) : alerts.length === 0 ? (
            <Card style={styles.alertCard}>
              <IconBadge icon="fa-solid fa-shield-heart|#10B981" size={32} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: c.text }]}>{t.dashboard.allBudgetsSafe}</Text>
                <Text style={[styles.alertMuted, { color: c.muted }]}>
                  {t.dashboard.allBudgetsSafeSub}
                </Text>
              </View>
            </Card>
          ) : (
            alerts.map((b) => {
              const pct = Math.round(b.percentage);
              const toneData = tone(b.percentage);
              const pLabel = getPeriodLabel(b.period_type);
              const chipLabel = `${pct}% ${b.percentage >= 100 ? t.common.overBudget : t.common.nearLimit}`;
              return (
                <Card key={b.id} style={styles.alertFull}>
                  <View style={styles.alertHead}>
                    <IconBadge icon={resolveBudgetIcon(b)} size={32} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.alertTitle, { color: c.text }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <Text style={[styles.alertPeriod, { color: c.muted }]}>{pLabel}</Text>
                    </View>
                    <Chip
                      label={chipLabel}
                      color={toneData.c1}
                      icon={toneData.icon}
                    />
                  </View>
                  <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${Math.min(pct, 100)}%` as any,
                          backgroundColor: toneData.c1,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.alertFoot}>
                    <Text style={[styles.alertMuted, { color: c.muted }]}>
                      {t.dashboard.spent}: {formatCurrency(b.spent)}
                    </Text>
                    <Text style={[styles.alertMuted, { color: c.muted }]}>
                      {t.dashboard.limit}: {formatCurrency(b.amount_limit)}
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
              {t.dashboard.viewAll}
            </Text>
          }
        >
          {t.dashboard.recentTransactionsTitle}
        </SectionTitle>
        <Card>
          {recent.length === 0 ? (
            <EmptyState
              icon="inbox"
              title={t.dashboard.noTransactionsTitle}
              subtitle={t.dashboard.noTransactionsSub}
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
