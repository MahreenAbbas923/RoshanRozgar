// One-step sign-up. The person either types into the form, or chooses
// "Answer by voice": the helper asks each question aloud, listens, and fills
// the same form from the answer. No phone number or PIN.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Keyboard, Mic, Square, RotateCcw, SkipForward, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCategory } from '@shared/constants.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useSpeak } from '../../hooks/useSpeak.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { aiApi } from '../../services/index.js';
import { errorText } from '../../services/api.js';
import OnboardingHeader from '../../components/layout/OnboardingHeader.jsx';
import { CategoryGrid, AreaSelect } from '../../components/pickers.jsx';
import { SpeakButton, WaveBars, SpeechLangPicker } from '../../components/voice.jsx';
import { Spinner } from '../../components/ui.jsx';

const QUESTIONS = {
  worker: [
    { id: 'name', key: 'qName', hint: 'qNameHint', fields: ['name'] },
    { id: 'trade', key: 'qTrade', hint: 'qTradeHint', fields: ['trade'] },
    { id: 'area', key: 'qArea', hint: 'qAreaHint', fields: ['area'] },
    { id: 'exp', key: 'qExpRate', hint: 'qExpRateHint', fields: ['experience', 'rate'] },
  ],
  customer: [
    { id: 'name', key: 'qName', hint: 'qNameHint', fields: ['name'] },
    { id: 'area', key: 'qAreaCustomer', hint: 'qAreaCustomerHint', fields: ['area'] },
    { id: 'address', key: 'qAddress', hint: 'qAddressHint', fields: ['address'], optional: true },
  ],
};
const MAX_RETRIES = 2;

// Runs `then` once: when speech ends, or after a fallback delay because some
// browsers never fire the end event.
function speakThen(speakFn, key, text, then) {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    then();
  };
  const spoke = speakFn(key, {}, { onEnd: () => setTimeout(once, 250) });
  setTimeout(once, spoke ? 1500 + String(text).length * 90 : 300);
}

export default function Signup() {
  const [params] = useSearchParams();
  const role = params.get('role');
  const { t, lang, has } = useI18n();
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { speakKey, supported: ttsSupported, stop: stopSpeaking } = useSpeak();

  const [mode, setMode] = useState(null); // 'type' | 'voice'
  const [form, setForm] = useState({ name: '', area: '', address: '', skills: [], subSkills: [], experienceYears: '', rate: '' });
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);
  const [speechLang, setSpeechLang] = useState(lang);

  // Voice helper state
  const [qIndex, setQIndex] = useState(-1);
  const [phase, setPhase] = useState('idle'); // idle | asking | listening | processing | retry | done
  const [heard, setHeard] = useState('');
  const sessionRef = useRef(0);
  const retriesRef = useRef(0);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const questions = QUESTIONS[role] || [];

  const handleAnswer = useRef(null);
  const sr = useSpeechRecognition({ lang: speechLang, onFinal: (text) => handleAnswer.current?.(text) });

  // Ask question i aloud, then start listening when the voice finishes.
  const ask = useCallback(
    (i) => {
      const session = sessionRef.current;
      if (i >= questions.length) {
        setPhase('done');
        setQIndex(questions.length);
        speakKey('voiceDone');
        return;
      }
      setQIndex(i);
      setHeard('');
      setPhase('asking');
      const listen = () => {
        if (sessionRef.current !== session) return;
        setPhase('listening');
        sr.start();
      };
      speakThen(ttsSupported ? speakKey : () => false, questions[i].key, t(questions[i].key), listen);
    },
    [questions, speakKey, ttsSupported, sr, t],
  );

  const next = useCallback(
    (i) => {
      retriesRef.current = 0;
      ask(i + 1);
    },
    [ask],
  );

  const retry = useCallback(
    (i) => {
      const session = sessionRef.current;
      retriesRef.current += 1;
      if (retriesRef.current > MAX_RETRIES) {
        next(i); // move on; the person can fill this field by hand
        return;
      }
      setPhase('retry');
      const again = () => {
        if (sessionRef.current !== session) return;
        setPhase('listening');
        sr.start();
      };
      speakThen(ttsSupported ? speakKey : () => false, 'didntCatch', t('didntCatch'), again);
    },
    [next, speakKey, ttsSupported, sr, t],
  );

  handleAnswer.current = async (text) => {
    const i = qIndex;
    const q = questions[i];
    if (!q || phase === 'idle' || phase === 'done') return;
    const session = sessionRef.current;
    setHeard(text);
    setPhase('processing');
    try {
      const results = {};
      for (const f of q.fields) results[f] = (await aiApi.extract(f, text)).value;
      if (sessionRef.current !== session) return;
      const patch = {};
      if (results.name) patch.name = results.name;
      if (results.trade) {
        const s = text.toLowerCase();
        patch.skills = [...new Set([...form.skills, results.trade])];
        patch.subSkills = getCategory(results.trade).subSkills.filter((sub) => sub.toLowerCase().split(/[ /&]+/).some((w) => w.length > 3 && s.includes(w)));
      }
      if (results.area) patch.area = results.area;
      if (results.address) patch.address = results.address;
      if (results.experience != null) patch.experienceYears = String(results.experience);
      if (results.rate != null) patch.rate = String(results.rate);
      if (!Object.keys(patch).length) {
        retry(i);
        return;
      }
      set(patch);
      setFlash(q.id);
      setTimeout(() => setFlash(null), 1500);
      setTimeout(() => sessionRef.current === session && next(i), 1200);
    } catch {
      retry(i);
    }
  };

  // Nothing heard / mic problem while the helper is running.
  useEffect(() => {
    if (!sr.error || phase !== 'listening') return;
    if (sr.error === 'not-allowed' || sr.error === 'unsupported') {
      toast.error(t(sr.error === 'not-allowed' ? 'micBlocked' : 'voiceUnsupported'));
      stopVoice();
      return;
    }
    retry(qIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr.error]);

  const startVoice = () => {
    sessionRef.current += 1;
    retriesRef.current = 0;
    setMode('voice');
    ask(0);
  };

  function stopVoice() {
    sessionRef.current += 1;
    stopSpeaking();
    sr.cancel();
    setPhase('idle');
  }

  useEffect(() => () => {
    sessionRef.current += 1;
    stopSpeaking();
  }, [stopSpeaking]);

  if (!['customer', 'worker'].includes(role)) return <Navigate to="/welcome" replace />;

  const missing = [];
  if (!form.name.trim()) missing.push(t('fName'));
  if (role === 'worker' && !form.skills.length) missing.push(t('fTrade'));
  if (!form.area) missing.push(t(role === 'worker' ? 'fWorkArea' : 'fArea'));

  const submit = async (e) => {
    e?.preventDefault();
    if (missing.length) {
      toast.error(t('missingFields', { fields: missing.join(', ') }));
      return;
    }
    stopVoice();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: { area: form.area, address: form.address },
        profileMethod: mode === 'voice' ? 'voice' : 'manual',
      };
      if (role === 'worker') {
        Object.assign(payload, {
          skills: form.skills,
          subSkills: form.subSkills,
          experienceYears: Number(form.experienceYears) || 0,
          rate: Number(form.rate) || 0,
          serviceAreas: [form.area],
        });
      }
      const u = await signup(role, payload);
      navigate(homePathFor(u), { replace: true });
    } catch (err) {
      toast.error(errorText(err, t, has));
    } finally {
      setSaving(false);
    }
  };

  const current = questions[qIndex];
  const fieldBox = (id) => `rounded-2xl p-3 transition ${flash === id ? 'bg-brand-50 ring-2 ring-brand-600' : current?.id === id && phase !== 'idle' && phase !== 'done' ? 'bg-amber-100/40 ring-2 ring-amber-500' : ''}`;
  const suggestions = [...new Set(form.skills.flatMap((s) => getCategory(s).subSkills))];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OnboardingHeader onBack={() => navigate('/welcome')} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">{t(role === 'worker' ? 'signupWorker' : 'signupCustomer')}</h1>
          <SpeakButton textKey="howToFill" size="sm" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
          <ShieldCheck className="h-4 w-4 text-brand-600" /> {t('noPhoneNote')}
        </p>

        {/* Choose how to fill */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              stopVoice();
              setMode('type');
            }}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition sm:p-4 ${mode === 'type' ? 'border-brand-600 bg-brand-50' : 'border-cream-200 bg-cream-100 hover:border-brand-200'}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-900">
              <Keyboard className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-brand-900">{t('fillByTyping')}</span>
              <span className="hidden text-xs text-ink-500 sm:block">{t('fillByTypingDesc')}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={startVoice}
            className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-start transition sm:p-4 ${mode === 'voice' ? 'border-brand-600 bg-brand-50' : 'border-cream-200 bg-cream-100 hover:border-brand-200'}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white">
              <Mic className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-brand-900">{t('fillByVoice')}</span>
              <span className="hidden text-xs text-ink-500 sm:block">{t('fillByVoiceDesc')}</span>
            </span>
          </button>
        </div>

        <div className={`mt-5 grid grid-cols-1 gap-5 ${mode === 'voice' ? 'lg:grid-cols-[1fr_20rem]' : ''}`}>
          {/* The form (always visible, filled by typing or by voice) */}
          <form onSubmit={submit} className="card order-2 space-y-2 p-4 sm:p-5 lg:order-1" noValidate>
            <div className={fieldBox('name')}>
              <label htmlFor="su-name" className="label">
                {t('fName')} <span className="text-red-700">*</span>
              </label>
              <input id="su-name" className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} autoComplete="name" />
            </div>

            {role === 'worker' && (
              <div className={fieldBox('trade')}>
                <span className="label">
                  {t('fTrade')} <span className="text-red-700">*</span>
                </span>
                <CategoryGrid value={form.skills} onChange={(skills) => set({ skills })} multi compact />
                {suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="checkbox"
                        aria-checked={form.subSkills.includes(s)}
                        onClick={() => set({ subSkills: form.subSkills.includes(s) ? form.subSkills.filter((x) => x !== s) : [...form.subSkills, s] })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${form.subSkills.includes(s) ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={fieldBox('area')}>
              <AreaSelect label={`${t(role === 'worker' ? 'fWorkArea' : 'fArea')} *`} value={form.area} onChange={(area) => set({ area })} id="su-area" />
            </div>

            {role === 'worker' ? (
              <div className={`grid grid-cols-2 gap-3 ${fieldBox('exp')}`}>
                <div>
                  <label htmlFor="su-years" className="label">
                    {t('fYears')}
                  </label>
                  <input id="su-years" type="number" inputMode="numeric" min="0" max="60" className="input" value={form.experienceYears} onChange={(e) => set({ experienceYears: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="su-rate" className="label">
                    {t('fRatePerVisit')}
                  </label>
                  <input id="su-rate" type="number" inputMode="numeric" min="0" step="50" className="input" value={form.rate} onChange={(e) => set({ rate: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className={fieldBox('address')}>
                <label htmlFor="su-address" className="label">
                  {t('fAddress')} <span className="font-normal text-ink-500">({t('optional')})</span>
                </label>
                <input id="su-address" className="input" value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={200} />
              </div>
            )}

            <div className="px-3 pt-2">
              <button type="submit" className="btn-primary btn-lg w-full" disabled={saving}>
                {saving ? <Spinner /> : <Check className="h-5 w-5" />} {t('createAccountBtn')}
              </button>
            </div>
          </form>

          {/* Voice helper */}
          {mode === 'voice' && (
            <aside className="order-1 lg:order-2">
              <div className="card sticky top-4 space-y-4 bg-brand-900 p-5 text-white">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display font-semibold">{t('voiceHelper')}</p>
                  {current && phase !== 'done' && <span className="text-xs text-white/70">{t('questionN', { n: qIndex + 1, total: questions.length })}</span>}
                </div>

                {phase === 'done' ? (
                  <p className="text-lg font-semibold">{t('voiceDone')}</p>
                ) : current ? (
                  <>
                    <div>
                      <p className="text-lg font-semibold leading-snug">{t(current.key)}</p>
                      <p className="mt-1 text-xs text-white/70">{t(current.hint)}</p>
                    </div>
                    <div className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                      {phase === 'asking' && <span className="text-sm">{t('askingQuestion')}</span>}
                      {(phase === 'listening' || phase === 'retry') && (
                        <>
                          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-500">
                            {sr.listening && <span className="absolute inset-0 animate-pulseRing rounded-full bg-red-400" />}
                            <Mic className="relative h-4 w-4" />
                          </span>
                          <span className="text-sm font-semibold">{phase === 'retry' ? t('didntCatch') : t('speakNow')}</span>
                          {sr.listening && <WaveBars light count={10} active={sr.level > 0.15} />}
                          {sr.listening && (
                            <button type="button" onClick={sr.stop} className="ms-auto rounded-full bg-white/15 p-2" aria-label={t('tapToStop')}>
                              <Square className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      {(phase === 'processing' || sr.processing) && (
                        <span className="flex items-center gap-2 text-sm">
                          <Spinner className="h-4 w-4" /> {t('understanding')}
                        </span>
                      )}
                    </div>
                    {heard && (
                      <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm">
                        <p className="text-xs uppercase tracking-wide text-amber-400">{t('youSaid')}</p>
                        <p dir="auto">“{heard}”</p>
                      </div>
                    )}
                  </>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {phase === 'idle' ? (
                    <button type="button" className="btn-amber w-full" onClick={startVoice}>
                      <Mic className="h-4 w-4" /> {t('startVoice')}
                    </button>
                  ) : phase === 'done' ? (
                    <button type="button" className="btn-amber w-full" onClick={submit} disabled={saving}>
                      {t('createAccountBtn')} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn flex-1 border border-white/30 px-3 text-white hover:bg-white/10"
                        onClick={() => {
                          sr.cancel();
                          retriesRef.current = 0;
                          sessionRef.current += 1;
                          ask(qIndex);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> {t('repeatQuestion')}
                      </button>
                      <button
                        type="button"
                        className="btn flex-1 border border-white/30 px-3 text-white hover:bg-white/10"
                        onClick={() => {
                          sr.cancel();
                          sessionRef.current += 1;
                          next(qIndex);
                        }}
                      >
                        <SkipForward className="h-4 w-4 rtl:-scale-x-100" /> {t('skipQuestion')}
                      </button>
                      <button type="button" className="btn flex-1 border border-white/30 px-3 text-white hover:bg-white/10" onClick={stopVoice}>
                        <Square className="h-4 w-4" /> {t('stopVoice')}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <span className="text-xs text-white/70">{t('fLanguage')}</span>
                  <SpeechLangPicker value={speechLang} onChange={setSpeechLang} />
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
