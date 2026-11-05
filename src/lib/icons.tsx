// =============================================================================
// icons.tsx — Ikon FontAwesome 6 + warna (badge, picker, kompatibilitas data lama)
// Format simpan: "fa-solid fa-utensils|#F97316". Data lama (emoji / lucide) tetap terbaca.
// =============================================================================

import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

export const COLORS = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7', '#6366F1', '#3B82F6',
  '#06B6D4', '#14B8A6', '#10B981', '#84CC16', '#EAB308', '#64748B',
];

// [nama ikon FontAwesome tanpa "fa-", emoji pengganti]
export interface IconGroup {
  label: string;
  icon: string;
  items: [string, string][];
}

export const GROUPS: IconGroup[] = [
  { label: 'Makan', icon: 'utensils', items: [['utensils', '🍽️'], ['burger', '🍔'], ['pizza-slice', '🍕'], ['mug-hot', '☕'], ['ice-cream', '🍦'], ['bowl-rice', '🍚'], ['fish', '🐟'], ['carrot', '🥕'], ['apple-whole', '🍎'], ['cookie-bite', '🍪'], ['wine-glass', '🍷'], ['bottle-water', '💧']] },
  { label: 'Belanja', icon: 'bag-shopping', items: [['cart-shopping', '🛒'], ['bag-shopping', '🛍️'], ['basket-shopping', '🧺'], ['store', '🏪'], ['shirt', '👕'], ['shoe-prints', '👟'], ['gift', '🎁'], ['gem', '💎'], ['glasses', '👓'], ['ring', '💍']] },
  { label: 'Transport', icon: 'car', items: [['car', '🚗'], ['motorcycle', '🏍️'], ['bus', '🚌'], ['train', '🚆'], ['plane', '✈️'], ['gas-pump', '⛽'], ['bicycle', '🚲'], ['taxi', '🚕'], ['ship', '🚢'], ['van-shuttle', '🚐']] },
  { label: 'Rumah', icon: 'house', items: [['house', '🏠'], ['bolt', '⚡'], ['droplet', '💧'], ['wifi', '🌐'], ['phone', '📱'], ['fire-flame-curved', '🔥'], ['file-invoice-dollar', '🧾'], ['couch', '🛋️'], ['broom', '🧹'], ['screwdriver-wrench', '🔧'], ['tv', '📺'], ['key', '🔑']] },
  { label: 'Sehat', icon: 'heart-pulse', items: [['heart-pulse', '🏥'], ['pills', '💊'], ['stethoscope', '🩺'], ['tooth', '🦷'], ['syringe', '💉'], ['hospital', '🏥'], ['dumbbell', '🏋️'], ['spa', '💆']] },
  { label: 'Kerja', icon: 'briefcase', items: [['briefcase', '💼'], ['graduation-cap', '🎓'], ['book', '📖'], ['book-open-reader', '📚'], ['laptop', '💻'], ['pen', '🖊️'], ['school', '🏫'], ['building', '🏢'], ['chalkboard-user', '🧑‍🏫']] },
  { label: 'Hiburan', icon: 'gamepad', items: [['gamepad', '🎮'], ['film', '🎬'], ['music', '🎵'], ['headphones', '🎧'], ['ticket', '🎟️'], ['futbol', '⚽'], ['camera', '📷'], ['palette', '🎨'], ['umbrella-beach', '🏖️'], ['guitar', '🎸'], ['dice', '🎲'], ['champagne-glasses', '🥂']] },
  { label: 'Uang', icon: 'wallet', items: [['wallet', '💰'], ['money-bill-wave', '💵'], ['piggy-bank', '🐷'], ['landmark', '🏦'], ['building-columns', '🏦'], ['chart-line', '📈'], ['arrow-trend-up', '📈'], ['coins', '🪙'], ['credit-card', '💳'], ['hand-holding-dollar', '💸'], ['sack-dollar', '💰'], ['vault', '🔐'], ['bullseye', '🎯'], ['scale-balanced', '⚖️']] },
  { label: 'Lainnya', icon: 'star', items: [['baby', '👶'], ['child', '🧒'], ['paw', '🐾'], ['heart', '❤️'], ['people-roof', '👨‍👩‍👧'], ['hands-praying', '🙏'], ['mosque', '🕌'], ['seedling', '🌱'], ['star', '⭐'], ['tag', '🏷️'], ['circle-plus', '➕'], ['ellipsis', '📦']] },
];

const EMOJI = new Map<string, string>();
GROUPS.forEach((g) => g.items.forEach(([n, e]) => EMOJI.set('fa-' + n, e)));
['sun', 'calendar-week', 'calendar-days', 'right-left', 'mobile-screen-button', 'receipt'].forEach((n) =>
  EMOJI.set('fa-' + n, '🏷️')
);

// Nama ikon lama (lucide / data awal) → FontAwesome
const LEGACY: Record<string, string> = {
  briefcase: 'fa-briefcase', gift: 'fa-gift', 'trending-up': 'fa-arrow-trend-up',
  'plus-circle': 'fa-circle-plus', 'shopping-cart': 'fa-cart-shopping', utensils: 'fa-utensils',
  car: 'fa-car', zap: 'fa-bolt', wifi: 'fa-wifi', 'heart-pulse': 'fa-heart-pulse',
  'graduation-cap': 'fa-graduation-cap', 'gamepad-2': 'fa-gamepad', landmark: 'fa-landmark',
  wallet: 'fa-wallet', tag: 'fa-tag', 'more-horizontal': 'fa-ellipsis',
};
const LEGACY_COLOR: Record<string, string> = {
  briefcase: '#6366F1', gift: '#EC4899', 'trending-up': '#10B981', 'plus-circle': '#14B8A6',
  'shopping-cart': '#A855F7', utensils: '#F97316', car: '#3B82F6', zap: '#EAB308',
  wifi: '#06B6D4', 'heart-pulse': '#EF4444', 'graduation-cap': '#6366F1',
  'gamepad-2': '#EC4899', landmark: '#64748B', wallet: '#10B981', tag: '#64748B',
  'more-horizontal': '#64748B',
};

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export interface ParsedIcon {
  kind: 'emoji' | 'fa';
  name: string;
  color: string;
  emoji: string;
}

/** Baca nilai ikon apa pun (FA, nama lucide lama, emoji) menjadi objek seragam. */
export function parseIcon(raw: string | null | undefined): ParsedIcon {
  const v = String(raw ?? '').trim();
  // Emoji: karakter non-ASCII
  if (v && /[^\x00-\x7F]/.test(v)) {
    return { kind: 'emoji', name: '', color: '#64748B', emoji: v };
  }

  let [cls, color] = (v || 'tag').split('|');
  cls = cls.trim().replace(/[^a-z0-9 -]/gi, '');
  color = color && /^#[0-9a-f]{6}$/i.test(color.trim()) ? color.trim() : '';

  if (!cls.startsWith('fa-')) {
    const key = cls;
    cls = 'fa-solid ' + (LEGACY[key] || 'fa-tag');
    color = color || LEGACY_COLOR[key] || '';
  } else if (!/^fa-(solid|regular|brands)\b/.test(cls)) {
    cls = 'fa-solid ' + cls;
  }

  // Nama glyph untuk FontAwesome6: glyphmap FA6 memakai nama polos ("utensils"),
  // bukan nama class CSS ("fa-utensils") — prefix "fa-" dipotong (termasuk data ganda "fa-fa-…").
  const rawName = cls.split(/\s+/).pop() || 'tag';
  const name = rawName.replace(/^(?:fa-)+/, '');
  const finalColor = color || COLORS[hash(rawName) % COLORS.length];
  return {
    kind: 'fa',
    name,
    color: finalColor,
    emoji: EMOJI.get(rawName) || '🏷️',
  };
}

export const emojiFor = (raw: string | null | undefined): string => parseIcon(raw).emoji;
export const iconColor = (raw: string | null | undefined): string => parseIcon(raw).color;

/** Ikon bawaan budget per periode */
const PERIOD_ICON: Record<string, string> = {
  daily: 'fa-solid fa-sun|#F59E0B',
  weekly: 'fa-solid fa-calendar-week|#3B82F6',
  monthly: 'fa-solid fa-calendar-days|#8B5CF6',
};
export const periodIcon = (t: string): string => PERIOD_ICON[t] || PERIOD_ICON.monthly;

/** Pilihan user > ikon kategori > ikon periode */
export function resolveBudgetIcon(b: {
  icon?: string | null;
  category_id?: number | null;
  category_icon?: string | null;
  period_type: string;
}): string {
  return b.icon || (b.category_id && b.category_icon ? b.category_icon : periodIcon(b.period_type));
}

// ---------------------------------------------------------------------------
// Komponen ikon
// ---------------------------------------------------------------------------

interface FaIconProps {
  /** Nilai mentah ("fa-solid fa-x|#RRGGBB" / nama lama / emoji) ATAU nama FA saja */
  icon: string | null | undefined;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Render satu ikon (FA6 / emoji) dengan warna dari data. */
export function FaIcon({ icon, size = 16, color, style }: FaIconProps) {
  const p = parseIcon(icon);
  const tint = color || p.color;
  if (p.kind === 'emoji') {
    return (
      <Text style={[{ fontSize: Math.round(size * 0.9), lineHeight: Math.round(size * 1.05) }, style]}>
        {p.emoji}
      </Text>
    );
  }
  return (
    <FontAwesome6
      name={p.name as any}
      solid
      size={size}
      color={tint}
      style={style as any}
    />
  );
}

/** Kotak ikon berwarna (pengganti iconBadge HTML). */
export function IconBadge({
  icon,
  size = 40,
  style,
}: {
  icon: string | null | undefined;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = parseIcon(icon);
  const radius = Math.round(size * 0.3);
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: hexA(p.color, 0.16),
        },
        style,
      ]}
    >
      {p.kind === 'emoji' ? (
        <Text style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.58) }}>
          {p.emoji}
        </Text>
      ) : (
        <FontAwesome6 name={p.name as any} solid size={Math.round(size * 0.4)} color={p.color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
