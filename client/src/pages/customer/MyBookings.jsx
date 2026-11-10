import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { jobsApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { EmptyState, ErrorState, PageLoader, Segmented } from '../../components/ui.jsx';
import { JobRow } from '../../components/cards.jsx';
import { JobAction } from './CustomerDashboard.jsx';

const ACTIVE = ['pending', 'in_discussion', 'confirmed', 'in_progress'];

export default function MyBookings() {
  const { t, has } = useI18n();
  const { version } = useRealtime();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      setJobs((await jobsApi.mine()).jobs);
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [t, has]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!jobs) return <PageLoader />;
  const active = jobs.filter((j) => ACTIVE.includes(j.status));
  const done = jobs.filter((j) => ['completed', 'cancelled'].includes(j.status));
  const shown = filter === 'active' ? active : filter === 'completed' ? done : jobs;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('myBookings')}</h1>
        <Link to="/jobs/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" /> {t('newJobRequest')}
        </Link>
      </div>
      <Segmented
        value={filter}
        onChange={setFilter}
        label={t('myBookings')}
        options={[
          { value: 'all', label: t('filterAll', { n: jobs.length }) },
          { value: 'active', label: t('filterActive', { n: active.length }) },
          { value: 'completed', label: t('filterCompleted', { n: done.length }) },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState title={t('noBookings')} />
      ) : (
        <div className="space-y-3">
          {shown.map((j) => (
            <JobRow key={j.id} job={j} action={<JobAction job={j} />} />
          ))}
        </div>
      )}
    </div>
  );
}
