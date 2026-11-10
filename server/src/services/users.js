// Shapes user records for API responses. Phone numbers are never shown to
// other users; contact happens through in-app chat.
export function selfView(user) {
  if (!user) return null;
  const { pinHash, ...rest } = user;
  return rest;
}

export function publicView(user, extra = {}) {
  if (!user) return null;
  const { pinHash, phone, ...rest } = user;
  return { ...rest, phoneMasked: phone ? `${phone.slice(0, 4)}•••••${phone.slice(-2)}` : '', ...extra };
}

// A short card used inside job/proposal/chat payloads.
export function miniView(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    avatarSeed: user.avatarSeed,
    gender: user.gender,
    skills: user.skills,
    rate: user.rate,
    ratingAvg: user.ratingAvg,
    ratingCount: user.ratingCount,
    completedJobs: user.completedJobs,
    experienceYears: user.experienceYears,
    location: user.location,
    isDemo: user.isDemo,
  };
}
