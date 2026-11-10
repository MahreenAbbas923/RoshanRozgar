// Chooses MongoDB when MONGODB_URI is set and reachable, otherwise the demo
// file store. Everything else in the server talks to `db` only.
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { createFileStore } from './fileStore.js';
import { createMongoStore } from './mongoStore.js';

let store = null;

export async function initDb() {
  if (config.mongoUri) {
    try {
      store = await createMongoStore(config.mongoUri);
      console.log('[db] Connected to MongoDB');
      return store;
    } catch (err) {
      console.error(`[db] MongoDB connection failed (${err.message}). Falling back to demo file store.`);
    }
  }
  store = createFileStore(path.join(config.dataDir, 'demo-db.json'));
  console.log('[db] DEMO MODE - data stored in server/data/demo-db.json');
  return store;
}

export const db = {
  get mode() {
    return store?.mode;
  },
  get users() {
    return store.collection('users');
  },
  get jobs() {
    return store.collection('jobs');
  },
  get proposals() {
    return store.collection('proposals');
  },
  get messages() {
    return store.collection('messages');
  },
  get reviews() {
    return store.collection('reviews');
  },
  get notifications() {
    return store.collection('notifications');
  },
  flush: () => store?.flush(),
};

export const newId = (prefix = '') => `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
