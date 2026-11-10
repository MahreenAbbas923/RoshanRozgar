import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Banknote, Sparkles, ShieldCheck, ArrowRight, MessageCircle, CalendarDays, BarChart3 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { jobsApi, workersApi } from '../services/index.js';
import { errorText } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';
import { AvailabilityBadge, DemoBadge, ErrorState, PageLoader, Stars, VerifiedChip, Spinner, CategoryIcon } from '../components/ui.jsx';
import { SpeakButton, AudioPlayer } from '../components/voice.jsx';
import { PortfolioImage } from '../components/WorkIllustration.jsx';
import { ChatPanel } from './chat/ChatRoom.jsx';

export function ReviewItem({ review }) {
  const { t, tagLabel, timeAgo } = useI18n();
  const r = review.reviewer;
  const initials = (r?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);
  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-800">{initials}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-brand-900">{r?.name || '—'}</p>
            <span className="text-xs text-ink-500">{timeAgo(review.createdAt)}</span>
          </div>
          <Stars value={review.rating} />
        </div>
      </div>
      {review.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span key={tag} className="chip">
              {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}
      {review.criteria && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-700">
          {['behavior', 'communication', 'professionalism'].map((k) => (
            <div key={k} className="flex justify-between">
              <dt>{t(`c${k[0].toUpperCase()}${k.slice(1)}`)}</dt>
              <dd className="font-semibold">{review.criteria[k]}/5</dd>
            </div>
          ))}
        </dl>
      )}
      {review.audioUrl && (
        <div className="mt-3">
          <AudioPlayer src={review.audioUrl} />
        </div>
      )}
      {(review.text || review.transcript) && (
        <p className="mt-3 text-sm text-ink-700" dir="auto">
          {review.audioUrl && review.transcript && !review.text ? `${t('voiceReview')}: ` : ''}
          {review.text || `“${review.transcript}”`}
        </p>
      )}
    </article>
  );
}

export default function WorkerProfile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const jobId = params.get('job');
  const { t, has, catName, price, areaName, areaShort } = useI18n();
  const { user: me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [openingChat, setOpeningChat] = useState(false);
  const wantsChat = params.get('chat') === '1';

  // Chat with this worker right here on the profile (no job needed).
  const openChat = useCallback(async () => {
    setOpeningChat(true);
    try {
      const { conversationId } = await workersApi.startChat(id);
      setChatId(conversationId);
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setOpeningChat(false);
    }
  }, [id, toast, t, has]);

  // Open automatically when arriving from a worker card's "Chat" button (once).
  const autoOpened = useRef(false);
  useEffect(() => {
    if (wantsChat && me.role === 'customer' && !autoOpened.current) {
      autoOpened.current = true;
      openChat();
    }
  }, [wantsChat, me.role, openChat]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await workersApi.profile(id);
      setData(res);
      if (jobId) setJob((await jobsApi.get(jobId)).job);
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [id, jobId, t, has]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader />;
  const w = data.user;
  const summary = w.reviewSummary;
  const hours = w.workingHours;
  const canRequest = me.role === 'customer' && job && ['pending', 'in_discussion'].includes(job.status);

  const sendRequest = async () => {
    setSending(true);
    try {
      const { proposal } = await jobsApi.requestWorker(job.id, w.id);
      navigate(`/chat/${proposal.id}`);
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pb-24">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ms-3 mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t('backToResults')}
      </button>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="card h-fit space-y-4 p-6">
          <div className="flex justify-center">
            <Avatar user={w} size={180} className="ring-8 ring-cream-100" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{w.name}</h1>
              <AvailabilityBadge status={w.status} />
              {w.isDemo && <DemoBadge />}
            </div>
            <p className="mt-1 font-semibold text-brand-600">{w.skills.map(catName).join(' · ')}</p>
          </div>
          <ul className="space-y-2 text-sm text-ink-700">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600" /> {areaName(w.location?.area)}
              {w.distanceKm != null && ` · ${t('kmAway', { n: w.distanceKm })}`}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-600" /> {t('yearsExp', { n: w.experienceYears })}
            </li>
            {w.rate > 0 && (
              <li className="flex items-center gap-2 font-semibold text-brand-900">
                <Banknote className="h-4 w-4 text-brand-600" /> {price(w.rate)} {t('perVisit')}
              </li>
            )}
            {hours && (
              <li className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 text-brand-600" />
                <span>
                  {hours.days.map((d) => t(`day${d}`)).join(', ')}
                  <br />
                  <span dir="ltr">
                    {hours.start} – {hours.end}
                  </span>
                </span>
              </li>
            )}
          </ul>
          {w.subSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {w.subSkills.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          )}
          {w.serviceAreas?.length > 0 && (
            <p className="text-xs text-ink-500">
              {t('fServiceAreas')}: {w.serviceAreas.map(areaShort).join(', ')}
            </p>
          )}
          {w.voiceIntro && <AudioPlayer src={w.voiceIntro} />}
        </aside>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-bold">{t('whyTrust', { name: w.name.split(' ')[0] })}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat value={w.ratingAvg ? w.ratingAvg.toFixed(1) : '–'} label={t('reviewsN', { n: w.ratingCount })} stars={w.ratingAvg} />
              <Stat value={w.completedJobs} label={t('jobsCompleted')} />
              <Stat value={w.repeatCustomers} label={t('repeatCustomers')} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {w.phoneVerified && <VerifiedChip label={t('phoneVerifiedDemo')} />}
            </div>
          </section>

          {summary && summary.source !== 'stats' ? (
            <section className="flex items-start gap-4 rounded-2xl bg-brand-900 p-5 text-white">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-amber-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-400">{t('aiReviewSummary')}</p>
                <p className="mt-1 font-display text-xl font-bold">“{summary.summary}”</p>
                {summary.concerns?.length > 0 && <p className="mt-1 text-sm text-white/80">⚠ {summary.concerns.join(' · ')}</p>}
                <p className="mt-1 text-xs text-white/70">{t('summarisedFrom', { n: summary.count, provider: summary.source === 'groq' ? 'Groq' : 'Claude' })}</p>
              </div>
              <SpeakButton text={summary.summary} size="sm" className="border-white/20 bg-white text-brand-900" />
            </section>
          ) : (
            summary?.topTags?.length > 0 && (
              <section className="flex items-start gap-4 rounded-2xl bg-brand-900 p-5 text-white">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-amber-400">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-400">{t('mostMentioned')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.topTags.map((tg) => (
                      <TagCount key={tg.tag} tag={tg.tag} count={tg.count} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-white/70">{t('countedFrom', { n: summary.count })}</p>
                </div>
              </section>
            )
          )}

          {w.bio && (
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('aboutWorker')}</h2>
                <SpeakButton text={w.bio} size="sm" />
              </div>
              <p className="mt-2 text-ink-700" dir="auto">
                {w.bio}
              </p>
            </section>
          )}

          {w.portfolio?.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg font-bold">{t('workPhotos')}</h2>
              {w.portfolio.some((p) => p.startsWith('illustration:')) && <p className="text-xs text-ink-500">{t('sampleIllustration')}</p>}
              <div className="mt-3 grid grid-cols-3 gap-3">
                {w.portfolio.map((src) => (
                  <div key={src} className="aspect-square overflow-hidden rounded-xl">
                    <PortfolioImage src={src} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-bold">
              {t('reviews')} <span className="text-base font-normal text-ink-500">{data.reviews.length}</span>
            </h2>
            {data.reviews.length === 0 ? (
              <p className="text-ink-500">{t('noReviews')}</p>
            ) : (
              <div className="space-y-3">
                {data.reviews.map((r) => (
                  <ReviewItem key={r.id} review={r} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {me.role === 'customer' && (
        <div className="fixed inset-x-0 bottom-20 z-20 px-4 lg:bottom-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-full border border-ink-300/30 bg-white p-2 ps-3 shadow-lift">
            <Avatar user={w} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-brand-900">
                {w.name} {w.rate > 0 && `· ${price(w.rate)} ${t('perVisit')}`}
              </p>
              <p className="truncate text-xs text-ink-500">
                <CategoryIcon category={w.skills[0]} className="inline h-3 w-3" /> {catName(w.skills[0])} · {t(`st_${w.status}`)}
              </p>
            </div>
            {canRequest && (
              <button type="button" className="btn-outline hidden sm:inline-flex" onClick={sendRequest} disabled={sending}>
                {sending ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4 rtl:rotate-180" />} {t('sendRequest')}
              </button>
            )}
            <button type="button" className="btn-primary btn-lg" onClick={openChat} disabled={openingChat}>
              {openingChat ? <Spinner /> : <MessageCircle className="h-5 w-5" />} {t('chatWithWorker')}
            </button>
          </div>
        </div>
      )}

      {chatId && (
        <div className="fixed inset-0 z-40 bg-brand-950/30 lg:bg-transparent" onClick={() => setChatId(null)}>
          <div
            className="absolute inset-0 bg-white p-2 lg:inset-auto lg:bottom-4 lg:end-4 lg:top-20 lg:w-[27rem] lg:rounded-3xl lg:p-0 lg:shadow-lift"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={t('chatWithName', { name: w.name })}
          >
            <ChatPanel conversationId={chatId} embedded onClose={() => setChatId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, stars }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-100 p-4">
      {stars != null && <Stars value={stars} size="h-3.5 w-3.5" />}
      <p className="font-display text-2xl font-bold text-brand-900">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function TagCount({ tag, count }) {
  const { tagLabel } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
      <ShieldCheck className="h-4 w-4 text-amber-400" /> {tagLabel(tag)} ×{count}
    </span>
  );
}
