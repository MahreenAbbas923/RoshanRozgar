// Notifications, uploads, AI helpers and app metadata.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, newId } from '../db/index.js';
import { config } from '../config.js';
import { ah, badRequest, notFound, HttpError } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { aiStatus, analyzeJob, extractField, translate, transcribeAudio } from '../services/ai.js';
import { CATEGORIES, AREAS, CITIES, LANGUAGES } from '../../../shared/index.js';

const router = Router();

router.get('/meta', (_req, res) => {
  res.json({ categories: CATEGORIES.map(({ keywords, ...c }) => c), areas: AREAS, cities: CITIES, ai: aiStatus(), dbMode: db.mode });
});

// ---------- Notifications ----------
router.get(
  '/notifications',
  requireAuth,
  ah(async (req, res) => {
    const list = await db.notifications.find({ userId: req.user.id }, { sort: { createdAt: -1 }, limit: 50 });
    res.json({ notifications: list, unread: list.filter((n) => !n.read).length });
  }),
);

router.post(
  '/notifications/read-all',
  requireAuth,
  ah(async (req, res) => {
    const list = await db.notifications.find({ userId: req.user.id, read: false });
    for (const n of list) await db.notifications.update(n.id, { read: true });
    res.json({ ok: true });
  }),
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  ah(async (req, res) => {
    const n = await db.notifications.findById(req.params.id);
    if (!n || n.userId !== req.user.id) throw notFound();
    await db.notifications.update(n.id, { read: true });
    res.json({ ok: true });
  }),
);

// ---------- Uploads (images, voice notes) ----------
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};
const MAX_BYTES = 6 * 1024 * 1024;

router.post(
  '/uploads',
  requireAuth,
  ah(async (req, res) => {
    const dataUrl = String(req.body?.dataUrl || '');
    const m = dataUrl.match(/^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.+)$/);
    if (!m) throw badRequest('bad_upload', 'File could not be read');
    const mime = m[1].toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext) throw badRequest('bad_type', 'Only photos (JPG, PNG, WEBP) and voice notes are allowed');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) throw badRequest('too_large', 'File is larger than 6 MB');
    fs.mkdirSync(config.uploadsDir, { recursive: true });
    const name = `${newId(mime.startsWith('image') ? 'img_' : 'aud_')}.${ext}`;
    fs.writeFileSync(path.join(config.uploadsDir, name), buf);
    res.status(201).json({ url: `/uploads/${name}`, mime, bytes: buf.length });
  }),
);

// ---------- AI ----------
router.get('/ai/status', (_req, res) => res.json(aiStatus()));

router.post(
  '/ai/analyze-job',
  requireAuth,
  ah(async (req, res) => {
    const text = String(req.body?.text || '').slice(0, 2000);
    if (!text.trim()) throw badRequest('no_text', 'Nothing to analyse');
    res.json(await analyzeJob(text));
  }),
);

// Speech-to-text and answer extraction are open (no login) because sign-up
// itself can be done by voice; a small per-IP limit protects the API key.
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, _res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) return next(new HttpError(429, 'rate_limited', 'Too many requests, please wait a moment'));
    list.push(now);
    hits.set(key, list);
    next();
  };
}

router.post(
  '/ai/transcribe',
  rateLimit(40, 60_000),
  ah(async (req, res) => {
    const m = String(req.body?.dataUrl || '').match(/^data:(audio\/[\w.+-]+)(?:;[^,]*)?;base64,(.+)$/);
    if (!m) throw badRequest('bad_audio', 'Audio could not be read');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) throw badRequest('too_large', 'Recording is too long');
    if (buf.length < 1500) return res.json({ text: '', source: 'empty' });
    const lang = ['en', 'ur', 'roman'].includes(req.body?.lang) ? req.body.lang : 'ur';
    try {
      res.json(await transcribeAudio(buf, m[1], lang));
    } catch (err) {
      console.warn('[ai] transcription failed:', err.message);
      throw new HttpError(502, 'stt_failed', 'Speech recognition failed, please try again');
    }
  }),
);

router.post(
  '/ai/extract',
  rateLimit(120, 60_000),
  ah(async (req, res) => {
    const { field, text } = req.body || {};
    res.json(await extractField(String(field), String(text || '').slice(0, 500)));
  }),
);

router.post(
  '/ai/translate',
  requireAuth,
  ah(async (req, res) => {
    const target = LANGUAGES.includes(req.body?.target) ? req.body.target : 'en';
    res.json(await translate(String(req.body?.text || '').slice(0, 2000), target));
  }),
);

export default router;
