import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../context/AuthContext.jsx';
import { hasChosenLanguage } from '../../i18n/I18nProvider.jsx';
import { HardHat } from '../../components/ui.jsx';

const MIN_MS = 2400;

// Shows the brand while the saved session is verified, then routes:
// returning user -> their dashboard; new visitor -> language selection.
export default function Splash() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [minDone, setMinDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDone(true), MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minDone || status !== 'ready') return;
    if (user) navigate(homePathFor(user), { replace: true });
    else navigate(hasChosenLanguage() ? '/welcome' : '/language', { replace: true });
  }, [minDone, status, user, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-brand-900 px-6 text-center text-white">
      <div className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-brand-800" aria-hidden />
      <div className="absolute -bottom-32 -end-20 h-96 w-96 rounded-full bg-brand-800" aria-hidden />
      <div className="relative animate-fadeUp">
        <div className="mx-auto mb-8 h-56 w-56 overflow-hidden rounded-full border-4 border-amber-500 bg-cream-100 shadow-lift sm:h-64 sm:w-64">
          <img src="/images/hero-workers.jpg" alt="Electrician, plumber and mechanic smiling" className="h-full w-full object-cover object-top" />
        </div>
        <div className="flex items-center justify-center gap-3">
          <HardHat size={56} />
          <div className="text-start">
            <p className="font-display text-3xl font-bold leading-tight text-white">Roshan Rozgar</p>
            <p className="font-urdu text-2xl leading-[1.8] text-amber-400" dir="rtl" lang="ur">
              روشن روزگار
            </p>
          </div>
        </div>
        <p className="mt-4 text-white/80">Hunarmand aap ke qareeb · Skilled workers near you</p>
      </div>
      <div className="relative mt-10 h-1.5 w-48 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Loading">
        <div className="h-full w-1/2 animate-[splash_1.2s_ease-in-out_infinite] rounded-full bg-amber-500" />
      </div>
      <style>{'@keyframes splash{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}'}</style>
    </div>
  );
}
