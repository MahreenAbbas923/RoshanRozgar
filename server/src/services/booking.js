// Job lifecycle: request -> worker accepts & quotes -> price agreed in chat ->
// customer confirms ONE worker -> in progress -> completed (or cancelled).
import { db, newId } from '../db/index.js';
import { JOB_STATUS, PROPOSAL_STATUS } from '../../../shared/index.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/http.js';
import { engagedJobsFor, canTakeJob, jobSlot, findConflict } from './availability.js';
import { postMessage, systemMessage } from './chat.js';
import { notify } from './notify.js';
import { emitToUser } from '../sockets.js';

const OPEN_JOB = [JOB_STATUS.PENDING, JOB_STATUS.IN_DISCUSSION];
const now = () => new Date().toISOString();

async function setJobStatus(job, status, by, extra = {}) {
  const timeline = [...(job.timeline || []), { status, at: now(), by }];
  const updated = await db.jobs.update(job.id, { ...extra, status, timeline, updatedAt: now() });
  for (const uid of [updated.customerId, updated.workerId].filter(Boolean)) emitToUser(uid, 'job:update', { jobId: job.id, status });
  return updated;
}

async function loadProposal(id, user) {
  const p = await db.proposals.findById(id);
  if (!p) throw notFound('proposal_not_found', 'Conversation not found');
  if (user && p.customerId !== user.id && p.workerId !== user.id) throw forbidden();
  return p;
}

async function loadJob(id) {
  const job = await db.jobs.findById(id);
  if (!job) throw notFound('job_not_found', 'Job not found');
  return job;
}

// Customer asks a worker about a job. Re-uses the existing conversation if any.
export async function requestWorker(customer, jobId, workerId, note) {
  const job = await loadJob(jobId);
  if (job.customerId !== customer.id) throw forbidden();
  if (!OPEN_JOB.includes(job.status)) throw badRequest('job_not_open', 'This job is already booked or closed');
  const worker = await db.users.findById(workerId);
  if (!worker || worker.role !== 'worker') throw notFound('worker_not_found', 'Worker not found');

  const existing = await db.proposals.findOne({ jobId, workerId });
  if (existing && ![PROPOSAL_STATUS.CLOSED, PROPOSAL_STATUS.CANCELLED].includes(existing.status)) return existing;

  const engaged = await engagedJobsFor(workerId);
  const fit = canTakeJob(worker, job, engaged);
  if (!fit.ok) throw conflict(`worker_${fit.reason}`, 'This worker is not free at that time');

  const proposal = existing
    ? await db.proposals.update(existing.id, { status: PROPOSAL_STATUS.REQUESTED, priceAgreed: false, updatedAt: now() })
    : await db.proposals.insert({
        id: newId('p_'),
        jobId,
        workerId,
        customerId: customer.id,
        status: PROPOSAL_STATUS.REQUESTED,
        price: job.budget || null,
        priceBy: job.budget ? customer.id : null,
        priceAgreed: false,
        lastMessageAt: now(),
        createdAt: now(),
        updatedAt: now(),
      });
  await systemMessage(proposal, 'request_sent', { title: job.title, budget: job.budget || null });
  if (note) await postMessage(proposal, customer.id, { type: 'text', text: note });
  if (job.voiceUrl) await postMessage(proposal, customer.id, { type: 'voice', audioUrl: job.voiceUrl, transcript: job.description, durationSec: job.voiceDurationSec || 0 });
  await notify(workerId, 'new_request', { name: customer.name, title: job.title, area: job.location?.area }, `/chat/${proposal.id}`);
  return proposal;
}

// Worker accepts (with a price) or declines a request.
export async function respondToRequest(worker, proposalId, action, price) {
  const p = await loadProposal(proposalId, worker);
  if (p.workerId !== worker.id) throw forbidden();
  const job = await loadJob(p.jobId);
  if (!OPEN_JOB.includes(job.status)) throw badRequest('job_not_open', 'This job is no longer open');
  if (![PROPOSAL_STATUS.REQUESTED, PROPOSAL_STATUS.ACCEPTED].includes(p.status)) throw badRequest('bad_state', 'Request already handled');

  if (action === 'decline') {
    const updated = await db.proposals.update(p.id, { status: PROPOSAL_STATUS.DECLINED, updatedAt: now() });
    await systemMessage(updated, 'worker_declined', { name: worker.name });
    await notify(p.customerId, 'worker_declined', { name: worker.name, title: job.title }, `/jobs/${job.id}`);
    return updated;
  }

  const engaged = await engagedJobsFor(worker.id);
  const fit = canTakeJob(worker, job, engaged);
  if (!fit.ok) throw conflict(`worker_${fit.reason}`, 'You already have a booking at that time');

  const amount = Number(price) || p.price || worker.rate || null;
  const updated = await db.proposals.update(p.id, { status: PROPOSAL_STATUS.ACCEPTED, updatedAt: now() });
  await systemMessage(updated, 'worker_accepted', { name: worker.name });
  if (amount) await makeOffer(worker, p.id, amount);
  if (job.status === JOB_STATUS.PENDING) await setJobStatus(job, JOB_STATUS.IN_DISCUSSION, worker.id);
  await notify(p.customerId, 'worker_accepted', { name: worker.name, title: job.title, amount }, `/chat/${p.id}`);
  return db.proposals.findById(p.id);
}

// Either side proposes a price. Earlier open offers are superseded.
export async function makeOffer(user, proposalId, amount) {
  const p = await loadProposal(proposalId, user);
  const value = Math.round(Number(amount));
  if (!value || value < 100 || value > 500000) throw badRequest('bad_amount', 'Enter a price between Rs 100 and Rs 500,000');
  const job = await loadJob(p.jobId);
  if (!OPEN_JOB.includes(job.status)) throw badRequest('job_not_open', 'Price can only change before booking');
  if ([PROPOSAL_STATUS.DECLINED, PROPOSAL_STATUS.CLOSED, PROPOSAL_STATUS.CANCELLED].includes(p.status)) {
    throw badRequest('bad_state', 'This conversation is closed');
  }
  const open = await db.messages.find({ proposalId: p.id, type: 'price_offer', offerStatus: 'open' });
  for (const m of open) await db.messages.update(m.id, { offerStatus: 'superseded' });
  await db.proposals.update(p.id, { price: value, priceBy: user.id, priceAgreed: false, updatedAt: now() });
  const msg = await postMessage(p, user.id, { type: 'price_offer', amount: value });
  const other = user.id === p.customerId ? p.workerId : p.customerId;
  await notify(other, 'price_offer', { name: user.name, amount: value }, `/chat/${p.id}`);
  return msg;
}

// The other side accepts the latest open offer -> price agreed.
export async function acceptOffer(user, messageId) {
  const msg = await db.messages.findById(messageId);
  if (!msg || msg.type !== 'price_offer') throw notFound('offer_not_found', 'Offer not found');
  const p = await loadProposal(msg.proposalId, user);
  if (msg.senderId === user.id) throw badRequest('own_offer', 'You cannot accept your own offer');
  if (msg.offerStatus !== 'open') throw badRequest('offer_closed', 'This offer is no longer open');
  if (p.status === PROPOSAL_STATUS.REQUESTED && user.id === p.workerId) {
    // Worker accepting the customer's price also accepts the request.
    await db.proposals.update(p.id, { status: PROPOSAL_STATUS.ACCEPTED });
    const job = await loadJob(p.jobId);
    if (job.status === JOB_STATUS.PENDING) await setJobStatus(job, JOB_STATUS.IN_DISCUSSION, user.id);
  }
  await db.messages.update(msg.id, { offerStatus: 'accepted' });
  const updated = await db.proposals.update(p.id, { price: msg.amount, priceAgreed: true, updatedAt: now() });
  await systemMessage(updated, 'price_agreed', { amount: msg.amount });
  const other = user.id === p.customerId ? p.workerId : p.customerId;
  await notify(other, 'price_agreed', { name: user.name, amount: msg.amount }, `/chat/${p.id}`);
  return updated;
}

// Customer books exactly one worker for the job.
export async function confirmBooking(customer, proposalId) {
  const p = await loadProposal(proposalId, customer);
  if (p.customerId !== customer.id) throw forbidden();
  const job = await loadJob(p.jobId);
  if (job.workerId || !OPEN_JOB.includes(job.status)) throw conflict('already_booked', 'This job already has a confirmed worker');
  if (p.status !== PROPOSAL_STATUS.ACCEPTED) throw badRequest('worker_not_accepted', 'The worker has not accepted this job yet');
  if (!p.priceAgreed || !p.price) throw badRequest('price_not_agreed', 'Agree on a price in the chat first');

  const worker = await db.users.findById(p.workerId);
  const engaged = await engagedJobsFor(worker.id);
  const fit = canTakeJob(worker, job, engaged);
  if (!fit.ok) throw conflict(`worker_${fit.reason}`, 'This worker just got booked or went offline. Choose another worker.');

  const startAt = job.when === 'scheduled' ? job.scheduledAt : now();
  // Conditional update: only succeeds if no other confirmation got in first.
  const claimed = await db.jobs.updateWhere(job.id, { workerId: null, status: { $in: OPEN_JOB } }, { workerId: worker.id });
  if (!claimed) throw conflict('already_booked', 'This job already has a confirmed worker');
  // Re-check the worker after claiming, in case two jobs raced for the same slot.
  const recheck = findConflict(worker.id, jobSlot({ ...job, scheduledAt: startAt }), await engagedJobsFor(worker.id), job.id);
  if (recheck) {
    await db.jobs.update(job.id, { workerId: null });
    throw conflict('worker_conflict', 'This worker was booked for the same time by someone else');
  }

  const booked = await setJobStatus(claimed, JOB_STATUS.CONFIRMED, customer.id, { agreedPrice: p.price, scheduledAt: startAt });
  const selected = await db.proposals.update(p.id, { status: PROPOSAL_STATUS.SELECTED, updatedAt: now() });
  await systemMessage(selected, 'booking_confirmed', { amount: p.price });
  await notify(worker.id, 'booking_confirmed', { name: customer.name, title: job.title, amount: p.price }, `/jobs/${job.id}`);

  // Close every other conversation for this job so no second worker can be booked.
  const others = await db.proposals.find({ jobId: job.id, id: { $ne: p.id } });
  for (const o of others) {
    if ([PROPOSAL_STATUS.CLOSED, PROPOSAL_STATUS.DECLINED].includes(o.status)) continue;
    const closed = await db.proposals.update(o.id, { status: PROPOSAL_STATUS.CLOSED, updatedAt: now() });
    await systemMessage(closed, 'job_given_to_other', {});
    await notify(o.workerId, 'job_taken', { title: job.title }, `/chat/${o.id}`);
  }
  return booked;
}

export async function startJob(worker, jobId) {
  const job = await loadJob(jobId);
  if (job.workerId !== worker.id) throw forbidden();
  if (job.status !== JOB_STATUS.CONFIRMED) throw badRequest('bad_state', 'Only confirmed jobs can be started');
  const updated = await setJobStatus(job, JOB_STATUS.IN_PROGRESS, worker.id, { startedAt: now() });
  const p = await db.proposals.findOne({ jobId, workerId: worker.id, status: PROPOSAL_STATUS.SELECTED });
  if (p) await systemMessage(p, 'job_started', {});
  await notify(job.customerId, 'job_started', { name: worker.name, title: job.title }, `/jobs/${job.id}`);
  return updated;
}

export async function completeJob(user, jobId) {
  const job = await loadJob(jobId);
  if (user.id !== job.workerId && user.id !== job.customerId) throw forbidden();
  if (![JOB_STATUS.CONFIRMED, JOB_STATUS.IN_PROGRESS].includes(job.status)) throw badRequest('bad_state', 'This job is not active');
  const updated = await setJobStatus(job, JOB_STATUS.COMPLETED, user.id, { completedAt: now() });
  const worker = await db.users.findById(job.workerId);
  const customer = await db.users.findById(job.customerId);
  await db.users.update(worker.id, { completedJobs: (worker.completedJobs || 0) + 1 });
  await db.users.update(customer.id, { completedJobs: (customer.completedJobs || 0) + 1 });
  const p = await db.proposals.findOne({ jobId, workerId: job.workerId, status: PROPOSAL_STATUS.SELECTED });
  if (p) await systemMessage(p, 'job_completed', { amount: job.agreedPrice });
  const other = user.id === job.workerId ? customer : worker;
  await notify(other.id, 'job_completed', { name: user.name, title: job.title }, `/jobs/${job.id}/review`);
  await notify(user.id, 'please_review', { title: job.title }, `/jobs/${job.id}/review`);
  return updated;
}

export async function cancelJob(user, jobId, reason = '') {
  const job = await loadJob(jobId);
  const isCustomer = user.id === job.customerId;
  const isWorker = user.id === job.workerId;
  if (!isCustomer && !isWorker) throw forbidden();
  if ([JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED, JOB_STATUS.IN_PROGRESS].includes(job.status)) {
    throw badRequest('cannot_cancel', 'This job can no longer be cancelled');
  }

  if (isWorker) {
    // Worker backs out: the job goes back to the customer, who can pick someone else.
    const p = await db.proposals.findOne({ jobId, workerId: user.id, status: PROPOSAL_STATUS.SELECTED });
    const reopened = await setJobStatus(job, JOB_STATUS.IN_DISCUSSION, user.id, { workerId: null, agreedPrice: null, cancelReason: reason });
    if (p) {
      const c = await db.proposals.update(p.id, { status: PROPOSAL_STATUS.CANCELLED, updatedAt: now() });
      await systemMessage(c, 'worker_cancelled', { reason });
    }
    // Re-open other conversations so the customer can continue with them.
    const others = await db.proposals.find({ jobId, status: PROPOSAL_STATUS.CLOSED });
    for (const o of others) {
      await db.proposals.update(o.id, { status: o.price ? PROPOSAL_STATUS.ACCEPTED : PROPOSAL_STATUS.REQUESTED, priceAgreed: false });
    }
    await notify(job.customerId, 'worker_cancelled', { name: user.name, title: job.title }, `/jobs/${job.id}`);
    return reopened;
  }

  const cancelled = await setJobStatus(job, JOB_STATUS.CANCELLED, user.id, { cancelReason: reason });
  const proposals = await db.proposals.find({ jobId });
  for (const p of proposals) {
    if ([PROPOSAL_STATUS.CLOSED, PROPOSAL_STATUS.DECLINED, PROPOSAL_STATUS.CANCELLED].includes(p.status)) continue;
    const c = await db.proposals.update(p.id, { status: p.status === PROPOSAL_STATUS.SELECTED ? PROPOSAL_STATUS.CANCELLED : PROPOSAL_STATUS.CLOSED });
    await systemMessage(c, 'customer_cancelled', { reason });
    await notify(p.workerId, 'customer_cancelled', { name: user.name, title: job.title }, `/chat/${p.id}`);
  }
  return cancelled;
}
