// Single source of truth for whether a worker is free. Status is derived from
// the availability toggle + confirmed/in-progress bookings every time it is
// read, so it can never drift out of sync with the bookings themselves.
import { db } from '../db/index.js';
import { JOB_STATUS, DEFAULT_JOB_HOURS, DEFAULT_WORKING_HOURS } from '../../../shared/index.js';

export const ENGAGED_STATUSES = [JOB_STATUS.CONFIRMED, JOB_STATUS.IN_PROGRESS];
const HOUR = 3600 * 1000;
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const pkFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Karachi',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Day of week and minutes after midnight in Pakistan time.
export function pkParts(date) {
  const parts = Object.fromEntries(pkFormat.formatToParts(new Date(date)).map((p) => [p.type, p.value]));
  return { day: WEEKDAYS[parts.weekday], minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const toMinutes = (hhmm = '00:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export function withinWorkingHours(worker, date) {
  const wh = worker.workingHours || DEFAULT_WORKING_HOURS;
  const { day, minutes } = pkParts(date);
  return wh.days.includes(day) && minutes >= toMinutes(wh.start) && minutes < toMinutes(wh.end);
}

export function jobSlot(job, startOverride) {
  const start = new Date(startOverride || job.scheduledAt || job.createdAt).getTime();
  const end = start + (job.durationHours || DEFAULT_JOB_HOURS) * HOUR;
  return { start, end };
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

export async function engagedJobsFor(workerIds) {
  const ids = Array.isArray(workerIds) ? workerIds : [workerIds];
  if (!ids.length) return [];
  return db.jobs.find({ workerId: { $in: ids }, status: { $in: ENGAGED_STATUSES } });
}

// 'offline' (toggle off), 'busy' (working on / booked for right now) or 'available'.
export function workerStatus(worker, engagedJobs, at = Date.now()) {
  const mine = engagedJobs.filter((j) => j.workerId === worker.id);
  const now = { start: at, end: at + 1 };
  const engagedNow = mine.some((j) => j.status === JOB_STATUS.IN_PROGRESS || overlaps(jobSlot(j), now));
  if (engagedNow) return 'busy';
  if (!worker.isAvailable) return 'offline';
  return 'available';
}

// Returns the conflicting job if the worker already has a booking in the slot.
export function findConflict(workerId, slot, engagedJobs, excludeJobId) {
  return (
    engagedJobs.find((j) => {
      if (j.workerId !== workerId || j.id === excludeJobId) return false;
      const s = jobSlot(j);
      // A job still in progress keeps the worker engaged until at least an hour from now.
      if (j.status === JOB_STATUS.IN_PROGRESS) s.end = Math.max(s.end, Date.now() + HOUR);
      return overlaps(s, slot);
    }) || null
  );
}

// Can this worker take a job at the requested time?
export function canTakeJob(worker, job, engagedJobs) {
  const isNow = job.when !== 'scheduled';
  const slot = isNow ? jobSlot(job, Date.now()) : jobSlot(job);
  const conflict = findConflict(worker.id, slot, engagedJobs, job.id);
  if (conflict) return { ok: false, reason: 'conflict', conflict };
  if (isNow) {
    if (!worker.isAvailable) return { ok: false, reason: 'offline' };
  } else if (!withinWorkingHours(worker, slot.start)) {
    return { ok: false, reason: 'outside_hours' };
  }
  return { ok: true };
}
