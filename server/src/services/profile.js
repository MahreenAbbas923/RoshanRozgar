// Builds a validated profile update. Used by sign-up (new user) and by
// profile editing (existing user) so both follow the same rules.
import { CATEGORY_KEYS, LANGUAGES, getArea, DEFAULT_WORKING_HOURS } from '../../../shared/index.js';
import { badRequest } from '../utils/http.js';

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const isUploadUrl = (u) => typeof u === 'string' && /^\/uploads\/[\w.-]+$/.test(u);

function buildLocation(input, fallback) {
  const area = getArea(input?.area);
  if (!area) return fallback || null;
  return {
    area: area.key,
    city: area.city,
    lat: area.lat,
    lng: area.lng,
    address: str(input.address, 200),
    source: input.source === 'gps' ? 'gps-nearest-area' : 'saved',
  };
}

function validHours(h) {
  if (!h) return null;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const days = (h.days || []).map(Number).filter((d) => d >= 0 && d <= 6);
  if (!days.length || !time.test(h.start) || !time.test(h.end) || h.start >= h.end) return null;
  return { days: [...new Set(days)].sort(), start: h.start, end: h.end };
}

// Returns { patch, missing } where `missing` lists required fields still empty.
export function buildProfileUpdate(u, b = {}) {
  const patch = {};
  if (b.name !== undefined) patch.name = str(b.name, 60);
  if (b.avatar !== undefined) patch.avatar = isUploadUrl(b.avatar) ? b.avatar : '';
  if (b.gender !== undefined) patch.gender = b.gender === 'female' ? 'female' : 'male';
  if (b.language && LANGUAGES.includes(b.language)) patch.language = b.language;
  if (b.location !== undefined) patch.location = buildLocation(b.location, u.location);
  if (b.profileMethod) patch.profileMethod = b.profileMethod === 'voice' ? 'voice' : 'manual';

  if (u.role === 'worker') {
    if (b.skills !== undefined) patch.skills = [...new Set((b.skills || []).filter((s) => CATEGORY_KEYS.includes(s)))];
    if (b.subSkills !== undefined) patch.subSkills = (b.subSkills || []).map((s) => str(s, 40)).filter(Boolean).slice(0, 12);
    if (b.experienceYears !== undefined) patch.experienceYears = Math.max(0, Math.min(60, Math.round(Number(b.experienceYears) || 0)));
    if (b.rate !== undefined) patch.rate = Math.max(0, Math.min(100000, Math.round(Number(b.rate) || 0)));
    if (b.bio !== undefined) patch.bio = str(b.bio, 500);
    if (b.serviceAreas !== undefined) patch.serviceAreas = [...new Set((b.serviceAreas || []).filter((a) => getArea(a)))];
    if (b.serviceRadiusKm !== undefined) patch.serviceRadiusKm = Math.max(1, Math.min(30, Number(b.serviceRadiusKm) || 8));
    if (b.workingHours !== undefined) {
      const wh = validHours(b.workingHours);
      if (!wh) throw badRequest('bad_hours', 'Working hours are not valid');
      patch.workingHours = wh;
    }
    if (b.portfolio !== undefined) {
      patch.portfolio = (b.portfolio || []).filter((p) => isUploadUrl(p) || /^illustration:[a-z_]+:\d$/.test(p)).slice(0, 12);
    }
    if (b.voiceIntro !== undefined) patch.voiceIntro = isUploadUrl(b.voiceIntro) ? b.voiceIntro : '';

    const next = { ...u, ...patch };
    if (!next.workingHours) patch.workingHours = DEFAULT_WORKING_HOURS;
    if (!next.location && next.serviceAreas?.length) patch.location = buildLocation({ area: next.serviceAreas[0] });
    if (!next.serviceAreas?.length && next.location?.area) patch.serviceAreas = [next.location.area];
  }

  const merged = { ...u, ...patch };
  const missing = [];
  if (!merged.name) missing.push('name');
  if (u.role === 'customer' && !merged.location) missing.push('location');
  if (u.role === 'worker' && !merged.skills?.length) missing.push('skills');
  if (u.role === 'worker' && !merged.serviceAreas?.length) missing.push('serviceAreas');
  if (b.complete && missing.length) throw badRequest('profile_missing', 'Some required details are missing', { missing });
  if (!missing.length) {
    if (!u.profileComplete && u.role === 'worker') patch.isAvailable = true; // new workers start visible
    patch.profileComplete = true;
  }
  return { patch, missing };
}
