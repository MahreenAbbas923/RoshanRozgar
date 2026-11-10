// Notifications are stored with a type + params; the client translates them
// into the reader's language, so one record works for every language.
import { db, newId } from '../db/index.js';
import { emitToUser } from '../sockets.js';

export async function notify(userId, type, params = {}, link = '') {
  const n = await db.notifications.insert({
    id: newId('n_'),
    userId,
    type,
    params,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
  emitToUser(userId, 'notification', n);
  return n;
}
