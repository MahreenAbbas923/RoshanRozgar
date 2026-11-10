// Joins related records for API responses (the store has no joins).
import { db } from '../db/index.js';
import { miniView } from './users.js';

async function usersById(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const users = await db.users.find({ id: { $in: unique } });
  return Object.fromEntries(users.map((u) => [u.id, miniView(u)]));
}

export async function enrichJobs(jobs, viewerId) {
  if (!jobs.length) return [];
  const users = await usersById(jobs.flatMap((j) => [j.customerId, j.workerId]));
  const jobIds = jobs.map((j) => j.id);
  const proposals = await db.proposals.find({ jobId: { $in: jobIds } });
  const myReviews = viewerId ? await db.reviews.find({ jobId: { $in: jobIds }, reviewerId: viewerId }) : [];
  return jobs.map((j) => ({
    ...j,
    customer: users[j.customerId] || null,
    worker: users[j.workerId] || null,
    proposalCount: proposals.filter((p) => p.jobId === j.id).length,
    reviewedByMe: myReviews.some((r) => r.jobId === j.id),
  }));
}

export async function enrichProposals(proposals, viewerId) {
  if (!proposals.length) return [];
  const users = await usersById(proposals.flatMap((p) => [p.customerId, p.workerId]));
  const jobs = await db.jobs.find({ id: { $in: [...new Set(proposals.map((p) => p.jobId))] } });
  const jobsById = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const out = [];
  for (const p of proposals) {
    const msgs = await db.messages.find({ proposalId: p.id }, { sort: { createdAt: -1 } });
    out.push({
      ...p,
      job: jobsById[p.jobId] || null,
      customer: users[p.customerId] || null,
      worker: users[p.workerId] || null,
      lastMessage: msgs[0] || null,
      unread: viewerId ? msgs.filter((m) => m.senderId && !m.readBy?.includes(viewerId)).length : 0,
    });
  }
  return out;
}
