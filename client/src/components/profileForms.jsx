// Manual profile forms used for first-time setup and later edits (same record).
import { useState } from 'react';
import { Mic, Square, Save } from 'lucide-react';
import { getCategory, DEFAULT_WORKING_HOURS } from '@shared/constants.js';
import { extractName } from '@shared/language.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';
import { AreaSelect, AreaChips, AvatarUpload, CategoryGrid, PhotoList } from './pickers.jsx';
import { VoiceTextarea, SpeakButton } from './voice.jsx';
import { Spinner, Segmented } from './ui.jsx';

export function NameField({ value, onChange, id = 'name' }) {
  const { t, lang } = useI18n();
  const sr = useSpeechRecognition({ lang, onFinal: (text) => onChange(extractName(text) || text) });
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="label mb-0">
          {t('fName')} <span className="text-red-700">*</span>
        </label>
        <SpeakButton textKey="qName" size="sm" />
      </div>
      <div className="flex gap-2">
        <input id={id} className="input" value={sr.listening ? sr.interim || value : value} onChange={(e) => onChange(e.target.value)} maxLength={60} required />
        {sr.supported && (
          <button
            type="button"
            onClick={sr.listening ? sr.stop : sr.start}
            className={`flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl text-white ${sr.listening ? 'bg-red-600' : 'bg-brand-900'}`}
            aria-label={t('speakName')}
          >
            {sr.listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function GenderPicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div>
      <span className="label">{t('fGender')}</span>
      <Segmented
        value={value}
        onChange={onChange}
        options={[
          { value: 'male', label: t('male') },
          { value: 'female', label: t('female') },
        ]}
      />
    </div>
  );
}

function MissingNote({ missing }) {
  const { t } = useI18n();
  if (!missing?.length) return null;
  return (
    <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-brand-900" role="alert">
      {t('missingFields', { fields: missing.join(', ') })}
    </p>
  );
}

export function CustomerProfileForm({ user, onSubmit, submitLabel }) {
  const { t } = useI18n();
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [gender, setGender] = useState(user.gender || 'male');
  const [area, setArea] = useState(user.location?.area || '');
  const [source, setSource] = useState(user.location?.source || 'saved');
  const [address, setAddress] = useState(user.location?.address || '');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState([]);

  const submit = async (e) => {
    e.preventDefault();
    const miss = [];
    if (!name.trim()) miss.push(t('fName'));
    if (!area) miss.push(t('fArea'));
    setMissing(miss);
    if (miss.length) return;
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), avatar, gender, location: { area, address, source }, complete: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-center gap-5">
        <AvatarUpload user={{ ...user, name, gender }} value={avatar} onChange={setAvatar} size={96} />
        <GenderPicker value={gender} onChange={setGender} />
      </div>
      <NameField value={name} onChange={setName} />
      <AreaSelect
        label={`${t('fArea')} *`}
        value={area}
        onChange={(v, src) => {
          setArea(v);
          setSource(src);
        }}
      />
      <div>
        <label htmlFor="address" className="label">
          {t('fAddress')} <span className="font-normal text-ink-500">({t('optional')})</span>
        </label>
        <input id="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
      </div>
      <MissingNote missing={missing} />
      <button type="submit" className="btn-primary btn-lg w-full" disabled={busy}>
        {busy ? <Spinner /> : <Save className="h-5 w-5" />} {submitLabel || t('save')}
      </button>
    </form>
  );
}

export function WorkerProfileForm({ user, onSubmit, submitLabel }) {
  const { t } = useI18n();
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [gender, setGender] = useState(user.gender || 'male');
  const [skills, setSkills] = useState(user.skills || []);
  const [subSkills, setSubSkills] = useState(user.subSkills || []);
  const [years, setYears] = useState(user.experienceYears || '');
  const [rate, setRate] = useState(user.rate || '');
  const [bio, setBio] = useState(user.bio || '');
  const [baseArea, setBaseArea] = useState(user.location?.area || user.serviceAreas?.[0] || '');
  const [serviceAreas, setServiceAreas] = useState(user.serviceAreas || []);
  const [hours, setHours] = useState(user.workingHours || DEFAULT_WORKING_HOURS);
  const [portfolio, setPortfolio] = useState(user.portfolio || []);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState([]);

  const suggestions = [...new Set(skills.flatMap((s) => getCategory(s).subSkills))];
  const toggleSub = (s) => setSubSkills((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  const toggleDay = (d) => setHours((h) => ({ ...h, days: h.days.includes(d) ? h.days.filter((x) => x !== d) : [...h.days, d].sort() }));

  const submit = async (e) => {
    e.preventDefault();
    const miss = [];
    if (!name.trim()) miss.push(t('fName'));
    if (!skills.length) miss.push(t('fTrade'));
    if (!baseArea) miss.push(t('fWorkArea'));
    if (!hours.days.length || hours.start >= hours.end) miss.push(t('fWorkingHours'));
    setMissing(miss);
    if (miss.length) return;
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        avatar,
        gender,
        skills,
        subSkills: subSkills.filter((s) => suggestions.includes(s)),
        experienceYears: Number(years) || 0,
        rate: Number(rate) || 0,
        bio,
        location: { area: baseArea },
        serviceAreas: [...new Set([baseArea, ...serviceAreas])],
        workingHours: hours,
        portfolio,
        complete: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-7" noValidate>
      <div className="flex flex-wrap items-center gap-5">
        <AvatarUpload user={{ ...user, name, gender }} value={avatar} onChange={setAvatar} size={96} />
        <GenderPicker value={gender} onChange={setGender} />
      </div>
      <NameField value={name} onChange={setName} />
      <div>
        <span className="label">
          {t('fTrade')} <span className="text-red-700">*</span>
        </span>
        <CategoryGrid value={skills} onChange={setSkills} multi compact />
      </div>
      {suggestions.length > 0 && (
        <div>
          <span className="label">{t('fSkills')}</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                role="checkbox"
                aria-checked={subSkills.includes(s)}
                onClick={() => toggleSub(s)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${subSkills.includes(s) ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="years" className="label">
            {t('fYears')}
          </label>
          <input id="years" type="number" inputMode="numeric" min="0" max="60" className="input" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rate" className="label">
            {t('fRatePerVisit')}
          </label>
          <input id="rate" type="number" inputMode="numeric" min="0" step="50" className="input" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
      </div>
      <AreaSelect label={`${t('fWorkArea')} *`} value={baseArea} onChange={(v) => setBaseArea(v)} id="baseArea" />
      <div>
        <span className="label">{t('fServiceAreas')}</span>
        <AreaChips value={serviceAreas} onChange={setServiceAreas} />
      </div>
      <fieldset>
        <legend className="label">{t('fWorkingHours')}</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              role="checkbox"
              aria-checked={hours.days.includes(d)}
              onClick={() => toggleDay(d)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${hours.days.includes(d) ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
            >
              {t(`day${d}`)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            {t('from')}
            <input type="time" className="input w-auto py-2" value={hours.start} onChange={(e) => setHours((h) => ({ ...h, start: e.target.value }))} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t('to')}
            <input type="time" className="input w-auto py-2" value={hours.end} onChange={(e) => setHours((h) => ({ ...h, end: e.target.value }))} />
          </label>
        </div>
      </fieldset>
      <VoiceTextarea id="bio" label={t('fAbout')} value={bio} onChange={setBio} rows={3} />
      <div>
        <span className="label">{t('photosOfWork')}</span>
        <PhotoList value={portfolio} onChange={setPortfolio} />
      </div>
      <MissingNote missing={missing} />
      <button type="submit" className="btn-primary btn-lg w-full" disabled={busy}>
        {busy ? <Spinner /> : <Save className="h-5 w-5" />} {submitLabel || t('save')}
      </button>
    </form>
  );
}
