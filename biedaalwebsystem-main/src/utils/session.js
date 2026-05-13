export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'team2_user';

export const AUTH_CHANGE_EVENT = 'team2-auth-change';
export const ROLE_CHANGE_EVENT = 'team2-role-change';
export const USER_CHANGE_EVENT = 'team2-user-change';

function dispatch(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function trimStoredValue(raw) {
  if (!raw) return '';
  const value = String(raw).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

export function normalizeRole(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return '';
  if (['systemadmin', 'admin', 'system_admin'].includes(value)) return 'systemadmin';
  if (['schooladmin', 'school_admin'].includes(value)) return 'schooladmin';
  if (['teacher', 'schoolteacher', 'school_teacher', 'багш'].includes(value)) return 'teacher';
  if (['student', 'schoolstudent', 'school_student', 'schooluser', 'school_user', 'learner', 'оюутан', 'сурагч', 'user'].includes(value)) return 'student';
  if (value.includes('teacher')) return 'teacher';
  if (value.includes('schooladmin')) return 'schooladmin';
  if (value.includes('admin')) return 'systemadmin';
  if (value.includes('student') || value.includes('user') || value.includes('learner')) return 'student';
  return value;
}

export function getToken() {
  return trimStoredValue(localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function getRefreshToken() {
  return trimStoredValue(localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function hasActiveSession() {
  return !!getToken();
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
  dispatch(AUTH_CHANGE_EVENT, { accessToken: getToken(), refreshToken: getRefreshToken() });
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatch(AUTH_CHANGE_EVENT, { accessToken: getToken(), refreshToken: getRefreshToken() });
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken !== undefined) {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  dispatch(AUTH_CHANGE_EVENT, { accessToken: getToken(), refreshToken: getRefreshToken() });
}

export function getRole() {
  const user = getCurrentUser();
  return normalizeRole(user?.role) || 'student';
}

export function setRole(role) {
  const normalized = normalizeRole(role) || 'student';
  localStorage.removeItem('team2_role');
  dispatch(ROLE_CHANGE_EVENT, normalized);
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
  dispatch(USER_CHANGE_EVENT, user || null);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('team2_role');
  localStorage.removeItem(USER_KEY);
  dispatch(AUTH_CHANGE_EVENT, { accessToken: '', refreshToken: '' });
  dispatch(ROLE_CHANGE_EVENT, 'student');
  dispatch(USER_CHANGE_EVENT, null);
}
