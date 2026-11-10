import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Briefcase } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import Avatar from './Avatar.jsx';
import { AvailabilityBadge, CategoryIcon, DemoBadge, JobStatusBadge, RatingBadge } from './ui.jsx';

export function WorkerCard({ worker, action, jobId, highlight }) {
  const { t, catName, price, areaShort } = useI18n();
  const reasons = worker.matchReasons || [];
  const profileLink = `/workers/${worker.id}${jobId ? `?job=${jobId}` : ''}`;
  return (
    <article className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${highlight ? 'border-2 border-brand-600' : ''}`}>
      <Link to={profileLink} className="flex flex-1 items-start gap-4">
        <Avatar user={worker} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-bold text-brand-900">{worker.name}</h3>
            {worker.status && <AvailabilityBadge status={worker.status} />}
            {worker.isDemo && <DemoBadge />}
          </div>
          <p className="text-sm text-ink-700">
            {(worker.skills || []).map(catName).join(' · ')} · {t('yearsShort', { n: worker.experienceYears || 0 })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <RatingBadge value={worker.ratingAvg} count={worker.ratingCount} />
            <span className="inline-flex items-center gap-1 text-ink-700">
              <Briefcase className="h-4 w-4" /> {t('jobsCount', { n: worker.completedJobs || 0 })}
            </span>
            {worker.distanceKm != null && (
              <span className="inline-flex items-center gap-1 text-ink-700">
                <MapPin className="h-4 w-4" />
                {worker.distanceKm < 1 ? areaShort(worker.location?.area) : t('kmAway', { n: worker.distanceKm })}
              </span>
            )}
            {worker.rate > 0 && (
              <span className="font-semibold text-brand-900">
                {price(worker.rate)} {t('perVisit')}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {worker.phoneVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                <BadgeCheck className="h-3.5 w-3.5" /> {t('phoneVerifiedDemo')}
              </span>
            )}
            {worker.coversArea && <span className="rounded-full bg-cream-100 px-2 py-0.5 text-xs font-medium text-brand-800">{t('inYourArea')}</span>}
            {reasons.slice(0, 2).map((r) => (
              <span key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-brand-900">
                {r.startsWith('skill:') ? t('reason_skill', { skill: r.slice(6) }) : t(`reason_${r}`)}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 gap-2 sm:flex-col">{action}</div>
    </article>
  );
}

export function JobRow({ job, viewer = 'customer', action }) {
  const { t, catName, price, when } = useI18n();
  const other = viewer === 'customer' ? job.worker : job.customer;
  return (
    <article className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Link to={`/jobs/${job.id}`} className="flex flex-1 items-center gap-4">
        {other ? (
          <Avatar user={other} size={52} />
        ) : (
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-cream-100">
            <CategoryIcon category={job.category} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-base font-bold text-brand-900">{job.title}</h3>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-sm text-ink-500">
            {other ? `${other.name} · ` : ''}
            {catName(job.category)} · {job.location?.area} · {job.when === 'now' && ['pending', 'in_discussion'].includes(job.status) ? t('neededNow') : when(job.scheduledAt)}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        {(job.agreedPrice || job.budget) && <span className="font-display text-lg font-bold text-brand-900">{price(job.agreedPrice || job.budget)}</span>}
        {action}
      </div>
    </article>
  );
}
