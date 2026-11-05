// =============================================================================
// auth.ts — Keamanan & PIN Authentication (port dari js/auth.js)
// SHA-256 + salt via expo-crypto, penyimpanan via AsyncStorage.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEYS = {
  ENABLED: 'keuangan_auth_enabled',
  HASH: 'keuangan_auth_hash',
  SALT: 'keuangan_auth_salt',
  AUTOLOCK: 'keuangan_auth_autolock', // 'immediate' | '5' | '15' | 'never'
  PIN_LENGTH: 'keuangan_auth_pin_len',
};

// Session (in-memory, setara sessionStorage)
let sessionUnlocked = false;
let lastActivity = 0;
// Cache panjang PIN di memori untuk render cepat tanpa kedip (4-6 digit)
let cachedPinLength: number | null = null;

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateSalt(): Promise<string> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  return bufferToHex(saltBytes);
}

async function hashPinWithSalt(pin: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin + saltHex,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

/** Dapatkan panjang PIN tersimpan secara sinkron dari cache */
export function getPinLengthSync(): number | null {
  return cachedPinLength;
}

/** Dapatkan panjang PIN tersimpan (4–6 digit) */
export async function getPinLength(): Promise<number | null> {
  if (cachedPinLength !== null) return cachedPinLength;
  const val = await AsyncStorage.getItem(STORAGE_KEYS.PIN_LENGTH);
  if (val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 4 && parsed <= 6) {
      cachedPinLength = parsed;
      return parsed;
    }
  }
  return null;
}

/** Cek apakah proteksi PIN aktif */
export async function isPinEnabled(): Promise<boolean> {
  const [enabled, hash] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.ENABLED),
    AsyncStorage.getItem(STORAGE_KEYS.HASH),
  ]);
  const active = enabled === 'true' && !!hash;
  if (active && cachedPinLength === null) {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.PIN_LENGTH);
    if (val) {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 4 && parsed <= 6) {
        cachedPinLength = parsed;
      }
    }
  }
  return active;
}

/** Cek apakah sesi terbuka dan belum timeout auto-lock */
export async function isSessionUnlocked(): Promise<boolean> {
  if (!(await isPinEnabled())) return true;
  if (!sessionUnlocked) return false;

  const autolockSetting = await getAutolockSetting();
  if (autolockSetting === 'never') return true;

  if (!lastActivity) return true;

  const timeoutMinutes = parseInt(autolockSetting, 10) || 5;
  const elapsedMinutes = (Date.now() - lastActivity) / (1000 * 60);

  if (elapsedMinutes > timeoutMinutes) {
    lockSession();
    return false;
  }
  return true;
}

/** Perbarui timer auto-lock */
export function touchActivity(): void {
  lastActivity = Date.now();
}

export function lockSession(): void {
  sessionUnlocked = false;
  lastActivity = 0;
}

function setSessionUnlocked(): void {
  sessionUnlocked = true;
  touchActivity();
}

/** Verifikasi PIN */
export async function verifyPin(pin: string): Promise<boolean> {
  if (!(await isPinEnabled())) return true;

  const cleanPin = pin.trim();
  const saltHex = (await AsyncStorage.getItem(STORAGE_KEYS.SALT)) || '';
  const storedHash = (await AsyncStorage.getItem(STORAGE_KEYS.HASH)) || '';

  const computedHash = await hashPinWithSalt(cleanPin, saltHex);
  const isValid = computedHash === storedHash;

  if (isValid) {
    setSessionUnlocked();
    // Jika panjang PIN belum tercatat (misal dari data lama), catat sekarang
    if (cachedPinLength === null && cleanPin.length >= 4 && cleanPin.length <= 6) {
      cachedPinLength = cleanPin.length;
      await AsyncStorage.setItem(STORAGE_KEYS.PIN_LENGTH, String(cleanPin.length));
    }
  }
  return isValid;
}

/** Set PIN baru & aktifkan proteksi */
export async function setupNewPin(newPin: string): Promise<void> {
  const cleanPin = newPin.trim();
  if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 6) {
    throw new Error('PIN minimal harus 4 digit dan maksimal 6 digit angka');
  }

  const saltHex = await generateSalt();
  const hash = await hashPinWithSalt(cleanPin, saltHex);

  await AsyncStorage.setItem(STORAGE_KEYS.SALT, saltHex);
  await AsyncStorage.setItem(STORAGE_KEYS.HASH, hash);
  await AsyncStorage.setItem(STORAGE_KEYS.PIN_LENGTH, String(cleanPin.length));
  await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, 'true');

  cachedPinLength = cleanPin.length;

  const autolock = await AsyncStorage.getItem(STORAGE_KEYS.AUTOLOCK);
  if (!autolock) await AsyncStorage.setItem(STORAGE_KEYS.AUTOLOCK, 'immediate');

  setSessionUnlocked();
}

/** Nonaktifkan proteksi PIN (verifikasi PIN saat ini dulu) */
export async function disablePin(currentPin: string): Promise<boolean> {
  const isValid = await verifyPin(currentPin);
  if (!isValid) throw new Error('PIN saat ini salah');

  await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, 'false');
  await AsyncStorage.removeItem(STORAGE_KEYS.HASH);
  await AsyncStorage.removeItem(STORAGE_KEYS.SALT);
  await AsyncStorage.removeItem(STORAGE_KEYS.PIN_LENGTH);
  cachedPinLength = null;
  lockSession();
  return true;
}

export async function getAutolockSetting(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.AUTOLOCK)) || 'immediate';
}

export async function setAutolockSetting(val: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.AUTOLOCK, val);
}

/**
 * Fungsi yang dipanggil ketika aplikasi masuk latar depan:
 * kunci jika auto-lock 'immediate', atau cek durasi inaktivitas.
 * @returns true jika aplikasi harus dikunci
 */
export async function evaluateLockOnBackground(): Promise<boolean> {
  if (!(await isPinEnabled())) return false;
  const setting = await getAutolockSetting();
  if (setting === 'immediate') {
    lockSession();
    return true;
  }
  return false;
}

export async function evaluateLockOnForeground(): Promise<boolean> {
  if (!(await isPinEnabled())) return false;
  const setting = await getAutolockSetting();
  if (setting === 'never') return false;
  if (setting === 'immediate') {
    if (!sessionUnlocked) return true;
    return false;
  }
  const timeoutMinutes = parseInt(setting, 10) || 5;
  if (!lastActivity) return true;
  const elapsedMinutes = (Date.now() - lastActivity) / (1000 * 60);
  if (elapsedMinutes > timeoutMinutes) {
    lockSession();
    return true;
  }
  return false;
}

export function getSessionUnlocked(): boolean {
  return sessionUnlocked;
}

export function forceSessionUnlocked(): void {
  setSessionUnlocked();
}
