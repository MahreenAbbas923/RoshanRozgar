// Text-to-speech for the "Listen" buttons, so users who cannot read can hear
// questions and their own profile read back.
import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { STRINGS } from '../i18n/strings.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function pickVoice(prefixes) {
  const voices = synth?.getVoices() || [];
  for (const p of prefixes) {
    const v = voices.find((x) => x.lang?.toLowerCase().startsWith(p));
    if (v) return v;
  }
  return null;
}

export function useSpeak() {
  const { lang } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const [, setVoicesReady] = useState(0);

  useEffect(() => {
    if (!synth) return undefined;
    const onVoices = () => setVoicesReady((n) => n + 1);
    synth.addEventListener?.('voiceschanged', onVoices);
    return () => synth.removeEventListener?.('voiceschanged', onVoices);
  }, []);

  // Speaks text. For Urdu without an installed Urdu voice, falls back to the
  // Roman Urdu text read by an Indian/Pakistani English voice.
  const speak = useCallback(
    ({ en, ur, roman }, { onEnd } = {}) => {
      if (!synth) return false;
      synth.cancel();
      let text = en;
      let voice = pickVoice(['en-in', 'en-pk', 'en-gb', 'en']);
      if (lang === 'ur') {
        const urVoice = pickVoice(['ur']);
        if (urVoice && ur) {
          text = ur;
          voice = urVoice;
        } else {
          text = roman || en;
          voice = pickVoice(['hi-in', 'en-in', 'en']) || voice;
        }
      } else if (lang === 'roman') {
        text = roman || en;
        voice = pickVoice(['hi-in', 'en-in', 'en']) || voice;
      }
      if (!text) return false;
      const u = new SpeechSynthesisUtterance(String(text));
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 0.92;
      u.onend = () => {
        setSpeaking(false);
        onEnd?.();
      };
      u.onerror = () => {
        setSpeaking(false);
        onEnd?.();
      };
      setSpeaking(true);
      synth.speak(u);
      return true;
    },
    [lang],
  );

  const speakKey = useCallback(
    (key, params = {}, opts) => {
      const entry = STRINGS[key];
      if (!entry) return false;
      const fill = (s) => Object.entries(params).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), s || '');
      return speak({ en: fill(entry.en), ur: fill(entry.ur), roman: fill(entry.roman) }, opts);
    },
    [speak],
  );

  // Speak free text (user content) as-is with the best voice for its script.
  const speakText = useCallback(
    (text) => {
      if (!synth || !text) return false;
      synth.cancel();
      const isUrdu = /[؀-ۿ]/.test(text);
      const u = new SpeechSynthesisUtterance(String(text));
      const v = isUrdu ? pickVoice(['ur']) : pickVoice(['en-in', 'en']);
      if (isUrdu && !v) return false;
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      }
      u.rate = 0.92;
      u.onend = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(u);
      return true;
    },
    [],
  );

  const stop = useCallback(() => {
    synth?.cancel();
    setSpeaking(false);
  }, []);

  return { supported: !!synth, speaking, speak, speakKey, speakText, stop };
}
