import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Settings, MapPin, Clock, Banknote, CalendarDays, Briefcase, Globe } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { workersApi, jobsApi } from '../../services/index.js';
import Avatar from '../../components/Avatar.jsx';
import { AvailabilityBadge, CategoryIcon, PageLoader, RatingBadge } from '../../components/ui.jsx';
import { PortfolioImage } from '../../components/WorkIllustration.jsx';
import { JobRow } from '../../components/cards.jsx';
import { ReviewItem } from '../WorkerProfile.jsx';

const LANG_LABEL = { en: 'English', ur: 'اردو', roman: 'Roman Urdu' };

export default function MyProfile() {
  const { t, catName, areaName, areaShort, price } = useI18n();
  const { user } = useAuth();
  const [reviews, setReviews] = useState(null);
  const [jobs, setJobs] = useState([]);

  const load = useCallback(async () => {
    const [p, j] = await Promise.all([workersApi.profile(user.id).catch(() => null), jobsApi.mine().catch(() => null)]);
    setReviews(p?.reviews || []);
    setJobs((j?.jobs || []).filter((x) => x.status === 'completed'));
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isWorker = user.role === 'worker';
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-start">
        <Avatar user={user} size={110} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {isWorker && <AvailabilityBadge status={user.status} />}
          </div>
          <p className="text-brand-600">{isWorker ? user.skills.map(catName).join(' · ') : t('customer')}</p>
          <div className="mt-2 flex justify-center sm:justify-start">
            <RatingBadge value={user.ratingAvg} count={user.ratingCount} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/profile/edit" className="btn-primary">
            <Pencil className="h-4 w-4" /> {t('editProfile')}
          </Link>
          <Link to="/settings" className="btn-outline" aria-label={t('settings')}>
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
        <Info icon={MapPin} label={isWorker ? t('fWorkArea') : t('fArea')} value={areaName(user.location?.area)} />
        <Info icon={Globe} label={t('fLanguage')} value={LANG_LABEL[user.language]} />
        <Info icon={Briefcase} label={t('jobsCompleted')} value={user.completedJobs} />
        {isWorker && <Info icon={Clock} label={t('fExperience')} value={t('yearsExp', { n: user.experienceYears })} />}
        {isWorker && <Info icon={Banknote} label={t('fRate')} value={user.rate ? `${price(user.rate)} ${t('perVisit')}` : '–'} />}
        {isWorker && user.workingHours && (
          <Info
            icon={CalendarDays}
            label={t('fWorkingHours')}
            value={
              <>
                {user.workingHours.days.map((d) => t(`day${d}`)).join(', ')} ·{' '}
                <span dir="ltr">
                  {user.workingHours.start}–{user.workingHours.end}
                </span>
              </>
            }
          />
        )}
        {isWorker && <Info icon={MapPin} label={t('fServiceAreas')} value={user.serviceAreas.map(areaShort).join(', ')} />}
      </div>

      {isWorker && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">{t('mySkills')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {user.skills.map((s) => (
              <span key={s} className="chip">
                <CategoryIcon category={s} className="h-3.5 w-3.5" /> {catName(s)}
              </span>
            ))}
            {user.subSkills.map((s) => (
              <span key={s} className="chip bg-white">
                {s}
              </span>
            ))}
          </div>
          {user.bio && (
            <p className="text-ink-700" dir="auto">
              {user.bio}
            </p>
          )}
          {user.portfolio?.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {user.portfolio.map((src) => (
                <div key={src} className="aspect-square overflow-hidden rounded-xl">
                  <PortfolioImage src={src} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">{t('previousJobs')}</h2>
        {jobs.length === 0 ? <p className="text-ink-500">{t('noTasks')}</p> : <div className="space-y-3">{jobs.slice(0, 5).map((j) => <JobRow key={j.id} job={j} viewer={user.role} />)}</div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t('reviewsReceived')}</h2>
        {reviews === null ? <PageLoader /> : reviews.length === 0 ? <p className="text-ink-500">{t('noReviews')}</p> : <div className="space-y-3">{reviews.map((r) => <ReviewItem key={r.id} review={r} />)}</div>}
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="font-semibold text-brand-900">{value}</p>
      </div>
    </div>
  );
}
