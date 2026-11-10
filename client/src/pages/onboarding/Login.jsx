// No phone number or PIN: people come back by tapping their account saved on
// this device. Seeded demo accounts are one tap as well.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRound, HardHat, X, PlusCircle, ChevronRight, Search, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorText } from '../../services/api.js';
import { authApi } from '../../services/index.js';
import OnboardingHeader from '../../components/layout/OnboardingHeader.jsx';
import Avatar from '../../components/Avatar.jsx';
import { Spinner } from '../../components/ui.jsx';
import { SpeakButton } from '../../components/voice.jsx';

export default function Login() {
  const { t, has } = useI18n();
  const { continueAs, demoLogin, demoLoginAs, deviceAccounts, forgetAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      const u = await fn();
      navigate(homePathFor(u), { replace: true });
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setBusy(null);
    }
  };

  const own = deviceAccounts.filter((a) => !a.isDemo);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OnboardingHeader onBack={() => navigate('/welcome')} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">{t('whoIsUsing')}</h1>
          <SpeakButton textKey="whoIsUsing" size="sm" />
        </div>

        <section className="mt-6" aria-label={t('accountsOnDevice')}>
          <p className="mb-2 text-sm font-semibold text-brand-900">{t('accountsOnDevice')}</p>
          {own.length === 0 ? (
            <p className="rounded-2xl bg-cream-50 px-4 py-3 text-sm text-ink-500">{t('noDeviceAccounts')}</p>
          ) : (
            <ul className="space-y-2">
              {own.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => run(a.id, () => continueAs(a))}
                    className="card flex flex-1 items-center gap-3 p-3 text-start hover:bg-cream-50"
                  >
                    <Avatar user={a} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-brand-900">{t('continueAs', { name: a.name })}</span>
                      <span className="text-xs text-ink-500">{t(a.role === 'worker' ? 'worker' : 'customer')}</span>
                    </span>
                    {busy === a.id ? <Spinner className="h-4 w-4" /> : <ChevronRight className="h-5 w-5 text-ink-300 rtl:rotate-180" />}
                  </button>
                  <button type="button" className="icon-btn h-9 w-9" onClick={() => forgetAccount(a.id)} aria-label={t('removeFromDevice')} title={t('removeFromDevice')}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link to="/welcome" className="btn-primary btn-lg mt-5 w-full">
          <PlusCircle className="h-5 w-5" /> {t('createNewAccount')}
        </Link>

        <section className="mt-8 rounded-2xl border border-dashed border-ink-300 bg-cream-50 p-4" aria-label={t('demoAccounts')}>
          <p className="text-sm font-semibold text-brand-900">{t('demoAccounts')}</p>
          <p className="text-xs text-ink-500">{t('demoOneTap')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { role: 'customer', key: 'demoCustomer', icon: UserRound },
              { role: 'worker', key: 'demoWorker', icon: HardHat },
            ].map((d) => (
              <button
                key={d.role}
                type="button"
                disabled={!!busy}
                onClick={() => run(d.role, () => demoLogin(d.role))}
                className="flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-start text-sm font-semibold text-brand-900 hover:bg-cream-100"
              >
                {busy === d.role ? <Spinner className="h-4 w-4" /> : <d.icon className="h-5 w-5 shrink-0 text-brand-600" />}
                {t(d.key)}
              </button>
            ))}
          </div>
          <DemoAccountPicker busy={busy} onPick={(acc) => run(acc.id, () => demoLoginAs(acc.id))} />
        </section>
      </main>
    </div>
  );
}

// Every seeded demo customer and worker, searchable, one tap to open.
function DemoAccountPicker({ busy, onPick }) {
  const { t, catName, areaShort } = useI18n();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open && !list) authApi.demoAccounts().then((r) => setList(r.accounts)).catch(() => setList([]));
  }, [open, list]);

  const query = q.trim().toLowerCase();
  const shown = (list || []).filter((a) => {
    if (!query) return true;
    const trades = (a.skills || []).map((s) => `${s} ${catName(s)}`).join(' ');
    return `${a.name} ${a.area} ${trades}`.toLowerCase().includes(query);
  });

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-brand-700"
      >
        {t('allDemoAccounts')}
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input className="input py-2 ps-9 text-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchDemo')} aria-label={t('searchDemo')} />
          </label>
          {!list ? (
            <p className="flex items-center gap-2 py-2 text-sm text-ink-500">
              <Spinner className="h-4 w-4" /> {t('loading')}
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {shown.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => onPick(a)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2 text-start hover:bg-cream-100"
                  >
                    <Avatar user={a} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-900">{a.name}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {a.role === 'worker' ? (a.skills || []).map(catName).join(', ') : t('customer')} · {areaShort(a.area)}
                      </span>
                    </span>
                    {busy === a.id && <Spinner className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
