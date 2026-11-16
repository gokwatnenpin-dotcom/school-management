export const ROLES = ['supadmin', 'admin', 'user'];
export const POSITIONS = ['principal', 'teacher', 'staff'];

const USER_PERMISSIONS = [
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
];

const ADMIN_PERMISSIONS = [
  ...USER_PERMISSIONS,
  'students:delete',
  'subjects:delete',
  'grades:delete',
  'users:view',
  'users:create',
  'users:update',
  'users:delete',
  'audit:view',
];

export const ROLE_PERMISSIONS = {
  user: USER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  supadmin: [...ADMIN_PERMISSIONS, 'users:roles', 'system:manage'],
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
