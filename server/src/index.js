import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { initSockets } from './sockets.js';
import { errorHandler } from './utils/http.js';
import { seedDatabase, DEMO_ACCOUNTS } from './seed/seed.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import jobRoutes from './routes/jobs.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import miscRoutes from './routes/misc.js';
import { aiStatus } from './services/ai.js';

await initDb();
if (await seedDatabase()) console.log('[seed] Demo data loaded');

const app = express();
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: '9mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', userRoutes);
app.use('/api', conversationRoutes);
app.use('/api', miscRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown API route' }));

fs.mkdirSync(config.uploadsDir, { recursive: true });
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

// In production the built React app is served from the same port.
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

app.use(errorHandler);

const server = http.createServer(app);
initSockets(server, config.clientOrigin);
server.listen(config.port, () => {
  const ai = aiStatus();
  console.log(`[server] Roshan Rozgar API on http://localhost:${config.port}`);
  console.log(`[server] Language AI: ${ai.provider === 'keywords' ? 'keyword matcher (no API key)' : `${ai.provider} (${ai.model})`}`);
  console.log(`[server] Speech-to-text: ${ai.stt === 'groq' ? `Groq ${ai.sttModel}` : 'browser only (no GROQ_API_KEY)'}`);
  console.log(`[server] Demo accounts: ${DEMO_ACCOUNTS.customer.name} (customer), ${DEMO_ACCOUNTS.worker.name} (worker) - one-tap on the login page`);
});
