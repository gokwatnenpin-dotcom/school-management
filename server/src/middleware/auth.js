import { verifyToken } from '../auth.js';
import { query } from '../db.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const { rows } = await query(
      `SELECT id, full_name, email, role, position, phone, is_active, last_login_at, created_at
       FROM users WHERE id = $1`,
      [payload.sub],
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'This account is inactive or no longer exists.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
