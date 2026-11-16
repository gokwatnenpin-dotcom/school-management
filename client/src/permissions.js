export const ROLE_PERMISSIONS = {
  user: [
    'dashboard:view',
    'students:view',
    'students:create',
    'students:update',
    'subjects:view',
    'subjects:create',
    'subjects:update',
    'enrollments:view',
    'enrollments:create',
    'enrollments:update',
    'enrollments:delete',
    'grades:view',
    'grades:create',
    'grades:update',
  ],
  admin: [
    'dashboard:view',
    'students:view',
    'students:create',
    'students:update',
    'students:delete',
    'subjects:view',
    'subjects:create',
    'subjects:update',
    'subjects:delete',
    'enrollments:view',
    'enrollments:create',
    'enrollments:update',
    'enrollments:delete',
    'grades:view',
    'grades:create',
    'grades:update',
    'grades:delete',
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'audit:view',
  ],
  supadmin: [
    'dashboard:view',
    'students:view',
    'students:create',
    'students:update',
    'students:delete',
    'subjects:view',
    'subjects:create',
    'subjects:update',
    'subjects:delete',
    'enrollments:view',
    'enrollments:create',
    'enrollments:update',
    'enrollments:delete',
    'grades:view',
    'grades:create',
    'grades:update',
    'grades:delete',
    'users:view',
    'users:create',
    'users:update',
    'users:delete',
    'users:roles',
    'audit:view',
    'system:manage',
  ],
};

export const ROLE_LABELS = {
  supadmin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
};

export function can(role, permission) {
  return Boolean(role && ROLE_PERMISSIONS[role]?.includes(permission));
}

export function isPrincipal(user) {
  return user?.role === 'user' && user?.position === 'principal';
}

export function canViewStaff(user) {
  return ['admin', 'supadmin'].includes(user?.role) || isPrincipal(user);
}

export function canCreateStaff(user) {
  return canViewStaff(user);
}

export function positionLabel(position) {
  if (!position) return 'Staff';
  return position.charAt(0).toUpperCase() + position.slice(1);
}

export function roleDisplay(user) {
  if (!user) return '';
  if (user.role === 'user') return positionLabel(user.position);
  return ROLE_LABELS[user.role] ?? user.role;
}
