import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Sparkles, Mic, Database, Info, Check, Pencil } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { metaApi } from '../../services/index.js';
import { speechSupported } from '../../hooks/useSpeechRecognition.js';

const LANGS = [
  { v: 'en', label: 'English' },
  { v: 'ur', label: 'اردو' },
  { v: 'roman', label: 'Roman Urdu' },
];

export default function Settings() {
  const { t, lang } = useI18n();
  const { changeLanguage, logout } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    metaApi.get().then(setMeta).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">{t('settings')}</h1>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">{t('changeLanguage')}</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('changeLanguage')}>
          {LANGS.map((l) => (
            <button
              key={l.v}
              type="button"
              role="radio"
              aria-checked={lang === l.v}
              onClick={() => changeLanguage(l.v)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 font-semibold ${lang === l.v ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-cream-200 bg-cream-100 text-brand-900'}`}
            >
              {lang === l.v && <Check className="h-4 w-4 text-brand-600" />}
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <Link to="/profile/edit" className="card flex items-center gap-3 p-5 font-semibold text-brand-900 hover:bg-cream-50">
        <Pencil className="h-5 w-5 text-brand-600" /> {t('editProfile')}
      </Link>

      <section className="card space-y-3 p-5 text-sm">
        <h2 className="font-bold">{t('aiStatusTitle')}</h2>
        <p className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          {meta ? (meta.ai.provider !== 'keywords' ? t('aiConnected', { provider: meta.ai.provider === 'groq' ? 'Groq' : 'Claude', model: meta.ai.model }) : t('aiNotConnected')) : '…'}
        </p>
        <p className="flex items-start gap-2">
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {meta?.ai.stt === 'groq' ? t('sttGroq', { model: meta.ai.sttModel }) : speechSupported ? t('speechSupported') : t('speechNotSupported')}
        </p>
        <p className="flex items-start gap-2">
          <Database className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {t('dataMode', { mode: meta?.dbMode === 'mongodb' ? 'MongoDB' : 'Demo JSON file' })}
        </p>
        <p className="flex items-start gap-2 text-ink-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t('demoDataNote')}
        </p>
      </section>

      <section className="card p-5">
        <button
          type="button"
          className="btn-danger w-full"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          <LogOut className="h-4 w-4 rtl:rotate-180" /> {t('logout')}
        </button>
        <p className="mt-2 text-center text-xs text-ink-500">{t('logoutNote')}</p>
      </section>
    </div>
  );
}
