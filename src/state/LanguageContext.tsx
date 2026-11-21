// =============================================================================
// LanguageContext.tsx — Konteks bahasa aplikasi (Bahasa Indonesia & English)
// =============================================================================

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations, TranslationSchema } from '../i18n/translations';

const STORAGE_KEY = 'kk_language';

export function interpolate(text: string, params: Record<string, string | number>): string {
  let result = text;
  for (const [key, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationSchema;
  interpolate: (text: string, params: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!alive || !saved) return;
        if (saved === 'id' || saved === 'en') {
          setLanguageState(saved);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat preferensi bahasa:', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = async (next: Language) => {
    setLanguageState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.warn('Gagal menyimpan preferensi bahasa:', err);
    }
  };

  const t = useMemo(() => {
    return translations[language] || translations.id;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      interpolate,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage harus digunakan di dalam <LanguageProvider>');
  }
  return ctx;
}
