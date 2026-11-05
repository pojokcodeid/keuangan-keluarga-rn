// =============================================================================
// IconPicker.tsx — Picker ikon FontAwesome + warna (port dari createIconPicker)
// =============================================================================

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { COLORS, GROUPS, hexA, parseIcon } from '../lib/icons';
import { useTheme } from '../state/ThemeContext';

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

/** Cari grup ikon untuk sebuah klasifikasi FA */
function findGroupIndex(cls: string): number {
  return GROUPS.findIndex((g) => g.items.some(([n]) => 'fa-solid fa-' + n === cls));
}

export function IconPicker({ value, onChange, label = 'Pilih ikon & warna' }: Props) {
  const { c } = useTheme();
  const parsed = parseIcon(value);
  const initialCls = parsed.kind === 'fa' ? `fa-solid fa-${parsed.name}` : 'fa-solid fa-tag';
  const gi = findGroupIndex(initialCls);
  const [group, setGroup] = useState(gi >= 0 ? gi : 0);
  const [cls, setCls] = useState(initialCls);
  const [color, setColor] = useState(parsed.color);

  const emit = (nextCls: string, nextColor: string) => {
    onChange(`${nextCls}|${nextColor}`);
  };

  const preview = `${cls}|${color}`;

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <View style={[styles.preview, { backgroundColor: hexA(color, 0.16) }]}>
          <FontAwesome6
            name={cls.replace('fa-solid ', '').replace(/^(?:fa-)+/, '') as any}
            solid
            size={17}
            color={color}
          />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
          <Text style={{ color: c.muted, fontSize: 11 }}>Ketuk ikon, lalu pilih warna favorit</Text>
        </View>
      </View>

      {/* Grup */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {GROUPS.map((g, i) => {
          const active = i === group;
          return (
            <Pressable
              key={g.label}
              onPress={() => setGroup(i)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? c.primarySoft : c.card,
                  borderColor: active ? c.primary : c.inputBorder,
                },
              ]}
            >
              <FontAwesome6 name={g.icon as any} solid size={11} color={active ? c.primary : c.subtext} />
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? c.primary : c.subtext }}>
                {g.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Grid ikon */}
      <View style={[styles.grid, { backgroundColor: c.cardAlt, borderColor: c.border }]}>
        {GROUPS[group].items.map(([n]) => {
          const itemCls = 'fa-solid fa-' + n;
          const on = itemCls === cls;
          return (
            <Pressable
              key={n}
              onPress={() => {
                setCls(itemCls);
                emit(itemCls, color);
              }}
              style={[
                styles.gridItem,
                {
                  borderColor: on ? color : c.inputBorder,
                  backgroundColor: on ? hexA(color, 0.16) : c.card,
                },
              ]}
            >
              <FontAwesome6 name={n as any} solid size={16} color={on ? color : c.subtext} />
            </Pressable>
          );
        })}
      </View>

      {/* Warna */}
      <View style={styles.colors}>
        {COLORS.map((col) => {
          const on = col === color;
          return (
            <Pressable
              key={col}
              onPress={() => {
                setColor(col);
                emit(cls, col);
              }}
              style={[
                styles.colorDot,
                {
                  backgroundColor: col,
                  transform: [{ scale: on ? 1.15 : 1 }],
                },
                on ? { borderWidth: 2, borderColor: '#fff', shadowColor: col, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 } : null,
              ]}
            />
          );
        })}
      </View>

      <Text style={{ color: c.muted, fontSize: 11 }}>Pratinjau: {preview}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    gap: 6,
    paddingRight: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridItem: {
    width: 44,
    height: 40,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
