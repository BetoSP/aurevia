import { createContext, useContext, useState } from 'react';
import { T, DEFAULT_LOCALE, LOCALES } from './translations';

const LocaleContext = createContext(null);

function localeInicial() {
  const guardado = localStorage.getItem('prestadora-original-panel-locale');
  return LOCALES.includes(guardado) ? guardado : DEFAULT_LOCALE;
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(localeInicial);

  function setLocale(nuevoLocale) {
    if (!LOCALES.includes(nuevoLocale)) return;
    localStorage.setItem('prestadora-original-panel-locale', nuevoLocale);
    setLocaleState(nuevoLocale);
  }

  const t = T[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale debe usarse dentro de LocaleProvider');
  return ctx;
}
