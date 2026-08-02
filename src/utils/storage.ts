/**
 * Utility for safe localStorage access across sandboxed iframes and privacy-restricted environments.
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] getItem("${key}") was blocked:`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[Storage] setItem("${key}") was blocked:`, e);
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[Storage] removeItem("${key}") was blocked:`, e);
    }
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch (e) {
      console.warn('[Storage] clear() was blocked:', e);
    }
  }
};
