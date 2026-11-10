import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search, Camera, ArrowRight, MessageCircle } from 'lucide-react';
import { CATEGORIES } from '@shared/constants.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { meApi, workersApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { VoiceTextarea } from '../../components/voice.jsx';
import { CategoryIcon, EmptyState, ErrorState, PageLoader, Segmented, JobStatusBadge } from '../../components/ui.jsx';
import { JobRow } from '../../components/cards.jsx';
import Avatar from '../../components/Avatar.jsx';

const ACTIVE = ['pending', 'in_discussion', 'confirmed', 'in_progress'];

export default function CustomerDashboard() {
  const { t, has, areaName, price, catName } = useI18n();
  const { user } = useAuth();
  const { version } = useRealtime();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, w] = await Promise.all([meApi.dashboard(), workersApi.search({ onlyAvailable: 'true', sort: 'best' })]);
      setData(d);
      setNearby(w.workers.slice(0, 3));
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [t, has]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;

  const jobs = data.jobs;
  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const completed = jobs.filter((j) => j.status === 'completed');
  const shown = filter === 'active' ? active : filter === 'completed' ? completed : jobs;
  const activeBooking = jobs.find((j) => ['in_progress', 'confirmed'].includes(j.status));

  const startJob = (e) => {
    e.preventDefault();
    navigate('/jobs/new', { state: { text } });
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('greeting', { name: user.name.split(' ')[0] })}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-ink-500">
          <MapPin className="h-4 w-4 text-brand-600" /> {areaName(user.location?.area)}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={startJob} className="card p-5 sm:p-6">
          <h2 className="mb-3 text-xl font-bold">{t('needHelpWith')}</h2>
          <VoiceTextarea value={text} onChange={setText} placeholder={t('needHelpPlaceholder')} rows={3} id="need" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-outline" onClick={() => navigate('/jobs/new', { state: { text, addPhoto: true } })}>
              <Camera className="h-4 w-4" /> {t('addPhoto')}
            </button>
            <button type="submit" className="btn-primary btn-lg ms-auto">
              <Search className="h-5 w-5" /> {t('findWorkers')}
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-500">{t('needHelpHint')}</p>
        </form>

        <aside className="card p-5">
          {activeBooking ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-semibold text-brand-900">{t('activeBooking')}</h2>
                <JobStatusBadge status={activeBooking.status} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Avatar user={activeBooking.worker} size={56} />
                <div>
                  <p className="font-display text-lg font-bold text-brand-900">{activeBooking.worker?.name}</p>
                  <p className="text-sm text-ink-500">
                    {catName(activeBooking.category)} · {activeBooking.title}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-cream-200 bg-cream-100 px-4 py-3">
                <span className="text-sm text-ink-700">{t('agreedPrice')}</span>
                <span className="font-display text-lg font-bold">{price(activeBooking.agreedPrice)}</span>
              </div>
              <Link to={`/jobs/${activeBooking.id}`} className="btn-primary mt-4 w-full">
                {t('view')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-brand-900">{t('nearbyWorkers')}</h2>
              <ul className="mt-3 space-y-3">
                {nearby.map((w) => (
                  <li key={w.id}>
                    <Link to={`/workers/${w.id}`} className="flex items-center gap-3 rounded-xl p-1 hover:bg-cream-100">
                      <Avatar user={w} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-brand-900">{w.name}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {w.skills.map(catName).join(', ')} · ★ {w.ratingAvg?.toFixed(1)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/workers" className="btn-outline mt-4 w-full">
                {t('browseWorkers')}
              </Link>
            </>
          )}
        </aside>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">{t('myBookings')}</h2>
          <Segmented
            value={filter}
            onChange={setFilter}
            label={t('myBookings')}
            options={[
              { value: 'all', label: t('filterAll', { n: jobs.length }) },
              { value: 'active', label: t('filterActive', { n: active.length }) },
              { value: 'completed', label: t('filterCompleted', { n: completed.length }) },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <EmptyState title={t('noBookings')} />
        ) : (
          <div className="space-y-3">
            {shown.slice(0, 6).map((job) => (
              <JobRow key={job.id} job={job} action={<JobAction job={job} />} />
            ))}
            {shown.length > 6 && (
              <Link to="/bookings" className="btn-ghost">
                {t('viewAll')}
              </Link>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">{t('popularServices')}</h2>
          <Link to="/workers" className="text-sm font-semibold text-brand-600">
            {t('viewAll')} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={`/workers?category=${c.key}`} className="tile py-6">
              <CategoryIcon category={c.key} className="h-9 w-9" />
              {catName(c.key)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function JobAction({ job }) {
  const { t } = useI18n();
  if (job.status === 'completed' && !job.reviewedByMe) {
    return (
      <Link to={`/jobs/${job.id}/review`} className="btn-outline">
        {t('rateReview')}
      </Link>
    );
  }
  if (['pending', 'in_discussion'].includes(job.status)) {
    return (
      <Link to={`/jobs/${job.id}/workers`} className="btn-primary">
        <MessageCircle className="h-4 w-4" /> {t('findWorkers')}
      </Link>
    );
  }
  return (
    <Link to={`/jobs/${job.id}`} className={job.status === 'completed' ? 'btn-ghost' : 'btn-primary'}>
      {job.status === 'completed' ? t('reviewed') : t('view')}
    </Link>
  );
}
