// =============================================================================
// TransaksiScreen.tsx — Daftar transaksi + filter bulan/akun/kategori
// Port dari renderTransactions() di js/ui.js
// =============================================================================

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { Card, EmptyState } from '../components/ui';
import { TransactionRowItem } from '../components/TransactionRow';
import { MonthField } from '../components/DatePickers';
import { SelectField } from '../components/form';
import { FaIcon } from '../lib/icons';
import { filterTransactions, groupTransactions } from '../lib/selectors';
import { currentYearMonthISO, formatDateGroup, formatCurrency } from '../lib/utils';

export function TransaksiScreen() {
  const { snap, openModal } = useApp();
  const { c } = useTheme();

  const [monthStr, setMonthStr] = useState(currentYearMonthISO());
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const accountOptions = useMemo(
    () => [
      ...snap.accounts.map((a) => ({ value: String(a.id), label: a.name })),
    ],
    [snap.accounts]
  );

  const categoryOptions = useMemo(
    () =>
      snap.categories.map((cat) => ({
        value: String(cat.id),
        label: `${cat.name} (${cat.type === 'income' ? 'Masuk' : 'Keluar'})`,
        icon: <FaIcon icon={cat.icon} size={14} />,
      })),
    [snap.categories]
  );

  const [y, m] = monthStr.split('-').map(Number);
  const filtered = filterTransactions(snap.transactions, {
    month: m || null,
    year: y || null,
    accountId: accountId ? parseInt(accountId, 10) : null,
    categoryId: categoryId ? parseInt(categoryId, 10) : null,
  });

  const groups = groupTransactions(filtered);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Filter */}
      <Card style={styles.filterCard}>
        <View style={styles.filterGrid}>
          <View style={styles.filterCol}>
            <Text style={[styles.filterLabel, { color: c.subtext }]}>Bulan</Text>
            <MonthField value={monthStr} onChange={setMonthStr} />
          </View>
          <View style={styles.filterCol}>
            <SelectField
              label="Akun"
              value={accountId}
              options={accountOptions}
              onChange={setAccountId}
              placeholder="Semua Akun"
              allowEmpty
            />
          </View>
          <View style={styles.filterCol}>
            <SelectField
              label="Kategori"
              value={categoryId}
              options={categoryOptions}
              onChange={setCategoryId}
              placeholder="Semua Kategori"
              allowEmpty
            />
          </View>
        </View>
      </Card>

      {/* Daftar berkelompok per tanggal */}
      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon="inbox"
            title="Tidak ada transaksi ditemukan"
            subtitle="Coba sesuaikan filter atau tambahkan transaksi baru"
          />
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {groups.map((g) => (
            <Card key={g.date}>
              <View style={[styles.groupHead, { backgroundColor: c.cardAlt, borderBottomColor: c.border }]}>
                <Text style={[styles.groupLabel, { color: c.text }]}>{formatDateGroup(g.date)}</Text>
                <View style={styles.groupTotals}>
                  {g.dailyIncome > 0 ? (
                    <Text style={[styles.groupIncome, { color: c.success }]}>
                      +{formatCurrency(g.dailyIncome)}
                    </Text>
                  ) : null}
                  {g.dailyExpense > 0 ? (
                    <Text style={[styles.groupExpense, { color: c.danger }]}>
                      -{formatCurrency(g.dailyExpense)}
                    </Text>
                  ) : null}
                </View>
              </View>
              {g.txs.map((tx, i) => (
                <TransactionRowItem
                  key={tx.id}
                  tx={tx}
                  divider={i < g.txs.length - 1}
                  onPress={() => openModal('transaction', tx.id)}
                />
              ))}
            </Card>
          ))}
        </View>
      )}

      {groups.length > 0 ? (
        <Text style={[styles.count, { color: c.muted }]}>
          {filtered.length} transaksi ditemukan
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  filterCard: {
    padding: 14,
  },
  filterGrid: {
    gap: 12,
  },
  filterCol: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  groupTotals: {
    flexDirection: 'row',
    gap: 10,
  },
  groupIncome: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupExpense: {
    fontSize: 11,
    fontWeight: '700',
  },
  count: {
    fontSize: 11,
    textAlign: 'center',
  },
});
