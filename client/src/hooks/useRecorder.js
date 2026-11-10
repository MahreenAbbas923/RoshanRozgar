// Records a voice note with MediaRecorder. Optionally runs browser speech
// recognition at the same time to produce a transcript.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SPEECH_LANGS } from './useSpeechRecognition.js';
import { sttConfig, transcribeBlob } from '../services/stt.js';

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const MAX_SECONDS = 120;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return '';
}

export const recordingSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export function useRecorder({ transcribeLang } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [liveText, setLiveText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const recRef = useRef(null);
  const transcriptRef = useRef('');
  const resolveRef = useRef(null);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    setLiveText('');
    transcriptRef.current = '';
    if (!recordingSupported) {
      setError('unsupported');
      return false;
    }
    const useServerStt = (await sttConfig()).stt === 'groq';
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: (rec.mimeType || 'audio/webm').split(';')[0] });
        const durationSec = Math.max(1, Math.round((Date.now() - startedRef.current) / 1000));
        cleanup();
        setRecording(false);
        const resolve = resolveRef.current;
        if (!resolve) return;
        if (useServerStt && transcribeLang) {
          // Server transcription (Groq Whisper); the voice note is still sent if it fails.
          setTranscribing(true);
          transcribeBlob(blob, transcribeLang)
            .then((text) => resolve({ blob, durationSec, transcript: text }))
            .catch(() => resolve({ blob, durationSec, transcript: '' }))
            .finally(() => setTranscribing(false));
        } else {
          // Give browser recognition a moment to deliver its final result.
          setTimeout(() => resolve({ blob, durationSec, transcript: transcriptRef.current.trim() }), 350);
        }
      };
      mediaRef.current = rec;
      startedRef.current = Date.now();
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startedRef.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) mediaRef.current?.state === 'recording' && mediaRef.current.stop();
      }, 250);

      if (transcribeLang && Recognition && !useServerStt) {
        const r = new Recognition();
        r.lang = SPEECH_LANGS[transcribeLang] || transcribeLang;
        r.continuous = true;
        r.interimResults = true;
        r.onresult = (e) => {
          let finalText = '';
          let interim = '';
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += `${e.results[i][0].transcript} `;
            else interim += e.results[i][0].transcript;
          }
          transcriptRef.current = finalText;
          setLiveText(`${finalText}${interim}`.trim());
        };
        r.onerror = () => {};
        try {
          r.start();
          recRef.current = r;
        } catch {
          /* transcription is optional */
        }
      }
      return true;
    } catch (err) {
      setError(err?.name === 'NotAllowedError' ? 'not-allowed' : 'failed');
      cleanup();
      return false;
    }
  }, [cleanup, transcribeLang]);

  // Resolves with { blob, durationSec, transcript }.
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
        else resolve(null);
      }),
    [],
  );

  const cancel = useCallback(() => {
    resolveRef.current = null;
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.onstop = () => {
        cleanup();
        setRecording(false);
      };
      mediaRef.current.stop();
    }
  }, [cleanup]);

  return { recording, transcribing, seconds, error, liveText, start, stop, cancel, supported: recordingSupported };
}
