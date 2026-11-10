import { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const OPTIONS = [
  { v: 'en', label: 'English' },
  { v: 'ur', label: 'اردو' },
  { v: 'roman', label: 'Roman Urdu' },
];

export default function LanguageSwitcher({ dark = false }) {
  const { lang, setLang, t } = useI18n();
  const { user, changeLanguage } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (v) => {
    setOpen(false);
    if (user) changeLanguage(v);
    else setLang(v);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('fLanguage')}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
          dark ? 'border-white/20 bg-white/10 text-white' : 'border-cream-200 bg-cream-100 text-brand-900'
        }`}
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span>{lang === 'ur' ? 'اردو' : lang === 'roman' ? 'Roman' : 'EN'}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <ul role="listbox" className="absolute end-0 z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-ink-300/30 bg-white py-1 shadow-lift">
          {OPTIONS.map((o) => (
            <li key={o.v}>
              <button
                type="button"
                role="option"
                aria-selected={lang === o.v}
                onClick={() => choose(o.v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-start text-sm text-brand-900 hover:bg-cream-100"
              >
                {o.label}
                {lang === o.v && <Check className="h-4 w-4 text-brand-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
