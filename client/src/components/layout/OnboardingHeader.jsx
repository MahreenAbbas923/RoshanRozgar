import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Logo } from '../ui.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

export default function OnboardingHeader({ step, total, onBack, badge }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <header className="border-b border-ink-300/30 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button type="button" className="icon-btn border-ink-300/40 bg-white" onClick={onBack || (() => navigate(-1))} aria-label={t('back')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Logo size="sm" />
        <div className="mx-auto hidden items-center gap-3 sm:flex">
          {badge}
          {step && (
            <>
              <span className="text-sm font-semibold text-brand-900">{t('stepOf', { n: step, total })}</span>
              <span className="flex items-center gap-1.5" aria-hidden>
                {Array.from({ length: total }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-brand-600' : i + 1 < step ? 'w-2 bg-brand-900' : 'w-2 bg-ink-300/50'}`}
                  />
                ))}
              </span>
            </>
          )}
        </div>
        <div className="ms-auto sm:ms-0">
          <LanguageSwitcher />
        </div>
      </div>
      {step && (
        <div className="h-1 bg-ink-300/20 sm:hidden" aria-hidden>
          <div className="h-1 bg-brand-600 transition-all" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      )}
    </header>
  );
}
