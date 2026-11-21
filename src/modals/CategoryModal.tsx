// =============================================================================
// CategoryModal.tsx — Tambah / edit kategori (port dari modal-category)
// =============================================================================

import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
import { useLanguage } from '../state/LanguageContext';
import { ModalSheet } from '../components/ModalSheet';
import {
  AppTextInput,
  FieldLabel,
  NumberInput,
  PrimaryButton,
  SegmentedControl,
} from '../components/form';
import { IconPicker } from '../components/IconPicker';
import { addCategory, CategoryPayload, updateCategory } from '../lib/db';
import { formatNumberString, parseAmount } from '../lib/utils';

type CatType = 'income' | 'expense';

export function CategoryModal() {
  const { modal, closeModal, snap, refresh, showToast } = useApp();
  const { c } = useTheme();
  const { t, language } = useLanguage();

  const editingId = modal?.key === 'category' ? modal.param : null;
  const defaultType = (modal?.extra as CatType) || 'expense';
  const existing = editingId ? snap.categories.find((cat) => cat.id === editingId) : null;

  const [type, setType] = useState<CatType>(existing?.type || defaultType);
  const [name, setName] = useState(existing?.name || '');
  const [icon, setIcon] = useState(existing?.icon || 'fa-solid fa-tag|#6366F1');
  const [budgetText, setBudgetText] = useState(
    existing?.budget_limit ? formatNumberString(Math.round(existing.budget_limit)) : ''
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return showToast(t.categoryModal.nameWarning, 'warning');
    const payload: CategoryPayload = {
      name: name.trim(),
      type,
      budget_limit: type === 'expense' ? parseAmount(budgetText) || 0 : 0,
      icon,
    };

    setSaving(true);
    try {
      if (editingId) await updateCategory(editingId, payload, existing!);
      else await addCategory(payload);
      await refresh();
      showToast(editingId ? t.categoryModal.updatedSuccess : t.categoryModal.savedSuccess, 'success');
      closeModal();
    } catch (err: any) {
      showToast(t.categoryModal.saveFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalSheet
      visible={modal?.key === 'category'}
      title={editingId ? t.categoryModal.editTitle : t.categoryModal.addTitle}
      onClose={closeModal}
      maxWidth={440}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>{t.categoryModal.typeLabel}</FieldLabel>
        <SegmentedControl<CatType>
          value={type}
          onChange={setType}
          activeColor={type === 'income' ? '#10b981' : '#e11d48'}
          activeSoft={type === 'income' ? c.successSoft : c.dangerSoft}
          columns={2}
          options={[
            { value: 'income', label: t.common.income },
            { value: 'expense', label: t.common.expense },
          ]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>{t.categoryModal.nameLabel}</FieldLabel>
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder={t.categoryModal.namePlaceholder}
        />
      </View>

      <IconPicker value={icon} onChange={setIcon} />

      {type === 'expense' ? (
        <View style={{ gap: 6 }}>
          <FieldLabel>{t.categoryModal.budgetLimitLabel}</FieldLabel>
          <NumberInput value={budgetText} onValueChange={setBudgetText} placeholder="0" />
        </View>
      ) : null}

      <PrimaryButton
        label={editingId ? (language === 'en' ? 'Update Category' : 'Perbarui Kategori') : t.categoryModal.saveBtn}
        onPress={submit}
        loading={saving}
      />
    </ModalSheet>
  );
}
