// Finds and ranks workers for a request. Distance is measured between the
// customer's saved area and the closest of the worker's service areas
// (seeded area centres - not live GPS).
import { db } from '../db/index.js';
import { getArea, distanceKm, getCategory } from '../../../shared/index.js';
import { engagedJobsFor, workerStatus, canTakeJob } from './availability.js';
import { publicView } from './users.js';

// Distance from the worker's base area to the customer's area.
export function workerDistance(worker, origin) {
  if (!origin) return null;
  const base = worker.location || getArea(worker.serviceAreas?.[0]);
  return distanceKm(origin, base);
}

const coversArea = (worker, origin) => !!origin?.area && (worker.serviceAreas || []).includes(origin.area);

function scoreWorker(w, distance, maxKm, job) {
  const reasons = [];
  let score = 0;
  score += ((w.ratingAvg || 0) / 5) * 35;
  if (w.ratingAvg >= 4.7 && w.ratingCount >= 10) reasons.push('top_rated');
  if (distance != null) {
    score += Math.max(0, 1 - distance / Math.max(maxKm, 1)) * 30;
    if (distance <= 2) reasons.push('very_close');
  }
  score += (Math.min(w.experienceYears || 0, 15) / 15) * 15;
  if ((w.experienceYears || 0) >= 10) reasons.push('experienced');
  score += (Math.min(w.completedJobs || 0, 200) / 200) * 10;
  // Sub-skill match against the job text (e.g. "switchboard", "gas refill").
  if (job?.description) {
    const text = `${job.title || ''} ${job.description}`.toLowerCase();
    const hit = (w.subSkills || []).find((s) => s.split(/[ /]+/).some((word) => word.length > 3 && text.includes(word.toLowerCase())));
    if (hit) {
      score += 10;
      reasons.push(`skill:${hit}`);
    }
  }
  return { score: Math.round(score), reasons };
}

/**
 * @param {object} opts
 *  category, origin {lat,lng}, job (optional, for time + text), maxKm, minRating,
 *  maxPrice, onlyAvailable (default true), q (name search), sort
 */
export async function findWorkers(opts = {}) {
  const { category, origin, job, maxKm = 10, minRating = 0, maxPrice, onlyAvailable = true, q, sort = 'best', excludeDemo = false } = opts;
  const filter = { role: 'worker', profileComplete: true };
  if (category && category !== 'all') filter.skills = category;
  const workers = await db.users.find(filter);
  const engaged = await engagedJobsFor(workers.map((w) => w.id));
  const requestJob = job || { when: 'now' };

  const results = [];
  let hiddenBusy = 0;
  for (const w of workers) {
    if (excludeDemo && w.isDemo) continue;
    const distance = workerDistance(w, origin);
    const covers = coversArea(w, origin);
    if (origin && distance != null && distance > maxKm && !covers) continue;
    if (minRating && (w.ratingAvg || 0) < minRating) continue;
    if (maxPrice && w.rate > maxPrice) continue;
    if (q) {
      const hay = `${w.name} ${(w.subSkills || []).join(' ')} ${(w.skills || []).map((s) => getCategory(s).names.en).join(' ')}`.toLowerCase();
      if (!hay.includes(String(q).toLowerCase())) continue;
    }
    const status = workerStatus(w, engaged);
    const fit = canTakeJob(w, requestJob, engaged);
    if (onlyAvailable && !fit.ok) {
      hiddenBusy += 1;
      continue;
    }
    const { score, reasons } = scoreWorker(w, distance, maxKm, job);
    results.push({
      ...publicView(w),
      distanceKm: distance,
      coversArea: covers,
      status,
      canTake: fit.ok,
      unavailableReason: fit.ok ? null : fit.reason,
      matchScore: score,
      matchReasons: reasons,
    });
  }

  const sorters = {
    best: (a, b) => b.matchScore - a.matchScore,
    distance: (a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
    rating: (a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount,
    price: (a, b) => a.rate - b.rate,
    experience: (a, b) => b.experienceYears - a.experienceYears,
  };
  // Real people who signed up come before seeded demo profiles.
  const bySort = sorters[sort] || sorters.best;
  results.sort((a, b) => Number(!!a.isDemo) - Number(!!b.isDemo) || bySort(a, b));
  return { workers: results, hiddenBusy };
}

export async function workerWithStatus(worker) {
  const engaged = await engagedJobsFor(worker.id);
  return { status: workerStatus(worker, engaged) };
}
