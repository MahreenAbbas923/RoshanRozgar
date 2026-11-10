// Flat illustrations used as portfolio placeholders for seeded demo workers.
// Real users upload photos; these are labelled "sample illustration" in the UI.
const SCENES = {
  electrician: [
    (
      <g key="a">
        <rect x="30" y="20" width="60" height="80" rx="6" fill="#E9EEF0" stroke="#9AA7AB" strokeWidth="3" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <rect x={38 + i * 10} y="30" width="6" height="10" rx="1" fill="#F29A1F" />
            <path d={`M${41 + i * 10} 40 q ${i % 2 ? 6 : -6} 25 0 50`} stroke="#167A6E" strokeWidth="2.5" fill="none" />
          </g>
        ))}
        <line x1="40" y1="70" x2="80" y2="70" stroke="#D9534F" strokeWidth="2" />
      </g>
    ),
    (
      <g key="b">
        <circle cx="60" cy="60" r="8" fill="#F29A1F" stroke="#fff" strokeWidth="3" />
        {[0, 120, 240].map((r) => (
          <path key={r} d="M60 60 q 30 -12 40 -2 q -14 10 -40 2z" fill="#8A6A4A" transform={`rotate(${r} 60 60)`} />
        ))}
      </g>
    ),
    (
      <g key="c">
        <rect x="35" y="40" width="50" height="45" rx="6" fill="#fff" stroke="#C9D2D4" strokeWidth="3" />
        <rect x="43" y="50" width="9" height="9" rx="2" fill="#167A6E" />
        <rect x="56" y="50" width="9" height="9" rx="2" fill="#167A6E" />
        <rect x="69" y="50" width="9" height="9" rx="2" fill="#167A6E" />
        <circle cx="60" cy="73" r="5" fill="#E9EEF0" stroke="#9AA7AB" strokeWidth="2" />
        <path d="M52 15 L48 38" stroke="#10241F" strokeWidth="4" />
        <circle cx="92" cy="40" r="4" fill="#F29A1F" />
      </g>
    ),
  ],
  plumber: [
    (
      <g key="a">
        <path d="M30 40 h40 v15 h20 v40" stroke="#9AA7AB" strokeWidth="10" fill="none" strokeLinecap="round" />
        <circle cx="90" cy="100" r="5" fill="#4BA3C7" />
        <rect x="62" y="33" width="14" height="14" rx="3" fill="#167A6E" />
      </g>
    ),
    (
      <g key="b">
        <path d="M40 35 h30 a10 10 0 0 1 10 10 v8" stroke="#9AA7AB" strokeWidth="8" fill="none" strokeLinecap="round" />
        <rect x="50" y="25" width="10" height="12" rx="2" fill="#167A6E" />
        <path d="M80 60 q -4 8 0 12 q 4 -4 0 -12z" fill="#4BA3C7" />
        <rect x="30" y="80" width="60" height="18" rx="9" fill="#E9EEF0" />
      </g>
    ),
    (
      <g key="c">
        <rect x="40" y="25" width="40" height="70" rx="8" fill="#fff" stroke="#C9D2D4" strokeWidth="3" />
        <circle cx="60" cy="45" r="8" fill="#F29A1F" />
        <rect x="52" y="65" width="16" height="4" rx="2" fill="#9AA7AB" />
      </g>
    ),
  ],
  ac_repair: [
    (
      <g key="a">
        <rect x="20" y="35" width="80" height="30" rx="8" fill="#fff" stroke="#C9D2D4" strokeWidth="3" />
        <line x1="30" y1="57" x2="90" y2="57" stroke="#9AA7AB" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${45 + i * 15} 72 q 3 8 0 14`} stroke="#4BA3C7" strokeWidth="3" fill="none" strokeLinecap="round" />
        ))}
      </g>
    ),
    (
      <g key="b">
        <rect x="40" y="20" width="40" height="80" rx="6" fill="#fff" stroke="#C9D2D4" strokeWidth="3" />
        <line x1="40" y1="50" x2="80" y2="50" stroke="#C9D2D4" strokeWidth="3" />
        <rect x="70" y="30" width="4" height="12" rx="2" fill="#9AA7AB" />
        <rect x="70" y="58" width="4" height="16" rx="2" fill="#9AA7AB" />
      </g>
    ),
    (
      <g key="c">
        <circle cx="60" cy="60" r="28" fill="#E9EEF0" stroke="#9AA7AB" strokeWidth="3" />
        <path d="M60 38 v44 M38 60 h44 M45 45 l30 30 M75 45 l-30 30" stroke="#167A6E" strokeWidth="3" />
      </g>
    ),
  ],
};

const GENERIC = (category) => [
  (
    <g key="a">
      <rect x="25" y="30" width="70" height="60" rx="8" fill="#fff" stroke="#C9D2D4" strokeWidth="3" />
      <path d="M40 75 l15 -20 l12 14 l8 -8 l12 14" stroke="#167A6E" strokeWidth="3" fill="none" />
      <circle cx="78" cy="45" r="6" fill="#F29A1F" />
    </g>
  ),
  (
    <g key="b">
      <rect x="30" y="50" width="60" height="40" rx="4" fill={category === 'painter' ? '#F6B44A' : '#C9A47A'} />
      <rect x="30" y="35" width="60" height="15" rx="4" fill={category === 'painter' ? '#167A6E' : '#8A6A4A'} />
      <rect x="55" y="62" width="10" height="4" rx="2" fill="#fff" />
    </g>
  ),
  (
    <g key="c">
      <path d="M35 85 l40 -40 l10 10 l-40 40z" fill="#9AA7AB" />
      <rect x="72" y="28" width="22" height="16" rx="3" fill="#167A6E" transform="rotate(45 83 36)" />
      <circle cx="40" cy="40" r="6" fill="#F29A1F" />
    </g>
  ),
];

export default function WorkIllustration({ refString, className = '' }) {
  const [, category = 'other', n = '1'] = String(refString).split(':');
  const scenes = SCENES[category] || GENERIC(category);
  const scene = scenes[(Number(n) - 1) % scenes.length];
  const bg = ['#F3EBDD', '#F7EFE2', '#EFE6D6'][(Number(n) - 1) % 3];
  return (
    <svg viewBox="0 0 120 120" className={`h-full w-full ${className}`} role="img" aria-label="Sample work illustration">
      <rect width="120" height="120" fill={bg} />
      {scene}
    </svg>
  );
}

export function PortfolioImage({ src, className = '' }) {
  if (String(src).startsWith('illustration:')) return <WorkIllustration refString={src} className={className} />;
  return <img src={src} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />;
}
