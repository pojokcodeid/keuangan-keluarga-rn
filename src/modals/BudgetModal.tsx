// =============================================================================
// BudgetModal.tsx — Tambah / edit budget (port dari modal-budget)
// =============================================================================

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { ModalSheet } from '../components/ModalSheet';
import {
  AppTextInput,
  CheckRow,
  FieldLabel,
  NumberInput,
  PrimaryButton,
  SegmentedControl,
  SelectField,
} from '../components/form';
import { IconPicker } from '../components/IconPicker';
import { IconBadge, periodIcon, resolveBudgetIcon } from '../lib/icons';
import { addBudget, BudgetPayload, updateBudget } from '../lib/db';
import { formatNumberString, parseAmount } from '../lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

export function BudgetModal() {
  const { modal, closeModal, snap, refresh, showToast } = useApp();
  const { c } = useTheme();

  const editingId = modal?.key === 'budget' ? modal.param : null;
  const existing = editingId ? snap.budgets.find((b) => b.id === editingId) : null;

  const [name, setName] = useState(existing?.name || '');
  const [amountText, setAmountText] = useState(
    existing ? formatNumberString(Math.round(existing.amount_limit)) : ''
  );
  const [period, setPeriod] = useState<Period>(existing?.period_type || 'monthly');
  const [categoryId, setCategoryId] = useState(
    existing?.category_id ? String(existing.category_id) : ''
  );
  const [active, setActive] = useState(existing ? !!existing.is_active : true);
  const [icon, setIcon] = useState(
    existing ? existing.icon || resolveBudgetIcon(existing) : periodIcon('monthly')
  );
  const [saving, setSaving] = useState(false);

  const expenseCategories = snap.categories.filter((cat) => cat.type === 'expense');

  const categoryOptions = [
    { value: '', label: 'Semua pengeluaran (global)' },
    ...expenseCategories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
      icon: <IconBadge icon={cat.icon} size={22} />,
    })),
  ];

  const handleCategoryChange = (v: string) => {
    setCategoryId(v);
    // Selama user belum memilih ikon sendiri, ikuti kategori (atau periode)
    if (!existing?.icon) {
      const cat = v ? expenseCategories.find((x) => String(x.id) === v) : null;
      setIcon(cat ? cat.icon : periodIcon(period));
    }
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (!existing?.icon && !categoryId) setIcon(periodIcon(p));
  };

  const submit = async () => {
    const amount = parseAmount(amountText);
    if (!name.trim()) return showToast('Nama budget harus diisi', 'warning');
    if (!(amount > 0)) return showToast('Batas budget harus lebih dari 0', 'warning');

    const payload: BudgetPayload = {
      name: name.trim(),
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      periodType: period,
      amountLimit: amount,
      isActive: active ? 1 : 0,
      icon: icon || null,
    };

    setSaving(true);
    try {
      if (editingId) await updateBudget(editingId, payload);
      else await addBudget(payload);
      await refresh();
      showToast(editingId ? 'Budget diperbarui' : 'Budget dibuat', 'success');
      closeModal();
    } catch (err: any) {
      showToast('Gagal menyimpan budget: ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'budget'}
      title={editingId ? 'Edit Budget' : 'Buat Budget'}
      onClose={closeModal}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>Nama Budget</FieldLabel>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder="Contoh: Jajan Harian, Belanja Dapur"
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Periode</FieldLabel>
        <SegmentedControl<Period>
          value={period}
          onChange={handlePeriodChange}
          activeColor={c.primary}
          activeSoft={c.primarySoft}
          columns={3}
          options={[
            { value: 'daily', label: 'Harian', icon: 'sun' },
            { value: 'weekly', label: 'Mingguan', icon: 'calendar-week' },
            { value: 'monthly', label: 'Bulanan', icon: 'calendar-days' },
          ]}
        />
        <Text style={{ fontSize: 11, color: c.muted }}>
          Otomatis berulang: harian = per hari, mingguan = Senin–Minggu, bulanan = per bulan kalender.
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Batas Budget (Rp)</FieldLabel>
        <NumberInput value={amountText} onValueChange={setAmountText} placeholder="0" />
      </View>

      <SelectField
        label="Cakupan"
        value={categoryId}
        options={categoryOptions}
        onChange={handleCategoryChange}
        placeholder="Semua pengeluaran (global)"
        allowEmpty
      />

      <IconPicker value={icon || periodIcon(period)} onChange={setIcon} />

      <CheckRow label="Budget aktif" checked={active} onChange={setActive} />

      <PrimaryButton
        label={editingId ? 'Perbarui Budget' : 'Simpan Budget'}
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
