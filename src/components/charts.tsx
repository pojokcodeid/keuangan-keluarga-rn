// =============================================================================
// charts.tsx — Grafik native (react-native-svg):
//  - DonutChart: pengeluaran per kategori (pengganti Chart.js doughnut)
//  - GroupedBarChart: pemasukan vs pengeluaran 6 bulan
//  - BudgetBar: bar horizontal persentase budget
// =============================================================================

import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../state/ThemeContext';
import { formatAxisLabel } from '../lib/utils';

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 210,
  centerLabel = 'Total Pengeluaran',
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue: string;
}) {
  const { c } = useTheme();
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const stroke = size * 0.17;
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 2;

  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {total > 0 &&
            data.map((d, i) => {
              const frac = d.value / total;
              const len = Math.max(0, circumference * frac - (data.length > 1 ? gap : 0));
              const dashOffset = -offset;
              offset += circumference * frac;
              return (
                <Circle
                  key={`${d.label}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={{ fontSize: 11, color: c.muted, fontWeight: '500' }}>{centerLabel}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: 16, fontWeight: '800', color: c.text, marginTop: 2 }}
        >
          {centerValue}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bar chart berkelompok (Pemasukan vs Pengeluaran)
// ---------------------------------------------------------------------------

export interface BarPoint {
  label: string;
  income: number;
  expense: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const norm = v / base;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

export function GroupedBarChart({
  data,
  height = 230,
}: {
  data: BarPoint[];
  height?: number;
}) {
  const { c } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const width = Math.max(280, winWidth - 64);

  const padLeft = 52;
  const padRight = 8;
  const padTop = 10;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = niceMax(Math.max(1, ...data.map((d) => Math.max(d.income, d.expense))));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(18, groupW * 0.28);

  return (
    <View>
      <Svg width={width} height={height}>
        {ticks.map((t) => {
          const y = padTop + plotH - plotH * t;
          return (
            <React.Fragment key={t}>
              <Line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={c.borderStrong}
                strokeWidth={1}
                strokeDasharray={t === 0 ? undefined : '4 4'}
              />
              <SvgText
                x={padLeft - 6}
                y={y + 3}
                fontSize={9}
                fill={c.muted}
                textAnchor="end"
              >
                {formatAxisLabel(maxVal * t).replace('Rp ', '')}
              </SvgText>
            </React.Fragment>
          );
        })}

        {data.map((d, i) => {
          const groupX = padLeft + i * groupW;
          const incomeH = maxVal > 0 ? (d.income / maxVal) * plotH : 0;
          const expenseH = maxVal > 0 ? (d.expense / maxVal) * plotH : 0;
          const baseY = padTop + plotH;
          const cx = groupX + groupW / 2;

          return (
            <React.Fragment key={`${d.label}-${i}`}>
              <Rect
                x={cx - barW - 2}
                y={baseY - incomeH}
                width={barW}
                height={Math.max(0, incomeH)}
                rx={3}
                fill="#10B981"
              />
              <Rect
                x={cx + 2}
                y={baseY - expenseH}
                width={barW}
                height={Math.max(0, expenseH)}
                rx={3}
                fill="#F43F5E"
              />
              <SvgText
                x={cx}
                y={height - 8}
                fontSize={9}
                fill={c.muted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <LegendDot color="#10B981" label="Pemasukan" />
        <LegendDot color="#F43F5E" label="Pengeluaran" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={{ fontSize: 11, color: c.subtext, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bar horizontal persentase (Budget vs Realisasi)
// ---------------------------------------------------------------------------

export interface HBarItem {
  label: string;
  percent: number;
  color: string;
  sublabel?: string;
}

export function HBarList({ items }: { items: HBarItem[] }) {
  const { c } = useTheme();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 12, color: c.muted }}>Belum ada budget aktif. Buat di menu Budget.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {items.map((it, i) => {
        const pct = Math.round(it.percent);
        return (
          <View key={`${it.label}-${i}`} style={{ gap: 5 }}>
            <View style={styles.hbarHead}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: '600', color: c.text }}>
                {it.label}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: it.color }}>{pct}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.cardAlt }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(pct, 100)}%`, backgroundColor: it.color },
                ]}
              />
            </View>
            {it.sublabel ? (
              <Text style={{ fontSize: 10, color: c.muted }} numberOfLines={1}>
                {it.sublabel}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Progress bar tipis (dipakai kartu budget & peringatan) */
export function ProgressBar({
  percent,
  height = 10,
  gradientColors,
}: {
  percent: number;
  height?: number;
  gradientColors: [string, string];
}) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View style={[styles.track, { height, backgroundColor: c.cardAlt }]}>
      <View
        style={{
          width: `${pct}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: gradientColors[0],
        }}
      />
    </View>
  );
}

/** Warna nada budget: hijau <75%, kuning 75-99%, merah >=100% */
export function tone(pct: number): { c1: string; c2: string; icon: string; label: string } {
  if (pct >= 100) return { c1: '#F43F5E', c2: '#FB7185', icon: 'circle-xmark', label: 'Melebihi budget' };
  if (pct >= 75) return { c1: '#F59E0B', c2: '#FBBF24', icon: 'triangle-exclamation', label: 'Mendekati batas' };
  return { c1: '#10B981', c2: '#34D399', icon: 'circle-check', label: 'Aman' };
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hbarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
  },
});
