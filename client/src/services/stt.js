// Speech-to-text through the server (Groq Whisper). Falls back to the
// browser's own recogniser only when the server has no STT key.
import { api } from './api.js';
import { fileToDataUrl } from './index.js';

let configPromise = null;

export function sttConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/ai/status')
      .then((r) => r.json())
      .catch(() => ({ stt: 'browser' }));
  }
  return configPromise;
}

// lang: 'ur' | 'roman' | 'en' — the language the person is speaking / wants back.
export async function transcribeBlob(blob, lang) {
  const dataUrl = await fileToDataUrl(blob);
  const res = await api('/ai/transcribe', { method: 'POST', body: { dataUrl, lang } });
  return res.text || '';
}
