// Worker's central mic: simple spoken commands in English, Urdu or Roman Urdu.
import { Mic, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useSpeak } from '../../hooks/useSpeak.js';
import { meApi } from '../../services/index.js';
import { speechErrorKey } from '../voice.jsx';

const COMMANDS = [
  { action: 'busy', words: ['busy', 'offline', 'not available', 'masroof', 'band', 'مصروف', 'آف لائن', 'بند'] },
  { action: 'free', words: ['free', 'available', 'online', 'farigh', 'faarigh', 'khali', 'فارغ', 'دستیاب', 'خالی'] },
  { action: 'jobs', words: ['job', 'jobs', 'task', 'work', 'kaam', 'kam', 'booking', 'کام', 'بکنگ'] },
  { action: 'chat', words: ['message', 'messages', 'chat', 'customer', 'paigham', 'پیغام', 'چیٹ', 'گاہک'] },
  { action: 'profile', words: ['profile', 'پروفائل'] },
  { action: 'home', words: ['home', 'ghar', 'ہوم'] },
];

export function parseCommand(text) {
  const s = ` ${text.toLowerCase()} `;
  for (const c of COMMANDS) if (c.words.some((w) => s.includes(w))) return c.action;
  return null;
}

export default function VoiceCommandButton({ className = '' }) {
  const { t, lang } = useI18n();
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { speakKey } = useSpeak();

  const run = async (text) => {
    const action = parseCommand(text);
    if (!action) {
      toast.info(`"${text}" — ${t('commandNotUnderstood')}`);
      speakKey('commandNotUnderstood');
      return;
    }
    if (action === 'free' || action === 'busy') {
      const res = await meApi.setAvailability(action === 'free').catch(() => null);
      if (res) {
        setUser(res.user);
        const key = action === 'free' ? 'imAvailable' : 'imOffline';
        toast.success(t(key));
        speakKey(key);
      }
      return;
    }
    const routes = { jobs: '/worker/jobs', chat: '/chat', profile: '/profile', home: '/worker' };
    navigate(routes[action]);
  };

  const sr = useSpeechRecognition({ lang, onFinal: run });
  const errKey = speechErrorKey(sr.error);

  return (
    <button
      type="button"
      onClick={() => {
        if (!sr.supported) {
          toast.error(t('voiceUnsupported'));
          return;
        }
        if (sr.listening) sr.stop();
        else sr.start();
        if (errKey === 'micBlocked') toast.error(t('micBlocked'));
      }}
      aria-label={sr.listening ? t('tapToStop') : t('justSayIt')}
      title={t('justSayIt')}
      className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-white shadow-lift ring-4 ring-white ${className}`}
    >
      {sr.listening && <span className="absolute inset-0 animate-pulseRing rounded-full bg-brand-600" aria-hidden />}
      {sr.listening ? <Square className="relative h-5 w-5" /> : <Mic className="relative h-6 w-6" />}
    </button>
  );
}
