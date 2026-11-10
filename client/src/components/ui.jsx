import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, Star, X, BadgeCheck, AlertTriangle, Inbox, Check, Clock,
  Zap, Droplets, Snowflake, Hammer, PaintRoller, Wrench, Sparkles, LayoutGrid,
} from 'lucide-react';

const Icons = { Inbox, Check, Clock, Zap, Droplets, Snowflake, Hammer, PaintRoller, Wrench, Sparkles, LayoutGrid };
import { getCategory } from '@shared/constants.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

export function Logo({ size = 'md', light = false, to = '/' }) {
  const { t, lang } = useI18n();
  const dim = size === 'lg' ? 56 : size === 'sm' ? 32 : 40;
  const [first, second] = lang === 'ur' ? ['روشن', 'روزگار'] : ['Roshan', 'Rozgar'];
  return (
    <Link to={to} className="flex items-center gap-2" aria-label={t('appName')}>
      <HardHat size={dim} />
      <span className={`font-display font-bold leading-[1.05] ${light ? 'text-white' : 'text-brand-900'} ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>
        {first}
        <br />
        {second}
      </span>
    </Link>
  );
}

export function HardHat({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 48" width={size} height={size * 0.75} aria-hidden>
      <path d="M10 34a22 22 0 0 1 44 0z" fill="#F29A1F" />
      <rect x="27" y="10" width="10" height="20" rx="4" fill="#F6B44A" />
      <rect x="20" y="16" width="4" height="16" rx="2" fill="#F6B44A" opacity="0.7" />
      <path d="M4 36h56c-5 8-16 11-28 11S9 44 4 36z" fill="#0C3B37" />
      <path d="M6 36h52" stroke="#F29A1F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CategoryIcon({ category, className = 'h-6 w-6' }) {
  const Icon = Icons[getCategory(category).icon] || Icons.Wrench;
  const color = category === 'electrician' ? 'text-amber-500' : category === 'ac_repair' ? 'text-brand-600' : 'text-brand-800';
  return <Icon className={`${color} ${className}`} aria-hidden />;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function PageLoader() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-brand-700" role="status">
      <Spinner className="h-6 w-6" /> <span>{t('loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="card mx-auto my-10 flex max-w-md flex-col items-center gap-3 p-6 text-center" role="alert">
      <AlertTriangle className="h-8 w-8 text-amber-600" />
      <p className="text-ink-700">{message || t('somethingWrong')}</p>
      {onRetry && (
        <button type="button" className="btn-outline" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Icons.Inbox, title, hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-300/60 bg-cream-50 px-6 py-8 text-center">
      <Icon className="h-8 w-8 text-brand-600" aria-hidden />
      {title && <p className="font-semibold text-brand-900">{title}</p>}
      {hint && <p className="max-w-sm text-sm text-ink-500">{hint}</p>}
      {action}
    </div>
  );
}

export function Stars({ value = 0, size = 'h-4 w-4', showValue = false, count }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1" aria-label={t('starsLabel', { n: value })}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${size} ${n <= Math.round(value) ? 'fill-amber-500 text-amber-500' : 'text-ink-300'}`} aria-hidden />
        ))}
      </span>
      {showValue && (
        <span className="text-sm font-semibold text-brand-900">
          {Number(value).toFixed(1)}
          {count != null && <span className="font-normal text-ink-500"> ({count})</span>}
        </span>
      )}
    </span>
  );
}

export function RatingBadge({ value, count }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
      <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
      {value ? Number(value).toFixed(1) : '–'}
      {count != null && <span className="font-normal text-ink-500">({count})</span>}
    </span>
  );
}

const JOB_COLORS = {
  pending: 'bg-amber-100 text-amber-600',
  in_discussion: 'bg-amber-500 text-brand-950',
  confirmed: 'bg-brand-600 text-white',
  in_progress: 'bg-brand-900 text-white',
  completed: 'bg-ink-300/30 text-ink-700',
  cancelled: 'bg-red-50 text-red-700',
};
const PROP_COLORS = {
  requested: 'bg-amber-100 text-amber-600',
  accepted: 'bg-amber-500 text-brand-950',
  selected: 'bg-brand-600 text-white',
  declined: 'bg-red-50 text-red-700',
  closed: 'bg-ink-300/30 text-ink-700',
  cancelled: 'bg-red-50 text-red-700',
};

export function JobStatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${JOB_COLORS[status] || ''}`}>{t(`job_${status}`)}</span>;
}

export function ProposalStatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PROP_COLORS[status] || ''}`}>{t(`prop_${status}`)}</span>;
}

export function AvailabilityBadge({ status }) {
  const { t } = useI18n();
  const cls =
    status === 'available' ? 'bg-brand-600 text-white' : status === 'busy' ? 'bg-amber-500 text-brand-950' : 'bg-ink-300/40 text-ink-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status === 'available' && <Icons.Check className="h-3.5 w-3.5" aria-hidden />}
      {status === 'busy' && <Icons.Clock className="h-3.5 w-3.5" aria-hidden />}
      {t(`st_${status}`)}
    </span>
  );
}

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500" title={t('demoDataNote')}>
      {t('demo')}
    </span>
  );
}

export function VerifiedChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> {label}
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    (ref.current?.querySelector('input, textarea, select') || ref.current?.querySelector('button'))?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md animate-fadeUp rounded-t-3xl bg-white p-6 shadow-lift sm:rounded-3xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="icon-btn h-8 w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-10 w-[4.5rem] shrink-0 items-center rounded-full transition ${checked ? 'bg-brand-600' : 'bg-ink-300'} disabled:opacity-50`}
    >
      <span className={`absolute h-8 w-8 rounded-full bg-white shadow transition-all ${checked ? 'start-[2.25rem]' : 'start-1'}`} />
    </button>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            value === o.value ? 'bg-brand-900 text-white' : 'border border-cream-200 bg-cream-100 text-brand-900 hover:bg-cream-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
