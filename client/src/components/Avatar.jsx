// Shows the user's photo, or a friendly illustrated avatar generated from a
// seed (matches the illustration style of the design).
const SKIN = ['#C98A5E', '#B57A4F', '#D9A27A', '#A86B43', '#E0B08A'];
const HAT = ['#F29A1F', '#167A6E', '#5B6B3A', '#0F4A44', '#8A5A2B'];
const BG = ['#FDEFD3', '#DDEFEA', '#FFF6E8', '#EEF7F4'];

export default function Avatar({ user, size = 48, className = '' }) {
  const label = user?.name || '';
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={label}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const seed = Math.abs(Number(user?.avatarSeed) || hash(label));
  const skin = SKIN[seed % SKIN.length];
  const hat = HAT[(seed >> 2) % HAT.length];
  const bg = BG[(seed >> 1) % BG.length];
  const female = user?.gender === 'female';
  const hardHat = !female && user?.role === 'worker' && seed % 3 === 0;
  const beard = !female && seed % 2 === 0;
  const grey = !female && seed % 5 === 0;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <circle cx="32" cy="32" r="32" fill={bg} />
      {female ? (
        <>
          <path d="M14 64c0-14 8-22 18-22s18 8 18 22z" fill={hat} />
          <ellipse cx="32" cy="30" rx="15" ry="17" fill={hat} />
          <ellipse cx="32" cy="31" rx="10" ry="11.5" fill={skin} />
          <circle cx="28" cy="30" r="1.4" fill="#1f2a27" />
          <circle cx="36" cy="30" r="1.4" fill="#1f2a27" />
          <path d="M28.5 36c2 1.6 5 1.6 7 0" stroke="#7a3b2a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M16 64c0-12 7-19 16-19s16 7 16 19z" fill={hardHat ? '#167A6E' : '#E9DCC6'} />
          <rect x="28" y="40" width="8" height="8" fill={skin} />
          <ellipse cx="32" cy="31" rx="11" ry="12.5" fill={skin} />
          {beard && <path d={`M21.5 31c0 10 4.5 14 10.5 14s10.5-4 10.5-14c-2 4-5 5-10.5 5s-8.5-1-10.5-5z`} fill={grey ? '#d6d3cd' : '#2a211c'} />}
          <circle cx="27.5" cy="30" r="1.4" fill="#1f2a27" />
          <circle cx="36.5" cy="30" r="1.4" fill="#1f2a27" />
          <path d="M28.5 37c2 1.4 5 1.4 7 0" stroke={beard ? '#f5efe6' : '#7a3b2a'} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {hardHat ? (
            <>
              <path d="M19 24c0-8 6-13 13-13s13 5 13 13z" fill="#F29A1F" />
              <rect x="16" y="23" width="32" height="3.5" rx="1.7" fill="#F29A1F" />
              <rect x="30.5" y="10.5" width="3" height="10" rx="1.5" fill="#F6B44A" />
            </>
          ) : (
            <>
              <path d="M20 25c0-7 5-11.5 12-11.5S44 18 44 25z" fill={hat} />
              <path d="M30 24h17c0 2-1.5 3-3.5 3H30z" fill={hat} opacity="0.85" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

function hash(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
