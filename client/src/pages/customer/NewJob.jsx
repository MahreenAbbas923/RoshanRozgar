// Create a job request: describe by voice/text/photo -> AI (or keyword) analysis
// shown for confirmation -> save -> suitable nearby workers.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Tag, Gauge, Banknote, Search, Clock, CalendarClock, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { getCategory } from '@shared/constants.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { aiApi, jobsApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import { VoiceTextarea, SpeakButton, AudioPlayer } from '../../components/voice.jsx';
import VoiceNoteRecorder from '../../components/VoiceNoteRecorder.jsx';
import { PhotoList, CategoryGrid, AreaSelect } from '../../components/pickers.jsx';
import { CategoryIcon, Modal, Spinner } from '../../components/ui.jsx';
import { PortfolioImage } from '../../components/WorkIllustration.jsx';

function defaultSchedule() {
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

export default function NewJob() {
  const { t, has, catName, price, areaName } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [text, setText] = useState(location.state?.text || '');
  const [images, setImages] = useState([]);
  const [voice, setVoice] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [category, setCategory] = useState(null);
  const [when, setWhen] = useState('now');
  const [scheduledAt, setScheduledAt] = useState(defaultSchedule());
  const [budget, setBudget] = useState('');
  const [area, setArea] = useState(user.location?.area || '');
  const [address, setAddress] = useState(user.location?.address || '');
  const [pickCategory, setPickCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const photosRef = useRef(null);

  useEffect(() => {
    if (location.state?.addPhoto) photosRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  const description = text.trim() || voice?.transcript || '';

  const analyze = async () => {
    if (!description) return toast.error(t('describeProblem'));
    setAnalyzing(true);
    try {
      const a = await aiApi.analyzeJob(description);
      setAnalysis(a);
      setCategory(a.category);
      if (a.when === 'tomorrow') setWhen('scheduled');
      if (a.budget) setBudget(String(a.budget));
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const { job } = await jobsApi.create({
        description,
        title: analysis.title,
        category,
        ai: { ...analysis, category },
        when,
        scheduledAt: when === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
        budget: budget ? Number(budget) : undefined,
        images,
        voiceUrl: voice?.url,
        voiceDurationSec: voice?.durationSec,
        location: { area, address },
      });
      navigate(`/jobs/${job.id}/workers`, { replace: true });
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setSaving(false);
    }
  };

  if (!analysis) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button type="button" className="btn-ghost -ms-3" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('back')}
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('describeProblem')}</h1>
          <SpeakButton textKey="describeProblemHint" />
        </div>
        <p className="text-ink-500">{t('describeProblemHint')}</p>
        <div className="card space-y-6 p-5 sm:p-6">
          <VoiceTextarea value={text} onChange={setText} placeholder={t('needHelpPlaceholder')} rows={4} id="desc" autoFocus />
          <p className="text-xs text-ink-500">{t('reviewBeforeSubmit')}</p>
          <div>
            <p className="label">
              {t('voiceDescription')} <span className="font-normal text-ink-500">({t('optional')})</span>
            </p>
            <VoiceNoteRecorder
              value={voice}
              onDone={(v) => {
                setVoice(v);
                if (!text.trim() && v.transcript) setText(v.transcript);
              }}
              onClear={() => setVoice(null)}
            />
          </div>
          <div ref={photosRef}>
            <p className="label">
              {t('addPhoto')} <span className="font-normal text-ink-500">({t('optional')})</span>
            </p>
            <PhotoList value={images} onChange={setImages} max={5} />
          </div>
        </div>
        <button type="button" className="btn-primary btn-lg w-full sm:w-auto" disabled={analyzing || !description} onClick={analyze}>
          {analyzing ? <Spinner /> : <Search className="h-5 w-5" />} {analyzing ? t('analyzing') : t('findWorkers')}
        </button>
      </div>
    );
  }

  const range = getCategory(category).priceRange;
  const items = [
    { icon: Tag, label: t('service'), value: catName(category), extra: <CategoryIcon category={category} className="h-4 w-4" /> },
    { icon: Gauge, label: t('urgency'), value: t(`urgency_${analysis.urgency || 'normal'}`), badge: analysis.urgency === 'high' },
    { icon: Banknote, label: t('typicalPrice'), value: range.length ? `${price(range[0])} – ${price(range[1])}` : '–', note: t('typicalPriceNote') },
    analysis.likelyIssue && { icon: Search, label: t('likelyIssue'), value: analysis.likelyIssue },
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button type="button" className="btn-ghost -ms-3" onClick={() => setAnalysis(null)}>
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('back')}
      </button>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="card space-y-3 self-start p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-900">{t('yourProblem')}</p>
            <button type="button" className="text-sm font-semibold text-brand-600" onClick={() => setAnalysis(null)}>
              {t('edit')}
            </button>
          </div>
          <p className="text-ink-700">“{description}”</p>
          {voice && <AudioPlayer src={voice.url} durationSec={voice.durationSec} />}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((src) => (
                <div key={src} className="aspect-square overflow-hidden rounded-xl">
                  <PortfolioImage src={src} />
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold">{t('aiUnderstood')}</h1>
              <p className={`text-xs ${analysis.source !== 'keywords' ? 'text-brand-600' : 'text-amber-600'}`}>
                {analysis.source !== 'keywords' ? t('aiByClaude', { provider: analysis.source === 'groq' ? 'Groq' : 'Claude' }) : t('aiByKeywords')}
              </p>
            </div>
          </div>
          {analysis.summary && <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">{analysis.summary}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.label} className="flex gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-4">
                <it.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <p className="text-xs text-ink-500">{it.label}</p>
                  <p className="flex items-center gap-1.5 font-display font-bold text-brand-900">
                    {it.extra}
                    {it.badge ? <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs">{it.value}</span> : it.value}
                  </p>
                  {it.note && <p className="text-[11px] text-ink-500">{it.note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="label">{t('whenNeeded')}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setWhen('now')} className={when === 'now' ? 'btn-primary' : 'btn-outline'}>
                  <Clock className="h-4 w-4" /> {t('now')}
                </button>
                <button type="button" onClick={() => setWhen('scheduled')} className={when === 'scheduled' ? 'btn-primary' : 'btn-outline'}>
                  <CalendarClock className="h-4 w-4" /> {t('schedule')}
                </button>
                {when === 'scheduled' && (
                  <input
                    type="datetime-local"
                    aria-label={t('dateTime')}
                    className="input w-auto py-2"
                    value={scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="budget" className="label">
                  {t('budgetOptional')}
                </label>
                <input id="budget" type="number" inputMode="numeric" step="100" min="0" className="input" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <label htmlFor="addr" className="label">
                  {t('fAddress')}
                </label>
                <input id="addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="label flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {t('jobLocation')}: <span className="font-normal">{areaName(area)}</span>
              </p>
              <AreaSelect value={area} onChange={setArea} id="jobArea" />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-outline" onClick={() => setPickCategory(true)}>
              {t('changeService')}
            </button>
            <button type="button" className="btn-primary btn-lg" onClick={submit} disabled={saving || !area}>
              {saving ? <Spinner /> : null} {t('confirmFindWorkers')} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          </div>
        </section>
      </div>

      <Modal open={pickCategory} onClose={() => setPickCategory(false)} title={t('changeService')}>
        <CategoryGrid
          value={category}
          onChange={(c) => {
            setCategory(c);
            setPickCategory(false);
          }}
          compact
        />
      </Modal>
    </div>
  );
}
