import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@fleetos/shared/src/i18n/en.json';
import hi from '@fleetos/shared/src/i18n/hi.json';
import te from '@fleetos/shared/src/i18n/te.json';

const STORAGE_KEY = 'fleetos_language';

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(STORAGE_KEY) || 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    te: { translation: te },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export function changeLanguage(lang: string): void {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export default i18n;
