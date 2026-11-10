// Conversation between a customer and a worker about one job. Real-time via
// Socket.IO; voice notes with optional transcript; structured price offers;
// the customer confirms the booking here once a price is agreed.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Square, Trash2, Image as ImageIcon, BadgeDollarSign, CheckCircle2, Languages, MapPin, Clock, X, Check } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useRealtime } from '../../context/RealtimeContext.jsx';
import { useRecorder } from '../../hooks/useRecorder.js';
import { chatApi, jobsApi, uploadFile } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import Avatar from '../../components/Avatar.jsx';
import { AudioPlayer, WaveBars } from '../../components/voice.jsx';
import { ErrorState, JobStatusBadge, Modal, PageLoader, ProposalStatusBadge, Spinner, CategoryIcon, RatingBadge } from '../../components/ui.jsx';
import { PortfolioImage } from '../../components/WorkIllustration.jsx';

const QUICK_WORKER = ['quickYes', 'quickNo', 'quickWhen', 'quickOnWay', 'quickPhoto', 'quickAddress'];
const QUICK_CUSTOMER = ['quickYes', 'quickNo', 'quickHowSoon', 'quickPhoto'];

// Page at /chat/:id (opened from notifications and the worker's chat list).
export default function ChatRoom() {
  const { id } = useParams();
  return <ChatPanel conversationId={id} />;
}

// The conversation itself. `embedded` renders it inside another page (the
// worker's profile) without the job side panel; `onClose` replaces "back".
export function ChatPanel({ conversationId: id, embedded = false, onClose, onBook }) {
  const { t, has, price, catName, areaName, when: fmtWhen, sysMessage, lang } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const { socket } = useRealtime();
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWorkOpen, setConfirmWorkOpen] = useState(false);
  const [respondOpen, setRespondOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [otherActivity, setOtherActivity] = useState(null);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const listRef = useRef(null);
  const imageRef = useRef(null);
  const rec = useRecorder({ transcribeLang: lang });

  const isCustomer = user.role === 'customer';

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await chatApi.get(id);
      setConv(res.conversation);
      setMessages(res.messages);
      chatApi.read(id).catch(() => {});
    } catch (err) {
      setError(errorText(err, t, has));
    }
  }, [id, t, has]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time updates for this conversation.
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('chat:join', id);
    const onMsg = (m) => {
      if (m.proposalId !== id) return;
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      if (m.type === 'system' || m.type === 'price_offer') load();
      else chatApi.read(id).catch(() => {});
    };
    const onUpdate = (m) => m.proposalId === id && setMessages((list) => list.map((x) => (x.id === m.id ? m : x)));
    const onTyping = (e) => {
      if (e.proposalId !== id) return;
      setOtherActivity(e.recording ? 'recording' : 'typing');
      clearTimeout(onTyping.timer);
      onTyping.timer = setTimeout(() => setOtherActivity(null), 2500);
    };
    socket.on('chat:message', onMsg);
    socket.on('chat:message:update', onUpdate);
    socket.on('chat:typing', onTyping);
    socket.on('connect', () => socket.emit('chat:join', id));
    return () => {
      socket.emit('chat:leave', id);
      socket.off('chat:message', onMsg);
      socket.off('chat:message:update', onUpdate);
      socket.off('chat:typing', onTyping);
    };
  }, [socket, id, load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, voiceDraft]);

  const sendMessage = async (body) => {
    setSending(true);
    try {
      const { message } = await chatApi.send(id, body);
      setMessages((list) => (list.some((x) => x.id === message.id) ? list : [...list, message]));
      return true;
    } catch (err) {
      toast.error(errorText(err, t, has));
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendText = async (value) => {
    const v = (value ?? text).trim();
    if (!v) return;
    if (await sendMessage({ type: 'text', text: v })) setText('');
  };

  const toggleRecord = async () => {
    if (rec.recording) {
      const r = await rec.stop();
      if (r) setVoiceDraft({ ...r, localUrl: URL.createObjectURL(r.blob) });
    } else {
      const ok = await rec.start();
      if (!ok) toast.error(t(rec.error === 'unsupported' ? 'voiceUnsupported' : 'micBlocked'));
      else socket?.emit('chat:typing', { proposalId: id, recording: true });
    }
  };

  const sendVoice = async () => {
    setSending(true);
    try {
      const url = await uploadFile(voiceDraft.blob);
      if (await sendMessage({ type: 'voice', audioUrl: url, durationSec: voiceDraft.durationSec, transcript: voiceDraft.transcript })) setVoiceDraft(null);
    } catch (err) {
      toast.error(err.code === 'too_large' ? t('fileTooLarge') : t('somethingWrong'));
    } finally {
      setSending(false);
    }
  };

  const sendImage = async (file) => {
    if (!file) return;
    setSending(true);
    try {
      const url = await uploadFile(file);
      await sendMessage({ type: 'image', imageUrl: url });
    } catch (err) {
      toast.error(err.code === 'too_large' ? t('fileTooLarge') : t('somethingWrong'));
    } finally {
      setSending(false);
    }
  };

  const doAction = async (fn, after) => {
    setBusyAction(true);
    try {
      await fn();
      after?.();
      await load();
    } catch (err) {
      toast.error(errorText(err, t, has));
      await load();
    } finally {
      setBusyAction(false);
    }
  };

  const job = conv?.job;
  const other = conv ? (isCustomer ? conv.worker : conv.customer) : null;
  const closed = conv && ['closed', 'declined', 'cancelled'].includes(conv.status);
  const jobOpen = job && ['pending', 'in_discussion'].includes(job.status);
  const latestOpenOffer = useMemo(() => [...messages].reverse().find((m) => m.type === 'price_offer' && m.offerStatus === 'open'), [messages]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!conv) return <PageLoader />;

  return (
    <div className={embedded ? 'h-full' : job ? 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]' : 'mx-auto max-w-3xl'}>
      <section
        className={`card flex flex-col overflow-hidden ${
          embedded ? 'h-full min-h-[460px]' : 'h-[calc(100vh-11rem)] min-h-[520px] lg:h-[calc(100vh-8.5rem)]'
        }`}
      >
        {/* Booking banner */}
        {conv.status === 'selected' && job && ['confirmed', 'in_progress', 'completed'].includes(job.status) && (
          <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <div className="flex-1">
              <p className="font-display font-bold">{t('bookingConfirmedBanner', { amount: Number(job.agreedPrice).toLocaleString('en-PK') })}</p>
              <p className="text-xs text-white/85">
                {job.title} · {job.location?.area}
              </p>
            </div>
            <Link to={`/jobs/${job.id}`} className="rounded-full border-2 border-white px-4 py-1.5 text-sm font-semibold">
              {t('jobDetails')}
            </Link>
          </div>
        )}


        {/* Header */}
        <header className="flex items-center gap-3 border-b border-ink-300/30 px-4 py-3">
          {embedded ? (
            onClose && (
              <button type="button" className="icon-btn h-9 w-9" onClick={onClose} aria-label={t('close')}>
                <X className="h-4 w-4" />
              </button>
            )
          ) : (
            <button type="button" className="icon-btn h-9 w-9 lg:hidden" onClick={() => navigate(isCustomer ? -1 : '/chat')} aria-label={t('back')}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
          )}
          <Link to={isCustomer ? `/workers/${other?.id}` : `/users/${other?.id}`} className="flex flex-1 items-center gap-3">
            <Avatar user={other} size={44} />
            <div className="min-w-0">
              <p className="truncate font-display font-bold text-brand-900">{other?.name}</p>
              <p className="flex items-center gap-2 text-xs text-ink-500">
                <RatingBadge value={other?.ratingAvg} />
                {otherActivity ? <span className="text-brand-600">{t(otherActivity === 'recording' ? 'someoneRecording' : 'someoneTyping')}</span> : t(isCustomer ? 'worker' : 'customer')}
              </p>
            </div>
          </Link>
          <ProposalStatusBadge status={conv.status} />
        </header>

        {/* Profile chat: customer confirms the booking here once work and price are agreed */}
        {isCustomer && onBook && conv.status === 'inquiry' && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500 bg-amber-100/50 px-4 py-3">
            <span className="flex-1 text-sm font-semibold text-brand-900">{t('agreedInChatQ')}</span>
            <button type="button" className="btn-amber" onClick={onBook}>
              <CheckCircle2 className="h-4 w-4" /> {t('confirmBookingBtn')}
            </button>
          </div>
        )}

        {/* Price strip */}
        {conv.price != null && !closed && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-cream-200 bg-cream-100 px-4 py-3">
            <BadgeDollarSign className="h-6 w-6 text-brand-600" />
            <div className="flex-1">
              <p className="text-xs text-ink-500">{conv.priceAgreed ? t('agreedPrice') : t('currentOffer')}</p>
              <p className="font-display text-xl font-bold text-brand-900">{price(conv.price)}</p>
              <p className="text-xs text-ink-500">{conv.priceAgreed ? t('agreedByBoth') : t('notAgreedYet')}</p>
            </div>
            {conv.priceAgreed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-sm font-semibold text-white">
                <Check className="h-4 w-4" /> {t('offerAccepted')}
              </span>
            )}
            {isCustomer && jobOpen && conv.status === 'accepted' && conv.priceAgreed && (
              <button type="button" className="btn-amber" onClick={() => setConfirmOpen(true)}>
                {t('confirmBookingFor', { amount: Number(conv.price).toLocaleString('en-PK') })}
              </button>
            )}
          </div>
        )}

        {/* Confirm work done banner — shown to customer when job is in progress */}
        {isCustomer && conv.status === 'selected' && job && job.status === 'in_progress' && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-600 bg-brand-50 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
            <span className="flex-1 text-sm font-semibold text-brand-900">{t('completeConfirmQ')}</span>
            <button type="button" className="btn-primary" onClick={() => setConfirmWorkOpen(true)}>
              <CheckCircle2 className="h-4 w-4" /> {t('markComplete')}
            </button>
          </div>
        )}

        {/* Worker: respond to a new request */}
        {!isCustomer && conv.status === 'requested' && jobOpen && (
          <div className="mx-4 mt-3 flex flex-wrap gap-2 rounded-2xl border-2 border-brand-600 bg-brand-50 p-3">
            <p className="w-full text-sm font-semibold text-brand-900">{t('newJobRequest')}: {job.title}</p>
            <button type="button" className="btn-danger flex-1" disabled={busyAction} onClick={() => doAction(() => chatApi.respond(id, 'decline'))}>
              <X className="h-4 w-4" /> {t('declineJob')}
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={busyAction}
              onClick={() => {
                setOfferAmount(String(conv.price || user.rate || ''));
                setRespondOpen(true);
              }}
            >
              <Check className="h-4 w-4" /> {t('acceptJob')}
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              mine={m.senderId === user.id}
              otherName={other?.name}
              canAccept={m.id === latestOpenOffer?.id && m.senderId !== user.id && jobOpen && !closed}
              onAccept={() => doAction(() => chatApi.acceptOffer(m.id))}
              onCounter={() => {
                setOfferAmount(String(m.amount));
                setOfferOpen(true);
              }}
              sysMessage={sysMessage}
            />
          ))}
          {voiceDraft && (
            <div className="ms-auto max-w-sm space-y-2 rounded-2xl border border-brand-200 bg-brand-50 p-3">
              <AudioPlayer src={voiceDraft.localUrl} durationSec={voiceDraft.durationSec} />
              {voiceDraft.transcript && <p className="text-sm text-ink-700">“{voiceDraft.transcript}”</p>}
              <div className="flex gap-2">
                <button type="button" className="btn-ghost text-red-700" onClick={() => setVoiceDraft(null)}>
                  <Trash2 className="h-4 w-4" /> {t('discard')}
                </button>
                <button type="button" className="btn-primary ms-auto" onClick={sendVoice} disabled={sending}>
                  {sending ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />} {t('sendVoice')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        {closed ? (
          <p className="border-t border-ink-300/30 px-4 py-4 text-center text-sm text-ink-500">{t('conversationClosed')}</p>
        ) : (
          <div className="space-y-3 border-t border-ink-300/30 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(isCustomer ? QUICK_CUSTOMER : QUICK_WORKER).map((k) => (
                <button key={k} type="button" className="chip shrink-0 py-1.5 text-sm" onClick={() => sendText(t(k))} disabled={sending}>
                  {t(k)}
                </button>
              ))}
              {jobOpen && conv.status !== 'requested' && (
                <button type="button" className="chip shrink-0 border-amber-500 bg-amber-100 py-1.5 text-sm" onClick={() => setOfferOpen(true)}>
                  <BadgeDollarSign className="h-4 w-4" /> {t('offerPrice')}
                </button>
              )}
            </div>
            {rec.recording ? (
              <div className="flex items-center gap-3 rounded-full bg-red-50 px-3 py-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
                <span className="font-semibold text-red-700">
                  {t('recording')} {rec.seconds}s
                </span>
                <WaveBars count={14} />
                <span className="hidden flex-1 truncate text-sm text-ink-500 sm:block">{rec.liveText}</span>
                <button type="button" className="icon-btn ms-auto h-9 w-9" onClick={rec.cancel} aria-label={t('discard')}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={toggleRecord} className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white" aria-label={t('tapToStop')}>
                  <Square className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText();
                }}
              >
                <button
                  type="button"
                  onClick={toggleRecord}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white ring-4 ring-brand-100"
                  aria-label={t('holdToTalk')}
                  title={t('holdToTalk')}
                >
                  <Mic className="h-6 w-6" />
                </button>
                <input
                  className="input rounded-full"
                  value={text}
                  dir="auto"
                  onChange={(e) => {
                    setText(e.target.value);
                    socket?.emit('chat:typing', { proposalId: id, recording: false });
                  }}
                  placeholder={t('typeMessage')}
                  aria-label={t('typeMessage')}
                />
                <button type="button" className="icon-btn h-12 w-12" onClick={() => imageRef.current?.click()} aria-label={t('sendPhoto')}>
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => sendImage(e.target.files?.[0])} />
                <button type="submit" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40" disabled={!text.trim() || sending} aria-label={t('send')}>
                  <Send className="h-5 w-5 rtl:-scale-x-100" />
                </button>
              </form>
            )}
            {!rec.recording && (
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                {rec.transcribing ? (
                  <>
                    <Spinner className="h-3 w-3" /> {t('understanding')}
                  </>
                ) : (
                  t('holdToTalkHint')
                )}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Job side panel (only for chats about a job, on the full page) */}
      <aside className={embedded || !job ? 'hidden' : 'hidden space-y-3 lg:block'}>
        <div className="card overflow-hidden">
          {job?.images?.[0] ? (
            <div className="h-40">
              <PortfolioImage src={job.images[0]} />
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center bg-cream-100">
              <CategoryIcon category={job?.category} className="h-12 w-12" />
            </div>
          )}
          <div className="space-y-2 p-4">
            <h2 className="font-display text-lg font-bold">{job?.title}</h2>
            <p className="text-sm text-ink-700" dir="auto">
              {job?.description}
            </p>
            {job?.voiceUrl && <AudioPlayer src={job.voiceUrl} durationSec={job.voiceDurationSec} />}
            <p className="flex items-center gap-2 text-sm text-ink-700">
              <MapPin className="h-4 w-4 text-brand-600" /> {areaName(job?.location?.area)}
            </p>
            <p className="flex items-center gap-2 text-sm text-ink-700">
              <Clock className="h-4 w-4 text-brand-600" /> {job?.when === 'now' && jobOpen ? t('neededNow') : fmtWhen(job?.scheduledAt)}
            </p>
            <div className="flex items-center justify-between border-t border-ink-300/30 pt-2 text-sm">
              <span>{t('bookingStatus')}</span>
              <JobStatusBadge status={job?.status} />
            </div>
            {job?.budget && (
              <div className="flex items-center justify-between text-sm">
                <span>{t('customerBudget')}</span>
                <span className="font-semibold">{price(job.budget)}</span>
              </div>
            )}
            <p className="text-xs text-ink-500">{catName(job?.category)}</p>
            <Link to={`/jobs/${job?.id}`} className="btn-outline w-full">
              {t('jobDetails')}
            </Link>
          </div>
        </div>
        <p className="px-1 text-xs text-ink-500">{t('phoneHidden')}</p>
      </aside>

      {/* Offer modal */}
      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title={t('offerPrice')}
        footer={
          <button
            type="button"
            className="btn-primary"
            disabled={busyAction || !Number(offerAmount)}
            onClick={() => doAction(() => chatApi.offer(id, Number(offerAmount)), () => setOfferOpen(false))}
          >
            {busyAction && <Spinner className="h-4 w-4" />} {t('send')}
          </button>
        }
      >
        <PriceInput value={offerAmount} onChange={setOfferAmount} />
      </Modal>

      {/* Worker accepts with price */}
      <Modal
        open={respondOpen}
        onClose={() => setRespondOpen(false)}
        title={t('acceptJob')}
        footer={
          <button
            type="button"
            className="btn-primary"
            disabled={busyAction}
            onClick={() => doAction(() => chatApi.respond(id, 'accept', Number(offerAmount) || undefined), () => setRespondOpen(false))}
          >
            {busyAction && <Spinner className="h-4 w-4" />} {t('acceptJob')}
          </button>
        }
      >
        <p className="mb-2 text-sm text-ink-700">{t('yourPriceForJob')}</p>
        <PriceInput value={offerAmount} onChange={setOfferAmount} />
      </Modal>

      {/* Customer confirms booking */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('confirm')}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirmOpen(false)}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busyAction}
              onClick={() =>
                doAction(
                  () => chatApi.confirm(id),
                  () => {
                    setConfirmOpen(false);
                    toast.success(t('bookingConfirmedBanner', { amount: Number(conv.price).toLocaleString('en-PK') }));
                  },
                )
              }
            >
              {busyAction && <Spinner className="h-4 w-4" />} {t('confirm')}
            </button>
          </>
        }
      >
        <p className="text-ink-700">{t('confirmBookingQ', { name: other?.name, amount: Number(conv.price).toLocaleString('en-PK') })}</p>
      </Modal>

      {/* Customer confirms work is done */}
      <Modal
        open={confirmWorkOpen}
        onClose={() => setConfirmWorkOpen(false)}
        title={t('completeConfirmQ')}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setConfirmWorkOpen(false)}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busyAction}
              onClick={() =>
                doAction(
                  () => jobsApi.complete(job.id),
                  () => setConfirmWorkOpen(false),
                )
              }
            >
              {busyAction && <Spinner className="h-4 w-4" />} {t('markComplete')}
            </button>
          </>
        }
      >
        <p className="text-ink-700">{job?.title}</p>
        {job?.agreedPrice && <p className="mt-1 font-display text-2xl font-bold text-brand-900">{conv.price ? `Rs ${Number(job.agreedPrice).toLocaleString('en-PK')}` : ''}</p>}
      </Modal>
    </div>
  );
}

function PriceInput({ value, onChange }) {
  const presets = [500, 800, 1000, 1500, 2000, 3000];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-ink-300/60 px-4">
        <span className="font-semibold text-ink-500">Rs</span>
        <input
          type="number"
          inputMode="numeric"
          step="50"
          min="100"
          autoFocus
          className="w-full bg-transparent py-3 font-display text-2xl font-bold text-brand-900 focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Rs"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p} type="button" className="chip py-1.5 text-sm" onClick={() => onChange(String(p))}>
            {p.toLocaleString('en-PK')}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m, mine, otherName, canAccept, onAccept, onCounter, sysMessage }) {
  const { t, price, lang } = useI18n();
  const [translation, setTranslation] = useState(m.translation?.[lang] || null);
  const [translating, setTranslating] = useState(false);
  const [translateNote, setTranslateNote] = useState(null);
  const time = new Date(m.createdAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });

  useEffect(() => {
    if (m.translation?.[lang]) setTranslation(m.translation[lang]);
  }, [m.translation, lang]);

  if (m.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="rounded-full border border-ink-300/40 bg-white px-3 py-1 text-xs font-medium text-ink-700">{sysMessage(m.systemKey, m.systemParams)}</span>
      </div>
    );
  }

  if (m.type === 'price_offer') {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className="w-64 rounded-2xl border-2 border-amber-500 bg-amber-100/50 p-4">
          <p className="text-xs font-semibold text-ink-700">{mine ? t('youOffered') : t('theyOffered', { name: otherName?.split(' ')[0] })}</p>
          <p className="font-display text-2xl font-bold text-brand-900">{price(m.amount)}</p>
          {m.offerStatus === 'accepted' && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
              <CheckCircle2 className="h-4 w-4" /> {t('offerAccepted')}
            </p>
          )}
          {m.offerStatus === 'superseded' && <p className="mt-1 text-xs text-ink-500 line-through">{t('offerSuperseded')}</p>}
          {m.offerStatus === 'open' && mine && <p className="mt-1 text-xs text-ink-500">{t('waitingForOther')}</p>}
          {canAccept && (
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-primary flex-1 px-3" onClick={onAccept}>
                <Check className="h-4 w-4" /> {t('acceptPrice')}
              </button>
              <button type="button" className="btn-outline px-3" onClick={onCounter}>
                {t('counterOffer')}
              </button>
            </div>
          )}
          <p className="mt-1 text-end text-[10px] text-ink-500">{time}</p>
        </div>
      </div>
    );
  }

  const translatable = !mine && (m.text || m.transcript);
  const doTranslate = async () => {
    setTranslating(true);
    setTranslateNote(null);
    try {
      const res = await chatApi.translate(m.id, lang);
      if (res.translation && !res.same) setTranslation(res.translation);
      else if (res.same) setTranslateNote(null);
      else setTranslateNote(t('translationUnavailable'));
    } catch {
      setTranslateNote(t('translationUnavailable'));
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-md ${mine ? 'bg-brand-900 text-white' : 'border border-ink-300/30 bg-white text-ink-900'}`}>
        {m.type === 'voice' && (
          <>
            <AudioPlayer src={m.audioUrl} durationSec={m.durationSec} dark={mine} />
            {m.transcript && (
              <p className={`mt-2 text-sm ${mine ? 'text-white/90' : 'text-ink-700'}`} dir="auto">
                “{m.transcript}”
              </p>
            )}
          </>
        )}
        {m.type === 'image' && (
          <a href={m.imageUrl} target="_blank" rel="noreferrer">
            <img src={m.imageUrl} alt="" className="max-h-64 rounded-xl object-cover" loading="lazy" />
          </a>
        )}
        {m.type === 'text' && (
          <p className="whitespace-pre-wrap" dir="auto">
            {m.text}
          </p>
        )}
        {translation && (
          <p className={`mt-2 border-t pt-2 text-sm italic ${mine ? 'border-white/20 text-white/80' : 'border-ink-300/30 text-ink-700'}`} dir="auto">
            <span className="block text-[10px] font-semibold uppercase not-italic tracking-wide opacity-70">{t('aiTranslation')}</span>
            {translation}
          </p>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-500">
        <span>{time}</span>
        {translatable && !translation && (
          <button type="button" onClick={doTranslate} className="inline-flex items-center gap-1 font-semibold text-brand-600" disabled={translating}>
            {translating ? <Spinner className="h-3 w-3" /> : <Languages className="h-3 w-3" />} {translating ? t('translating') : t('translate')}
          </button>
        )}
        {translateNote && <span className="text-amber-600">{translateNote}</span>}
      </div>
    </div>
  );
}
