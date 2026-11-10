// Public view of any user. Workers see a customer's rating from other workers here.
import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { workersApi } from '../services/index.js';
import { errorText } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import { DemoBadge, ErrorState, PageLoader, RatingBadge } from '../components/ui.jsx';
import { ReviewItem } from './WorkerProfile.jsx';

export default function UserProfile() {
  const { id } = useParams();
  const { t, has, areaName } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await workersApi.profile(id));
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [id, t, has]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;
  if (data.user.role === 'worker') return <Navigate to={`/workers/${id}`} replace />;
  const u = data.user;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button type="button" className="btn-ghost -ms-3" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('back')}
      </button>
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-start">
        <Avatar user={u} size={96} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold">{u.name}</h1>
            {u.isDemo && <DemoBadge />}
          </div>
          <p className="text-sm text-ink-500">{t('customer')}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm sm:justify-start">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-600" /> {areaName(u.location?.area)}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4 text-brand-600" /> {t('completedJobsN', { n: u.completedJobs })}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-cream-100 p-4 text-center">
          <p className="text-xs text-ink-500">{t('customerRatingLabel')}</p>
          <RatingBadge value={u.ratingAvg} count={u.ratingCount} />
        </div>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">{t('reviewsReceived')}</h2>
        {data.reviews.length === 0 ? <p className="text-ink-500">{t('noReviews')}</p> : <div className="space-y-3">{data.reviews.map((r) => <ReviewItem key={r.id} review={r} />)}</div>}
      </section>
    </div>
  );
}
