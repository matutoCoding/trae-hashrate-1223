import Taro from '@tarojs/taro';
import type { StoreApi, StateCreator } from 'zustand';

const STORAGE_PREFIX = 'md_app_';

const storage = {
  getItem: (key: string): string | null => {
    try {
      return Taro.getStorageSync(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      Taro.setStorageSync(STORAGE_PREFIX + key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key: string) => {
    try {
      Taro.removeStorageSync(STORAGE_PREFIX + key);
    } catch {
      // ignore
    }
  },
};

export const loadState = <T extends object>(key: string, defaultState: Partial<T> = {}): Partial<T> => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return defaultState;
    return JSON.parse(raw);
  } catch {
    return defaultState;
  }
};

export const persistStore = <T extends object>(
  key: string,
  initialState: Partial<T> = {}
) => {
  return {
    load: (): Partial<T> => loadState<T>(key, initialState),
    save: (state: T) => {
      storage.setItem(key, JSON.stringify(state));
    },
    clear: () => {
      storage.removeItem(key);
    },
  };
};
