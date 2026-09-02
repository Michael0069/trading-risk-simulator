export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'tradedna_theme_mode_v1';
let memoryTheme: ThemeMode = 'dark';

interface StorageLike {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

async function getSecureStorage(): Promise<StorageLike | null> {
  try {
    const mod = await import('expo-secure-store');
    const storage = mod as any;
    if (!storage?.getItemAsync || !storage?.setItemAsync) {
      return null;
    }

    return {
      getItem: async (key: string) => storage.getItemAsync(key),
      setItem: async (key: string, value: string) => storage.setItemAsync(key, value),
    };
  } catch {
    return null;
  }
}

async function getAsyncStorage(): Promise<StorageLike | null> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const storage = (mod as any)?.default ?? mod;
    if (!storage?.getItem || !storage?.setItem) {
      return null;
    }

    return {
      getItem: async (key: string) => storage.getItem(key),
      setItem: async (key: string, value: string) => storage.setItem(key, value),
    };
  } catch {
    return null;
  }
}

export async function getThemeMode(): Promise<ThemeMode> {
  const secure = await getSecureStorage();
  if (secure) {
    try {
      const raw = await secure.getItem(THEME_KEY);
      if (raw === 'dark' || raw === 'light') {
        memoryTheme = raw;
        return raw;
      }
    } catch {
      // Continue with fallback stores.
    }
  }

  const asyncStore = await getAsyncStorage();
  if (asyncStore) {
    try {
      const raw = await asyncStore.getItem(THEME_KEY);
      if (raw === 'dark' || raw === 'light') {
        memoryTheme = raw;
        return raw;
      }
    } catch {
      // Continue with memory fallback.
    }
  }

  return memoryTheme;
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  memoryTheme = mode;

  const secure = await getSecureStorage();
  if (secure) {
    try {
      await secure.setItem(THEME_KEY, mode);
      return;
    } catch {
      // Continue to AsyncStorage fallback.
    }
  }

  const asyncStore = await getAsyncStorage();
  if (asyncStore) {
    try {
      await asyncStore.setItem(THEME_KEY, mode);
    } catch {
      // Keep in-memory value as final fallback.
    }
  }
}
