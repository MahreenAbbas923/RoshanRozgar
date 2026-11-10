import { Router } from 'express';
import { db } from '../db/index.js';
import { ah, notFound } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { publicView, miniView } from '../services/users.js';
import { findWorkers, workerWithStatus, workerDistance } from '../services/matching.js';
import { summarizeReviewsFor } from '../services/ai.js';
import { getArea } from '../../../shared/index.js';

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
      maxKm: Number(q.maxKm) || 10,
      minRating: Number(q.minRating) || 0,
      maxPrice: Number(q.maxPrice) || undefined,
      q: q.q,
      sort: q.sort,
      onlyAvailable: q.onlyAvailable === 'true',
    });
    res.json(result);
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
