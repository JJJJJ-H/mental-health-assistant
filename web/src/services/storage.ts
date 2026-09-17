import type { PrefsState, Theme } from "../types/chat";

export const PREFS_VERSION = 2;
export const STORAGE_KEY = "mewhelp-web:prefs";

function newUserId(): string {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultPrefs(): PrefsState {
  return {
    version: PREFS_VERSION,
    userId: newUserId(),
    theme: "system",
    sidebarCollapsed: typeof window !== "undefined" && window.innerWidth <= 760
  };
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function loadPrefs(storage: Storage = localStorage): PrefsState {
  const serialized = storage.getItem(STORAGE_KEY);
  if (!serialized) {
    const prefs = createDefaultPrefs();
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return prefs;
  }
  try {
    const parsed = JSON.parse(serialized) as Partial<PrefsState>;
    if (
      parsed.version === PREFS_VERSION &&
      typeof parsed.userId === "string" &&
      isTheme(parsed.theme) &&
      typeof parsed.sidebarCollapsed === "boolean"
    ) {
      return parsed as PrefsState;
    }
  } catch {
    /* fallthrough */
  }
  const prefs = createDefaultPrefs();
  storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  return prefs;
}

export function savePrefs(state: PrefsState, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
