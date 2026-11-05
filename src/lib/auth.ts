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
};

// Session (in-memory, setara sessionStorage)
let sessionUnlocked = false;
let lastActivity = 0;

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

/** Cek apakah proteksi PIN aktif */
export async function isPinEnabled(): Promise<boolean> {
  const [enabled, hash] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.ENABLED),
    AsyncStorage.getItem(STORAGE_KEYS.HASH),
  ]);
  return enabled === 'true' && !!hash;
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

  const saltHex = (await AsyncStorage.getItem(STORAGE_KEYS.SALT)) || '';
  const storedHash = (await AsyncStorage.getItem(STORAGE_KEYS.HASH)) || '';

  const computedHash = await hashPinWithSalt(pin.trim(), saltHex);
  const isValid = computedHash === storedHash;

  if (isValid) setSessionUnlocked();
  return isValid;
}

/** Set PIN baru & aktifkan proteksi */
export async function setupNewPin(newPin: string): Promise<void> {
  if (!newPin || newPin.length < 4) {
    throw new Error('PIN minimal harus 4 digit angka/karakter');
  }

  const saltHex = await generateSalt();
  const hash = await hashPinWithSalt(newPin.trim(), saltHex);

  await AsyncStorage.setItem(STORAGE_KEYS.SALT, saltHex);
  await AsyncStorage.setItem(STORAGE_KEYS.HASH, hash);
  await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, 'true');

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
