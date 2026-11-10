import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, MessageCircle, Play, CheckCircle2, XCircle, Search, Star, Circle } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRealtime } from '../context/RealtimeContext.jsx';
import { jobsApi } from '../services/index.js';
import { errorText } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import { CategoryIcon, ErrorState, JobStatusBadge, Modal, PageLoader, ProposalStatusBadge, RatingBadge, Spinner, Stars } from '../components/ui.jsx';
import { AudioPlayer } from '../components/voice.jsx';
import { PortfolioImage } from '../components/WorkIllustration.jsx';

const FLOW = ['pending', 'in_discussion', 'confirmed', 'in_progress', 'completed'];

export default function JobDetail() {
  const { id } = useParams();
  const { t, has, catName, price, areaName, when: fmtWhen, tagLabel } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const { version } = useRealtime();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'cancel' | 'complete'
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await jobsApi.get(id));
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [id, t, has]);

  useEffect(() => {
    load();
  }, [load, version]);

  const act = async (fn, after) => {
    setBusy(true);
    try {
      await fn();
      setModal(null);
      after?.();
      await load();
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;
  const { job, proposals, reviews } = data;
  const isCustomer = user.id === job.customerId;
  const isWorker = user.id === job.workerId;
  const myProposal = proposals.find((p) => p.workerId === user.id);
  const selected = proposals.find((p) => p.status === 'selected');
  const open = ['pending', 'in_discussion'].includes(job.status);
  const stepIndex = FLOW.indexOf(job.status);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" className="btn-ghost -ms-3" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('back')}
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-6">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-100">
                <CategoryIcon category={job.category} className="h-7 w-7" />
              </span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="text-sm text-ink-500">{catName(job.category)}</p>
              </div>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-4 text-ink-700" dir="auto">
              {job.description}
            </p>
            {job.voiceUrl && (
              <div className="mt-3">
                <AudioPlayer src={job.voiceUrl} durationSec={job.voiceDurationSec} />
              </div>
            )}
            {job.images?.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {job.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl">
                    <PortfolioImage src={src} />
                  </a>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-600" /> {areaName(job.location?.area)}
                {job.location?.address && (isCustomer || isWorker) ? ` · ${job.location.address}` : ''}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-600" /> {job.when === 'now' && open ? t('neededNow') : fmtWhen(job.scheduledAt)}
              </p>
              {job.budget && (
                <p>
                  {t('customerBudget')}: <strong>{price(job.budget)}</strong>
                </p>
              )}
              {job.agreedPrice && (
                <p>
                  {t('agreedPrice')}: <strong>{price(job.agreedPrice)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Status progress */}
          {job.status !== 'cancelled' && (
            <div className="card p-5">
              <h2 className="mb-4 font-bold">{t('timeline')}</h2>
              <ol className="grid grid-cols-5 gap-1">
                {FLOW.map((s, i) => (
                  <li key={s} className="flex flex-col items-center gap-1 text-center">
                    {i <= stepIndex ? <CheckCircle2 className="h-6 w-6 text-brand-600" /> : <Circle className="h-6 w-6 text-ink-300" />}
                    <span className={`text-[11px] leading-tight ${i <= stepIndex ? 'font-semibold text-brand-900' : 'text-ink-500'}`}>{t(`job_${s}`)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Customer: workers contacted */}
          {isCustomer && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-bold">{t('workersForJob')}</h2>
                {open && (
                  <Link to={`/jobs/${job.id}/workers`} className="btn-primary">
                    <Search className="h-4 w-4" /> {proposals.length ? t('findMoreWorkers') : t('findWorkers')}
                  </Link>
                )}
              </div>
              {proposals.length === 0 ? (
                <p className="text-sm text-ink-500">{t('noWorkersContacted')}</p>
              ) : (
                <ul className="space-y-2">
                  {proposals.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-ink-300/30 p-3">
                      <Avatar user={p.worker} size={44} />
                      <div className="min-w-0 flex-1">
                        <Link to={`/workers/${p.workerId}?job=${job.id}`} className="font-semibold text-brand-900 hover:underline">
                          {p.worker?.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <ProposalStatusBadge status={p.status} />
                          {p.price && (
                            <span className="text-ink-700">
                              {price(p.price)} {p.priceAgreed ? `· ${t('agreedByBoth')}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link to={`/chat/${p.id}`} className="btn-outline px-3" aria-label={t('openChat')}>
                        <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">{t('openChat')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {reviews.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-bold">{t('reviewsForJob')}</h2>
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl bg-cream-50 p-3">
                    <p className="text-xs font-semibold text-ink-500">{r.direction === 'customer_to_worker' ? `${t('customer')} → ${t('worker')}` : `${t('worker')} → ${t('customer')}`}</p>
                    <Stars value={r.rating} />
                    {r.tags?.length > 0 && <p className="mt-1 text-xs text-ink-700">{r.tags.map(tagLabel).join(' · ')}</p>}
                    {(r.text || r.transcript) && (
                      <p className="mt-1 text-sm text-ink-700" dir="auto">
                        {r.text || `“${r.transcript}”`}
                      </p>
                    )}
                    {r.audioUrl && (
                      <div className="mt-2">
                        <AudioPlayer src={r.audioUrl} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Side: other party + actions */}
        <aside className="space-y-4">
          {(isCustomer ? job.worker : job.customer) && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{isCustomer ? t('bookedWorker') : t('customer')}</p>
              <Link to={isCustomer ? `/workers/${job.workerId}` : `/users/${job.customerId}`} className="mt-3 flex items-center gap-3">
                <Avatar user={isCustomer ? job.worker : job.customer} size={56} />
                <div>
                  <p className="font-display text-lg font-bold text-brand-900">{(isCustomer ? job.worker : job.customer)?.name}</p>
                  <RatingBadge value={(isCustomer ? job.worker : job.customer)?.ratingAvg} count={(isCustomer ? job.worker : job.customer)?.ratingCount} />
                </div>
              </Link>
              {(selected || myProposal) && (
                <Link to={`/chat/${(selected || myProposal).id}`} className="btn-outline mt-4 w-full">
                  <MessageCircle className="h-4 w-4" /> {t('openChat')}
                </Link>
              )}
            </div>
          )}

          {!isCustomer && !isWorker && myProposal && (
            <div className="card p-5">
              <ProposalStatusBadge status={myProposal.status} />
              <Link to={`/chat/${myProposal.id}`} className="btn-primary mt-3 w-full">
                <MessageCircle className="h-4 w-4" /> {t('openChat')}
              </Link>
            </div>
          )}

          <div className="space-y-2">
            {isWorker && job.status === 'confirmed' && (
              <button type="button" className="btn-primary btn-lg w-full" disabled={busy} onClick={() => act(() => jobsApi.start(job.id))}>
                <Play className="h-5 w-5" /> {t('startJob')}
              </button>
            )}
            {(isWorker || isCustomer) && ['confirmed', 'in_progress'].includes(job.status) && (
              <button type="button" className={`${job.status === 'in_progress' ? 'btn-primary' : 'btn-outline'} btn-lg w-full`} onClick={() => setModal('complete')}>
                <CheckCircle2 className="h-5 w-5" /> {t('markComplete')}
              </button>
            )}
            {job.status === 'completed' && (isCustomer || isWorker) && !reviews.some((r) => r.reviewerId === user.id) && (
              <Link to={`/jobs/${job.id}/review`} className="btn-amber btn-lg w-full">
                <Star className="h-5 w-5" /> {t('reviewNow')}
              </Link>
            )}
            {isCustomer && ['pending', 'in_discussion', 'confirmed'].includes(job.status) && (
              <button type="button" className="btn-danger w-full" onClick={() => setModal('cancel')}>
                <XCircle className="h-4 w-4" /> {job.status === 'confirmed' ? t('cancelBooking') : t('cancelJob')}
              </button>
            )}
            {isWorker && job.status === 'confirmed' && (
              <button type="button" className="btn-danger w-full" onClick={() => setModal('cancel')}>
                <XCircle className="h-4 w-4" /> {t('cancelBooking')}
              </button>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        title={t('cancelConfirmQ')}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              {t('back')}
            </button>
            <button type="button" className="btn-danger" disabled={busy} onClick={() => act(() => jobsApi.cancel(job.id, reason))}>
              {busy && <Spinner className="h-4 w-4" />} {t('confirm')}
            </button>
          </>
        }
      >
        <label htmlFor="reason" className="label">
          {t('cancelReason')}
        </label>
        <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Modal
        open={modal === 'complete'}
        onClose={() => setModal(null)}
        title={t('completeConfirmQ')}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
              {t('back')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => act(() => jobsApi.complete(job.id), () => navigate(`/jobs/${job.id}/review`))}
            >
              {busy && <Spinner className="h-4 w-4" />} {t('markComplete')}
            </button>
          </>
        }
      >
        <p className="text-ink-700">{job.title}</p>
        {job.agreedPrice && <p className="mt-1 font-display text-2xl font-bold text-brand-900">{price(job.agreedPrice)}</p>}
      </Modal>
    </div>
  );
}
