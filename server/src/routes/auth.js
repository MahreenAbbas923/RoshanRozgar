import { Router } from 'express';
import { db, newId } from '../db/index.js';
import { ah, badRequest, notFound } from '../utils/http.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { selfView } from '../services/users.js';
import { workerWithStatus } from '../services/matching.js';
import { buildProfileUpdate } from '../services/profile.js';
import { LANGUAGES } from '../../../shared/index.js';
import { DEMO_ACCOUNTS } from '../seed/seed.js';

const router = Router();

async function withStatus(user) {
  const view = selfView(user);
  if (user.role === 'worker') Object.assign(view, await workerWithStatus(user));
  return view;
}

// One-step sign-up: the profile form (typed or answered by voice) creates the
// account. No phone number or PIN; the returned token keeps the user signed in
// on this device.
router.post(
  '/signup',
  ah(async (req, res) => {
    const b = req.body || {};
    if (!['customer', 'worker'].includes(b.role)) throw badRequest('bad_role', 'Choose customer or worker');
    const base = {
      id: newId('u_'),
      role: b.role,
      name: '',
      language: LANGUAGES.includes(b.language) ? b.language : 'en',
      avatar: '',
      avatarSeed: Math.floor(Math.random() * 1000),
      gender: 'male',
      location: null,
      profileComplete: false,
      profileMethod: 'manual',
      isDemo: false,
      skills: [],
      subSkills: [],
      experienceYears: 0,
      rate: 0,
      bio: '',
      serviceAreas: [],
      serviceRadiusKm: 8,
      workingHours: null,
      isAvailable: false,
      portfolio: [],
      phoneVerified: false,
      ratingAvg: 0,
      ratingCount: 0,
      completedJobs: 0,
      createdAt: new Date().toISOString(),
    };
    const { patch } = buildProfileUpdate(base, { ...b, complete: true });
    const user = await db.users.insert({ ...base, ...patch });
    res.status(201).json({ token: signToken(user), user: await withStatus(user) });
  }),
);

// Seeded demo accounts that can be opened with one tap (judges / testing).
// Only records marked isDemo are listed or reachable this way.
router.get(
  '/demo-accounts',
  ah(async (_req, res) => {
    const users = await db.users.find({ isDemo: true });
    res.json({
      accounts: users
        .map((u) => ({ id: u.id, name: u.name, role: u.role, skills: u.skills, area: u.location?.area, avatar: u.avatar, avatarSeed: u.avatarSeed, gender: u.gender }))
        .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
    });
  }),
);

// One-tap sign-in to a seeded demo account: by `userId`, or by `role` for the
// two featured accounts (Sara = customer, Ali Khan = worker).
router.post(
  '/demo-login',
  ah(async (req, res) => {
    let user = null;
    if (req.body?.userId) {
      user = await db.users.findOne({ id: String(req.body.userId), isDemo: true });
    } else {
      const demo = DEMO_ACCOUNTS[req.body?.role];
      if (!demo) throw badRequest('bad_role', 'Unknown demo account');
      user = await db.users.findOne({ phone: demo.phone, isDemo: true });
    }
    if (!user) throw notFound('demo_missing', 'Demo account not found. Run npm run seed.');
    res.json({ token: signToken(user), user: await withStatus(user) });
  }),
);

// Session verification used by the splash screen and "Continue as" cards.
router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    res.json({ user: await withStatus(req.user) });
  }),
);

export default router;
export { withStatus };
