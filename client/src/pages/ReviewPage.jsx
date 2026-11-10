// Two-way review after a completed job. Customer: stars + tags + text/voice.
// Worker: four simple 1-5 ratings for the customer + tags + optional voice.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star, CheckCircle2, Home, PartyPopper } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { jobsApi } from '../services/index.js';
import { errorText } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import { ErrorState, PageLoader, Spinner } from '../components/ui.jsx';
import { SpeakButton, VoiceTextarea } from '../components/voice.jsx';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder.jsx';

const CUSTOMER_TAGS = ['On time', 'Fair price', 'Clean work', 'Polite', 'Expert', 'Would hire again'];
const WORKER_TAGS = ['Clear instructions', 'Paid on time', 'Respectful', 'Easy to find'];
const CRITERIA = [
  ['behavior', 'cBehavior'],
  ['communication', 'cCommunication'],
  ['professionalism', 'cProfessionalism'],
  ['overall', 'cOverall'],
];

function StarInput({ value, onChange, size = 'h-10 w-10', label }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={t('starsLabel', { n })} onClick={() => onChange(n)} className="p-0.5">
          <Star className={`${size} transition ${n <= value ? 'fill-amber-500 text-amber-500' : 'text-ink-300'}`} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams();
  const { t, has, tagLabel, price, lang } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [criteria, setCriteria] = useState({ behavior: 0, communication: 0, professionalism: 0, overall: 0 });
  const [tags, setTags] = useState([]);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(null);
  const [reviewLang, setReviewLang] = useState(lang);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await jobsApi.get(id));
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [id, t, has]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;
  const { job, reviews } = data;
  const isCustomer = user.id === job.customerId;
  const other = isCustomer ? job.worker : job.customer;
  const already = reviews.some((r) => r.reviewerId === user.id);

  if (job.status !== 'completed') return <ErrorState message={t('job_' + job.status)} />;

  if (done || already) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <div className="card flex flex-col items-center gap-4 p-8">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white">
            {done ? <PartyPopper className="h-10 w-10" /> : <CheckCircle2 className="h-10 w-10" />}
          </span>
          <h1 className="text-2xl font-bold">{done ? t('thankYou') : t('alreadyReviewed')}</h1>
          <p className="text-ink-500">{t('reviewHelps')}</p>
          <div className="flex gap-2">
            <Link to={isCustomer ? `/workers/${job.workerId}` : `/users/${job.customerId}`} className="btn-outline">
              {t('viewProfile')}
            </Link>
            <Link to={homePathFor(user)} className="btn-primary">
              <Home className="h-4 w-4" /> {t('goHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tagOptions = isCustomer ? CUSTOMER_TAGS : WORKER_TAGS;
  const valid = isCustomer ? rating > 0 : Object.values(criteria).every((v) => v > 0);

  const submit = async () => {
    setBusy(true);
    try {
      await jobsApi.review(job.id, {
        rating: isCustomer ? rating : criteria.overall,
        criteria: isCustomer ? undefined : criteria,
        tags,
        text,
        audioUrl: voice?.url,
        transcript: voice?.transcript,
        language: reviewLang,
      });
      setDone(true);
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card flex flex-col items-center gap-3 bg-brand-900 p-6 text-center text-white">
        <CheckCircle2 className="h-10 w-10 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">{t('jobDone')}</h1>
        <p className="text-white/80">
          {job.title} · {price(job.agreedPrice)}
        </p>
      </div>

      <div className="card space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Avatar user={other} size={64} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{isCustomer ? t('rateWorkerQ', { name: other?.name }) : t('rateCustomerQ', { name: other?.name })}</h2>
          </div>
          <SpeakButton textKey={isCustomer ? 'howWasJob' : 'rateCustomerQ'} params={{ name: other?.name }} />
        </div>

        {isCustomer ? (
          <div className="flex justify-center">
            <StarInput value={rating} onChange={setRating} label={t('howWasJob')} />
          </div>
        ) : (
          <div className="space-y-3">
            {CRITERIA.map(([key, label]) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-50 px-4 py-2">
                <span className="font-semibold text-brand-900">{t(label)}</span>
                <StarInput value={criteria[key]} onChange={(v) => setCriteria((c) => ({ ...c, [key]: v }))} size="h-7 w-7" label={t(label)} />
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="label">{t('whatWentWell')}</p>
          <div className="flex flex-wrap gap-2">
            {tagOptions.map((tag) => (
              <button
                key={tag}
                type="button"
                role="checkbox"
                aria-checked={tags.includes(tag)}
                onClick={() => setTags((list) => (list.includes(tag) ? list.filter((x) => x !== tag) : [...list, tag]))}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${tags.includes(tag) ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
              >
                {tagLabel(tag)}
              </button>
            ))}
          </div>
        </div>

        <VoiceTextarea id="reviewText" label={t('writeFeedback')} value={text} onChange={setText} rows={3} />

        <div>
          <p className="label">{t('orSpeakFeedback')}</p>
          <VoiceNoteRecorder value={voice} onDone={setVoice} onClear={() => setVoice(null)} />
        </div>

        <div>
          <label htmlFor="rlang" className="label">
            {t('reviewLanguage')}
          </label>
          <select id="rlang" className="input w-auto" value={reviewLang} onChange={(e) => setReviewLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ur">اردو</option>
            <option value="roman">Roman Urdu</option>
          </select>
        </div>

        <button type="button" className="btn-primary btn-lg w-full" disabled={!valid || busy} onClick={submit}>
          {busy && <Spinner />} {t('submitReview')}
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => navigate(homePathFor(user))}>
          {t('skip')}
        </button>
      </div>
    </div>
  );
}
