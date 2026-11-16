import { can } from '../permissions.js';

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!can(req.user?.role, permission)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action.',
        required: permission,
      });
    }
    next();
  };
}

export function requireAccess(check, required) {
  return (req, res, next) => {
    if (!check(req.user)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action.',
        required,
      });
    }
    next();
  };
}
