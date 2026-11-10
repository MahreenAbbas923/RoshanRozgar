export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const notFound = (code = 'not_found', message = 'Not found') => new HttpError(404, code, message);
export const forbidden = (code = 'forbidden', message = 'Not allowed') => new HttpError(403, code, message);
export const conflict = (code, message, details) => new HttpError(409, code, message, details);

// Wraps async route handlers so thrown errors reach the error middleware.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'too_large', message: 'File is too large' });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: 'server_error', message: 'Something went wrong on the server' });
}
