// =============================================================================
// LaporanScreen.tsx — Laporan bulanan + grafik (port dari renderReports di ui.js)
// Tab Ringkasan & Grafik, filter bulan, ekspor Excel.
// =============================================================================

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { Card, EmptyState, SectionTitle } from '../components/ui';
import { SegmentedControl } from '../components/form';
import { MonthField } from '../components/DatePickers';
import { DonutChart, GroupedBarChart, HBarList, tone } from '../components/charts';
import {
  getBudgetStatuses,
  getBudgetUsage,
  getExpenseByCategory,
  getIncomeVsExpense,
  getMonthlySummary,
  SHORT_MONTHS,
} from '../lib/selectors';
import { formatCurrency, getCurrentMonth, getCurrentYear, parseDate } from '../lib/utils';
import { COLORS } from '../lib/icons';
import { exportToExcel } from '../lib/excel';

type ReportTab = 'ringkasan' | 'grafik';

function SummaryCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.sumCard, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.sumIcon, { backgroundColor: iconBg }]}>
        <FontAwesome6 name={icon as any} solid size={13} color={iconColor} />
      </View>
      <Text style={[styles.sumLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.sumValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function LaporanScreen() {
  const { snap, showToast } = useApp();
  const { c } = useTheme();
  const [tab, setTab] = useState<ReportTab>('ringkasan');
  const [monthStr, setMonthStr] = useState(
    `${getCurrentYear()}-${String(getCurrentMonth()).padStart(2, '0')}`
  );
  const [exporting, setExporting] = useState(false);

  const [y, m] = monthStr.split('-').map(Number);
  const month = m || getCurrentMonth();
  const year = y || getCurrentYear();

  const summary = useMemo(
    () => getMonthlySummary(snap.transactions, month, year),
    [snap.transactions, month, year]
  );
  const budgetUsage = useMemo(
    () => getBudgetUsage(snap.transactions, snap.categories, month, year),
    [snap.transactions, snap.categories, month, year]
  );
  const expenseByCat = useMemo(
    () => getExpenseByCategory(snap.transactions, snap.categories, month, year),
    [snap.transactions, snap.categories, month, year]
  );
  const donutSlices = useMemo(
    () =>
      expenseByCat.map((row, i) => ({
        label: row.categoryName,
        value: row.total,
        color: COLORS[i % COLORS.length],
      })),
    [expenseByCat]
  );
  const budgetBars = useMemo(() => {
    const active = getBudgetStatuses(snap, true);
    return active.map((b) => {
      const t = tone(b.percentage);
      return {
        label: b.name,
        percent: b.percentage,
        color: t.c1,
        sublabel: `${formatCurrency(b.spent)} / ${formatCurrency(b.amount_limit)}`,
      };
    });
  }, [snap]);
  const series = useMemo(
    () => getIncomeVsExpense(snap.transactions, 6),
    [snap.transactions]
  );
  const barPoints = useMemo(
    () =>
      series.map((s) => ({
        label: SHORT_MONTHS[s.month - 1],
        income: s.income,
        expense: s.expense,
      })),
    [series]
  );

  const totalExpense = expenseByCat.reduce((s, r) => s + r.total, 0);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportToExcel(snap, { month, year });
      showToast('Laporan Excel berhasil dibagikan', 'success');
    } catch (err: any) {
      showToast('Gagal mengekspor Excel: ' + (err?.message || String(err)), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Pilih tab Ringkasan / Grafik */}
      <View style={[styles.tabWrap, { backgroundColor: c.card, borderColor: c.border }]}>
        <SegmentedControl<ReportTab>
          value={tab}
          onChange={setTab}
          activeColor={c.primary}
          activeSoft={c.primarySoft}
          options={[
            { value: 'ringkasan', label: 'Ringkasan', icon: 'list-ul' },
            { value: 'grafik', label: 'Grafik', icon: 'chart-simple' },
          ]}
        />
      </View>

      {/* Filter bulan + tombol Excel */}
      <View style={styles.monthRow}>
        <View style={{ flex: 1 }}>
          <MonthField value={monthStr} onChange={setMonthStr} />
        </View>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [
            styles.excelBtn,
            { backgroundColor: exporting ? c.muted : c.success, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <FontAwesome6 name="download" solid size={13} color="#fff" />
          <Text style={styles.excelText}>{exporting ? 'Memproses…' : 'Excel'}</Text>
        </Pressable>
      </View>

      {tab === 'ringkasan' ? (
        <View style={{ gap: 16 }}>
          {/* Ringkasan bulanan */}
          <View style={styles.sumRow}>
            <SummaryCard
              icon="arrow-trend-up"
              iconBg={c.successSoft}
              iconColor={c.success}
              label="Pemasukan"
              value={formatCurrency(summary.totalIncome)}
              valueColor={c.success}
            />
            <SummaryCard
              icon="arrow-trend-down"
              iconBg={c.dangerSoft}
              iconColor={c.danger}
              label="Pengeluaran"
              value={formatCurrency(summary.totalExpense)}
              valueColor={c.danger}
            />
            <SummaryCard
              icon="wallet"
              iconBg={c.primarySoft}
              iconColor={c.primary}
              label="Selisih"
              value={formatCurrency(summary.net)}
              valueColor={summary.net >= 0 ? c.primary : c.danger}
            />
          </View>

          {/* Penggunaan anggaran per kategori */}
          <View>
            <SectionTitle icon="bullseye">Penggunaan Anggaran</SectionTitle>
            <Card>
              {budgetUsage.length === 0 ? (
                <EmptyState
                  icon="bullseye"
                  title="Belum ada kategori pengeluaran dengan batas anggaran"
                  subtitle="Atur batas anggaran di menu Pengaturan → Kategori"
                />
              ) : (
                budgetUsage.map((item, i) => {
                  const pct = Math.round(item.percentage);
                  const barColor = pct > 100 ? c.danger : pct > 75 ? c.warning : c.success;
                  const textColor = pct > 100 ? c.danger : pct > 75 ? c.warning : c.success;
                  return (
                    <View
                      key={item.categoryId}
                      style={[
                        styles.usageRow,
                        { borderBottomColor: i < budgetUsage.length - 1 ? c.border : 'transparent' },
                      ]}
                    >
                      <View style={styles.usageHead}>
                        <Text style={[styles.usageName, { color: c.text }]} numberOfLines={1}>
                          {item.categoryName}
                        </Text>
                        <Text style={[styles.usagePct, { color: textColor }]}>{pct}%</Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
                        <View
                          style={[
                            styles.fill,
                            { width: `${Math.min(pct, 100)}%` as any, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <View style={styles.usageFoot}>
                        <Text style={[styles.usageSub, { color: c.muted }]}>
                          Terpakai: <Text style={{ color: c.subtext, fontWeight: '700' }}>{formatCurrency(item.spent)}</Text>
                        </Text>
                        <Text style={[styles.usageSub, { color: c.muted }]}>
                          Batas: <Text style={{ color: c.subtext, fontWeight: '700' }}>{formatCurrency(item.budgetLimit)}</Text>
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </View>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Donut: pengeluaran per kategori */}
          <View>
            <SectionTitle icon="chart-pie">Pengeluaran per Kategori</SectionTitle>
            <Card style={styles.chartCard}>
              {expenseByCat.length === 0 ? (
                <EmptyState icon="chart-pie" title="Belum ada data pengeluaran" />
              ) : (
                <>
                  <View style={styles.donutWrap}>
                    <DonutChart
                      data={donutSlices}
                      centerLabel="Total Pengeluaran"
                      centerValue={formatCurrency(totalExpense)}
                    />
                  </View>
                  <View style={{ gap: 6 }}>
                    {expenseByCat.map((row, i) => {
                      const pct = totalExpense > 0 ? Math.round((row.total / totalExpense) * 100) : 0;
                      return (
                        <View key={String(row.categoryId)} style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                          <Text style={[styles.legendLabel, { color: c.text }]} numberOfLines={1}>
                            {row.categoryName}
                          </Text>
                          <Text style={[styles.legendPct, { color: c.subtext }]}>{pct}%</Text>
                          <Text style={[styles.legendValue, { color: c.subtext }]}>{formatCurrency(row.total)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </Card>
          </View>

          {/* Budget vs realisasi */}
          <View>
            <SectionTitle icon="bullseye">Budget vs Realisasi</SectionTitle>
            <Card style={styles.chartCard}>
              <HBarList items={budgetBars} />
            </Card>
          </View>

          {/* Pemasukan vs pengeluaran 6 bulan */}
          <View>
            <SectionTitle icon="chart-column">Pemasukan vs Pengeluaran (6 Bulan Terakhir)</SectionTitle>
            <Card style={styles.chartCard}>
              {barPoints.every((p) => p.income === 0 && p.expense === 0) ? (
                <EmptyState icon="chart-column" title="Belum ada data transaksi" />
              ) : (
                <GroupedBarChart data={barPoints} />
              )}
            </Card>
          </View>
        </View>
      )}

      <Text style={[styles.note, { color: c.muted }]}>
        Periode laporan: {parseDate(`${year}-${String(month).padStart(2, '0')}-01`).getFullYear()} ·{' '}
        {SHORT_MONTHS[month - 1]} · {summary.transactionCount} transaksi
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  tabWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  excelBtn: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  excelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sumRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sumCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  sumIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sumLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sumValue: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  usageRow: {
    padding: 14,
    gap: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  usageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  usageName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  usagePct: {
    fontSize: 12,
    fontWeight: '800',
  },
  usageFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  usageSub: {
    fontSize: 11,
  },
  track: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  chartCard: {
    padding: 16,
  },
  donutWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  legendPct: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '600',
    width: 96,
    textAlign: 'right',
  },
  note: {
    fontSize: 11,
    textAlign: 'center',
  },
});
