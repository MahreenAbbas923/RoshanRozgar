import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { HttpError } from '../utils/http.js';

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '365d' });

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token && verifyToken(token);
    if (!payload) throw new HttpError(401, 'unauthenticated', 'Please log in');
    const user = await db.users.findById(payload.sub);
    if (!user) throw new HttpError(401, 'unauthenticated', 'Account not found');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole = (role) => (req, _res, next) => {
  if (req.user?.role !== role) return next(new HttpError(403, 'wrong_role', `Only ${role}s can do this`));
  next();
};

// Blocks marketplace actions until the one-time profile is complete.
export const requireProfile = (req, _res, next) => {
  if (!req.user?.profileComplete) return next(new HttpError(403, 'profile_incomplete', 'Please complete your profile first'));
  next();
};
