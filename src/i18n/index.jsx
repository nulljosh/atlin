import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en, locales, rtlLanguages } from './strings'

const STORAGE_KEY = 'atlin-language'

// Every locale we ship strings for, plus English.
export const supportedLanguages = ['en', ...Object.keys(locales)]

// Nominatim understands BCP-47 tags directly, and Intl.DisplayNames gives us
// the endonym for the picker, so no hand-written language-name table.
export function languageLabel(code) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) || code
  } catch {
    return code
  }
}

// Browser preference -> a locale we actually have strings for.
// Script matters for Chinese, so match the full tag before the base language.
export function resolveLanguage(preferred = navigator.languages || [navigator.language]) {
  for (const raw of preferred) {
    if (!raw) continue
    const tag = new Intl.Locale(raw)
    const script = tag.maximize().script
    if (tag.language === 'zh') return script === 'Hant' ? 'zh-Hant' : 'zh-Hans'
    if (supportedLanguages.includes(tag.baseName)) return tag.baseName
    if (supportedLanguages.includes(tag.language)) return tag.language
  }
  return 'en'
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || resolveLanguage()
  )

  const dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
  }, [language, dir])

  function setLanguage(code) {
    localStorage.setItem(STORAGE_KEY, code)
    setLanguageState(code)
  }

  const value = useMemo(() => {
    const dict = { ...en, ...(locales[language] || {}) }
    // {n} is the only placeholder we use; anything else is a literal string.
    const t = (key, vars) => {
      const s = dict[key] ?? en[key] ?? key
      return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s
    }
    return { language, setLanguage, dir, t }
  }, [language, dir])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
