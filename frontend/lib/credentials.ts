/**
 * Credential storage helper.
 *
 * API key: sessionStorage (dies on tab close, never persisted to disk).
 * Instance URL + preferences: localStorage (persistent, non-sensitive).
 *
 * On first load, migrates any legacy localStorage API keys and deletes them.
 */

const SESSION_KEY = 'signalflow-n8n-api-key';
const LOCAL_URL_KEY = 'signalflow-n8n-url';

// Legacy keys written by older versions
const LEGACY_KEYS = {
  importApiKey: 'n8n_api_key',
  importUrl: 'n8n_instance_url',
  settingsBlob: 'signalflow-settings',
} as const;

/** Run once on app boot to move API keys out of localStorage. */
export function migrateCredentials(): void {
  if (typeof window === 'undefined') return;

  // 1. Legacy import page keys
  const legacyKey = localStorage.getItem(LEGACY_KEYS.importApiKey);
  if (legacyKey) {
    sessionStorage.setItem(SESSION_KEY, legacyKey);
    localStorage.removeItem(LEGACY_KEYS.importApiKey);
  }

  const legacyUrl = localStorage.getItem(LEGACY_KEYS.importUrl);
  if (legacyUrl) {
    localStorage.setItem(LOCAL_URL_KEY, legacyUrl);
    localStorage.removeItem(LEGACY_KEYS.importUrl);
  }

  // 2. Legacy settings blob (may contain n8nApiKey alongside preferences)
  const blob = localStorage.getItem(LEGACY_KEYS.settingsBlob);
  if (blob) {
    try {
      const parsed = JSON.parse(blob);
      if (parsed.n8nApiKey) {
        // Only overwrite sessionStorage if we didn't already get one above
        if (!sessionStorage.getItem(SESSION_KEY)) {
          sessionStorage.setItem(SESSION_KEY, parsed.n8nApiKey);
        }
        delete parsed.n8nApiKey;
      }
      if (parsed.n8nUrl) {
        if (!localStorage.getItem(LOCAL_URL_KEY)) {
          localStorage.setItem(LOCAL_URL_KEY, parsed.n8nUrl);
        }
        delete parsed.n8nUrl;
      }
      // Write the blob back without credential fields
      localStorage.setItem(LEGACY_KEYS.settingsBlob, JSON.stringify(parsed));
    } catch {
      // Corrupt blob — leave it alone
    }
  }
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(SESSION_KEY) || '';
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    sessionStorage.setItem(SESSION_KEY, key);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function getInstanceUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(LOCAL_URL_KEY) || '';
}

export function setInstanceUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.setItem(LOCAL_URL_KEY, url);
  } else {
    localStorage.removeItem(LOCAL_URL_KEY);
  }
}
