// =============================================================================
// TransactionRow.tsx — Baris transaksi (dipakai Dashboard & daftar Transaksi)
// Port dari renderTransactionRowHtml() di js/ui.js
// =============================================================================

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TransactionRow as Tx } from '../lib/db';
import { useTheme } from '../state/ThemeContext';
import { IconBadge } from '../lib/icons';
import { formatCurrency, formatDate } from '../lib/utils';

const TYPE_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  income: { label: 'Pemasukan', bg: 'rgba(16,185,129,0.12)', fg: '#10B981' },
  expense: { label: 'Pengeluaran', bg: 'rgba(244,63,94,0.10)', fg: '#E11D48' },
  transfer: { label: 'Transfer', bg: 'rgba(59,130,246,0.12)', fg: '#3B82F6' },
};

const AMOUNT_COLOR: Record<string, string> = {
  income: '#10b981',
  expense: '#e11d48',
  transfer: '#3b82f6',
};

export function TransactionRowItem({
  tx,
  onPress,
  divider = true,
}: {
  tx: Tx;
  onPress: () => void;
  divider?: boolean;
}) {
  const { c } = useTheme();
  const isTransfer = tx.type === 'transfer';
  const badge = TYPE_BADGE[tx.type] || TYPE_BADGE.transfer;

  const iconValue = isTransfer
    ? 'fa-solid fa-right-left|#3B82F6'
    : tx.category_icon || (tx.type === 'income' ? 'briefcase' : 'shopping-cart');

  const title = isTransfer
    ? `${tx.account_name || 'Akun'} → ${tx.to_account_name || 'Akun Tujuan'}`
    : tx.category_name || 'Tanpa Kategori';

  const subInfo = isTransfer ? 'Transfer Antar-Akun' : tx.account_name || '';
  const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: divider ? c.border : 'transparent', backgroundColor: pressed ? c.cardAlt : 'transparent' },
      ]}
    >
      <IconBadge icon={iconValue} size={38} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={styles.subRow}>
          <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>
            {subInfo}
            {tx.note ? ` · ${tx.note}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: AMOUNT_COLOR[tx.type] || c.primary }]} numberOfLines={1}>
          {prefix}
          {formatCurrency(tx.amount)}
        </Text>
        <Text style={[styles.date, { color: c.muted }]}>{formatDate(tx.transaction_date)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  subRow: {
    marginTop: 2,
  },
  sub: {
    fontSize: 11,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
  date: {
    fontSize: 10,
    marginTop: 2,
  },
});
