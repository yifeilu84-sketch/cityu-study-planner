import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getDocumentLanguage,
  getDocumentTitle,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  readStoredLanguage,
  writeStoredLanguage,
} from './language.ts'
import type { Language } from './language.ts'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  pick: <T>(zh: T, en: T) => T
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage())

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(normalizeLanguage(nextLanguage))
  }, [])

  useEffect(() => {
    writeStoredLanguage(language)
    document.documentElement.lang = getDocumentLanguage(language)
    document.title = getDocumentTitle(language)
  }, [language])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguageState(normalizeLanguage(event.newValue))
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const pick = useCallback(<T,>(zh: T, en: T) => (language === 'en' ? en : zh), [language])
  const value = useMemo(() => ({ language, setLanguage, pick }), [language, pick, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used within LanguageProvider')
  return value
}
