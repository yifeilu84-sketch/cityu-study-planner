export type Language = 'zh' | 'en'

export const LANGUAGE_STORAGE_KEY = 'cityu-study-planner-language-v1'

export interface LanguageStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStorage(): LanguageStorage | undefined {
  if (typeof window === 'undefined') return undefined
  return window.localStorage
}

export function normalizeLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh'
}

export function readStoredLanguage(storage: LanguageStorage | undefined = browserStorage()): Language {
  if (!storage) return 'zh'
  try {
    return normalizeLanguage(storage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'zh'
  }
}

export function writeStoredLanguage(
  language: Language,
  storage: LanguageStorage | undefined = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // The selected language still applies for this tab when storage is unavailable.
  }
}

export function getDocumentLanguage(language: Language): 'zh-Hans' | 'en' {
  return language === 'en' ? 'en' : 'zh-Hans'
}

export function getDocumentTitle(language: Language): string {
  return language === 'en'
    ? 'CityU Study Planner - Course and Programme Planning'
    : 'CityU Study Planner - 香港城市大学课程规划'
}
