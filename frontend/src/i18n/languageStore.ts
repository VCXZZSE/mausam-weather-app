// Global language state, kept outside React so that it survives remounts and
// so the value read during the very first render already matches localStorage
// (no English flash before a persisted Hindi/Bengali choice is applied).
//
// LanguageProvider subscribes to this store; useTranslation falls back to it
// when a component renders outside the provider (isolated component tests).

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGES,
  type Language,
} from "./bundles/coreTranslations"

export const LANGUAGE_STORAGE_KEY = "mausam-language"

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Private mode / storage disabled — English is still a valid default.
  }
  return DEFAULT_LANGUAGE
}

let current: Language = readStoredLanguage()
const listeners = new Set<() => void>()

export function getLanguage(): Language {
  return current
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Mirrors the active language onto <html> for font fallback and a11y. */
function syncDocumentLanguage(language: Language): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (!root) return
  root.lang = language
  // Devanagari and Bengali are left-to-right, so direction never flips — it is
  // set explicitly so a future RTL locale only has to change this table.
  root.dir = LANGUAGES.find((option) => option.code === language)?.dir ?? "ltr"
}

export function setLanguage(language: Language): void {
  if (!isLanguage(language) || language === current) return
  current = language
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Choice still applies for this session even if it cannot be persisted.
  }
  syncDocumentLanguage(language)
  for (const listener of listeners) listener()
}

/** Test seam: restores the module to a freshly-loaded state. */
export function resetLanguageForTests(): void {
  current = readStoredLanguage()
  syncDocumentLanguage(current)
  for (const listener of listeners) listener()
}

syncDocumentLanguage(current)
