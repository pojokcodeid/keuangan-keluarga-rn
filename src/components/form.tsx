// =============================================================================
// form.tsx — Primitif form: label, input teks, input nominal, tombol,
// segmented control (pilihan jenis), dan select sheet (pengganti <select>)
// =============================================================================

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../state/ThemeContext';
import { formatNumberString, parseAmount } from '../lib/utils';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={[styles.label, { color: c.subtext }]}>{children}</Text>;
}

export function AppTextInput(
  props: React.ComponentProps<typeof TextInput> & { containerStyle?: StyleProp<ViewStyle> }
) {
  const { c } = useTheme();
  const { containerStyle, style, ...rest } = props;
  return (
    <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.inputBorder }, containerStyle]}>
      <TextInput
        placeholderTextColor={c.muted}
        {...rest}
        style={[styles.input, { color: c.text }, style]}
      />
    </View>
  );
}

/** Input nominal dengan format titik ribuan live (Rp). */
export function NumberInput({
  value,
  onValueChange,
  onTextChange,
  placeholder = '0',
  prefix = 'Rp',
  editable = true,
}: {
  value: string;
  onValueChange?: (raw: string) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  prefix?: string | null;
  editable?: boolean;
}) {
  const { c } = useTheme();
  const [text, setText] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Sinkronkan teks saat prop `value` berubah dari luar (mode edit)
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  const handleChange = (v: string) => {
    const digits = v.replace(/\D/g, '');
    const formatted = digits ? formatNumberString(digits) : '';
    setText(formatted);
    onTextChange?.(formatted);
    onValueChange?.(formatted);
  };

  return (
    <View style={[styles.inputWrap, styles.amountWrap, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
      {prefix ? (
        <Text style={[styles.amountPrefix, { color: c.muted }]}>{prefix}</Text>
      ) : null}
      <TextInput
        value={text}
        onChangeText={handleChange}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        editable={editable}
        style={[styles.input, styles.amountInput, { color: c.text }]}
      />
    </View>
  );
}

export function parseInputAmount(text: string): number {
  return parseAmount(text);
}

/** Tombol utama */
export function PrimaryButton({
  label,
  onPress,
  icon,
  color,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  icon?: string;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: color || c.primary, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <FontAwesome6 name={(icon || 'check') as any} solid size={15} color="#fff" />
      <Text style={styles.primaryBtnText}>{loading ? 'Memproses…' : label}</Text>
    </Pressable>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

/** Pilihan jenis (radio buttons bergaya segmented) */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  activeColor,
  activeSoft,
  columns,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  activeColor: string;
  activeSoft: string;
  columns?: number;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segRow, columns ? { flexWrap: 'wrap' } : null]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segItem,
              columns ? { flexGrow: 1, flexBasis: `${100 / columns - 1}%` } : { flex: 1 },
              {
                backgroundColor: active ? activeSoft : c.card,
                borderColor: active ? activeColor : c.inputBorder,
              },
            ]}
          >
            {opt.icon ? (
              <FontAwesome6 name={opt.icon as any} solid size={13} color={active ? activeColor : c.subtext} />
            ) : null}
            <Text
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: active ? '700' : '500',
                color: active ? activeColor : c.subtext,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

/** Select field: ketuk untuk membuka daftar pilihan (sheet) */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Pilih…',
  allowEmpty,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 6 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.inputWrap, styles.selectWrap, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
      >
        <View style={styles.selectValue}>
          {selected?.icon}
          <Text
            numberOfLines={1}
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: selected ? c.text : c.muted,
              flexShrink: 1,
            }}
          >
            {selected ? selected.label : placeholder}
          </Text>
        </View>
        <FontAwesome6 name="chevron-down" size={12} color={c.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.selectBackdrop, { backgroundColor: c.overlay }]} onPress={() => setOpen(false)}>
          <View style={[styles.selectSheet, { backgroundColor: c.card }]}>
            {label ? (
              <Text style={[styles.selectSheetTitle, { color: c.text }]}>{label}</Text>
            ) : null}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {allowEmpty ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  style={[styles.selectItem, { backgroundColor: !value ? c.primarySoft : 'transparent' }]}
                >
                  <Text style={{ color: !value ? c.primary : c.subtext, fontWeight: !value ? '700' : '500', fontSize: 14 }}>
                    {placeholder}
                  </Text>
                </Pressable>
              ) : null}
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.selectItem,
                      { borderBottomColor: c.border },
                      active ? { backgroundColor: c.primarySoft } : null,
                    ]}
                  >
                    <View style={styles.selectValue}>
                      {o.icon}
                      <Text
                        numberOfLines={2}
                        style={{ color: active ? c.primary : c.text, fontWeight: active ? '700' : '500', fontSize: 14, flexShrink: 1 }}
                      >
                        {o.label}
                      </Text>
                    </View>
                    {active ? (
                      <FontAwesome6 name="check" solid size={13} color={c.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Baris switch/checkbox sederhana */
export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} style={styles.checkRow}>
      <View
        style={[
          styles.checkbox,
          { borderColor: checked ? c.primary : c.inputBorder, backgroundColor: checked ? c.primary : 'transparent' },
        ]}
      >
        {checked ? <FontAwesome6 name="check" solid size={11} color="#fff" /> : null}
      </View>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  inputWrap: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    fontWeight: '500',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  amountPrefix: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 12,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segItem: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  selectBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  selectSheet: {
    borderRadius: 16,
    padding: 14,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  selectSheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  selectItem: {
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export type TextStylePair = StyleProp<TextStyle>;
export type ViewStylePair = StyleProp<ViewStyle>;
