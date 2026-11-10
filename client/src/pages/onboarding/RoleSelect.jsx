import { Link, useNavigate } from 'react-router-dom';
import { Home, HardHat as HatIcon, ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { SpeakButton } from '../../components/voice.jsx';
import OnboardingHeader from '../../components/layout/OnboardingHeader.jsx';

export default function RoleSelect() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const roles = [
    { role: 'customer', icon: Home, title: 'iAmCustomer', desc: 'customerDesc', tone: 'bg-brand-900 text-white' },
    { role: 'worker', icon: HatIcon, title: 'iAmWorker', desc: 'workerDesc', tone: 'bg-amber-500 text-brand-950' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OnboardingHeader onBack={() => navigate('/language')} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="flex items-center gap-3 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('howWillYouUse')}</h1>
          <SpeakButton textKey="howWillYouUse" />
        </div>
        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
          {roles.map((r) => (
            <div key={r.role} className="card flex flex-col items-center gap-3 p-6 text-center">
              <button
                type="button"
                onClick={() => navigate(`/signup?role=${r.role}`)}
                className="flex w-full flex-col items-center gap-3 rounded-2xl p-2 focus-visible:ring-2"
              >
                <span className={`flex h-20 w-20 items-center justify-center rounded-full ${r.tone}`}>
                  <r.icon className="h-10 w-10" aria-hidden />
                </span>
                <span className="font-display text-xl font-bold text-brand-900">{t(r.title)}</span>
                <span className="text-sm text-ink-500">{t(r.desc)}</span>
              </button>
              <div className="flex items-center gap-2">
                <SpeakButton textKey={r.desc} size="sm" />
                <button type="button" className="btn-primary" onClick={() => navigate(`/signup?role=${r.role}`)}>
                  {t('continue')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-700">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-600 underline">
            {t('login')}
          </Link>
        </p>
        <Link to="/about" className="mt-2 text-sm font-semibold text-brand-600">
          {t('learnHowItWorks')}
        </Link>
      </main>
    </div>
  );
}
