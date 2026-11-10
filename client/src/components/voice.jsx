import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, Play, Pause, RotateCcw, Keyboard } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useSpeak } from '../hooks/useSpeak.js';
import { useSpeechRecognition, speechSupported } from '../hooks/useSpeechRecognition.js';
import { Spinner } from './ui.jsx';

// Reads a translated string (or free text) aloud.
export function SpeakButton({ textKey, params, text, className = '', size = 'md' }) {
  const { t } = useI18n();
  const { supported, speakKey, speakText } = useSpeak();
  if (!supported) return null;
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <button
      type="button"
      className={`icon-btn ${dim} ${className}`}
      aria-label={t('hearThis')}
      title={t('hearThis')}
      onClick={() => (textKey ? speakKey(textKey, params) : speakText(text))}
    >
      <Volume2 className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
    </button>
  );
}

export function WaveBars({ active = true, light = false, count = 18, className = '' }) {
  return (
    <span className={`inline-flex h-6 items-center gap-[3px] ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${light ? 'bg-white/80' : 'bg-brand-600'} ${active ? 'animate-bar' : ''}`}
          style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 6) * 0.1}s`, transform: active ? undefined : 'scaleY(0.6)' }}
        />
      ))}
    </span>
  );
}

// Large round microphone used in voice-first screens.
export function BigMic({ listening, error, onClick, label, disabled, processing }) {
  const { t } = useI18n();
  const Icon = listening ? Square : error ? RotateCcw : Mic;
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label || (listening ? t('tapToStop') : t('tapToSpeak'))}
        className={`relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lift transition active:scale-95 disabled:opacity-50 ${
          error ? 'bg-brand-900 ring-[10px] ring-amber-100' : 'bg-brand-900 ring-[10px] ring-brand-100'
        }`}
      >
        {listening && <span className="absolute inset-0 animate-pulseRing rounded-full bg-brand-600" aria-hidden />}
        <Icon className="relative h-11 w-11" aria-hidden />
      </button>
      <span className="font-display text-lg font-semibold text-brand-900">
        {processing ? t('understanding') : listening ? t('tapToStop') : error ? t('speakAgain') : label || t('tapToSpeak')}
      </span>
    </div>
  );
}

// Choose which language the speech recogniser listens for.
export function SpeechLangPicker({ value, onChange }) {
  const opts = [
    { v: 'ur', label: 'اردو' },
    { v: 'roman', label: 'Roman' },
    { v: 'en', label: 'English' },
  ];
  return (
    <div className="inline-flex rounded-full border border-cream-200 bg-cream-100 p-0.5 text-xs" role="radiogroup" aria-label="Speech language">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-2.5 py-1 font-semibold ${value === o.v ? 'bg-brand-900 text-white' : 'text-brand-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function speechErrorKey(error) {
  if (!error) return null;
  if (error === 'unsupported') return 'voiceUnsupported';
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'micBlocked';
  return 'didntCatch';
}

// Textarea with a mic: speech is appended so the user can review and correct it.
export function VoiceTextarea({ value, onChange, placeholder, rows = 4, label, id, autoFocus }) {
  const { t, lang } = useI18n();
  const [speechLang, setSpeechLang] = useState(lang);
  const valueRef = useRef(value);
  valueRef.current = value;
  const sr = useSpeechRecognition({
    lang: speechLang,
    onFinal: (text) => onChange(`${valueRef.current ? `${valueRef.current.trim()} ` : ''}${text}`),
  });
  const errKey = speechErrorKey(sr.error);

  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className={`rounded-2xl border bg-white transition ${sr.listening ? 'border-brand-600 ring-2 ring-brand-100' : 'border-ink-300/60'}`}>
        <textarea
          id={id}
          autoFocus={autoFocus}
          rows={rows}
          value={sr.listening && sr.interim ? `${value}${value ? ' ' : ''}${sr.interim}` : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-2xl bg-transparent px-4 py-3 text-base focus:outline-none"
          readOnly={sr.listening}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-300/30 px-3 py-2">
          <button
            type="button"
            onClick={sr.listening ? sr.stop : sr.start}
            disabled={!speechSupported || sr.processing}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white ${sr.listening ? 'bg-red-600' : 'bg-brand-900'} disabled:opacity-40`}
            aria-label={sr.listening ? t('tapToStop') : t('tapToSpeak')}
          >
            {sr.listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {sr.listening ? t('listening') : t('tapToSpeak')}
          </button>
          {sr.listening && <WaveBars count={12} active={sr.level > 0.15} />}
          {sr.processing && (
            <span className="flex items-center gap-1.5 text-sm text-brand-700">
              <Spinner className="h-4 w-4" /> {t('understanding')}
            </span>
          )}
          <span className="ms-auto">
            <SpeechLangPicker value={speechLang} onChange={setSpeechLang} />
          </span>
        </div>
      </div>
      {errKey && <p className="mt-1.5 text-sm text-amber-600">{t(errKey)}</p>}
      {!speechSupported && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-500">
          <Keyboard className="h-3.5 w-3.5" /> {t('voiceUnsupported')}
        </p>
      )}
    </div>
  );
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AudioPlayer({ src, durationSec = 0, dark = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onTime = () => setTime(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setTime(0);
    };
    const onMeta = () => Number.isFinite(a.duration) && setDuration(a.duration);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('loadedmetadata', onMeta);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${dark ? 'bg-white/10' : 'bg-cream-100'}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white text-brand-900' : 'bg-brand-600 text-white'}`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px rtl:-scale-x-100" />}
      </button>
      <div className="relative flex-1">
        <WaveBars active={playing} light={dark} count={24} />
        <div className={`absolute bottom-0 h-0.5 ${dark ? 'bg-amber-400' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`ltr-text text-xs font-semibold ${dark ? 'text-white/90' : 'text-brand-900'}`}>{fmt(playing ? time : duration)}</span>
    </div>
  );
}
