import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { meApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { ErrorState, PageLoader } from '../../components/ui.jsx';
import TaskList from './TaskList.jsx';

export default function WorkerJobs() {
  const { t, has } = useI18n();
  const { version } = useRealtime();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await meApi.dashboard());
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [t, has]);

  useEffect(() => {
    load();
  }, [load, version]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;
  return (
    <div className="mx-auto max-w-4xl">
      <TaskList jobs={data.jobs} negotiating={[...data.requests, ...data.negotiating]} />
    </div>
  );
}
