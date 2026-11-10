// One voice-first question: big mic, live transcript, "We heard" card with
// read-back, and a typing fallback. Extraction happens on the server (rules,
// plus Claude when configured) so spoken answers like "mera naam Ali hai" work.
import { useState } from 'react';
import { AlertCircle, Keyboard, UserRound, Sparkles } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { aiApi } from '../../services/index.js';
import { BigMic, SpeakButton, WaveBars, SpeechLangPicker, speechErrorKey } from '../../components/voice.jsx';
import { Spinner } from '../../components/ui.jsx';

export default function VoiceQuestion({ questionKey, hintKey, fields, display, onResult, onTyped, side, typedPlaceholder, children }) {
  const { t, lang } = useI18n();
  const [speechLang, setSpeechLang] = useState(lang);
  const [heard, setHeard] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');

  const handleText = async (text) => {
    setHeard(text);
    setExtracting(true);
    setFailed(false);
    try {
      const results = {};
      let src = 'rules';
      for (const f of fields) {
        const r = await aiApi.extract(f, text);
        results[f] = r.value;
        if (r.source === 'claude' || r.source === 'groq') src = 'ai';
      }
      setSource(src);
      const ok = Object.values(results).some((v) => v !== null && v !== undefined && v !== '');
      setFailed(!ok);
      if (ok) onResult(results, text);
    } catch {
      setFailed(true);
    } finally {
      setExtracting(false);
    }
  };

  const sr = useSpeechRecognition({ lang: speechLang, onFinal: handleText });
  const errKey = speechErrorKey(sr.error);
  const showError = failed || (errKey && errKey !== 'voiceUnsupported');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="card p-6 text-center sm:p-10">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-xl font-bold sm:text-3xl">{t(questionKey)}</h1>
          <SpeakButton textKey={questionKey} />
        </div>
        <p className="mt-2 text-ink-500">{t(hintKey)}</p>

        {showError && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl border-2 border-amber-500 bg-amber-100/60 px-4 py-3 text-start">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            <span className="flex-1 font-display font-semibold text-brand-900">{t(errKey === 'micBlocked' ? 'micBlocked' : 'didntCatch')}</span>
            <SpeakButton textKey="didntCatch" size="sm" />
          </div>
        )}

        <div className="mt-8">
          {sr.supported ? (
            <BigMic listening={sr.listening} processing={sr.processing || extracting} error={showError} onClick={sr.listening ? sr.stop : sr.start} disabled={extracting || sr.processing} />
          ) : (
            <p className="mx-auto max-w-sm rounded-xl bg-cream-100 p-4 text-sm text-ink-700">{t('voiceUnsupported')}</p>
          )}
          {showError && <p className="mt-2 text-sm text-ink-500">{t('speakSlowly')}</p>}
        </div>

        {sr.supported && (
          <div className="mt-4 flex justify-center">
            <SpeechLangPicker value={speechLang} onChange={setSpeechLang} />
          </div>
        )}

        {(sr.listening || sr.interim || heard) && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-ink-300/40 p-4 text-start">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-600">
                <span className={`h-2 w-2 rounded-full ${sr.listening ? 'bg-brand-600' : 'bg-ink-300'}`} />
                {sr.listening ? t('listening') : t('aiHeard')}
              </span>
              {sr.listening && <WaveBars count={14} />}
            </div>
            <p className="mt-2 text-lg text-brand-900">“{sr.interim || heard}”</p>
            {extracting && (
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
                <Spinner className="h-4 w-4" /> {t('analyzing')}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          {!typing ? (
            <button type="button" className="btn-ghost" onClick={() => setTyping(true)}>
              <Keyboard className="h-4 w-4" /> {t('typeInstead')}
            </button>
          ) : (
            <form
              className="mx-auto flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!typed.trim()) return;
                if (onTyped) onTyped(typed.trim());
                else handleText(typed.trim());
              }}
            >
              <input className="input" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={typedPlaceholder} />
              <button type="submit" className="btn-primary">
                {t('save')}
              </button>
            </form>
          )}
        </div>
        {children}
      </section>

      <aside className="space-y-4">
        {display && (
          <div className="card p-5">
            <p className="font-display font-semibold text-brand-900">{t('aiHeard')}</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="flex-1 font-display text-xl font-bold text-brand-900">{display}</span>
              <SpeakButton text={display} size="sm" />
            </div>
            <p className="mt-3 text-sm text-ink-500">{t('wrongSpeakAgain')}</p>
            {source && (
              <p className="mt-2 flex items-center gap-1 text-xs text-ink-500">
                <Sparkles className="h-3.5 w-3.5" /> {t('understoodBy', { source: t(source === 'ai' ? 'srcClaude' : 'srcRules') })}
              </p>
            )}
          </div>
        )}
        {side}
      </aside>
    </div>
  );
}
