import { authFetch, extractItem, formatApiError, getToken, parseJsonFields, readResponseData } from '../services/api';

export const getRole = () => {
  return resolveUserRole(getCurrentUser()) || 'student';
};

export const setRole = (role) => {
  const nextRole = normalizeRole(role) || 'student';
  localStorage.removeItem('team2_role');
  window.dispatchEvent(new CustomEvent('team2-role-change', { detail: nextRole }));
};

export const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem('team2_user') || 'null'); }
  catch { return null; }
};

export const setCurrentUser = (user) => {
  if (!user) {
    localStorage.removeItem('team2_user');
    localStorage.removeItem('team2_role');
    window.dispatchEvent(new CustomEvent('team2-user-change', { detail: null }));
    window.dispatchEvent(new CustomEvent('team2-role-change', { detail: 'student' }));
    return;
  }
  const normalizedUser = parseJsonFields(user);
  const nextUser = {
    ...normalizedUser,
    role: resolveUserRole(normalizedUser) || normalizeRole(normalizedUser.role) || 'student',
  };
  localStorage.removeItem('team2_role');
  localStorage.setItem('team2_user', JSON.stringify(nextUser));
  window.dispatchEvent(new CustomEvent('team2-user-change', { detail: nextUser }));
  window.dispatchEvent(new CustomEvent('team2-role-change', { detail: nextUser.role }));
};

// GET /schools/{id}/users response-д user.schools[].roles байдаг
export function resolveUserRole(user, schoolId = null) {
  return resolveRoleFromUser(user, schoolId);
}

export const isStudent     = (r = getRole()) => r === 'student';
export const isTeacher     = (r = getRole()) => r === 'teacher';
export const isSchoolAdmin = (r = getRole()) => r === 'schooladmin';
export const isSystemAdmin = (r = getRole()) => r === 'systemadmin';
export const canGrade          = (r = getRole()) => isTeacher(r) || isSchoolAdmin(r) || isSystemAdmin(r);
export const canSubmit         = (r = getRole()) => isStudent(r);
export const canManageUsers    = (r = getRole()) => isSchoolAdmin(r) || isSystemAdmin(r);
export const canManagePayments = (r = getRole()) => isSchoolAdmin(r) || isSystemAdmin(r);
export const canManageCourseUsers = (r = getRole()) => isTeacher(r) || isSchoolAdmin(r) || isSystemAdmin(r);
export const canManageQuestionBank = (r = getRole()) => isTeacher(r) || isSchoolAdmin(r) || isSystemAdmin(r);
export const canManageExams = (r = getRole()) => isTeacher(r) || isSchoolAdmin(r) || isSystemAdmin(r);
export const canAccessLesson = (r = getRole(), lesson, accessibleCourseIds = []) => {
  if (!lesson) return false;
  if (canGrade(r)) return true;
  return accessibleCourseIds.some((id) => String(id) === String(lesson.course_id));
};
export const getSchoolMemberships = (user = getCurrentUser()) => {
  if (!user) return [];
  return parseList(user.schools ?? user['{}schools']).map((school) => parseJsonFields(school));
};
export const getSchoolIds = (user = getCurrentUser()) => (
  [...new Set(getSchoolMemberships(user).map((school) => String(school.id ?? school.school_id ?? '')).filter(Boolean))]
);
export const getSchoolId = (user = getCurrentUser()) => {
  const memberships = getSchoolMemberships(user);
  return user?.school_id ?? user?.schoolId ?? memberships[0]?.id ?? memberships[0]?.school_id ?? null;
};

export const getRoleLabel = (r = getRole()) => {
  if (isSystemAdmin(r)) return 'Системийн админ';
  if (isSchoolAdmin(r)) return 'Сургуулийн админ';
  if (isTeacher(r))     return 'Багш';
  return 'Оюутан';
};

function normalizeRole(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  // API role IDs (numeric)
  if (v === '10') return 'schooladmin';
  if (v === '20') return 'teacher';
  if (v === '30') return 'student';
  // API role names (Mongolian)
  if (['админ', 'admin'].includes(v))                          return 'schooladmin';
  if (['сургагч', 'teacher', 'schoolteacher', 'school_teacher', 'багш'].includes(v)) return 'teacher';
  if (['суралцагч', 'student', 'schoolstudent', 'school_student', 'оюутан', 'user'].includes(v)) return 'student';
  // legacy
  if (['systemadmin', 'system_admin'].includes(v))             return 'systemadmin';
  if (['schooladmin', 'school_admin'].includes(v))             return 'schooladmin';
  if (v.includes('сургагч') || v.includes('teacher'))          return 'teacher';
  if (v.includes('суралцагч') || v.includes('student'))        return 'student';
  if (v.includes('admin'))                                     return 'schooladmin';
  return v;
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseObject(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function extractRoleFromSchool(school) {
  // API нь roles: [{id, name}] array буцаадаг
  const rolesArr = parseList(school.roles ?? school['{}roles']);
  if (rolesArr.length > 0) {
    return rolesArr.map((r) => normalizeRole(r.name ?? r.id)).filter(Boolean);
  }
  // fallback: role object/string/id
  const roleValue = school.role ?? school['{}role'] ?? school.role_id;
  const roleObject = parseObject(roleValue);
  const resolved = normalizeRole(
    roleObject?.name ?? roleObject?.id ?? roleValue?.name ?? roleValue,
  );
  return resolved ? [resolved] : [];
}

function resolveRoleFromUser(user, schoolId = null) {
  const normalizedUser = parseJsonFields(user);
  if (!normalizedUser) return 'student';
  const schools = getSchoolMemberships(normalizedUser);
  const targetSchoolId = schoolId ?? normalizedUser._roleSchoolId ?? normalizedUser.school_id ?? normalizedUser.schoolId;
  const matchingSchools = targetSchoolId
    ? schools.filter((school) => String(school.id ?? school.school_id ?? '') === String(targetSchoolId))
    : schools;
  const roles = (matchingSchools.length ? matchingSchools : schools)
    .flatMap(extractRoleFromSchool)
    .filter(Boolean);

  if (roles.includes('systemadmin')) return 'systemadmin';
  if (roles.includes('schooladmin')) return 'schooladmin';
  if (roles.includes('teacher'))     return 'teacher';
  if (roles.includes('student'))     return 'student';

  const directRoles = parseList(normalizedUser.roles ?? normalizedUser['{}roles'])
    .map((role) => normalizeRole(role?.name ?? role?.id ?? role))
    .filter(Boolean);
  if (directRoles.includes('systemadmin')) return 'systemadmin';
  if (directRoles.includes('schooladmin')) return 'schooladmin';
  if (directRoles.includes('teacher'))     return 'teacher';
  if (directRoles.includes('student'))     return 'student';

  const directRole = normalizedUser.role ?? normalizedUser.role_id;
  if (directRole) return normalizeRole(directRole) || 'student';

  return normalizeRole(normalizedUser.email || normalizedUser.username || '') || 'student';
}

let syncRolePromise = null;

export async function syncRole() {
  const token = getToken();
  if (!token) return getRole();

  if (!syncRolePromise) {
    syncRolePromise = (async () => {
      try {
        const res = await authFetch('/users/me');
        if (!res.ok) return getRole();

        const payload = await readResponseData(res);
        const me = extractItem(payload);
        if (!me || typeof me !== 'object') return getRole();

        const normalizedUser = parseJsonFields(me);
        const role = resolveRoleFromUser(normalizedUser) || 'student';

        const user = {
          ...normalizedUser,
          id: normalizedUser.id,
          first_name: normalizedUser.first_name || '',
          last_name: normalizedUser.last_name || '',
          email: normalizedUser.email || '',
          username: normalizedUser.username || normalizedUser.email || '',
          name:
            `${normalizedUser.last_name || ''} ${normalizedUser.first_name || ''}`.trim() ||
            normalizedUser.username ||
            normalizedUser.email ||
            'Хэрэглэгч',
          role,
        };

        setCurrentUser(user);
        localStorage.removeItem('team2_role');
        window.dispatchEvent(new CustomEvent('team2-role-change', { detail: role }));
        return role;
      } catch {
        return getRole();
      } finally {
        syncRolePromise = null;
      }
    })();
  }

  return syncRolePromise;
}

export const getErrorMessage = (error, fallback = 'Алдаа гарлаа.') => {
  if (String(error?.message || '').includes('Failed to fetch')) return 'Сервертэй холбогдож чадсангүй.';
  const apiMessage = formatApiError(error?.response?.data, '');
  if (apiMessage) return apiMessage;
  if (error?.status === 403) return 'Энэ үйлдлийг хийх эрх байхгүй байна.';
  if (error?.status === 401) return 'Дахин нэвтэрнэ үү.';
  return error?.message || fallback;
};
