// Safely check environment without top-level react-native/native imports
const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

const ACCESS_TOKEN_KEY = "ab_access_token";
const REFRESH_TOKEN_KEY = "ab_refresh_token";
const USER_KEY = "ab_user_profile";

// In-memory fallback for test runners or environments where SecureStore is unavailable
const memoryStore = new Map<string, string>();

let secureStoreModule: typeof import("expo-secure-store") | null | undefined;
async function getSecureStore() {
  if (secureStoreModule !== undefined) return secureStoreModule;
  try {
    secureStoreModule = await import("expo-secure-store");
    return secureStoreModule;
  } catch {
    secureStoreModule = null;
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      memoryStore.set(key, value);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    const store = await getSecureStore();
    if (store) {
      await store.setItemAsync(key, value);
    } else {
      memoryStore.set(key, value);
    }
  } catch {
    memoryStore.set(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      const local = typeof window !== "undefined" && window.localStorage?.getItem(key);
      return local || memoryStore.get(key) || null;
    }
    const store = await getSecureStore();
    if (store) {
      const val = await store.getItemAsync(key);
      return val || memoryStore.get(key) || null;
    }
    return memoryStore.get(key) || null;
  } catch {
    return memoryStore.get(key) || null;
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      memoryStore.delete(key);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    const store = await getSecureStore();
    if (store) {
      await store.deleteItemAsync(key);
    } else {
      memoryStore.delete(key);
    }
  } catch {
    memoryStore.delete(key);
  }
}

export const Storage = {
  getAccessToken: () => getItem(ACCESS_TOKEN_KEY),
  setAccessToken: (token: string) => setItem(ACCESS_TOKEN_KEY, token),
  deleteAccessToken: () => deleteItem(ACCESS_TOKEN_KEY),

  getRefreshToken: () => getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => setItem(REFRESH_TOKEN_KEY, token),
  deleteRefreshToken: () => deleteItem(REFRESH_TOKEN_KEY),

  getUser: async () => {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser: (user: any) => setItem(USER_KEY, JSON.stringify(user)),
  deleteUser: () => deleteItem(USER_KEY),

  clearAllAuthTokens: async () => {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
      deleteItem(USER_KEY),
    ]);
  },

  getItem: (key: string) => getItem(key),
  setItem: (key: string, value: string) => setItem(key, value),
  deleteItem: (key: string) => deleteItem(key),

  getTheme: () => getItem("ts_theme"),
  setTheme: (theme: string) => setItem("ts_theme", theme),

  getGoal: () => getItem("trillion_selected_goal"),
  setGoal: (goal: string) => setItem("trillion_selected_goal", goal),

  getContentLanguage: () => getItem("ts_content_language"),
  setContentLanguage: (lang: string) => setItem("ts_content_language", lang),
};
