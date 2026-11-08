// =============================================================================
// sheetFocus.ts — Konteks fokus input untuk sheet modal.
//
// Keyboard pada Android (terutama edge-to-edge) tidak menggeser window, sehingga
// sheet harus digeser manual oleh KeyboardAvoidingView. Agar input yang sedang
// diketik tidak berada di bawah lipatan ScrollView, ModalSheet perlu tahu input
// mana yang mendapat fokus. Komponen input di form.tsx memberi tahu lewat
// konteks ini, lalu ModalSheet menggulirkan sheet ke posisi input tersebut.
// =============================================================================

import { createContext, useContext } from 'react';
import { findNodeHandle } from 'react-native';
import type { HostInstance } from 'react-native';

/** Nilai `event.target` pada event focus (node handle atau instance host). */
export type FocusTarget = number | HostInstance | undefined;

export interface SheetFocusValue {
  /** Dipanggil saat input di dalam sheet mendapat fokus (null bila tak terukur). */
  onInputFocus: (nodeHandle: number | null) => void;
}

export const SheetFocusContext = createContext<SheetFocusValue | null>(null);

/** Ambil handler fokus dari sheet terdekat (null jika bukan di dalam sheet). */
export function useSheetFocus(): SheetFocusValue | null {
  return useContext(SheetFocusContext);
}

/** Ubah target fokus event menjadi node handle angka. */
export function resolveFocusTarget(target: FocusTarget): number | null {
  if (typeof target === 'number') return target;
  if (target == null) return null;
  return findNodeHandle(target) ?? null;
}
