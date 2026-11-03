import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '../../locales/de.json'
import en from '../../locales/en.json'
import es from '../../locales/es.json'

export type AppLang = 'de' | 'en' | 'es'

export function normalizeLang(code?: string | null): AppLang | null {
  const c = (code || '').toLowerCase()
  if (c.startsWith('de')) return 'de'
  if (c.startsWith('es')) return 'es'
  if (c.startsWith('en')) return 'en'
  return null
}

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
    es: { translation: es }
  },
  lng: 'de',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

export default i18n
