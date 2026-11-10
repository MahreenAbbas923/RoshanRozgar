// Worker discovery. With a job (/jobs/:id/workers): only workers free at the
// requested time, with request/chat actions. Without (/workers): browse.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Send, MessageCircle, Search, SearchX, PlusCircle } from 'lucide-react';
import { CATEGORIES } from '@shared/constants.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { jobsApi, workersApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { WorkerCard } from '../../components/cards.jsx';
import { CategoryIcon, EmptyState, ErrorState, PageLoader, Segmented, Spinner } from '../../components/ui.jsx';

const WorkersMap = lazy(() => import('../../components/WorkersMap.jsx'));
const DISTANCES = [2, 5, 10, 25];

export default function FindWorkers() {
  const { id: jobId } = useParams();
  const [params, setParams] = useSearchParams();
  const { t, has, catName, when: fmtWhen } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const { version } = useRealtime();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list');
  const [maxKm, setMaxKm] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('best');
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [sending, setSending] = useState(null);
  const category = params.get('category') || '';

  const load = useCallback(async () => {
    try {
      setError(null);
      if (jobId) {
        const [{ job: j }, m] = await Promise.all([jobsApi.get(jobId), jobsApi.matches(jobId, { maxKm, minRating, sort, q })]);
        setJob(j);
        setResult(m);
      } else {
        setResult(await workersApi.search({ category, maxKm, minRating, sort, q, onlyAvailable: showAll ? 'false' : 'true' }));
      }
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [jobId, maxKm, minRating, sort, q, category, showAll, t, has]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, q, version]);

  const request = async (workerId) => {
    setSending(workerId);
    try {
      const { proposal } = await jobsApi.requestWorker(jobId, workerId);
      toast.success(t('requestSent'));
      navigate(`/chat/${proposal.id}`);
    } catch (err) {
      toast.error(errorText(err, t, has));
      load();
    } finally {
      setSending(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!result) return <PageLoader />;

  const jobOpen = job && ['pending', 'in_discussion'].includes(job.status);
  const origin = job?.location || user.location;
  const workers = result.workers;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="icon-btn border-ink-300/40 bg-white" onClick={() => navigate(jobId ? `/jobs/${jobId}` : '/customer')} aria-label={t('back')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        {job ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
            <CategoryIcon category={job.category} className="h-4 w-4 !text-amber-400" />
            {catName(job.category)} · {job.location?.area} · {job.when === 'now' ? t('now') : fmtWhen(job.scheduledAt)}
          </span>
        ) : (
          <h1 className="text-2xl font-bold">{t('browseWorkers')}</h1>
        )}
        <div className="ms-auto">
          <Segmented value={view} onChange={setView} label="View" options={[{ value: 'list', label: t('listView') }, { value: 'map', label: t('mapView') }]} />
        </div>
      </div>

      {job && <p className="text-sm text-ink-500">{t('forJob', { title: job.title })}</p>}

      {!jobId && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setParams({})}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${!category ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
          >
            {t('allServices')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setParams({ category: c.key })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                category === c.key ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'
              }`}
            >
              {catName(c.key)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-brand-900">{t('distance')}</span>
        {DISTANCES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setMaxKm(d)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${maxKm === d ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
          >
            {d} km
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMinRating(minRating ? 0 : 4)}
          aria-pressed={!!minRating}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${minRating ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
        >
          ★ {t('rating4')}
        </button>
        <select className="input w-auto rounded-full py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('sortBy')}>
          {['best', 'distance', 'rating', 'price', 'experience'].map((s) => (
            <option key={s} value={s}>
              {t(`sort_${s}`)}
            </option>
          ))}
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input w-48 rounded-full py-1.5 ps-9 text-sm" placeholder={t('searchByName')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('searchByName')} />
        </label>
        {!jobId && (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 accent-brand-600" /> {t('showBusyToo')}
          </label>
        )}
        <span className="ms-auto text-sm text-ink-500">{t('availableNowCount', { n: workers.filter((w) => w.canTake).length })}</span>
      </div>

      {!jobId && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3 text-sm text-brand-900">
          <Info className="h-4 w-4 shrink-0" /> {t('browseHint')}
          <Link to={`/jobs/new`} className="btn-primary ms-auto py-1.5">
            <PlusCircle className="h-4 w-4" /> {t('newJobRequest')}
          </Link>
        </div>
      )}

      <div className={view === 'map' ? 'grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]' : ''}>
        <div className={view === 'map' ? 'order-2 space-y-3 lg:order-1' : 'space-y-3'}>
          {workers.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('noWorkersTitle')}
              hint={t('noWorkersHint')}
              action={
                maxKm < 25 && (
                  <button type="button" className="btn-outline mt-2" onClick={() => setMaxKm(25)}>
                    {t('widenSearch')}
                  </button>
                )
              }
            />
          ) : (
            workers.map((w, i) => {
              const contacted = result.contacted?.[w.id];
              let action = (
                <Link to={`/workers/${w.id}${jobId ? `?job=${jobId}` : ''}`} className="btn-outline">
                  {t('viewProfile')}
                </Link>
              );
              if (jobId && jobOpen) {
                action = (
                  <>
                    {action}
                    {contacted ? (
                      <Link to={`/chat/${contacted.proposalId}`} className="btn-primary">
                        <MessageCircle className="h-4 w-4" /> {t('openChat')}
                      </Link>
                    ) : (
                      <button type="button" className="btn-primary" disabled={sending === w.id} onClick={() => request(w.id)}>
                        {sending === w.id ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />} {t('sendRequest')}
                      </button>
                    )}
                  </>
                );
              }
              return <WorkerCard key={w.id} worker={w} jobId={jobId} action={action} highlight={i === 0 && sort === 'best'} />;
            })
          )}
          <p className="flex items-start gap-2 text-xs text-ink-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {result.hiddenBusy > 0 && `${t('onlyFreeShown', { n: result.hiddenBusy })} `}
              {t('distanceNote')}
            </span>
          </p>
        </div>
        {view === 'map' && (
          <div className="order-1 lg:order-2">
            <Suspense fallback={<PageLoader />}>
              <WorkersMap workers={workers} origin={origin} radiusKm={maxKm} jobId={jobId} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
