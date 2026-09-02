const SESSION_KEY = 'tradedna_session_v1';
let memorySession: MobileSessionUser | null = null;

export interface MobileSessionUser {
  id: number;
  username: string;
  current_balance: number;
  starting_balance: number;
}

interface StorageLike {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

async function getSecureStorage(): Promise<StorageLike | null> {
  try {
    const mod = await import('expo-secure-store');
    const storage = mod as any;
    if (!storage?.getItemAsync || !storage?.setItemAsync || !storage?.deleteItemAsync) {
      return null;
    }

    return {
      getItem: async (key: string) => storage.getItemAsync(key),
      setItem: async (key: string, value: string) => storage.setItemAsync(key, value),
      removeItem: async (key: string) => storage.deleteItemAsync(key),
    };
  } catch {
    return null;
  }
}

async function getNativeStorage(): Promise<StorageLike | null> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const storage = (mod as any)?.default ?? mod;
    if (storage?.getItem && storage?.setItem && storage?.removeItem) {
      return storage as StorageLike;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSession(user: MobileSessionUser): Promise<void> {
  memorySession = user;
  const payload = JSON.stringify(user);

  const secureStore = await getSecureStorage();
  if (secureStore) {
    try {
      await secureStore.setItem(SESSION_KEY, payload);
      return;
    } catch {
      // Fall through to AsyncStorage fallback.
    }
  }

  const storage = await getNativeStorage();
  if (storage) {
    try {
      await storage.setItem(SESSION_KEY, payload);
    } catch {
      // Keep app functional even when native storage is unavailable in this runtime.
    }
  }
}

export async function getSession(): Promise<MobileSessionUser | null> {
  const secureStore = await getSecureStorage();
  if (secureStore) {
    try {
      const raw = await secureStore.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MobileSessionUser;
        if (parsed?.id) {
          memorySession = parsed;
          return parsed;
        }
      }
    } catch {
      // Continue with AsyncStorage fallback.
    }
  }

  const storage = await getNativeStorage();

  if (!storage) {
    return memorySession;
  }

  try {
    const raw = await storage.getItem(SESSION_KEY);
    if (!raw) return memorySession;

    const parsed = JSON.parse(raw) as MobileSessionUser;
    if (!parsed?.id) return memorySession;

    memorySession = parsed;

    return parsed;
  } catch {
    return memorySession;
  }
}

export async function clearSession(): Promise<void> {
  memorySession = null;

  const secureStore = await getSecureStorage();
  if (secureStore) {
    try {
      await secureStore.removeItem(SESSION_KEY);
    } catch {
      // Continue with AsyncStorage fallback.
    }
  }

  const storage = await getNativeStorage();
  if (!storage) return;

  try {
    await storage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage clear errors so logout still proceeds.
  }
}
