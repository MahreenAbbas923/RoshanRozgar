import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, BadgeDollarSign, MapPin, Star, Briefcase, CalendarDays, Mic, Power, Clock, Wallet, Pencil } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { meApi, chatApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { SpeakButton, AudioPlayer } from '../../components/voice.jsx';
import { CategoryIcon, EmptyState, ErrorState, Modal, PageLoader, Spinner, Toggle, Stars } from '../../components/ui.jsx';
import { MessagePreview } from '../chat/Inbox.jsx';
import TaskList from './TaskList.jsx';

export default function WorkerDashboard() {
  const { t, has, catName, price, timeAgo, areaShort } = useI18n();
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { version } = useRealtime();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await meApi.dashboard();
      setData(d);
      setUser(d.user);
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [t, has, setUser]);

  useEffect(() => {
    load();
  }, [load, version]);

  const toggle = async (next) => {
    setToggling(true);
    try {
      const res = await meApi.setAvailability(next);
      setUser(res.user);
      setData((d) => ({ ...d, user: res.user }));
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setToggling(false);
    }
  };

  const respond = async (proposal, action, price) => {
    setBusy(true);
    try {
      await chatApi.respond(proposal.id, action, price);
      setAccepting(null);
      if (action === 'accept') navigate(`/chat/${proposal.id}`);
      else load();
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;

  const me = data.user || user;
  const status = me.status;
  const todayCount = data.jobs.filter((j) => ['confirmed', 'in_progress'].includes(j.status) && new Date(j.scheduledAt).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">
          {t('greeting', { name: me.name.split(' ')[0] })} <span className="text-brand-600">· {catName(me.skills[0])}</span>
        </h1>
        <SpeakButton textKey="greeting" params={{ name: me.name.split(' ')[0] }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {/* Availability */}
          <section
            className={`flex items-center gap-4 rounded-3xl border-2 p-5 sm:p-6 ${
              status === 'busy' ? 'border-amber-500 bg-amber-100/40' : me.isAvailable ? 'border-brand-600 bg-white' : 'border-ink-300 bg-cream-50'
            }`}
          >
            <span
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white sm:h-20 sm:w-20 ${
                status === 'busy' ? 'bg-amber-500' : me.isAvailable ? 'bg-brand-600' : 'bg-ink-500'
              }`}
            >
              {status === 'busy' ? <Clock className="h-9 w-9" /> : me.isAvailable ? <Check className="h-10 w-10" /> : <Power className="h-9 w-9" />}
            </span>
            <div className="flex-1">
              <p className="font-display text-xl font-bold text-brand-900 sm:text-2xl">
                {status === 'busy' ? t('busyNow') : me.isAvailable ? t('imAvailable') : t('imOffline')}
              </p>
              <p className="text-sm text-brand-700">{status === 'busy' ? t('busyNowSub') : me.isAvailable ? t('imAvailableSub') : t('imOfflineSub')}</p>
            </div>
            <Toggle checked={me.isAvailable} onChange={toggle} disabled={toggling} label={t('imAvailable')} />
          </section>

          {/* New requests */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="section-title">{t('newJobRequests')}</h2>
              {data.requests.length > 0 && <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white">{t('newCount', { n: data.requests.length })}</span>}
              <SpeakButton textKey="newJobRequests" size="sm" className="ms-auto" />
            </div>
            {data.requests.length === 0 ? (
              <EmptyState icon={Briefcase} title={t('noRequests')} />
            ) : (
              <div className="space-y-4">
                {data.requests.map((p) => (
                  <article key={p.id} className="rounded-3xl border-2 border-brand-600 bg-white p-5">
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream-100">
                        <CategoryIcon category={p.job?.category} className="h-7 w-7" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link to={`/chat/${p.id}`} className="font-display text-xl font-bold text-brand-900 hover:underline">
                          {p.job?.title}
                        </Link>
                        <p className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
                          <MapPin className="h-4 w-4" /> {areaShort(p.job?.location?.area)} · {p.customer?.name} · {timeAgo(p.createdAt)}
                        </p>
                      </div>
                      {p.price && (
                        <div className="text-end">
                          <p className="text-xs text-ink-500">{t('offer')}</p>
                          <p className="font-display text-2xl font-bold text-brand-900">{price(p.price)}</p>
                        </div>
                      )}
                    </div>
                    {p.job?.voiceUrl ? (
                      <div className="mt-4">
                        <AudioPlayer src={p.job.voiceUrl} durationSec={p.job.voiceDurationSec} />
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3 text-sm text-ink-700">
                        <span className="flex-1" dir="auto">
                          <MessagePreview m={p.lastMessage?.type === 'text' ? p.lastMessage : { type: 'text', text: p.job?.description }} />
                        </span>
                        <SpeakButton text={p.job?.description} size="sm" />
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button type="button" className="btn-outline btn-lg px-2" disabled={busy} onClick={() => respond(p, 'decline')}>
                        <X className="h-5 w-5" /> {t('declineJob')}
                      </button>
                      <Link to={`/chat/${p.id}`} className="btn-outline btn-lg px-2">
                        <BadgeDollarSign className="h-5 w-5" /> {t('counterOffer')}
                      </Link>
                      <button
                        type="button"
                        className="btn-primary btn-lg px-2"
                        disabled={busy}
                        onClick={() => {
                          setAmount(String(p.price || me.rate || ''));
                          setAccepting(p);
                        }}
                      >
                        <Check className="h-5 w-5" /> {t('acceptJob')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <TaskList jobs={data.jobs} negotiating={data.negotiating} />
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Star} value={me.ratingAvg ? me.ratingAvg.toFixed(1) : '–'} label={t('rating')} />
            <StatTile icon={Briefcase} value={me.completedJobs} label={t('jobsDone')} />
            <StatTile icon={CalendarDays} value={todayCount} label={t('todayJobs')} />
          </div>

          <div className="rounded-3xl bg-brand-900 p-5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-700">
                <Mic className="h-5 w-5" />
              </span>
              <p className="font-display text-lg font-bold">{t('justSayIt')}</p>
            </div>
            <p className="mt-3 text-sm text-white/85">{t('justSayItHint')}</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-brand-900">{t('profileCompletion', { n: data.completion })}</p>
              <Link to="/profile/edit" className="icon-btn h-8 w-8" aria-label={t('improveProfile')}>
                <Pencil className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-2 h-2 rounded-full bg-ink-300/30">
              <div className="h-2 rounded-full bg-brand-600" style={{ width: `${data.completion}%` }} />
            </div>
            {data.completion < 100 && <p className="mt-2 text-xs text-ink-500">{t('profileCompletionHint')}</p>}
            <div className="mt-4">
              <p className="text-xs font-semibold text-ink-500">{t('mySkills')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {me.skills.map((s) => (
                  <span key={s} className="chip">
                    <CategoryIcon category={s} className="h-3.5 w-3.5" /> {catName(s)}
                  </span>
                ))}
                {me.subSkills.map((s) => (
                  <span key={s} className="chip bg-white">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand-600" />
              <p className="font-semibold text-brand-900">{t('earnings')}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-500">{t('earningsThisMonth')}</p>
                <p className="font-display text-xl font-bold">{price(data.earnings.thisMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-500">{t('earningsTotal')}</p>
                <p className="font-display text-xl font-bold">{price(data.earnings.total)}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">{t('earningsNote')}</p>
          </div>

          {data.reviews.length > 0 && (
            <div className="card p-5">
              <p className="font-semibold text-brand-900">{t('recentReviews')}</p>
              <ul className="mt-3 space-y-3">
                {data.reviews.slice(0, 3).map((r) => (
                  <li key={r.id} className="text-sm">
                    <Stars value={r.rating} size="h-3.5 w-3.5" />
                    {(r.text || r.transcript) && (
                      <p className="mt-0.5 line-clamp-2 text-ink-700" dir="auto">
                        {r.text || r.transcript}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <Link to="/profile" className="mt-3 inline-block text-sm font-semibold text-brand-600">
                {t('viewAll')}
              </Link>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={!!accepting}
        onClose={() => setAccepting(null)}
        title={t('acceptJob')}
        footer={
          <button type="button" className="btn-primary" disabled={busy} onClick={() => respond(accepting, 'accept', Number(amount) || undefined)}>
            {busy && <Spinner className="h-4 w-4" />} {t('acceptJob')}
          </button>
        }
      >
        <p className="mb-2 text-sm text-ink-700">{t('yourPriceForJob')}</p>
        <input type="number" inputMode="numeric" step="50" className="input font-display text-2xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <div className="mt-3 flex flex-wrap gap-2">
          {[500, 800, 1000, 1300, 1500, 2000].map((v) => (
            <button key={v} type="button" className="chip py-1.5 text-sm" onClick={() => setAmount(String(v))}>
              {v.toLocaleString('en-PK')}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function StatTile({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-cream-200 bg-cream-100 p-3 text-center">
      <Icon className="h-5 w-5 text-amber-500" />
      <p className="font-display text-2xl font-bold text-brand-900">{value}</p>
      <p className="text-[11px] text-ink-500">{label}</p>
    </div>
  );
}
