import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import en from './en.json';
import hi from './hi.json';
import or from './or.json';

const LANG_KEY = 'lifelink_app_language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  or: { translation: or },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';
const initialLang = ['en', 'hi', 'or'].includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

/** Restore persisted language preference (async after cold start). */
export async function hydrateAppLanguage() {
  try {
    const saved = await SecureStore.getItemAsync(LANG_KEY);
    if (saved && ['en', 'hi', 'or'].includes(saved) && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    /* ignore */
  }
}

export async function setAppLanguage(code: string) {
  const next = ['en', 'hi', 'or'].includes(code) ? code : 'en';
  await i18n.changeLanguage(next);
  try {
    await SecureStore.setItemAsync(LANG_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

void hydrateAppLanguage();

export default i18n;
