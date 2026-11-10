// All REST calls, grouped by feature.
import { api } from './api.js';

export const authApi = {
  signup: (body) => api('/auth/signup', { method: 'POST', body }),
  demoLogin: (role) => api('/auth/demo-login', { method: 'POST', body: { role } }),
  demoLoginAs: (userId) => api('/auth/demo-login', { method: 'POST', body: { userId } }),
  demoAccounts: () => api('/auth/demo-accounts'),
  me: () => api('/auth/me'),
};

export const meApi = {
  saveProfile: (body) => api('/me/profile', { method: 'PUT', body }),
  setLanguage: (language) => api('/me/settings', { method: 'PATCH', body: { language } }),
  setAvailability: (isAvailable) => api('/me/availability', { method: 'PATCH', body: { isAvailable } }),
  dashboard: () => api('/me/dashboard'),
};

export const jobsApi = {
  create: (body) => api('/jobs', { method: 'POST', body }),
  mine: () => api('/jobs/mine'),
  get: (id) => api(`/jobs/${id}`),
  matches: (id, query) => api(`/jobs/${id}/matches`, { query }),
  requestWorker: (id, workerId, note) => api(`/jobs/${id}/request`, { method: 'POST', body: { workerId, note } }),
  start: (id) => api(`/jobs/${id}/start`, { method: 'POST' }),
  complete: (id) => api(`/jobs/${id}/complete`, { method: 'POST' }),
  cancel: (id, reason) => api(`/jobs/${id}/cancel`, { method: 'POST', body: { reason } }),
  review: (id, body) => api(`/jobs/${id}/reviews`, { method: 'POST', body }),
};

export const workersApi = {
  search: (query) => api('/workers', { query }),
  profile: (id) => api(`/users/${id}`),
  startChat: (id) => api(`/users/${id}/chat`, { method: 'POST' }),
  book: (id, body) => api(`/users/${id}/book`, { method: 'POST', body }),
};

export const chatApi = {
  list: () => api('/conversations'),
  get: (id) => api(`/conversations/${id}`),
  send: (id, body) => api(`/conversations/${id}/messages`, { method: 'POST', body }),
  read: (id) => api(`/conversations/${id}/read`, { method: 'POST' }),
  respond: (id, action, price) => api(`/conversations/${id}/respond`, { method: 'POST', body: { action, price } }),
  offer: (id, amount) => api(`/conversations/${id}/offer`, { method: 'POST', body: { amount } }),
  acceptOffer: (messageId) => api(`/messages/${messageId}/accept`, { method: 'POST' }),
  confirm: (id) => api(`/conversations/${id}/confirm`, { method: 'POST' }),
  translate: (messageId, target) => api(`/messages/${messageId}/translate`, { method: 'POST', body: { target } }),
};

export const notificationsApi = {
  list: () => api('/notifications'),
  readAll: () => api('/notifications/read-all', { method: 'POST' }),
  read: (id) => api(`/notifications/${id}/read`, { method: 'POST' }),
};

export const aiApi = {
  analyzeJob: (text) => api('/ai/analyze-job', { method: 'POST', body: { text } }),
  extract: (field, text) => api('/ai/extract', { method: 'POST', body: { field, text } }),
};

export const metaApi = { get: () => api('/meta') };

const MAX_UPLOAD = 6 * 1024 * 1024;

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Shrinks large photos before upload so phones on slow data still work.
async function shrinkImage(file, maxSide = 1280) {
  if (!file.type.startsWith('image/') || file.size < 400 * 1024) return fileToDataUrl(file);
  const url = await fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function uploadFile(fileOrBlob) {
  const isImage = fileOrBlob.type?.startsWith('image/');
  const dataUrl = isImage ? await shrinkImage(fileOrBlob) : await fileToDataUrl(fileOrBlob);
  if (dataUrl.length * 0.75 > MAX_UPLOAD) {
    const err = new Error('too_large');
    err.code = 'too_large';
    throw err;
  }
  const { url } = await api('/uploads', { method: 'POST', body: { dataUrl } });
  return url;
}
