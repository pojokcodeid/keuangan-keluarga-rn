// =============================================================================
// TransactionModal.tsx — Tambah / edit transaksi (port dari modal-transaction)
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  SelectField,
} from '../components/form';
import { DateField } from '../components/DatePickers';
import { AttachmentPicker } from '../components/AttachmentPicker';
import { IconBadge, resolveBudgetIcon } from '../lib/icons';
import { ProgressBar, tone } from '../components/charts';
import { addTransaction, deleteTransaction, TransactionPayload, updateTransaction } from '../lib/db';
import { clearDraft, readDraft, writeDraft } from '../lib/draft';
import { getAccountBalance, getBudgetsForTransaction } from '../lib/selectors';
import { formatCurrency, parseAmount, todayISO } from '../lib/utils';

type TxType = 'income' | 'expense' | 'transfer';

/** Isi form transaksi yang ditahan di draft agar tidak hilang saat terkunci */
type TxDraft = {
  type: TxType;
  amountText: string;
  date: string;
  accountId: string;
  toAccountId: string;
  categoryId: string;
  note: string;
  attachmentUri: string | null;
};

export function TransactionModal() {
  const { modal, closeModal, snap, refresh, showToast, openModal, confirm } = useApp();
  const { c } = useTheme();
  const { t, language } = useLanguage();

  const editingId = modal?.key === 'transaction' ? modal.param : null;
  const existing = editingId ? snap.transactions.find((t) => t.id === editingId) : null;

  // Key draft per transaksi; dibaca satu kali saat mount (termasuk saat mount
  // ulang setelah aplikasi terkunci lalu dibuka kembali dengan PIN)
  const draftKey = editingId ? `tx-${editingId}` : 'tx-new';
  const [draft] = useState(() => readDraft<TxDraft>(draftKey));

  const [type, setType] = useState<TxType>((draft?.type ?? existing?.type) ?? 'expense');
  const [amountText, setAmountText] = useState(
    draft?.amountText ?? (existing ? String(Math.round(existing.amount)) : '')
  );
  const [date, setDate] = useState((draft?.date ?? existing?.transaction_date) || todayISO());
  const [accountId, setAccountId] = useState(
    draft?.accountId ?? (existing ? String(existing.account_id) : '')
  );
  const [toAccountId, setToAccountId] = useState(
    draft?.toAccountId ?? (existing?.to_account_id ? String(existing.to_account_id) : '')
  );
  const [categoryId, setCategoryId] = useState(
    draft?.categoryId ?? (existing?.category_id ? String(existing.category_id) : '')
  );
  const [note, setNote] = useState(draft?.note ?? existing?.note ?? '');
  const [attachmentUri, setAttachmentUri] = useState<string | null>(
    draft?.attachmentUri ?? existing?.attachment_uri ?? null
  );
  const [saving, setSaving] = useState(false);

  // Tahan isi form di draft setiap kali berubah
  useEffect(() => {
    writeDraft(draftKey, {
      type,
      amountText,
      date,
      accountId,
      toAccountId,
      categoryId,
      note,
      attachmentUri,
    });
  }, [draftKey, type, amountText, date, accountId, toAccountId, categoryId, note, attachmentUri]);

  // Tutup form secara sengaja: buang draft lalu tutup modal.
  // Saat terkunci (layar PIN) jalur ini TIDAK dipanggil, sehingga draft
  // tetap ada dan form dipulihkan setelah PIN dimasukkan.
  const close = () => {
    clearDraft(draftKey);
    closeModal();
  };

  const accounts = snap.accounts;
  const categories = useMemo(
    () => snap.categories.filter((cat) => cat.type === type),
    [snap.categories, type]
  );

  const accountOptions = accounts.map((a) => ({
    value: String(a.id),
    label: `${a.name} (${formatCurrency(getAccountBalance(snap.accounts, snap.transactions, a.id))})`,
    icon: <IconBadge icon={a.icon} size={22} />,
  }));

  const categoryOptions = categories.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
    icon: <IconBadge icon={cat.icon} size={22} />,
  }));

  // Dampak ke budget (real-time) untuk pengeluaran
  const budgetImpact = useMemo(() => {
    if (type !== 'expense' || !date) return [];
    const catId = categoryId ? parseInt(categoryId, 10) : null;
    const amount = parseAmount(amountText);
    if (!amount) return [];
    return getBudgetsForTransaction(snap, {
      date,
      categoryId: catId,
      amount,
      excludeId: editingId,
    });
  }, [type, date, categoryId, amountText, snap, editingId]);

  const handleTypeChange = (tVal: TxType) => {
    setType(tVal);
    setCategoryId('');
    if (tVal !== 'transfer') setToAccountId('');
  };

  const submit = async () => {
    const amount = parseAmount(amountText);
    const accId = accountId ? parseInt(accountId, 10) : null;
    const toId = toAccountId ? parseInt(toAccountId, 10) : null;
    const catId = categoryId ? parseInt(categoryId, 10) : null;

    if (!amount || amount <= 0) return showToast(t.txModal.amountWarning, 'warning');
    if (!date) return showToast(language === 'en' ? 'Select transaction date' : 'Pilih tanggal transaksi', 'warning');
    if (!accId) return showToast(t.txModal.accountWarning, 'warning');
    if (type === 'transfer') {
      if (!toId) return showToast(t.txModal.toAccountWarning, 'warning');
      if (accId === toId) return showToast(t.txModal.sameAccountWarning, 'warning');
    } else if (!catId) {
      return showToast(t.txModal.categoryWarning, 'warning');
    }

    const payload: TransactionPayload = {
      account_id: accId,
      to_account_id: type === 'transfer' ? toId : null,
      category_id: type === 'transfer' ? null : catId,
      type,
      amount,
      transaction_date: date,
      note: note.trim() || null,
      attachment_uri: attachmentUri || null,
    };

    setSaving(true);
    try {
      if (editingId) await updateTransaction(editingId, payload);
      else await addTransaction(payload);
      await refresh();
      showToast(editingId ? t.txModal.updatedSuccess : t.txModal.savedSuccess, 'success');
      close();

      // Peringatan budget setelah pengeluaran tersimpan
      if (type === 'expense') {
        const hit = getBudgetsForTransaction(snap, { date, categoryId: catId }).filter(
          (b) => b.percentage >= 75
        );
        const over = hit.filter((b) => b.percentage >= 100);
        if (over.length) {
          showToast(
            (language === 'en' ? 'Budget exceeded: ' : 'Budget terlampaui: ') +
              over.map((b) => b.name).join(', '),
            'warning'
          );
        } else if (hit.length) {
          showToast(
            (language === 'en' ? 'Budget near limit: ' : 'Budget hampir habis: ') +
              hit.map((b) => b.name).join(', '),
            'warning'
          );
        }
      }
    } catch (err: any) {
      showToast(t.txModal.saveFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const ok = await confirm(t.txModal.deleteConfirmTitle, t.txModal.deleteConfirmMsg);
    if (!ok) return;

    setSaving(true);
    try {
      await deleteTransaction(editingId);
      await refresh();
      showToast(t.txModal.deletedSuccess, 'info');
      close();
    } catch (err: any) {
      showToast(t.txModal.deleteFailed + ': ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const getPeriodLabel = (periodType: string) => {
    if (periodType === 'daily') return t.common.daily;
    if (periodType === 'weekly') return t.common.weekly;
    return t.common.monthly;
  };

  return (
    <ModalSheet
      visible={modal?.key === 'transaction'}
      title={editingId ? t.txModal.editTitle : t.txModal.addTitle}
      onClose={close}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>{language === 'en' ? 'Transaction Type' : 'Jenis Transaksi'}</FieldLabel>
        <SegmentedControl<TxType>
          value={type}
          onChange={handleTypeChange}
          activeColor={type === 'income' ? '#10b981' : type === 'expense' ? c.danger : '#3b82f6'}
          activeSoft={
            type === 'income' ? c.successSoft : type === 'expense' ? c.dangerSoft : c.infoSoft
          }
          options={[
            { value: 'expense', label: t.common.expense, icon: 'arrow-up' },
            { value: 'income', label: t.common.income, icon: 'arrow-down' },
            { value: 'transfer', label: t.common.transfer, icon: 'right-left' },
          ]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>{language === 'en' ? 'Amount (Rp)' : 'Jumlah (Rp)'}</FieldLabel>
        <NumberInput value={amountText} onValueChange={setAmountText} placeholder="0" />
      </View>

      <DateField label={t.txModal.dateLabel} value={date} onChange={setDate} />

      <SelectField
        label={type === 'transfer' ? t.txModal.fromAccountLabel : t.txModal.accountLabel}
        value={accountId}
        options={accountOptions}
        onChange={setAccountId}
        placeholder={t.txModal.selectAccountPlaceholder}
      />

      {type === 'transfer' ? (
        <SelectField
          label={t.txModal.toAccountLabel}
          value={toAccountId}
          options={accountOptions}
          onChange={setToAccountId}
          placeholder={language === 'en' ? 'Select Destination Account' : 'Pilih Akun Tujuan'}
        />
      ) : null}

      {type !== 'transfer' ? (
        <SelectField
          label={t.txModal.categoryLabel}
          value={categoryId}
          options={categoryOptions}
          onChange={setCategoryId}
          placeholder={t.txModal.selectCategoryPlaceholder}
        />
      ) : null}

      {budgetImpact.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.subtext }}>
            {language === 'en' ? '▢ Budget Impact' : '▢ Dampak ke budget'}
          </Text>
          {budgetImpact.map((b) => {
            const pct = Math.round(b.percentage);
            const over = pct >= 100;
            const warn = pct >= 75;
            const toneData = tone(pct);
            const frame = over
              ? { borderColor: 'rgba(244,63,94,.35)', backgroundColor: c.dangerSoft }
              : warn
              ? { borderColor: 'rgba(245,158,11,.35)', backgroundColor: c.warningSoft }
              : { borderColor: c.inputBorder, backgroundColor: c.cardAlt };
            const msg = over
              ? (language === 'en'
                  ? `Over budget by ${formatCurrency(-b.remaining)}`
                  : `Melebihi budget ${formatCurrency(-b.remaining)}`)
              : (language === 'en'
                  ? `Remaining ${formatCurrency(b.remaining)}`
                  : `Sisa ${formatCurrency(b.remaining)}`);
            return (
              <View
                key={b.id}
                style={[styles.budgetBox, { borderColor: frame.borderColor, backgroundColor: frame.backgroundColor }]}
              >
                <View style={styles.budgetHead}>
                  <View style={styles.budgetName}>
                    <IconBadge icon={resolveBudgetIcon(b)} size={22} />
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: c.text, flexShrink: 1 }}>
                      {b.name} <Text style={{ fontWeight: '400', color: c.muted }}>· {getPeriodLabel(b.period_type)}</Text>
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: over ? c.danger : warn ? c.warning : c.success }}>
                    {pct}%
                  </Text>
                </View>
                <ProgressBar percent={pct} height={8} gradientColors={[toneData.c1, toneData.c2]} />
                <Text style={{ fontSize: 11, color: c.subtext }}>
                  {formatCurrency(b.after)} / {formatCurrency(b.amount_limit)} · {msg}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <FieldLabel>{t.txModal.noteLabel}</FieldLabel>
        <AppTextInput
          value={note}
          onChangeText={setNote}
          placeholder={language === 'en' ? 'Add a note...' : 'Tambahkan catatan...'}
          multiline
          numberOfLines={2}
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />
      </View>

      <AttachmentPicker
        value={attachmentUri}
        onChange={setAttachmentUri}
        label={
          type === 'income'
            ? (language === 'en' ? 'Income Proof Photo (optional)' : 'Foto Bukti Pemasukan (opsional)')
            : type === 'expense'
            ? (language === 'en' ? 'Receipt / Expense Proof Photo (optional)' : 'Foto Struk / Bukti Pengeluaran (opsional)')
            : (language === 'en' ? 'Transfer Proof Photo (optional)' : 'Foto Bukti Transfer (opsional)')
        }
      />

      <PrimaryButton
        label={editingId ? t.txModal.updateBtn : t.txModal.saveBtn}
        onPress={submit}
        loading={saving}
      />

      {editingId ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 }}>
          <Text
            onPress={() => {
              close();
              setTimeout(() => openModal('transaction', null), 250);
            }}
            style={{ fontSize: 13, color: c.primary, fontWeight: '700' }}
          >
            {language === 'en' ? '+ New Transaction' : '+ Transaksi Baru'}
          </Text>
          <Text
            onPress={handleDelete}
            style={{ fontSize: 13, color: c.danger, fontWeight: '700' }}
          >
            {t.txModal.deleteBtn}
          </Text>
        </View>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  budgetBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  budgetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
});
