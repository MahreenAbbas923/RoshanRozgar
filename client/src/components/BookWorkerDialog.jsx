// Customer confirms a booking from a worker's profile (or the profile chat):
// what work, when, where and the agreed price. The server re-checks that the
// worker is free at that time before confirming.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { workersApi } from '../services/index.js';
import { errorText } from '../services/api.js';
import { Modal, Spinner } from './ui.jsx';
import { VoiceTextarea } from './voice.jsx';
import { AreaSelect } from './pickers.jsx';

function tomorrowAt10() {
  const d = new Date(Date.now() + 864e5);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export default function BookWorkerDialog({ open, onClose, worker, conversationId, onBooked }) {
  const { t, has, catName, money } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(worker?.skills?.[0] || '');
  const [when, setWhen] = useState(worker?.status === 'available' ? 'now' : 'scheduled');
  const [scheduledAt, setScheduledAt] = useState(tomorrowAt10());
  const [area, setArea] = useState(user?.location?.area || '');
  const [price, setPrice] = useState(worker?.rate ? String(worker.rate) : '');
  const [busy, setBusy] = useState(false);

  if (!worker) return null;

  const submit = async () => {
    setBusy(true);
    try {
      const { job } = await workersApi.book(worker.id, {
        description,
        category,
        when,
        scheduledAt: when === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
        area,
        price: Number(price),
        conversationId,
      });
      toast.success(t('bookingDoneToast', { name: worker.name }));
      onBooked?.(job);
      onClose();
      navigate(`/jobs/${job.id}`);
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setBusy(false);
    }
  };

  const valid = Number(price) >= 100 && area && (when === 'now' || scheduledAt);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('bookWithName', { name: worker.name })}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={!valid || busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('confirmBookingBtn')} {Number(price) >= 100 ? `— Rs ${money(price)}` : ''}
          </button>
        </>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pe-1">
        {worker.skills?.length > 1 && (
          <div>
            <label htmlFor="bk-cat" className="label">
              {t('service')}
            </label>
            <select id="bk-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {worker.skills.map((s) => (
                <option key={s} value={s}>
                  {catName(s)}
                </option>
              ))}
            </select>
          </div>
        )}

        <VoiceTextarea id="bk-desc" label={t('whatWorkNeeded')} value={description} onChange={setDescription} rows={2} placeholder={t('needHelpPlaceholder')} />

        <div>
          <p className="label">{t('whenNeeded')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setWhen('now')} className={when === 'now' ? 'btn-primary' : 'btn-outline'}>
              <Clock className="h-4 w-4" /> {t('now')}
            </button>
            <button type="button" onClick={() => setWhen('scheduled')} className={when === 'scheduled' ? 'btn-primary' : 'btn-outline'}>
              <CalendarClock className="h-4 w-4" /> {t('schedule')}
            </button>
          </div>
          {when === 'scheduled' && (
            <input
              type="datetime-local"
              aria-label={t('dateTime')}
              className="input mt-2"
              value={scheduledAt}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          )}
        </div>

        <AreaSelect label={t('jobLocation')} value={area} onChange={(v) => setArea(v)} id="bk-area" />

        <div>
          <label htmlFor="bk-price" className="label">
            {t('agreedPriceRs')}
          </label>
          <input id="bk-price" type="number" inputMode="numeric" min="100" step="50" className="input font-display text-xl font-bold" value={price} onChange={(e) => setPrice(e.target.value)} />
          {worker.rate > 0 && <p className="mt-1 text-xs text-ink-500">{t('workerRateHint', { name: worker.name.split(' ')[0], rate: money(worker.rate) })}</p>}
        </div>

        <p className="rounded-xl bg-cream-100 px-3 py-2 text-xs text-ink-700">{t('bookingNote')}</p>
      </div>
    </Modal>
  );
}
