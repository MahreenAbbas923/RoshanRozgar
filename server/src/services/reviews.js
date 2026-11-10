// Two-way reviews after a completed job. One review per reviewer per job.
import { db, newId } from '../db/index.js';
import { JOB_STATUS } from '../../../shared/index.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/http.js';
import { notify } from './notify.js';

const CUSTOMER_CRITERIA = ['behavior', 'communication', 'professionalism', 'overall'];

export async function recomputeRating(userId) {
  const reviews = await db.reviews.find({ revieweeId: userId });
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  await db.users.update(userId, { ratingAvg: avg, ratingCount: count });
}

export async function createReview(user, jobId, input) {
  const job = await db.jobs.findById(jobId);
  if (!job) throw notFound('job_not_found', 'Job not found');
  if (job.status !== JOB_STATUS.COMPLETED) throw badRequest('job_not_completed', 'You can review only after the job is completed');
  const isCustomer = user.id === job.customerId;
  const isWorker = user.id === job.workerId;
  if (!isCustomer && !isWorker) throw forbidden();
  const existing = await db.reviews.findOne({ jobId, reviewerId: user.id });
  if (existing) throw conflict('already_reviewed', 'You have already reviewed this job');

  let rating = Math.round(Number(input.rating));
  let criteria = null;
  if (isWorker) {
    // Worker rates the customer on four simple criteria; overall is the rating.
    criteria = {};
    for (const k of CUSTOMER_CRITERIA) {
      const v = Math.round(Number(input.criteria?.[k]));
      if (!(v >= 1 && v <= 5)) throw badRequest('bad_criteria', `Please rate ${k}`);
      criteria[k] = v;
    }
    rating = criteria.overall;
  }
  if (!(rating >= 1 && rating <= 5)) throw badRequest('bad_rating', 'Choose 1 to 5 stars');
  const text = String(input.text || '').slice(0, 1000);
  const audioUrl = /^\/uploads\/[\w.-]+$/.test(input.audioUrl || '') ? input.audioUrl : '';

  const review = await db.reviews.insert({
    id: newId('r_'),
    jobId,
    reviewerId: user.id,
    revieweeId: isCustomer ? job.workerId : job.customerId,
    direction: isCustomer ? 'customer_to_worker' : 'worker_to_customer',
    rating,
    criteria,
    tags: (input.tags || []).slice(0, 6).map(String),
    text,
    audioUrl,
    transcript: String(input.transcript || '').slice(0, 1000),
    language: ['en', 'ur', 'roman'].includes(input.language) ? input.language : user.language,
    createdAt: new Date().toISOString(),
  });
  await recomputeRating(review.revieweeId);
  await notify(review.revieweeId, 'new_review', { name: user.name, rating }, isCustomer ? '/profile' : '/profile');
  return review;
}
