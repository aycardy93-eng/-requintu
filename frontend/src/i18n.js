import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

const idiomaGuardado = () => {
  try {
    const valor = localStorage.getItem('requintu_idioma');
    return valor === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
};

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: idiomaGuardado(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export const localeFecha = () => (i18n.language === 'en' ? 'en-US' : 'es-CO');

export default i18n;