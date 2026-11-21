// =============================================================================
// BudgetModal.tsx — Tambah / edit budget (port dari modal-budget)
// =============================================================================

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
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
  const { t, language } = useLanguage();

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
    { value: '', label: t.budgetModal.allExpensesGlobal },
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
    if (!name.trim()) return showToast(t.budgetModal.nameWarning, 'warning');
    if (!(amount > 0)) return showToast(t.budgetModal.limitWarning, 'warning');

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
      showToast(editingId ? t.budgetModal.updatedSuccess : t.budgetModal.savedSuccess, 'success');
      closeModal();
    } catch (err: any) {
      showToast(t.budgetModal.saveFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'budget'}
      title={editingId ? t.budgetModal.editTitle : t.budgetModal.addTitle}
      onClose={closeModal}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>{t.budgetModal.nameLabel}</FieldLabel>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder={language === 'en' ? 'E.g., Daily Snacks, Groceries' : 'Contoh: Jajan Harian, Belanja Dapur'}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>{t.budgetModal.periodLabel}</FieldLabel>
        <SegmentedControl<Period>
          value={period}
          onChange={handlePeriodChange}
          activeColor={c.primary}
          activeSoft={c.primarySoft}
          columns={3}
          options={[
            { value: 'daily', label: t.common.daily, icon: 'sun' },
            { value: 'weekly', label: t.common.weekly, icon: 'calendar-week' },
            { value: 'monthly', label: t.common.monthly, icon: 'calendar-days' },
          ]}
        />
        <Text style={{ fontSize: 11, color: c.muted }}>
          {language === 'en'
            ? 'Repeats automatically: daily = per day, weekly = Mon–Sun, monthly = per calendar month.'
            : 'Otomatis berulang: harian = per hari, mingguan = Senin–Minggu, bulanan = per bulan kalender.'}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>{language === 'en' ? 'Budget Limit (Rp)' : 'Batas Budget (Rp)'}</FieldLabel>
        <NumberInput value={amountText} onValueChange={setAmountText} placeholder="0" />
      </View>

      <SelectField
        label={language === 'en' ? 'Scope' : 'Cakupan'}
        value={categoryId}
        options={categoryOptions}
        onChange={handleCategoryChange}
        placeholder={t.budgetModal.allExpensesGlobal}
        allowEmpty
      />

      <IconPicker value={icon || periodIcon(period)} onChange={setIcon} />

      <CheckRow
        label={language === 'en' ? 'Budget active' : 'Budget aktif'}
        checked={active}
        onChange={setActive}
      />

      <PrimaryButton
        label={editingId ? (language === 'en' ? 'Update Budget' : 'Perbarui Budget') : t.budgetModal.saveBtn}
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
