import { Router } from 'express';
import { db } from '../db/index.js';
import { ah, badRequest, forbidden, notFound } from '../utils/http.js';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.js';
import { enrichProposals } from '../services/enrich.js';
import { postMessage } from '../services/chat.js';
import * as booking from '../services/booking.js';
import { translate } from '../services/ai.js';
import { detectLanguage, LANGUAGES } from '../../../shared/index.js';
import { emitToProposal } from '../sockets.js';

const router = Router();
// Scoped to this router's paths: it is mounted on /api alongside other routers.
router.use(['/conversations', '/messages'], requireAuth, requireProfile);

const isUploadUrl = (u) => typeof u === 'string' && /^\/uploads\/[\w.-]+$/.test(u);

async function loadOwn(req) {
  const p = await db.proposals.findById(req.params.id);
  if (!p) throw notFound('proposal_not_found', 'Conversation not found');
  if (p.customerId !== req.user.id && p.workerId !== req.user.id) throw forbidden();
  return p;
}

router.get(
  '/conversations',
  ah(async (req, res) => {
    const key = req.user.role === 'customer' ? 'customerId' : 'workerId';
    const list = await db.proposals.find({ [key]: req.user.id });
    const enriched = await enrichProposals(list, req.user.id);
    enriched.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt));
    res.json({ conversations: enriched });
  }),
);

router.get(
  '/conversations/:id',
  ah(async (req, res) => {
    const p = await loadOwn(req);
    const [conversation] = await enrichProposals([p], req.user.id);
    const messages = await db.messages.find({ proposalId: p.id }, { sort: { createdAt: 1 } });
    res.json({ conversation, messages });
  }),
);

router.post(
  '/conversations/:id/messages',
  ah(async (req, res) => {
    const p = await loadOwn(req);
    if (['closed', 'declined', 'cancelled'].includes(p.status)) throw badRequest('conversation_closed', 'This conversation is closed');
    const b = req.body || {};
    const type = ['text', 'voice', 'image'].includes(b.type) ? b.type : 'text';
    const text = String(b.text || '').trim().slice(0, 2000);
    if (type === 'text' && !text) throw badRequest('empty_message', 'Message is empty');
    if (type === 'voice' && !isUploadUrl(b.audioUrl)) throw badRequest('bad_audio', 'Voice note missing');
    if (type === 'image' && !isUploadUrl(b.imageUrl)) throw badRequest('bad_image', 'Image missing');
    const transcript = String(b.transcript || '').slice(0, 2000);
    const msg = await postMessage(p, req.user.id, {
      type,
      text,
      lang: detectLanguage(text || transcript),
      audioUrl: type === 'voice' ? b.audioUrl : '',
      durationSec: Math.min(300, Number(b.durationSec) || 0),
      transcript,
      imageUrl: type === 'image' ? b.imageUrl : '',
    });
    res.status(201).json({ message: msg });
  }),
);

router.post(
  '/conversations/:id/read',
  ah(async (req, res) => {
    const p = await loadOwn(req);
    const msgs = await db.messages.find({ proposalId: p.id });
    for (const m of msgs) {
      if (!m.readBy?.includes(req.user.id)) await db.messages.update(m.id, { readBy: [...(m.readBy || []), req.user.id] });
    }
    res.json({ ok: true });
  }),
);

router.post(
  '/conversations/:id/respond',
  requireRole('worker'),
  ah(async (req, res) => {
    const action = req.body?.action === 'decline' ? 'decline' : 'accept';
    res.json({ proposal: await booking.respondToRequest(req.user, req.params.id, action, req.body?.price) });
  }),
);

router.post(
  '/conversations/:id/offer',
  ah(async (req, res) => res.status(201).json({ message: await booking.makeOffer(req.user, req.params.id, req.body?.amount) })),
);

router.post(
  '/conversations/:id/confirm',
  requireRole('customer'),
  ah(async (req, res) => res.json({ job: await booking.confirmBooking(req.user, req.params.id) })),
);

router.post('/messages/:id/accept', ah(async (req, res) => res.json({ proposal: await booking.acceptOffer(req.user, req.params.id) })));

// Translate a message into the reader's language (Claude only; cached on the message).
router.post(
  '/messages/:id/translate',
  ah(async (req, res) => {
    const msg = await db.messages.findById(req.params.id);
    if (!msg) throw notFound();
    const p = await db.proposals.findById(msg.proposalId);
    if (!p || (p.customerId !== req.user.id && p.workerId !== req.user.id)) throw forbidden();
    const target = LANGUAGES.includes(req.body?.target) ? req.body.target : req.user.language;
    const cached = msg.translation?.[target];
    if (cached) return res.json({ translation: cached, source: 'cache', cached: true });
    const source = msg.text || msg.transcript;
    if (!source) throw badRequest('nothing_to_translate', 'Nothing to translate');
    const result = await translate(source, target);
    if (result.translation && ['claude', 'groq'].includes(result.source)) {
      const translation = { ...(msg.translation || {}), [target]: result.translation };
      const updated = await db.messages.update(msg.id, { translation });
      emitToProposal(p.id, 'chat:message:update', updated);
    }
    res.json(result);
  }),
);

export default router;
