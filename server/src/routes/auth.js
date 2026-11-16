import { Router } from 'express';
import { hashPassword, signToken, verifyPassword } from '../auth.js';
import { one, query } from '../db.js';
import { ApiError } from '../lib/api-error.js';
import { logAudit } from '../lib/audit.js';
import { publicUser } from '../lib/user.js';
import { changePasswordSchema, loginSchema, parse, profileSchema } from '../lib/validators.js';
import { authenticate } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/login-rate-limit.js';

const router = Router();

router.post('/login', loginRateLimit, async (req, res) => {
  const data = parse(loginSchema, req.body);

  const user = await one('SELECT * FROM users WHERE lower(email) = lower($1)', [data.email]);
  const passwordOk = user ? await verifyPassword(data.password, user.password_hash) : false;

  if (!user || !passwordOk) {
    throw new ApiError(401, 'Incorrect email or password.');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'This account has been deactivated. Contact an administrator.');
  }

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  await logAudit({
    userId: user.id,
    action: 'auth.login',
    entity: 'user',
    entityId: user.id,
    details: { email: user.email },
  });

  res.json({ token: signToken(user), user: publicUser({ ...user, last_login_at: new Date() }) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', authenticate, async (req, res) => {
  const data = parse(profileSchema, req.body);
  const fields = [];
  const values = [];

  for (const key of ['full_name', 'phone']) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (!fields.length) throw new ApiError(400, 'No changes were submitted.');

  values.push(req.user.id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
     RETURNING id, full_name, email, role, position, phone, is_active, last_login_at, created_at`,
    values,
  );

  await logAudit({
    userId: req.user.id,
    action: 'profile.updated',
    entity: 'user',
    entityId: req.user.id,
    details: { changes: Object.keys(data) },
  });

  res.json({ user: rows[0] });
});

router.post('/change-password', authenticate, async (req, res) => {
  const data = parse(changePasswordSchema, req.body);

  const user = await one('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await verifyPassword(data.current_password, user.password_hash);
  if (!valid) throw new ApiError(400, 'Your current password is incorrect.');

  const passwordHash = await hashPassword(data.new_password);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);

  await logAudit({
    userId: req.user.id,
    action: 'auth.password_changed',
    entity: 'user',
    entityId: req.user.id,
  });

  res.json({ message: 'Your password has been updated.' });
});

export default router;
