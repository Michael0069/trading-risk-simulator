'use client';

const USER_STORAGE_KEY = 'user';
const USER_COOKIE_KEY = 'ai_trading_user';

export interface StoredUser {
  id: number;
  username: string;
  email?: string;
  current_balance?: number;
  starting_balance?: number;
}

function canUseStorage() {
  return typeof window !== 'undefined';
}

function writeCookie(value: string) {
  if (!canUseStorage()) {
    return;
  }

  document.cookie = `${USER_COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=86400; samesite=lax`;
}

function readCookie() {
  if (!canUseStorage()) {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${USER_COOKIE_KEY}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

export function persistUser(user: StoredUser) {
  if (!canUseStorage()) {
    return;
  }

  const safeUser: StoredUser = {
    id: Number(user.id) || 1,
    username: user.username || 'demo_trader',
    email: user.email || 'demo@example.com',
    current_balance: Number(user.current_balance) || 10000,
    starting_balance: Number(user.starting_balance) || 10000,
  };

  const serialized = JSON.stringify(safeUser);
  localStorage.setItem(USER_STORAGE_KEY, serialized);
  sessionStorage.setItem(USER_STORAGE_KEY, serialized);
  writeCookie(serialized);
}

export function getStoredUser(): StoredUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const storedValue = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY) || readCookie();

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (!parsed || typeof parsed !== 'object' || !parsed.id) {
      clearStoredUser();
      return null;
    }
    return {
      id: Number(parsed.id) || 1,
      username: parsed.username || 'demo_trader',
      email: parsed.email || 'demo@example.com',
      current_balance: Number(parsed.current_balance) || 10000,
      starting_balance: Number(parsed.starting_balance) || 10000,
    };
  } catch {
    clearStoredUser();
    return null;
  }
}

export function clearStoredUser() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  document.cookie = `${USER_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
}