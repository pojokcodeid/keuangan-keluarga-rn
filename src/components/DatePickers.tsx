// =============================================================================
// DatePickers.tsx — Input tanggal & bulan bergaya wheel (pengganti input date/month)
// =============================================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';
import { MONTH_NAMES_SHORT, getCurrentMonth, getCurrentYear, pad2 } from '../lib/utils';
import { FieldLabel } from './form';

const ITEM_H = 40;
const WHEEL_H = ITEM_H * 5;

interface WheelProps {
  items: string[];
  index: number;
  onChange: (i: number) => void;
  width: number;
}

function Wheel({ items, index, onChange, width }: WheelProps) {
  const { c } = useTheme();
  const ref = useRef<ScrollViewInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: Math.max(0, index) * ITEM_H, animated: false });
      setReady(true);
    }, 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== index) onChange(i);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: WHEEL_H, width }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onScrollEndDrag={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      <View style={{ height: (WHEEL_H - ITEM_H) / 2 }} />
      {items.map((it, i) => {
        const active = i === index && ready;
        return (
          <Pressable
            key={`${it}-${i}`}
            onPress={() => {
              onChange(i);
              ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            }}
            style={styles.wheelItem}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: active ? 16 : 15,
                fontWeight: active ? '800' : '500',
                color: active ? c.primary : c.subtext,
              }}
            >
              {it}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ height: (WHEEL_H - ITEM_H) / 2 }} />
    </ScrollView>
  );
}

function WheelPickerSheet({
  visible,
  title,
  onClose,
  onConfirm,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.flex}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.card }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
            <Pressable onPress={onClose} hitSlop={10} style={{ padding: 6 }}>
              <Text style={{ color: c.subtext, fontSize: 14, fontWeight: '600' }}>Batal</Text>
            </Pressable>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{title}</Text>
            <Pressable onPress={onConfirm} hitSlop={10} style={{ padding: 6 }}>
              <Text style={{ color: c.primary, fontSize: 14, fontWeight: '700' }}>Pilih</Text>
            </Pressable>
          </View>
          <View style={styles.wheelArea}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DateField: "YYYY-MM-DD"
// ---------------------------------------------------------------------------

export function DateField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  const [y, m, d] = value.split('-').map(Number);
  const year = y || getCurrentYear();
  const month = m || getCurrentMonth();
  const day = d || 1;

  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);
  const [selDay, setSelDay] = useState(day);

  const openPicker = () => {
    setSelYear(year);
    setSelMonth(month);
    setSelDay(day);
    setOpen(true);
  };

  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const dayItems = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const monthItems = MONTH_NAMES_SHORT;
  const nowYear = getCurrentYear();
  const yearItems = Array.from({ length: 11 }, (_, i) => String(nowYear - 5 + i));

  const confirm = () => {
    const dd = Math.min(selDay, daysInMonth);
    onChange(`${selYear}-${pad2(selMonth)}-${pad2(dd)}`);
    setOpen(false);
  };

  const display = value
    ? `${String(day).padStart(2, '0')} ${MONTH_NAMES_SHORT[month - 1] || ''} ${year}`
    : '-';

  return (
    <View style={{ gap: 6 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={openPicker}
        style={[styles.field, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
      >
        <FontAwesome6 name="calendar" size={14} color={c.muted} />
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', flex: 1 }}>{display}</Text>
        <FontAwesome6 name="chevron-down" size={11} color={c.muted} />
      </Pressable>

      <WheelPickerSheet visible={open} title="Pilih Tanggal" onClose={() => setOpen(false)} onConfirm={confirm}>
        <Wheel
          items={dayItems}
          index={Math.min(selDay, daysInMonth) - 1}
          onChange={(i) => setSelDay(i + 1)}
          width={70}
        />
        <Wheel
          items={monthItems}
          index={selMonth - 1}
          onChange={(i) => setSelMonth(i + 1)}
          width={110}
        />
        <Wheel items={yearItems} index={yearItems.indexOf(String(selYear))} onChange={(i) => setSelYear(Number(yearItems[i]))} width={80} />
      </WheelPickerSheet>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MonthField: "YYYY-MM"
// ---------------------------------------------------------------------------

export function MonthField({
  label,
  value,
  onChange,
  style,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  style?: any;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  const [vy, vm] = value.split('-').map(Number);
  const year = vy || getCurrentYear();
  const month = vm || getCurrentMonth();

  const [selYear, setSelYear] = useState(year);
  const [selMonth, setSelMonth] = useState(month);

  const nowYear = getCurrentYear();
  const yearItems = Array.from({ length: 11 }, (_, i) => String(nowYear - 5 + i));

  const confirm = () => {
    onChange(`${selYear}-${pad2(selMonth)}`);
    setOpen(false);
  };

  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={() => {
          setSelYear(year);
          setSelMonth(month);
          setOpen(true);
        }}
        style={[styles.field, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
      >
        <FontAwesome6 name="calendar-days" size={14} color={c.muted} />
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
          {MONTH_NAMES_SHORT[month - 1] || ''} {year}
        </Text>
        <FontAwesome6 name="chevron-down" size={11} color={c.muted} />
      </Pressable>

      <WheelPickerSheet visible={open} title="Pilih Bulan" onClose={() => setOpen(false)} onConfirm={confirm}>
        <Wheel items={MONTH_NAMES_SHORT} index={selMonth - 1} onChange={(i) => setSelMonth(i + 1)} width={120} />
        <Wheel items={yearItems} index={yearItems.indexOf(String(selYear))} onChange={(i) => setSelYear(Number(yearItems[i]))} width={90} />
      </WheelPickerSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill },
  field: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    marginHorizontal: 16,
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wheelArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  wheelItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
