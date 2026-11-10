import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import Avatar from '../../components/Avatar.jsx';
import { EmptyState, JobStatusBadge, ProposalStatusBadge, Segmented } from '../../components/ui.jsx';
import { SpeakButton } from '../../components/voice.jsx';

// Worker's tasks: booked jobs plus conversations still negotiating a price.
export default function TaskList({ jobs, negotiating = [] }) {
  const { t, price, when, areaShort } = useI18n();
  const [tab, setTab] = useState('upcoming');
  const upcoming = jobs.filter((j) => ['confirmed', 'in_progress'].includes(j.status));
  const completed = jobs.filter((j) => j.status === 'completed').reverse();

  const rows =
    tab === 'upcoming'
      ? upcoming.map((j) => ({ kind: 'job', item: j }))
      : tab === 'negotiating'
        ? negotiating.map((p) => ({ kind: 'prop', item: p }))
        : completed.map((j) => ({ kind: 'job', item: j }));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="section-title">{t('myTasks')}</h2>
        <SpeakButton textKey="myTasks" size="sm" />
        <div className="ms-auto">
          <Segmented
            value={tab}
            onChange={setTab}
            label={t('myTasks')}
            options={[
              { value: 'upcoming', label: t('tabUpcoming', { n: upcoming.length }) },
              { value: 'negotiating', label: t('tabNegotiating', { n: negotiating.length }) },
              { value: 'completed', label: t('tabCompleted', { n: completed.length }) },
            ]}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('noTasks')} />
      ) : (
        <div className="space-y-3">
          {rows.map(({ kind, item }) => {
            if (kind === 'prop') {
              return (
                <article key={item.id} className="card flex items-center gap-4 p-4">
                  <Avatar user={item.customer} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-display font-bold text-brand-900">{item.job?.title}</p>
                      <ProposalStatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-ink-500">
                      {item.customer?.name} · {areaShort(item.job?.location?.area)}
                    </p>
                  </div>
                  {item.price && <span className="hidden font-display text-lg font-bold sm:block">{price(item.price)}</span>}
                  <Link to={`/chat/${item.id}`} className="btn-outline">
                    {t('openChat')}
                  </Link>
                </article>
              );
            }
            const j = item;
            const action =
              j.status === 'confirmed' ? (
                <Link to={`/jobs/${j.id}`} className="btn-primary">
                  {t('startJob')}
                </Link>
              ) : j.status === 'in_progress' ? (
                <Link to={`/jobs/${j.id}`} className="btn-primary">
                  {t('markComplete')}
                </Link>
              ) : !j.reviewedByMe ? (
                <Link to={`/jobs/${j.id}/review`} className="btn-outline">
                  {t('rateReview')}
                </Link>
              ) : (
                <Link to={`/jobs/${j.id}`} className="btn-outline">
                  {t('seeReview')}
                </Link>
              );
            return (
              <article key={j.id} className="card flex items-center gap-4 p-4">
                <Avatar user={j.customer} size={52} />
                <Link to={`/jobs/${j.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display font-bold text-brand-900">{j.title}</p>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <p className="text-sm text-ink-500">
                    {j.customer?.name} · {areaShort(j.location?.area)} · {when(j.scheduledAt)}
                  </p>
                </Link>
                {j.agreedPrice && <span className="hidden font-display text-lg font-bold sm:block">{price(j.agreedPrice)}</span>}
                {action}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
