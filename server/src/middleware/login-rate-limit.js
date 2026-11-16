const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const attempts = new Map();

export function loginRateLimit(req, res, next) {
  const key = req.ip || 'unknown';
  const startedAt = Date.now();
  const record = attempts.get(key);

  if (record && startedAt - record.first < WINDOW_MS && record.count >= MAX_FAILURES) {
    const minutes = Math.max(1, Math.ceil((WINDOW_MS - (startedAt - record.first)) / 60000));
    return res.status(429).json({
      error: `Too many failed sign-in attempts. Please try again in ${minutes} minute(s).`,
    });
  }

  res.on('finish', () => {
    if (res.statusCode === 401) {
      const current = attempts.get(key);
      if (!current || startedAt - current.first >= WINDOW_MS) {
        attempts.set(key, { count: 1, first: startedAt });
      } else {
        current.count += 1;
      }
    } else if (res.statusCode < 400) {
      attempts.delete(key);
    }
  });

  next();
}
