// =============================================================================
// BudgetScreen.tsx — Budget harian / mingguan / bulanan + ringkasan alokasi
// Port dari renderBudgets() & renderBudgetSummary() di js/budget.js
// =============================================================================

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { Card, Chip, EmptyState, IconBtn, SectionTitle } from '../components/ui';
import { tone } from '../components/charts';
import {
  currentMonthYear,
  getBudgetStatuses,
  getMonthlyExpense,
  getMonthlyIncome,
} from '../lib/selectors';
import { formatCurrency, formatDate } from '../lib/utils';
import { hexA, IconBadge, resolveBudgetIcon } from '../lib/icons';
import { deleteBudget } from '../lib/db';

const PERIOD: Record<string, { label: string; icon: string; color: string }> = {
  daily: { label: 'Harian', icon: 'sun', color: '#F59E0B' },
  weekly: { label: 'Mingguan', icon: 'calendar-week', color: '#3B82F6' },
  monthly: { label: 'Bulanan', icon: 'calendar-days', color: '#8B5CF6' },
};

/** Kartu kecil (Terpakai / Sisa / Aman per hari) */
function Tile({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: c.cardAlt }]}>
      <View style={styles.tileHead}>
        <FontAwesome6 name={icon as any} solid size={9} color={color} />
        <Text style={[styles.tileLabel, { color: c.muted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.tileValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function SummaryCell({
  icon,
  color,
  label,
  value,
  sub,
}: {
  icon: string;
  color: string;
  label: string;
  value: string;
  sub?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.sumCell, { backgroundColor: c.card, borderColor: c.border }]}>
      <IconBadge icon={`fa-solid ${icon}|${color}`} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sumLabel, { color: c.muted }]}>{label}</Text>
        <Text style={[styles.sumValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {sub ? <Text style={[styles.sumSub, { color: c.muted }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function BudgetScreen() {
  const { snap, refresh, showToast, confirm, openModal } = useApp();
  const { c } = useTheme();

  const items = useMemo(() => getBudgetStatuses(snap), [snap]);
  const { month, year } = currentMonthYear();

  const income = getMonthlyIncome(snap.transactions, month, year);
  const expense = getMonthlyExpense(snap.transactions, month, year);
  const monthly = items.filter((b) => b.is_active && b.period_type === 'monthly');
  const perCat = monthly.filter((b) => b.category_id);
  const alloc = (perCat.length ? perCat : monthly).reduce((s, b) => s + b.amount_limit, 0);
  const spentPct = income > 0 ? Math.round((expense / income) * 100) : null;
  const allocPct = income > 0 ? Math.round((alloc / income) * 100) : null;
  const free = income - alloc;

  const handleDelete = async (id: number) => {
    const ok = await confirm('Hapus Budget', 'Budget ini akan dihapus. Transaksi tidak terpengaruh.');
    if (!ok) return;
    try {
      await deleteBudget(id);
      showToast('Budget dihapus', 'success');
      await refresh();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus budget', 'error');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View>
        <Text style={[styles.title, { color: c.text }]}>Budget & Anggaran</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Batasi pengeluaran harian, mingguan, atau bulanan.
        </Text>
      </View>

      {/* Ringkasan alokasi bulan berjalan */}
      <View style={styles.sumGrid}>
        <SummaryCell icon="arrow-trend-up" color="#10B981" label="Pemasukan" value={formatCurrency(income)} sub="Bulan ini" />
        <SummaryCell
          icon="arrow-trend-down"
          color="#F43F5E"
          label="Pengeluaran"
          value={formatCurrency(expense)}
          sub={spentPct === null ? 'Bulan ini' : `${spentPct}% dari pemasukan`}
        />
        <SummaryCell
          icon="bullseye"
          color="#6366F1"
          label="Total budget"
          value={formatCurrency(alloc)}
          sub={allocPct === null ? 'Bulanan' : `${allocPct}% dari pemasukan`}
        />
        <SummaryCell
          icon="scale-balanced"
          color={free >= 0 ? '#14B8A6' : '#F43F5E'}
          label="Belum dialokasi"
          value={formatCurrency(free)}
          sub="Pemasukan − budget"
        />
      </View>

      {income > 0 && alloc > income ? (
        <View style={[styles.warnBox, { backgroundColor: c.dangerSoft, borderColor: hexA('#e11d48', 0.35) }]}>
          <Text style={[styles.warnText, { color: c.danger }]}>
            Total budget bulanan melebihi pemasukan bulan ini.
          </Text>
        </View>
      ) : null}

      {/* Daftar budget */}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="bullseye"
            title="Belum ada budget"
            subtitle="Buat budget harian, mingguan, atau bulanan untuk mengontrol pengeluaran."
          />
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          <SectionTitle icon="list-ul">Daftar Budget</SectionTitle>
          {items.map((b) => {
            const pct = Math.round(b.percentage);
            const t = tone(b.percentage);
            const P = PERIOD[b.period_type] || PERIOD.monthly;
            const thirdTile =
              b.period_type === 'daily'
                ? { icon: 'flag-checkered', label: 'Batas', value: formatCurrency(b.amount_limit) }
                : { icon: 'hourglass-half', label: 'Aman/hari', value: formatCurrency(b.dailySafe) };

            return (
              <Card key={b.id} style={b.is_active ? undefined : { opacity: 0.6 }}>
                <View style={styles.cardBody}>
                  <View style={styles.head}>
                    <IconBadge icon={resolveBudgetIcon(b)} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                        {b.name}
                      </Text>
                      <View style={styles.chips}>
                        <Chip label={P.label} color={P.color} icon={P.icon} />
                        {b.category_id ? (
                          <Chip
                            label={b.category_name || 'Kategori'}
                            color={c.subtext}
                            node={<IconBadge icon={b.category_icon} size={16} />}
                          />
                        ) : (
                          <Chip label="Semua pengeluaran" color="#64748B" icon="receipt" />
                        )}
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <IconBtn name="pen" color={c.primary} onPress={() => openModal('budget', b.id)} />
                      <IconBtn name="trash-can" color={c.danger} onPress={() => handleDelete(b.id)} />
                    </View>
                  </View>

                  <View>
                    <View style={styles.pctRow}>
                      <Text style={[styles.pct, { color: t.c1 }]}>{pct}%</Text>
                      <Text style={[styles.pctSub, { color: c.muted }]}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.amount_limit)}
                      </Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${Math.min(pct, 100)}%` as any, backgroundColor: t.c1 },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.tiles}>
                    <Tile icon="wallet" color="#F43F5E" label="Terpakai" value={formatCurrency(b.spent)} />
                    {b.remaining >= 0 ? (
                      <Tile icon="piggy-bank" color="#10B981" label="Sisa" value={formatCurrency(b.remaining)} />
                    ) : (
                      <Tile icon="fire" color="#F43F5E" label="Lebih" value={formatCurrency(-b.remaining)} />
                    )}
                    <Tile icon={thirdTile.icon} color="#6366F1" label={thirdTile.label} value={thirdTile.value} />
                  </View>

                  <View style={styles.footer}>
                    {b.is_active ? (
                      <Chip label={t.label} color={t.c1} icon={t.icon} />
                    ) : (
                      <Chip label="Nonaktif" color="#64748B" icon="pause" />
                    )}
                    <Text style={[styles.period, { color: c.muted }]}>
                      {b.period_type === 'daily'
                        ? formatDate(b.start)
                        : `${formatDate(b.start)} – ${formatDate(b.end)}`}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sumCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  sumLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sumValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  sumSub: {
    fontSize: 10,
    marginTop: 1,
  },
  warnBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  warnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 14,
    gap: 12,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  pct: {
    fontSize: 20,
    fontWeight: '900',
  },
  pctSub: {
    fontSize: 11,
  },
  track: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
    gap: 2,
  },
  tileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  tileValue: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  period: {
    fontSize: 10,
    flexShrink: 1,
    textAlign: 'right',
  },
});
