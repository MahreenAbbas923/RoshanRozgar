import { Router } from 'express';
import { db } from '../db/index.js';
import { ah } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withStatus } from './auth.js';
import { enrichJobs, enrichProposals } from '../services/enrich.js';
import { LANGUAGES, JOB_STATUS, PROPOSAL_STATUS } from '../../../shared/index.js';
import { buildProfileUpdate } from '../services/profile.js';

const router = Router();
router.use(requireAuth);

// Creates the profile the first time and edits it afterwards - always the same record.
router.put(
  '/profile',
  ah(async (req, res) => {
    const u = req.user;
    const { patch, missing } = buildProfileUpdate(u, req.body || {});
    const updated = await db.users.update(u.id, patch);
    res.json({ user: await withStatus(updated), missing });
  }),
);

router.patch(
  '/settings',
  ah(async (req, res) => {
    const patch = {};
    if (LANGUAGES.includes(req.body?.language)) patch.language = req.body.language;
    const updated = await db.users.update(req.user.id, patch);
    res.json({ user: await withStatus(updated) });
  }),
);

router.patch(
  '/availability',
  requireRole('worker'),
  ah(async (req, res) => {
    const updated = await db.users.update(req.user.id, { isAvailable: !!req.body?.isAvailable });
    res.json({ user: await withStatus(updated) });
  }),
);

function completion(u) {
  const checks =
    u.role === 'worker'
      ? [u.name, u.avatar, u.skills?.length, u.subSkills?.length, u.experienceYears, u.rate, u.serviceAreas?.length, u.portfolio?.length, u.bio]
      : [u.name, u.avatar, u.location];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

router.get(
  '/dashboard',
  ah(async (req, res) => {
    const u = req.user;
    if (u.role === 'customer') {
      const jobs = await enrichJobs(await db.jobs.find({ customerId: u.id }, { sort: { createdAt: -1 } }), u.id);
      return res.json({ user: await withStatus(u), completion: completion(u), jobs });
    }
    const proposals = await enrichProposals(await db.proposals.find({ workerId: u.id }, { sort: { updatedAt: -1 } }), u.id);
    const jobs = await enrichJobs(await db.jobs.find({ workerId: u.id }, { sort: { scheduledAt: 1 } }), u.id);
    const completed = jobs.filter((j) => j.status === JOB_STATUS.COMPLETED);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const earnings = {
      total: completed.reduce((s, j) => s + (j.agreedPrice || 0), 0),
      thisMonth: completed.filter((j) => new Date(j.completedAt || j.updatedAt) >= monthStart).reduce((s, j) => s + (j.agreedPrice || 0), 0),
      jobs: completed.length,
    };
    const reviews = await db.reviews.find({ revieweeId: u.id }, { sort: { createdAt: -1 }, limit: 5 });
    res.json({
      user: await withStatus(u),
      completion: completion(u),
      requests: proposals.filter((p) => p.status === PROPOSAL_STATUS.REQUESTED && ['pending', 'in_discussion'].includes(p.job?.status)),
      negotiating: proposals.filter((p) => p.status === PROPOSAL_STATUS.ACCEPTED && ['pending', 'in_discussion'].includes(p.job?.status)),
      jobs,
      earnings,
      reviews,
    });
  }),
);

export default router;
