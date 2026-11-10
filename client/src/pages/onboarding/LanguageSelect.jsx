import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Volume2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSpeak } from '../../hooks/useSpeak.js';
import { Logo } from '../../components/ui.jsx';

const LANGS = [
  { v: 'en', title: 'English', sub: 'English', sample: 'Aa' },
  { v: 'ur', title: 'اردو', sub: 'Urdu', sample: 'ا ب', rtl: true },
  { v: 'roman', title: 'Roman Urdu', sub: 'Urdu in English letters', sample: 'Aa' },
];

// Spoken prompt in all three languages so a non-reader can still choose.
const PROMPT = {
  en: 'Choose your language.',
  ur: 'اپنی زبان چنیں۔',
  roman: 'Apni zabaan chunein. English, Urdu ya Roman Urdu.',
};

export default function LanguageSelect() {
  const { lang, setLang, t } = useI18n();
  const { user, changeLanguage } = useAuth();
  const { speak, supported } = useSpeak();
  const [choice, setChoice] = useState(lang);
  const navigate = useNavigate();

  const pick = (v) => {
    setChoice(v);
    setLang(v);
  };
  const go = () => {
    if (user) changeLanguage(choice);
    navigate(user ? -1 : '/welcome');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <Logo size="sm" />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="card w-full p-6 text-center sm:p-10">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('chooseLanguage')}</h1>
            {supported && (
              <button type="button" className="icon-btn" aria-label="Listen" onClick={() => speak(PROMPT)}>
                <Volume2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-ink-500">{t('chooseLanguageHint')}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label={t('chooseLanguage')}>
            {LANGS.map((l) => (
              <button
                key={l.v}
                type="button"
                role="radio"
                aria-checked={choice === l.v}
                onClick={() => pick(l.v)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition ${
                  choice === l.v ? 'border-brand-600 bg-brand-50' : 'border-cream-200 bg-cream-100 hover:border-brand-200'
                }`}
              >
                {choice === l.v && (
                  <span className="absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
                <span className={`text-3xl font-bold text-brand-700 ${l.rtl ? 'font-urdu leading-[1.8]' : 'font-display'}`}>{l.sample}</span>
                <span className={`text-xl font-bold text-brand-900 ${l.rtl ? 'font-urdu leading-[2]' : 'font-display'}`} dir={l.rtl ? 'rtl' : 'ltr'}>
                  {l.title}
                </span>
                <span className="text-xs text-ink-500" dir="ltr">
                  {l.sub}
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary btn-lg mt-8 w-full sm:w-auto" onClick={go}>
            {t('continue')} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </button>
        </div>
      </main>
    </div>
  );
}
