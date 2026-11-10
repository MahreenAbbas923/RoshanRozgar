// Speech-to-text hook. Default path: record the microphone, stop automatically
// when the person stops talking, and transcribe on the server (Groq Whisper,
// which handles Urdu well). If the server has no speech key, it falls back to
// the browser's Web Speech API.
import { useCallback, useEffect, useRef, useState } from 'react';
import { sttConfig, transcribeBlob } from '../services/stt.js';

const BrowserRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const canRecord = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export const SPEECH_LANGS = { en: 'en-IN', ur: 'ur-PK', roman: 'en-IN' };
export const speechSupported = canRecord || !!BrowserRecognition;

const SILENCE_MS = 1400; // stop this long after the person stops talking
const NO_SPEECH_MS = 8000; // give up if nothing is said
const MAX_MS = 25000;

function pickMime() {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return '';
}

export function useSpeechRecognition({ lang = 'en', onFinal } = {}) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null); // 'unsupported' | 'not-allowed' | 'no-speech' | 'network'
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const langRef = useRef(lang);
  langRef.current = lang;
  const sessionRef = useRef(null);

  const cleanup = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    clearInterval(s.timer);
    s.stream?.getTracks().forEach((t) => t.stop());
    s.audioCtx?.close().catch(() => {});
    try {
      s.browserRec?.abort();
    } catch {
      /* ignore */
    }
    sessionRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const finish = useCallback(async (text) => {
    const clean = String(text || '').trim();
    if (clean) {
      setTranscript(clean);
      onFinalRef.current?.(clean);
    } else setError('no-speech');
  }, []);

  const startBrowser = useCallback(() => {
    const rec = new BrowserRecognition();
    rec.lang = SPEECH_LANGS[langRef.current] || 'en-IN';
    rec.interimResults = true;
    let finalText = '';
    rec.onresult = (e) => {
      let f = '';
      let i = '';
      for (let k = 0; k < e.results.length; k++) {
        if (e.results[k].isFinal) f += `${e.results[k][0].transcript} `;
        else i += e.results[k][0].transcript;
      }
      finalText = f;
      setInterim(i);
    };
    rec.onerror = (e) => e.error !== 'aborted' && setError(e.error === 'not-allowed' ? 'not-allowed' : 'no-speech');
    rec.onend = () => {
      setListening(false);
      setInterim('');
      sessionRef.current = null;
      finish(finalText);
    };
    sessionRef.current = { browserRec: rec };
    rec.start();
    setListening(true);
  }, [finish]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    // Voice activity detection from the input volume.
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const started = Date.now();
    const s = { stream, audioCtx, recorder, spoke: false, lastVoice: 0, noise: 0.01, samples: 0 };

    s.timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();
      // Learn the background noise level during the first half second.
      if (now - started < 500) {
        s.noise = (s.noise * s.samples + rms) / (s.samples + 1);
        s.samples += 1;
      }
      const threshold = Math.max(0.015, s.noise * 3);
      setLevel(Math.min(1, rms / (threshold * 4)));
      if (rms > threshold) {
        s.spoke = true;
        s.lastVoice = now;
      }
      const elapsed = now - started;
      if ((s.spoke && now - s.lastVoice > SILENCE_MS) || (!s.spoke && elapsed > NO_SPEECH_MS) || elapsed > MAX_MS) {
        if (recorder.state === 'recording') recorder.stop();
      }
    }, 100);

    recorder.onstop = async () => {
      const spoke = s.spoke || s.manualStop;
      cleanup();
      setListening(false);
      setLevel(0);
      if (!spoke) {
        setError('no-speech');
        return;
      }
      const blob = new Blob(chunks, { type: (recorder.mimeType || 'audio/webm').split(';')[0] });
      setProcessing(true);
      try {
        await finish(await transcribeBlob(blob, langRef.current));
      } catch (err) {
        setError(err.code === 'network' ? 'network' : 'no-speech');
      } finally {
        setProcessing(false);
      }
    };
    sessionRef.current = s;
    recorder.start();
    setListening(true);
  }, [cleanup, finish]);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    setTranscript('');
    setInterim('');
    const cfg = await sttConfig();
    try {
      if (cfg.stt === 'groq' && canRecord) await startRecording();
      else if (BrowserRecognition) startBrowser();
      else if (canRecord) await startRecording();
      else setError('unsupported');
    } catch (err) {
      cleanup();
      setListening(false);
      setError(err?.name === 'NotAllowedError' ? 'not-allowed' : 'unsupported');
    }
  }, [startRecording, startBrowser, cleanup]);

  // Manual stop: transcribe whatever was said so far.
  const stop = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (s.browserRec) s.browserRec.stop();
    else if (s.recorder?.state === 'recording') {
      s.manualStop = true;
      s.recorder.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    const s = sessionRef.current;
    if (s?.recorder) s.recorder.onstop = null;
    if (s?.recorder?.state === 'recording') s.recorder.stop();
    cleanup();
    setListening(false);
    setLevel(0);
  }, [cleanup]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  return { supported: speechSupported, listening, processing, transcript, interim, level, error, start, stop, cancel, reset };
}
