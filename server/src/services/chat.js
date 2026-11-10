import { db, newId } from '../db/index.js';
import { emitToProposal, emitToUser } from '../sockets.js';

// Stores a chat message and pushes it to both participants in real time.
export async function postMessage(proposal, senderId, data) {
  const msg = await db.messages.insert({
    id: newId('m_'),
    proposalId: proposal.id,
    senderId: senderId || null,
    type: data.type || 'text',
    text: data.text || '',
    lang: data.lang || '',
    audioUrl: data.audioUrl || '',
    durationSec: data.durationSec || 0,
    transcript: data.transcript || '',
    translation: data.translation || null,
    imageUrl: data.imageUrl || '',
    amount: data.amount ?? null,
    offerStatus: data.type === 'price_offer' ? 'open' : null,
    systemKey: data.systemKey || null,
    systemParams: data.systemParams || null,
    readBy: senderId ? [senderId] : [],
    createdAt: new Date().toISOString(),
  });
  await db.proposals.update(proposal.id, { lastMessageAt: msg.createdAt, updatedAt: msg.createdAt });
  emitToProposal(proposal.id, 'chat:message', msg);
  for (const uid of [proposal.customerId, proposal.workerId]) emitToUser(uid, 'inbox:update', { proposalId: proposal.id, message: msg });
  return msg;
}

export const systemMessage = (proposal, systemKey, systemParams = {}) =>
  postMessage(proposal, null, { type: 'system', systemKey, systemParams });
