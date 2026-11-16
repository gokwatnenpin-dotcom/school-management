export function cx(...values) {
  return values.filter(Boolean).join(' ');
}

const honorifics = new Set([
  'dr',
  'dr.',
  'mr',
  'mr.',
  'mrs',
  'mrs.',
  'ms',
  'ms.',
  'prof',
  'prof.',
  'rev',
  'rev.',
]);

export function firstName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const filtered = parts.filter((part) => !honorifics.has(part.toLowerCase()));
  return filtered[0] || parts[0] || name;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const avatarPalette = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
];

export function avatarClass(name = '') {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % 9973;
  }
  return avatarPalette[hash % avatarPalette.length];
}

export const CLASS_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() >= 8 ? year : year - 1;
  return `${start}/${start + 1}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function gradeInfo(score) {
  if (score === null || score === undefined || score === '') {
    return { letter: '—', tone: 'slate', label: 'Not graded' };
  }
  const value = Number(score);
  if (Number.isNaN(value)) return { letter: '—', tone: 'slate', label: 'Not graded' };
  if (value >= 80) return { letter: 'A', tone: 'emerald', label: 'Excellent' };
  if (value >= 70) return { letter: 'B', tone: 'sky', label: 'Very good' };
  if (value >= 60) return { letter: 'C', tone: 'amber', label: 'Good' };
  if (value >= 50) return { letter: 'D', tone: 'orange', label: 'Pass' };
  return { letter: 'F', tone: 'rose', label: 'Needs support' };
}

export const gradeBarClass = {
  A: 'from-emerald-500 to-emerald-400',
  B: 'from-sky-500 to-sky-400',
  C: 'from-amber-500 to-amber-400',
  D: 'from-orange-500 to-orange-400',
  F: 'from-rose-500 to-rose-400',
};

export function auditTone(action = '') {
  if (action.startsWith('auth.')) return 'sky';
  if (action.startsWith('user.')) return 'violet';
  if (action.startsWith('student.')) return 'brand';
  if (action.startsWith('subject.')) return 'amber';
  if (action.startsWith('grade.')) return 'emerald';
  if (action.startsWith('enrollment.')) return 'slate';
  return 'rose';
}

export function auditLabel(action = '') {
  return action.replace(/[._]/g, ' ');
}

export function auditDescription(log) {
  const details = log?.details || {};
  switch (log?.action) {
    case 'grade.saved':
      return [details.student, details.subject, details.score != null ? `scored ${details.score}` : null]
        .filter(Boolean)
        .join(' · ');
    case 'student.created':
    case 'student.updated':
    case 'student.deleted':
      return details.name || '';
    case 'subject.created':
    case 'subject.updated':
    case 'subject.deleted':
      return [details.code, details.name].filter(Boolean).join(' · ');
    case 'enrollment.created':
    case 'enrollment.deleted':
      return [details.student, details.subject, details.term].filter(Boolean).join(' · ');
    case 'user.created':
    case 'user.updated':
      return [details.email, details.role, details.position].filter(Boolean).join(' · ');
    case 'user.deleted':
      return [details.email, details.role].filter(Boolean).join(' · ');
    case 'auth.login':
      return 'Signed in to Scholara';
    case 'auth.password_changed':
      return 'Password updated';
    case 'profile.updated':
      return 'Profile details updated';
    default: {
      if (!details || typeof details !== 'object') return '';
      return Object.values(details)
        .filter((value) => typeof value !== 'object' && value !== null)
        .slice(0, 3)
        .join(' · ');
    }
  }
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
