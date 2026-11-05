import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import or from './or.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('lifelink_lang') || 'en' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      or: { translation: or }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export function changeLanguage(lang: 'en' | 'hi' | 'or') {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lifelink_lang', lang);
  }
  i18n.changeLanguage(lang);
}

export default i18n;

