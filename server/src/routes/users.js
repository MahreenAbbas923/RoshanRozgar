import { Router } from 'express';
import { db, newId } from '../db/index.js';
import { ah, notFound, forbidden } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { publicView, miniView } from '../services/users.js';
import { findWorkers, workerWithStatus, workerDistance } from '../services/matching.js';
import { summarizeReviewsFor } from '../services/ai.js';
import { getArea, PROPOSAL_STATUS } from '../../../shared/index.js';
import { notify } from '../services/notify.js';
import { bookDirect } from '../services/booking.js';

const router = Router();
// Scoped to this router's paths: it is mounted on /api alongside other routers.
router.use(['/workers', '/users'], requireAuth);

// Worker search without a job (browse by category / area).
router.get(
  '/workers',
  ah(async (req, res) => {
    const q = req.query;
    const origin = getArea(q.area) || getArea(req.user.location?.area);
    const result = await findWorkers({
      category: q.category,
      origin,
      // Browsing a category shows every worker unless the customer picks a distance.
      maxKm: Number(q.maxKm) || 1000,
      minRating: Number(q.minRating) || 0,
      maxPrice: Number(q.maxPrice) || undefined,
      q: q.q,
      sort: q.sort,
      onlyAvailable: q.onlyAvailable === 'true',
      excludeDemo: q.excludeDemo === 'true',
    });
    res.json(result);
  }),
);

// Customer opens a chat from a worker's profile. Re-uses the latest open
// conversation with that worker; otherwise starts a job-less "inquiry" chat.
router.post(
  '/users/:id/chat',
  ah(async (req, res) => {
    if (req.user.role !== 'customer') throw forbidden('wrong_role', 'Only customers can start a chat from a profile');
    if (!req.user.profileComplete) throw forbidden('profile_incomplete', 'Please complete your profile first');
    const worker = await db.users.findById(req.params.id);
    if (!worker || worker.role !== 'worker' || !worker.profileComplete) throw notFound('worker_not_found', 'Worker not found');

    // Re-use an open inquiry, or a conversation whose job is still active;
    // finished jobs keep their own history and a new chat starts instead.
    const existing = await db.proposals.find({ customerId: req.user.id, workerId: worker.id }, { sort: { updatedAt: -1 } });
    const jobIds = existing.map((p) => p.jobId).filter(Boolean);
    const jobs = jobIds.length ? await db.jobs.find({ id: { $in: jobIds } }) : [];
    const activeJob = (p) => ['pending', 'in_discussion', 'confirmed', 'in_progress'].includes(jobs.find((j) => j.id === p.jobId)?.status);
    const open = existing.find(
      (p) => (p.status === PROPOSAL_STATUS.INQUIRY || activeJob(p)) && !['closed', 'declined', 'cancelled'].includes(p.status),
    );
    if (open) return res.json({ conversationId: open.id, created: false });

    const now = new Date().toISOString();
    const proposal = await db.proposals.insert({
      id: newId('p_'),
      jobId: null,
      workerId: worker.id,
      customerId: req.user.id,
      status: PROPOSAL_STATUS.INQUIRY,
      price: null,
      priceBy: null,
      priceAgreed: false,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await notify(worker.id, 'new_inquiry', { name: req.user.name }, `/chat/${proposal.id}`);
    res.status(201).json({ conversationId: proposal.id, created: true });
  }),
);

// Customer confirms a booking straight from the worker's profile.
router.post(
  '/users/:id/book',
  ah(async (req, res) => {
    if (req.user.role !== 'customer') throw forbidden('wrong_role', 'Only customers can book a worker');
    if (!req.user.profileComplete) throw forbidden('profile_incomplete', 'Please complete your profile first');
    const result = await bookDirect(req.user, req.params.id, req.body || {});
    res.status(201).json(result);
  }),
);

// Public profile (worker or customer) with reviews received.
router.get(
  '/users/:id',
  ah(async (req, res) => {
    const user = await db.users.findById(req.params.id);
    if (!user || !user.profileComplete) throw notFound('user_not_found', 'Profile not found');
    const reviews = await db.reviews.find({ revieweeId: user.id }, { sort: { createdAt: -1 } });
    const reviewers = await db.users.find({ id: { $in: [...new Set(reviews.map((r) => r.reviewerId))] } });
    const byId = Object.fromEntries(reviewers.map((r) => [r.id, miniView(r)]));
    const profile = publicView(user);
    let extra = {};
    if (user.role === 'worker') {
      const repeat = await repeatCustomers(user.id);
      extra = {
        ...(await workerWithStatus(user)),
        distanceKm: workerDistance(user, req.user.location),
        repeatCustomers: repeat,
        reviewSummary: await summarizeReviewsFor(user.id, reviews),
      };
    }
    res.json({
      user: { ...profile, ...extra },
      reviews: reviews.map((r) => ({ ...r, reviewer: byId[r.reviewerId] || null })),
    });
  }),
);

async function repeatCustomers(workerId) {
  const jobs = await db.jobs.find({ workerId, status: 'completed' });
  const counts = {};
  for (const j of jobs) counts[j.customerId] = (counts[j.customerId] || 0) + 1;
  return Object.values(counts).filter((c) => c > 1).length;
}

export default router;
