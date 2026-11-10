// Record -> preview -> use. Uploads the clip and returns
// { url, durationSec, transcript } (transcript only where the browser supports it).
import { useState } from 'react';
import { Mic, Square, Trash2, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRecorder } from '../hooks/useRecorder.js';
import { uploadFile } from '../services/index.js';
import { AudioPlayer, WaveBars } from './voice.jsx';
import { Spinner } from './ui.jsx';

export default function VoiceNoteRecorder({ onDone, value, onClear, label }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const rec = useRecorder({ transcribeLang: lang });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  if (value) {
    return (
      <div className="space-y-2 rounded-2xl border border-cream-200 bg-cream-50 p-3">
        <AudioPlayer src={value.url} durationSec={value.durationSec} />
        {value.transcript && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">{t('transcript')}:</span> “{value.transcript}”
          </p>
        )}
        <button type="button" className="btn-ghost text-red-700" onClick={onClear}>
          <Trash2 className="h-4 w-4" /> {t('discard')}
        </button>
      </div>
    );
  }

  if (!rec.supported) return <p className="text-sm text-ink-500">{t('voiceUnsupported')}</p>;

  if (rec.transcribing) {
    return (
      <p className="flex items-center gap-2 text-sm text-brand-700">
        <Spinner className="h-4 w-4" /> {t('understanding')}
      </p>
    );
  }

  if (preview) {
    return (
      <div className="space-y-2 rounded-2xl border border-cream-200 bg-cream-50 p-3">
        <AudioPlayer src={preview.localUrl} durationSec={preview.durationSec} />
        {preview.transcript && <p className="text-sm text-ink-700">“{preview.transcript}”</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-red-700" onClick={() => setPreview(null)}>
            <Trash2 className="h-4 w-4" /> {t('discard')}
          </button>
          <button
            type="button"
            className="btn-primary ms-auto"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const url = await uploadFile(preview.blob);
                onDone({ url, durationSec: preview.durationSec, transcript: preview.transcript });
                setPreview(null);
              } catch {
                toast.error(t('somethingWrong'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} {t('save')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={async () => {
          if (rec.recording) {
            const r = await rec.stop();
            if (r) setPreview({ ...r, localUrl: URL.createObjectURL(r.blob) });
          } else {
            const ok = await rec.start();
            if (!ok) toast.error(t('micBlocked'));
          }
        }}
        className={`inline-flex h-12 items-center gap-2 rounded-full px-5 font-semibold text-white ${rec.recording ? 'bg-red-600' : 'bg-brand-900'}`}
      >
        {rec.recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
        {rec.recording ? `${t('recording')} ${rec.seconds}s` : label || t('holdToTalk')}
      </button>
      {rec.recording && <WaveBars count={16} />}
      {rec.recording && rec.liveText && <p className="w-full text-sm text-ink-500">“{rec.liveText}”</p>}
    </div>
  );
}
