import { Link } from 'react-router-dom';
import { Search, UserRound, MapPin, ShieldCheck, Zap, Home, HardHat, ArrowRight, Mic } from 'lucide-react';
import { CATEGORIES } from '@shared/constants.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { Logo, CategoryIcon } from '../components/ui.jsx';
import LanguageSwitcher from '../components/layout/LanguageSwitcher.jsx';

export default function Landing() {
  const { t, catName } = useI18n();
  const { user } = useAuth();
  const customerLink = user ? homePathFor(user) : '/signup?role=customer';
  const workerLink = user ? homePathFor(user) : '/signup?role=worker';

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-ink-300/30">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="mx-auto hidden gap-6 text-sm font-semibold text-brand-900 md:flex">
            <a href="#how" className="hover:text-brand-600">
              {t('navHowItWorks')}
            </a>
            <a href="#workers" className="hover:text-brand-600">
              {t('navForWorkers')}
            </a>
          </nav>
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <LanguageSwitcher />
            <Link to={user ? homePathFor(user) : '/login'} className="btn-primary">
              <UserRound className="h-4 w-4" /> <span className="hidden sm:inline">{user ? t('openDashboard') : t('loginSignup')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-16">
          <div>
            <span className="chip mb-5">
              <MapPin className="h-3.5 w-3.5 text-brand-600" /> Islamabad · Rawalpindi
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {t('heroTitle1')}
              <br />
              <span className="text-brand-600">{t('heroTitle2')}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-700">{t('taglineLong')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={customerLink} className="btn-primary btn-lg">
                <Search className="h-5 w-5" /> {t('findAWorker')}
              </Link>
              <Link to={workerLink} className="btn-outline btn-lg">
                <UserRound className="h-5 w-5" /> {t('imAWorker')}
              </Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl">
            <img src="/images/hero-workers.jpg" alt="An electrician, a plumber and a mechanic smiling in front of Islamabad landmarks" className="w-full object-cover" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4">
          <h2 className="section-title mb-5">{t('popularServices')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {CATEGORIES.map((c) => (
              <Link key={c.key} to={customerLink} className="tile py-6 text-sm">
                <CategoryIcon category={c.key} className="h-8 w-8" />
                {catName(c.key)}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-4 rounded-2xl border border-cream-200 bg-cream-100 p-5 sm:grid-cols-3">
            {[
              [MapPin, 'featNearby', 'featNearbySub'],
              [ShieldCheck, 'featTrusted', 'featTrustedSub'],
              [Zap, 'featQuick', 'featQuickSub'],
            ].map(([Icon, a, b]) => (
              <div key={a} className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-brand-900">{t(a)}</p>
                  <p className="text-sm text-ink-500">{t(b)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <span className="chip">{t('threeSteps')}</span>
            <h2 className="mt-3 text-2xl font-bold">{t('navHowItWorks')}</h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Steps icon={Home} title={t('forCustomers')} tone="brand" steps={[['hc1', 'hc1s'], ['hc2', 'hc2s'], ['hc3', 'hc3s']]} cta={t('findAWorker')} to={customerLink} />
            <Steps icon={HardHat} title={t('forWorkers')} tone="amber" steps={[['hw1', 'hw1s'], ['hw2', 'hw2s'], ['hw3', 'hw3s']]} cta={t('imAWorker')} to={workerLink} />
          </div>
        </section>

        <section id="workers" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-brand-900 p-8 text-white md:flex-row">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-600 ring-[12px] ring-brand-800">
              <Mic className="h-10 w-10" />
            </span>
            <div className="flex-1 text-center md:text-start">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">{t('voiceBannerKicker')}</p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t('voiceBannerTitle')}</h2>
              <p className="mt-2 text-white/80">{t('voiceBannerSub')}</p>
            </div>
            <Link to={workerLink} className="btn border-2 border-amber-500 text-white hover:bg-white/10">
              <Mic className="h-4 w-4" /> {t('registerByVoice')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-sm text-white/80">{t('footerAbout')}</p>
          </div>
          <div className="text-sm text-white/70 sm:text-end">
            <LanguageSwitcher dark />
            <p className="mt-4">© 2026 Roshan Rozgar · {t('tagline')}</p>
            <p>{t('footerDemo')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Steps({ icon: Icon, title, steps, cta, to, tone }) {
  const { t } = useI18n();
  const num = tone === 'amber' ? 'bg-amber-500 text-brand-950' : 'bg-brand-900 text-white';
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-brand-50 text-brand-600'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <ol className="mt-5 space-y-4">
        {steps.map(([a, b], i) => (
          <li key={a} className="flex gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${num}`}>{i + 1}</span>
            <div>
              <p className="font-semibold text-brand-900">{t(a)}</p>
              <p className="text-sm text-ink-500">{t(b)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to={to} className={`${tone === 'amber' ? 'btn-outline' : 'btn-primary'} mt-6`}>
        {cta} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
