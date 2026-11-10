// One-time profile creation, right after registration. Workers get a
// voice-first wizard (no reading/typing needed); a short form is the fallback.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, FileText, Check, UserRound, Zap, MapPin, Clock, Wrench, Sparkles, ArrowRight } from 'lucide-react';
import { getCategory } from '@shared/constants.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth, homePathFor } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { errorText } from '../../services/api.js';
import OnboardingHeader from '../../components/layout/OnboardingHeader.jsx';
import { SpeakButton } from '../../components/voice.jsx';
import { CategoryGrid, AreaSelect, AvatarUpload, PhotoList } from '../../components/pickers.jsx';
import { CustomerProfileForm, WorkerProfileForm } from '../../components/profileForms.jsx';
import { Spinner, CategoryIcon } from '../../components/ui.jsx';
import Avatar from '../../components/Avatar.jsx';
import VoiceQuestion from './VoiceQuestion.jsx';

export default function ProfileSetup() {
  const { user, saveProfile } = useAuth();
  const { t, has } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);

  const finish = async (payload) => {
    try {
      const res = await saveProfile(payload);
      if (res.user.profileComplete) navigate(homePathFor(res.user), { replace: true });
    } catch (err) {
      toast.error(errorText(err, t, has));
    }
  };

  if (method === 'voice' && user.role === 'worker') {
    return <WorkerVoiceWizard onDone={(p) => finish({ ...p, profileMethod: 'voice', complete: true })} onExit={() => setMethod(null)} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OnboardingHeader onBack={() => (method ? setMethod(null) : navigate('/welcome'))} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {!method ? (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold sm:text-3xl">{t('howCreateProfile')}</h1>
              <SpeakButton textKey="howCreateProfile" />
            </div>
            <p className="mt-2 text-ink-500">{t('completeProfileHint')}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {user.role === 'worker' && (
                <MethodCard icon={Mic} title={t('byVoice')} desc={t('byVoiceDesc')} badge={t('recommended')} onClick={() => setMethod('voice')} speakKey="byVoiceDesc" primary />
              )}
              <MethodCard icon={FileText} title={t('byForm')} desc={t('byFormDesc')} onClick={() => setMethod('form')} speakKey="byFormDesc" primary={user.role !== 'worker'} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{t('completeProfileTitle')}</h1>
            <p className="mb-6 mt-1 text-ink-500">{t('completeProfileHint')}</p>
            {user.role === 'worker' ? (
              <WorkerProfileForm user={user} onSubmit={(p) => finish({ ...p, profileMethod: 'manual' })} submitLabel={t('continue')} />
            ) : (
              <CustomerProfileForm user={user} onSubmit={(p) => finish({ ...p, profileMethod: 'manual' })} submitLabel={t('continue')} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MethodCard({ icon: Icon, title, desc, badge, onClick, speakKey, primary }) {
  return (
    <div className={`card relative flex flex-col items-center gap-3 p-6 text-center ${primary ? 'border-2 border-brand-600' : ''}`}>
      {badge && <span className="absolute -top-3 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-brand-950">{badge}</span>}
      <button type="button" onClick={onClick} className="flex w-full flex-col items-center gap-3">
        <span className={`flex h-20 w-20 items-center justify-center rounded-full ${primary ? 'bg-brand-900 text-white' : 'bg-cream-100 text-brand-900'}`}>
          <Icon className="h-9 w-9" />
        </span>
        <span className="font-display text-xl font-bold text-brand-900">{title}</span>
        <span className="text-sm text-ink-500">{desc}</span>
      </button>
      <SpeakButton textKey={speakKey} size="sm" />
    </div>
  );
}

const STEPS = ['name', 'trade', 'area', 'exp', 'photo'];

function WorkerVoiceWizard({ onDone, onExit }) {
  const { t, catName, areaName } = useI18n();
  const { user } = useAuth();
  const [step, setStep] = useState(0); // index into STEPS, or STEPS.length for review
  const [returnToReview, setReturnToReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState({ name: '', skills: [], subSkills: [], area: '', experienceYears: null, rate: null, avatar: '', portfolio: [] });
  const set = (patch) => setP((prev) => ({ ...prev, ...patch }));

  const next = () => {
    if (returnToReview) {
      setReturnToReview(false);
      setStep(STEPS.length);
    } else setStep((s) => s + 1);
  };
  const back = () => (step === 0 ? onExit() : setStep((s) => s - 1));
  const goEdit = (i) => {
    setReturnToReview(true);
    setStep(i);
  };
  const canNext = [p.name, p.skills.length, p.area, true, true][step];

  const subSkillsFrom = (text, category) => {
    const s = text.toLowerCase();
    return getCategory(category).subSkills.filter((sub) => sub.toLowerCase().split(/[ /&]+/).some((w) => w.length > 3 && s.includes(w)));
  };

  const nextBar = (
    <div className="space-y-2">
      <button type="button" className="btn-primary btn-lg w-full" disabled={!canNext} onClick={next}>
        {t('next')} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
      </button>
      <button type="button" className="btn-ghost w-full" onClick={back}>
        {t('back')}
      </button>
    </div>
  );

  let content;
  if (step === 0) {
    content = (
      <VoiceQuestion
        questionKey="qName"
        hintKey="qNameHint"
        fields={['name']}
        display={p.name}
        onResult={(r) => set({ name: r.name })}
        side={nextBar}
      />
    );
  } else if (step === 1) {
    content = (
      <VoiceQuestion
        questionKey="qTrade"
        hintKey="qTradeHint"
        fields={['trade']}
        display={p.skills.length ? p.skills.map(catName).join(', ') : ''}
        onResult={(r, text) => set({ skills: [r.trade], subSkills: subSkillsFrom(text, r.trade) })}
        side={
          <>
            <div className="card p-5">
              <p className="font-display font-semibold text-brand-900">{t('orTapPicture')}</p>
              <p className="mb-3 text-sm text-ink-500">{t('orTapPictureHint')}</p>
              <CategoryGrid value={p.skills} onChange={(skills) => set({ skills })} multi compact />
            </div>
            {nextBar}
          </>
        }
      />
    );
  } else if (step === 2) {
    content = (
      <VoiceQuestion
        questionKey="qArea"
        hintKey="qAreaHint"
        fields={['area']}
        display={p.area ? areaName(p.area) : ''}
        onResult={(r) => set({ area: r.area })}
        side={
          <>
            <div className="card p-5">
              <p className="mb-3 font-display font-semibold text-brand-900">{t('orChooseArea')}</p>
              <AreaSelect value={p.area} onChange={(area) => set({ area })} />
            </div>
            {nextBar}
          </>
        }
      />
    );
  } else if (step === 3) {
    content = (
      <VoiceQuestion
        questionKey="qExpRate"
        hintKey="qExpRateHint"
        fields={['experience']}
        display={
          p.experienceYears != null
            ? t('yearsExp', { n: p.experienceYears })
            : ''
        }
        onResult={(r) =>
          set({
            experienceYears: r.experience ?? p.experienceYears,
          })
        }
        side={
          <>
            <div className="card p-5">
              <label className="text-sm font-semibold text-brand-900">
                {t('fYears')}
                <input type="number" inputMode="numeric" className="input mt-1" value={p.experienceYears ?? ''} onChange={(e) => set({ experienceYears: e.target.value === '' ? null : Number(e.target.value) })} />
              </label>
            </div>
            {nextBar}
          </>
        }
      />
    );
  } else if (step === 4) {
    content = (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="card p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold sm:text-3xl">{t('qPhoto')}</h1>
            <SpeakButton textKey="qPhotoHint" />
          </div>
          <p className="mt-2 text-ink-500">{t('qPhotoHint')}</p>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-2">
              <AvatarUpload user={{ ...user, name: p.name }} value={p.avatar} onChange={(avatar) => set({ avatar })} size={140} />
              <span className="text-sm font-semibold text-brand-900">{t('takeSelfie')}</span>
            </div>
            <div>
              <p className="label">
                {t('photosOfWork')} <span className="font-normal text-ink-500">({t('optional')})</span>
              </p>
              <PhotoList value={p.portfolio} onChange={(portfolio) => set({ portfolio })} />
            </div>
          </div>
        </section>
        <aside>
          {nextBar}
          {!p.avatar && (
            <button type="button" className="btn-ghost mt-2 w-full" onClick={next}>
              {t('skip')}
            </button>
          )}
        </aside>
      </div>
    );
  } else {
    const rows = [
      { icon: UserRound, label: 'fName', value: p.name, step: 0 },
      { icon: Zap, label: 'fTrade', value: p.skills.map(catName).join(', '), step: 1 },
      { icon: MapPin, label: 'fWorkArea', value: p.area ? areaName(p.area) : '', step: 2 },
      { icon: Clock, label: 'fExperience', value: p.experienceYears != null ? t('yearsExp', { n: p.experienceYears }) : '–', step: 3 },
      { icon: Wrench, label: 'fSkills', value: p.subSkills.join(', '), chips: p.subSkills, step: 1 },
    ];
    content = (
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">{t('isThisCorrect')}</h1>
          <SpeakButton textKey="isThisCorrect" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
          <div className="card flex flex-col items-center gap-3 p-6 text-center">
            <Avatar user={{ ...user, name: p.name, avatar: p.avatar }} size={150} />
            <p className="font-display text-2xl font-bold text-brand-900">{p.name}</p>
            {p.skills[0] && (
              <span className="chip">
                <CategoryIcon category={p.skills[0]} className="h-3.5 w-3.5" /> {catName(p.skills[0])} · {p.area}
              </span>
            )}
            <p className="text-sm text-ink-500">{t('tapSpeakerHint')}</p>
          </div>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="card flex items-center gap-4 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-500">{t(r.label)}</p>
                  {r.chips ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {r.chips.length ? r.chips.map((c) => <span key={c} className="chip">{c}</span>) : <span className="text-ink-500">–</span>}
                    </div>
                  ) : (
                    <p className="truncate font-display text-xl font-bold text-brand-900">{r.value || '–'}</p>
                  )}
                </div>
                <SpeakButton text={`${t(r.label)}: ${r.value || ''}`} size="sm" />
                <button
                  type="button"
                  onClick={() => goEdit(r.step)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-600 text-brand-600"
                  aria-label={`${t('edit')} ${t(r.label)}`}
                >
                  <Mic className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-primary btn-lg w-full py-5 text-lg"
              disabled={saving || !p.name || !p.skills.length || !p.area}
              onClick={async () => {
                setSaving(true);
                await onDone({
                  name: p.name,
                  skills: p.skills,
                  subSkills: p.subSkills,
                  experienceYears: p.experienceYears || 0,
                  location: { area: p.area },
                  serviceAreas: [p.area],
                  avatar: p.avatar,
                  portfolio: p.portfolio,
                });
                setSaving(false);
              }}
            >
              {saving ? <Spinner /> : null} {t('looksGood')} <Check className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inReview = step === STEPS.length;
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <OnboardingHeader
        step={inReview ? undefined : step + 1}
        total={STEPS.length}
        onBack={back}
        badge={
          inReview ? (
            <span className="chip">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> {t('builtFromVoice')}
            </span>
          ) : null
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <div key={step} className="animate-fadeUp">
          {content}
        </div>
      </main>
    </div>
  );
}
