// =============================================================================
// TransactionModal.tsx — Tambah / edit transaksi (port dari modal-transaction)
// =============================================================================

import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';
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
import { IconBadge, resolveBudgetIcon } from '../lib/icons';
import { ProgressBar, tone } from '../components/charts';
import { addTransaction, TransactionPayload, updateTransaction } from '../lib/db';
import { getAccountBalance, getBudgetsForTransaction } from '../lib/selectors';
import { formatCurrency, parseAmount, todayISO } from '../lib/utils';

type TxType = 'income' | 'expense' | 'transfer';

export function TransactionModal() {
  const { modal, closeModal, snap, refresh, showToast, openModal } = useApp();
  const { c } = useTheme();

  const editingId = modal?.key === 'transaction' ? modal.param : null;
  const existing = editingId ? snap.transactions.find((t) => t.id === editingId) : null;

  const [type, setType] = useState<TxType>(existing?.type || 'expense');
  const [amountText, setAmountText] = useState(
    existing ? String(Math.round(existing.amount)) : ''
  );
  const [date, setDate] = useState(existing?.transaction_date || todayISO());
  const [accountId, setAccountId] = useState(existing ? String(existing.account_id) : '');
  const [toAccountId, setToAccountId] = useState(
    existing?.to_account_id ? String(existing.to_account_id) : ''
  );
  const [categoryId, setCategoryId] = useState(
    existing?.category_id ? String(existing.category_id) : ''
  );
  const [note, setNote] = useState(existing?.note || '');
  const [saving, setSaving] = useState(false);

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

  const handleTypeChange = (t: TxType) => {
    setType(t);
    setCategoryId('');
    if (t !== 'transfer') setToAccountId('');
  };

  const submit = async () => {
    const amount = parseAmount(amountText);
    const accId = accountId ? parseInt(accountId, 10) : null;
    const toId = toAccountId ? parseInt(toAccountId, 10) : null;
    const catId = categoryId ? parseInt(categoryId, 10) : null;

    if (!amount || amount <= 0) return showToast('Nominal transaksi harus lebih dari 0', 'warning');
    if (!date) return showToast('Pilih tanggal transaksi', 'warning');
    if (!accId) return showToast('Pilih akun', 'warning');
    if (type === 'transfer') {
      if (!toId) return showToast('Pilih akun tujuan untuk transfer', 'warning');
      if (accId === toId) return showToast('Akun asal dan akun tujuan tidak boleh sama', 'warning');
    } else if (!catId) {
      return showToast('Pilih kategori transaksi', 'warning');
    }

    const payload: TransactionPayload = {
      account_id: accId,
      to_account_id: type === 'transfer' ? toId : null,
      category_id: type === 'transfer' ? null : catId,
      type,
      amount,
      transaction_date: date,
      note: note.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) await updateTransaction(editingId, payload);
      else await addTransaction(payload);
      await refresh();
      showToast(editingId ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil dicatat', 'success');
      closeModal();

      // Peringatan budget setelah pengeluaran tersimpan
      if (type === 'expense') {
        const hit = getBudgetsForTransaction(snap, { date, categoryId: catId }).filter(
          (b) => b.percentage >= 75
        );
        const over = hit.filter((b) => b.percentage >= 100);
        if (over.length) showToast('Budget terlampaui: ' + over.map((b) => b.name).join(', '), 'warning');
        else if (hit.length) showToast('Budget hampir habis: ' + hit.map((b) => b.name).join(', '), 'warning');
      }
    } catch (err: any) {
      showToast('Gagal menyimpan transaksi: ' + (err?.message || String(err)), 'error');
    } finally {
      setSaving(false);
    }
  };

  const periodLabel: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

  return (
    <ModalSheet
      visible={modal?.key === 'transaction'}
      title={editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
      onClose={closeModal}
    >
      <View style={{ gap: 6 }}>
        <FieldLabel>Jenis Transaksi</FieldLabel>
        <SegmentedControl<TxType>
          value={type}
          onChange={handleTypeChange}
          activeColor={type === 'income' ? '#10b981' : type === 'expense' ? c.danger : '#3b82f6'}
          activeSoft={
            type === 'income' ? c.successSoft : type === 'expense' ? c.dangerSoft : c.infoSoft
          }
          options={[
            { value: 'expense', label: 'Pengeluaran', icon: 'arrow-up' },
            { value: 'income', label: 'Pemasukan', icon: 'arrow-down' },
            { value: 'transfer', label: 'Transfer', icon: 'right-left' },
          ]}
        />
      </View>

      <View style={{ gap: 6 }}>
        <FieldLabel>Jumlah (Rp)</FieldLabel>
        <NumberInput value={amountText} onValueChange={setAmountText} placeholder="0" />
      </View>

      <DateField label="Tanggal" value={date} onChange={setDate} />

      <SelectField
        label={type === 'transfer' ? 'Akun Asal' : 'Akun'}
        value={accountId}
        options={accountOptions}
        onChange={setAccountId}
        placeholder="Pilih Akun"
      />

      {type === 'transfer' ? (
        <SelectField
          label="Ke Akun"
          value={toAccountId}
          options={accountOptions}
          onChange={setToAccountId}
          placeholder="Pilih Akun Tujuan"
        />
      ) : null}

      {type !== 'transfer' ? (
        <SelectField
          label="Kategori"
          value={categoryId}
          options={categoryOptions}
          onChange={setCategoryId}
          placeholder="Pilih Kategori"
        />
      ) : null}

      {budgetImpact.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.subtext }}>
            ▢ Dampak ke budget
          </Text>
          {budgetImpact.map((b) => {
            const pct = Math.round(b.percentage);
            const over = pct >= 100;
            const warn = pct >= 75;
            const t = tone(pct);
            const frame = over
              ? { borderColor: 'rgba(244,63,94,.35)', backgroundColor: c.dangerSoft }
              : warn
              ? { borderColor: 'rgba(245,158,11,.35)', backgroundColor: c.warningSoft }
              : { borderColor: c.inputBorder, backgroundColor: c.cardAlt };
            const msg = over
              ? `Melebihi budget ${formatCurrency(-b.remaining)}`
              : `Sisa ${formatCurrency(b.remaining)}`;
            return (
              <View
                key={b.id}
                style={[styles.budgetBox, { borderColor: frame.borderColor, backgroundColor: frame.backgroundColor }]}
              >
                <View style={styles.budgetHead}>
                  <View style={styles.budgetName}>
                    <IconBadge icon={resolveBudgetIcon(b)} size={22} />
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: c.text, flexShrink: 1 }}>
                      {b.name} <Text style={{ fontWeight: '400', color: c.muted }}>· {periodLabel[b.period_type]}</Text>
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: over ? c.danger : warn ? c.warning : c.success }}>
                    {pct}%
                  </Text>
                </View>
                <ProgressBar percent={pct} height={8} gradientColors={[t.c1, t.c2]} />
                <Text style={{ fontSize: 11, color: c.subtext }}>
                  {formatCurrency(b.after)} / {formatCurrency(b.amount_limit)} · {msg}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <FieldLabel>Catatan (opsional)</FieldLabel>
        <AppTextInput
          value={note}
          onChangeText={setNote}
          placeholder="Tambahkan catatan..."
          multiline
          numberOfLines={2}
          style={{ minHeight: 60, textAlignVertical: 'top' }}
        />
      </View>

      <PrimaryButton
        label={editingId ? 'Perbarui Transaksi' : 'Simpan Transaksi'}
        onPress={submit}
        loading={saving}
      />

      {editingId ? (
        <Text
          onPress={() => {
            closeModal();
            setTimeout(() => openModal('transaction', null), 250);
          }}
          style={{ textAlign: 'center', fontSize: 12, color: c.primary, fontWeight: '600' }}
        >
          Buat transaksi baru
        </Text>
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
