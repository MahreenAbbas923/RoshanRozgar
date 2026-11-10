import { useRef, useState } from 'react';
import { Camera, LocateFixed, Plus, X, Check } from 'lucide-react';
import { AREAS, CATEGORIES, nearestArea } from '@shared/constants.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { uploadFile } from '../services/index.js';
import { CategoryIcon, Spinner } from './ui.jsx';
import Avatar from './Avatar.jsx';
import { PortfolioImage } from './WorkIllustration.jsx';

export function CategoryGrid({ value, onChange, multi = false, compact = false }) {
  const { catName } = useI18n();
  const selected = multi ? value || [] : [value];
  const toggle = (key) => {
    if (!multi) return onChange(key);
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`} role={multi ? 'group' : 'radiogroup'}>
      {CATEGORIES.map((c) => {
        const on = selected.includes(c.key);
        return (
          <button
            key={c.key}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            onClick={() => toggle(c.key)}
            className={`tile relative ${compact ? 'p-3 text-xs' : 'text-sm'} ${on ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600' : ''}`}
          >
            {on && (
              <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
            <CategoryIcon category={c.key} className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
            {catName(c.key)}
          </button>
        );
      })}
    </div>
  );
}

export function AreaSelect({ value, onChange, id = 'area', label }) {
  const { t, areaName } = useI18n();
  const toast = useToast();
  const [locating, setLocating] = useState(false);

  const locate = () => {
    if (!navigator.geolocation) return toast.error(t('locationFailed'));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const a = nearestArea(pos.coords.latitude, pos.coords.longitude);
        onChange(a.key, 'gps');
        toast.success(t('locationFound', { area: areaName(a.key) }));
      },
      () => {
        setLocating(false);
        toast.error(t('locationFailed'));
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select id={id} className="input" value={value || ''} onChange={(e) => onChange(e.target.value, 'saved')}>
          <option value="" disabled>
            {t('orChooseArea')}
          </option>
          {['islamabad', 'rawalpindi'].map((city) => (
            <optgroup key={city} label={city === 'islamabad' ? 'Islamabad / اسلام آباد' : 'Rawalpindi / راولپنڈی'}>
              {AREAS.filter((a) => a.city === city).map((a) => (
                <option key={a.key} value={a.key}>
                  {areaName(a.key)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className="btn-outline shrink-0" onClick={locate} disabled={locating}>
          {locating ? <Spinner className="h-4 w-4" /> : <LocateFixed className="h-4 w-4" />} {t('useMyLocation')}
        </button>
      </div>
    </div>
  );
}

export function AreaChips({ value = [], onChange }) {
  const { areaShort } = useI18n();
  const toggle = (k) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {AREAS.map((a) => {
        const on = value.includes(a.key);
        return (
          <button
            key={a.key}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(a.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${on ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900'}`}
          >
            {areaShort(a.key)}
          </button>
        );
      })}
    </div>
  );
}

export function AvatarUpload({ user, value, onChange, size = 120 }) {
  const { t } = useI18n();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (err) {
      toast.error(err.code === 'too_large' ? t('fileTooLarge') : t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="relative inline-block">
      <Avatar user={{ ...user, avatar: value }} size={size} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-0 end-0 flex h-11 w-11 items-center justify-center rounded-full bg-brand-900 text-white ring-4 ring-white"
        aria-label={t('changePhoto')}
      >
        {busy ? <Spinner className="h-4 w-4" /> : <Camera className="h-5 w-5" />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

export function PhotoList({ value = [], onChange, max = 6, capture }) {
  const { t } = useI18n();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const add = async (files) => {
    const list = [...(files || [])].slice(0, max - value.length);
    if (!list.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of list) urls.push(await uploadFile(f));
      onChange([...value, ...urls]);
    } catch (err) {
      toast.error(err.code === 'too_large' ? t('fileTooLarge') : t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap gap-3">
      {value.map((src) => (
        <div key={src} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-cream-200">
          <PortfolioImage src={src} />
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== src))}
            className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-700"
            aria-label={t('discard')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink-300 text-xs font-semibold text-brand-700 hover:bg-cream-100"
        >
          {busy ? <Spinner /> : <Plus className="h-6 w-6" />}
          {t('addPhotos')}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple capture={capture} className="hidden" onChange={(e) => add(e.target.files)} />
    </div>
  );
}
