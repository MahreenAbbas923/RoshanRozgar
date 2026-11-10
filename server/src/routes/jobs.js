import { Router } from 'express';
import { db, newId } from '../db/index.js';
import { ah, badRequest, forbidden, notFound } from '../utils/http.js';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.js';
import { enrichJobs, enrichProposals } from '../services/enrich.js';
import { findWorkers } from '../services/matching.js';
import * as booking from '../services/booking.js';
import { createReview } from '../services/reviews.js';
import { analyzeJob } from '../services/ai.js';
import { CATEGORY_KEYS, getArea, getCategory, JOB_STATUS, DEFAULT_JOB_HOURS } from '../../../shared/index.js';

const router = Router();
router.use(requireAuth, requireProfile);

const isUploadUrl = (u) => typeof u === 'string' && /^\/uploads\/[\w.-]+$/.test(u);

router.post(
  '/',
  requireRole('customer'),
  ah(async (req, res) => {
    const b = req.body || {};
    const description = String(b.description || '').trim().slice(0, 2000);
    if (description.length < 3 && !b.voiceUrl) throw badRequest('no_description', 'Describe the problem by typing or speaking');

    // Use the confirmed AI analysis from the client if present; otherwise analyse now.
    const ai = b.ai && b.ai.category ? b.ai : await analyzeJob(description);
    const category = CATEGORY_KEYS.includes(b.category) ? b.category : ai.category;
    const area = getArea(b.location?.area) || getArea(req.user.location?.area);
    if (!area) throw badRequest('no_location', 'Choose where the work is');

    const when = b.when === 'scheduled' ? 'scheduled' : 'now';
    let scheduledAt = new Date();
    if (when === 'scheduled') {
      scheduledAt = new Date(b.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) throw badRequest('bad_time', 'Choose a valid date and time');
      if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) throw badRequest('past_time', 'Choose a time in the future');
    }
    const budget = Number(b.budget) > 0 ? Math.round(Number(b.budget)) : null;
    const now = new Date().toISOString();
    const job = await db.jobs.insert({
      id: newId('j_'),
      customerId: req.user.id,
      category,
      title: String(b.title || ai.title || getCategory(category).names.en).slice(0, 80),
      description,
      descriptionLang: ai.language || '',
      voiceUrl: isUploadUrl(b.voiceUrl) ? b.voiceUrl : '',
      voiceDurationSec: Number(b.voiceDurationSec) || 0,
      images: (b.images || []).filter(isUploadUrl).slice(0, 5),
      location: {
        area: area.key,
        city: area.city,
        lat: area.lat,
        lng: area.lng,
        address: String(b.location?.address || req.user.location?.address || '').slice(0, 200),
        source: 'saved',
      },
      when,
      scheduledAt: scheduledAt.toISOString(),
      durationHours: DEFAULT_JOB_HOURS,
      budget,
      ai,
      status: JOB_STATUS.PENDING,
      workerId: null,
      agreedPrice: null,
      timeline: [{ status: JOB_STATUS.PENDING, at: now, by: req.user.id }],
      createdAt: now,
      updatedAt: now,
    });
    const matches = await findWorkers({ category, origin: job.location, job, maxKm: 10 });
    res.status(201).json({ job, matches });
  }),
);

router.get(
  '/mine',
  ah(async (req, res) => {
    const filter = req.user.role === 'customer' ? { customerId: req.user.id } : { workerId: req.user.id };
    const jobs = await db.jobs.find(filter, { sort: { createdAt: -1 } });
    res.json({ jobs: await enrichJobs(jobs, req.user.id) });
  }),
);

async function loadVisibleJob(req) {
  const job = await db.jobs.findById(req.params.id);
  if (!job) throw notFound('job_not_found', 'Job not found');
  const u = req.user;
  if (job.customerId === u.id || job.workerId === u.id) return job;
  if (u.role === 'worker' && (await db.proposals.findOne({ jobId: job.id, workerId: u.id }))) return job;
  throw forbidden();
}

router.get(
  '/:id',
  ah(async (req, res) => {
    const job = await loadVisibleJob(req);
    const [enriched] = await enrichJobs([job], req.user.id);
    const filter = req.user.role === 'customer' ? { jobId: job.id } : { jobId: job.id, workerId: req.user.id };
    const proposals = await enrichProposals(await db.proposals.find(filter, { sort: { updatedAt: -1 } }), req.user.id);
    const reviews = await db.reviews.find({ jobId: job.id });
    res.json({ job: enriched, proposals, reviews });
  }),
);

router.get(
  '/:id/matches',
  requireRole('customer'),
  ah(async (req, res) => {
    const job = await loadVisibleJob(req);
    const q = req.query;
    const result = await findWorkers({
      category: q.category || job.category,
      origin: job.location,
      job,
      maxKm: Number(q.maxKm) || 10,
      minRating: Number(q.minRating) || 0,
      maxPrice: Number(q.maxPrice) || undefined,
      q: q.q,
      sort: q.sort,
      onlyAvailable: q.onlyAvailable !== 'false',
    });
    const proposals = await db.proposals.find({ jobId: job.id });
    const contacted = Object.fromEntries(proposals.map((p) => [p.workerId, { proposalId: p.id, status: p.status }]));
    res.json({ ...result, contacted });
  }),
);

router.post(
  '/:id/request',
  requireRole('customer'),
  ah(async (req, res) => {
    const proposal = await booking.requestWorker(req.user, req.params.id, req.body?.workerId, String(req.body?.note || '').slice(0, 500));
    res.status(201).json({ proposal });
  }),
);

router.post('/:id/start', requireRole('worker'), ah(async (req, res) => res.json({ job: await booking.startJob(req.user, req.params.id) })));
router.post('/:id/complete', ah(async (req, res) => res.json({ job: await booking.completeJob(req.user, req.params.id) })));
router.post(
  '/:id/cancel',
  ah(async (req, res) => res.json({ job: await booking.cancelJob(req.user, req.params.id, String(req.body?.reason || '').slice(0, 300)) })),
);

router.post(
  '/:id/reviews',
  ah(async (req, res) => {
    const review = await createReview(req.user, req.params.id, req.body || {});
    res.status(201).json({ review });
  }),
);

export default router;
