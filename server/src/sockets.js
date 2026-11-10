// Socket.IO: authenticated connections join a personal room (user:<id>) and,
// when they open a chat, the conversation room (proposal:<id>).
import { Server } from 'socket.io';
import { verifyToken } from './middleware/auth.js';
import { db } from './db/index.js';

let io = null;

export function initSockets(httpServer, origin) {
  io = new Server(httpServer, { cors: { origin, credentials: true }, maxHttpBufferSize: 1e6 });

  io.use((socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token);
    if (!payload) return next(new Error('unauthenticated'));
    socket.userId = payload.sub;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on('chat:join', async (proposalId, ack) => {
      const p = await db.proposals.findById(proposalId);
      const allowed = p && (p.customerId === socket.userId || p.workerId === socket.userId);
      if (allowed) socket.join(`proposal:${proposalId}`);
      ack?.({ ok: !!allowed });
    });
    socket.on('chat:leave', (proposalId) => socket.leave(`proposal:${proposalId}`));
    socket.on('chat:typing', ({ proposalId, recording }) => {
      if (socket.rooms.has(`proposal:${proposalId}`)) {
        socket.to(`proposal:${proposalId}`).emit('chat:typing', { proposalId, userId: socket.userId, recording: !!recording });
      }
    });
  });
  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToProposal(proposalId, event, payload) {
  io?.to(`proposal:${proposalId}`).emit(event, payload);
}
