import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STRINGS } from './strings.js';
import { getCategory, getArea, CITIES } from '@shared/constants.js';

const I18nContext = createContext(null);
const STORAGE_KEY = 'rr_lang';
export const SUPPORTED = ['en', 'ur', 'roman'];

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function hasChosenLanguage() {
  return !!readStoredLang();
}

const TAG_KEYS = {
  'On time': 'tag_on_time',
  'Fair price': 'tag_fair_price',
  'Clean work': 'tag_clean_work',
  Polite: 'tag_polite',
  Expert: 'tag_expert',
  'Would hire again': 'tag_would_hire_again',
  'Clear instructions': 'tag_clear_instructions',
  'Paid on time': 'tag_paid_on_time',
  Respectful: 'tag_respectful',
  'Easy to find': 'tag_easy_to_find',
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => readStoredLang() || 'en');

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang === 'roman' ? 'en' : lang;
    root.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.title = lang === 'ur' ? 'روشن روزگار' : 'Roshan Rozgar';
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable - language still applies for this session */
    }
    setLangState(next);
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const entry = STRINGS[key];
      if (!entry) {
        if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
        return key;
      }
      let s = entry[lang] ?? entry.en;
      for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(v ?? '');
      return s;
    },
    [lang],
  );

  const value = useMemo(() => {
    const money = (n) => (n == null ? '' : Number(n).toLocaleString('en-PK'));
    return {
      lang,
      dir: lang === 'ur' ? 'rtl' : 'ltr',
      isRtl: lang === 'ur',
      setLang,
      t,
      has: (key) => !!STRINGS[key],
      catName: (key) => getCategory(key).names[lang] || getCategory(key).names.en,
      areaName: (key) => {
        const a = getArea(key);
        if (!a) return key || '';
        return `${a.names[lang] || a.names.en}, ${CITIES[a.city]?.[lang] || ''}`;
      },
      areaShort: (key) => getArea(key)?.names[lang] || key || '',
      price: (n) => t('rs', { amount: money(n) }),
      money,
      tagLabel: (tag) => (TAG_KEYS[tag] ? t(TAG_KEYS[tag]) : tag),
      sysMessage: (key, params) => (STRINGS[`sys_${key}`] ? t(`sys_${key}`, formatParams(params, money)) : key),
      notifText: (n) => (STRINGS[`notif_${n.type}`] ? t(`notif_${n.type}`, formatParams(n.params, money)) : n.type),
      timeAgo: (date) => {
        const diff = Math.max(0, Date.now() - new Date(date).getTime());
        const min = Math.floor(diff / 60000);
        if (min < 1) return t('justNow');
        if (min < 60) return t('minAgo', { n: min });
        const h = Math.floor(min / 60);
        if (h < 24) return t('hoursAgo', { n: h });
        return t('daysAgo', { n: Math.floor(h / 24) });
      },
      when: (date) => {
        const d = new Date(date);
        const locale = lang === 'ur' ? 'ur-PK' : 'en-PK';
        const today = new Date();
        const tmr = new Date(Date.now() + 864e5);
        const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
        if (d.toDateString() === today.toDateString()) return `${t('today')}, ${time}`;
        if (d.toDateString() === tmr.toDateString()) return `${t('tomorrow')}, ${time}`;
        return d.toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      },
    };
  }, [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function formatParams(params = {}, money) {
  const out = { ...params };
  if (out.amount != null) out.amount = money(out.amount);
  if (out.budget != null) out.budget = money(out.budget);
  return out;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
