// =============================================================================
// ui.tsx — Elemen tampilan bersama: judul bagian, kartu, chip, keadaan kosong
// =============================================================================

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';
import { hexA } from '../lib/icons';

/** Kartu putih dengan border lembut (pengganti kelas bg-white rounded-xl) */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}

/** Judul bagian dengan ikon (dan opsional aksi di kanan) */
export function SectionTitle({
  icon,
  children,
  action,
}: {
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <FontAwesome6 name={icon as any} solid size={14} color={c.subtext} />
      <Text style={[styles.sectionText, { color: c.subtext }]}>{children}</Text>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
}

/** Chip pil kecil berwarna (periode budget, status, dll.) */
export function Chip({
  label,
  color,
  icon,
  node,
}: {
  label: string;
  color: string;
  icon?: string;
  node?: React.ReactNode;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: hexA(color, 0.15) }]}>
      {icon ? <FontAwesome6 name={icon as any} solid size={9} color={color} /> : null}
      {node}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Pesan tengah untuk daftar kosong */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <FontAwesome6 name={icon as any} solid size={34} color={c.borderStrong} />
      <Text style={[styles.emptyTitle, { color: c.subtext }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySub, { color: c.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

/** Tombol ikon persegi (edit / hapus / kunci) */
export function IconBtn({
  name,
  onPress,
  color,
  size = 13,
}: {
  name: string;
  onPress: () => void;
  color?: string;
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: pressed ? c.cardAlt : 'transparent' },
      ]}
    >
      <FontAwesome6 name={name as any} solid size={size} color={color || c.muted} />
    </Pressable>
  );
}

/** Baris tombol selebar kartu (dipakai di Pengaturan → Data & Backup) */
export function ActionRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  rightIcon = 'chevron-right',
  rightColor,
  titleColor,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  rightIcon?: string;
  rightColor?: string;
  titleColor?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? c.cardAlt : 'transparent' }]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <FontAwesome6 name={icon as any} solid size={15} color={iconColor} />
      </View>
      <View style={styles.actionBody}>
        <Text style={[styles.actionTitle, { color: titleColor || c.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.actionSub, { color: c.muted }]}>{subtitle}</Text> : null}
      </View>
      <FontAwesome6 name={rightIcon as any} solid size={12} color={rightColor || c.borderStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
