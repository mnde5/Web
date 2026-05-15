const BASE_URL = 'https://todu.mn/bs/lms/v1';
const LOCAL_BACKEND_URL = 'http://localhost:3000/bs/lms/v1';
const SPEC_PATHS = {};

function normalizePathname(path) {
  const [pathname] = String(path || '').split('?');
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function normalizeRequestPath(path) {
  const value = String(path || '');
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function resolveSpecPath(pathname) {
  const normalized = normalizePathname(pathname);

  if (SPEC_PATHS[normalized]) {
    return { pathname: normalized, template: normalized, methods: SPEC_PATHS[normalized] };
  }

  for (const [template, methods] of Object.entries(SPEC_PATHS)) {
    if (!template.includes('{')) continue;

    const pattern = new RegExp(`^${template.replace(/\{[^/]+\}/g, '[^/]+')}$`);
    if (pattern.test(normalized)) {
      return { pathname: normalized, template, methods };
    }
  }

  return null;
}

function assertApiPath(pathname, method = 'GET') {
  if (!Object.keys(SPEC_PATHS).length) return null;

  const resolved = resolveSpecPath(pathname);
  if (!resolved) {
    throw new Error(`api.json-д бүртгэлгүй endpoint ашиглахыг оролдлоо: ${pathname}`);
  }

  const normalizedMethod = String(method || 'GET').toLowerCase();
  if (!resolved.methods?.[normalizedMethod]) {
    throw new Error(`api.json-д ${method.toUpperCase()} ${resolved.template} endpoint бүртгэлгүй байна.`);
  }

  return resolved;
}

function normalizeStoredValue(raw) {
  if (!raw) return '';
  const value = String(raw).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

export function getToken() {
  return normalizeStoredValue(localStorage.getItem('access_token'));
}

export function getRefreshToken() {
  return normalizeStoredValue(localStorage.getItem('refresh_token'));
}

export function extractAuthTokens(payload) {
  if (!payload || typeof payload !== 'object') {
    return { accessToken: '', refreshToken: '' };
  }

  return {
    accessToken: normalizeStoredValue(
      payload.token ?? payload.access_token ?? payload.data?.token ?? payload.data?.access_token,
    ),
    refreshToken: normalizeStoredValue(payload.refresh_token ?? payload.data?.refresh_token),
  };
}

export function saveSession({ accessToken, refreshToken } = {}) {
  const nextAccessToken = normalizeStoredValue(accessToken);
  const nextRefreshToken = normalizeStoredValue(refreshToken);

  if (nextAccessToken) localStorage.setItem('access_token', nextAccessToken);
  else localStorage.removeItem('access_token');

  if (refreshToken !== undefined) {
    if (nextRefreshToken) localStorage.setItem('refresh_token', nextRefreshToken);
    else localStorage.removeItem('refresh_token');
  }
}

export function clearSession({ clearProfile = false } = {}) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');

  if (!clearProfile) return;

  localStorage.removeItem('team2_role');
  localStorage.removeItem('team2_user');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('team2-role-change', { detail: 'student' }));
    window.dispatchEvent(new CustomEvent('team2-user-change', { detail: null }));
  }
}

function createHeaders(body, token = getToken()) {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function parseResponseBody(response) {
  if (response.status === 204 || response.status === 205) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function readResponseData(response) {
  return parseResponseBody(response);
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return '';

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const body = JSON.stringify({ refresh_token: refreshToken });
      assertApiPath('/token/refresh', 'POST');
      const response = await fetch(`${BASE_URL}/token/refresh`, {
        method: 'POST',
        headers: createHeaders(body, ''),
        body,
      });
      const payload = await parseResponseBody(response);
      const { accessToken, refreshToken: nextRefreshToken } = extractAuthTokens(payload);

      if (!response.ok || !accessToken) {
        clearSession({ clearProfile: true });
        return '';
      }

      saveSession({ accessToken, refreshToken: nextRefreshToken || refreshToken });
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function authFetch(path, init = {}, retry = true) {
  const method = init.method || 'GET';
  const body = init.body;
  const headers = createHeaders(body, getToken());
  const normalizedPath = normalizePathname(path);
  const requestPath = normalizeRequestPath(path);

  assertApiPath(normalizedPath, method);

  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  const response = await fetch(`${BASE_URL}${requestPath}`, { ...init, method, headers, body });
  if (response.status === 401 && retry) {
    const nextToken = await refreshAccessToken();
    if (nextToken) return authFetch(requestPath, init, false);
  }
  return response;
}

export function formatApiError(payload, fallback = '') {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload || fallback;

  const message = String(payload.message || payload.title || payload.error || '').trim();
  const code = String(payload['o:errorCode'] || payload.code || payload.errorCode || '').trim();
  const cause = String(payload.cause || payload.details || '').trim();

  const header = [message, code && !message.includes(code) ? `(${code})` : '']
    .filter(Boolean)
    .join(' ')
    .trim();

  return [header, cause].filter(Boolean).join('\n') || fallback;
}

async function request(method, path, data) {
  const body = data !== undefined ? JSON.stringify(data) : undefined;
  const res = await authFetch(path, { method, body });
  const payload = await parseResponseBody(res);
  if (!res.ok) {
    const err = new Error(formatApiError(payload, `Request failed ${res.status}`));
    err.status = res.status;
    err.response = { status: res.status, data: payload };
    throw err;
  }
  return payload;
}

async function localRequest(method, path, data) {
  const body = data !== undefined ? JSON.stringify(data) : undefined;
  const headers = createHeaders(body, getToken());
  const requestPath = normalizeRequestPath(path);
  const res = await fetch(`${LOCAL_BACKEND_URL}${requestPath}`, { method, headers, body });
  const payload = await parseResponseBody(res);
  if (!res.ok) {
    const err = new Error(formatApiError(payload, `Local request failed ${res.status}`));
    err.status = res.status;
    err.response = { status: res.status, data: payload };
    throw err;
  }
  return payload;
}

const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, data) => request('POST',   path, data),
  put:    (path, data) => request('PUT',    path, data),
  delete: (path)       => request('DELETE', path),
};

function appendCurrentUser(path, userId) {
  const currentUser = userId ?? getCurrentUserId();
  if (!currentUser) return path;
  const separator = String(path).includes('?') ? '&' : '?';
  return `${path}${separator}current_user=${encodeURIComponent(currentUser)}`;
}

function withCurrentUser(data = {}, userId) {
  return {
    ...data,
    current_user: data?.current_user ?? userId ?? getCurrentUserId(),
  };
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('team2_user') || 'null');
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export function extractItems(payload) {
  if (Array.isArray(payload))           return payload;
  if (Array.isArray(payload?.items))    return payload.items;
  if (Array.isArray(payload?.data))     return payload.data;
  if (Array.isArray(payload?.results))  return payload.results;
  return [];
}

export function extractItem(payload) {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  return payload.item || payload.result || payload;
}

export function parseJsonFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (key.startsWith('{}') && typeof result[key] === 'string') {
      try { result[key.slice(2)] = JSON.parse(result[key]); } catch {}
    }
  }
  return result;
}

export function parseUser(s) {
  if (s.user && typeof s.user === 'object') return s.user;
  try { return JSON.parse(s['{}user'] ?? 'null'); } catch { return null; }
}

export function parsePersonName(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';

    try {
      return parsePersonName(JSON.parse(text));
    } catch {
      return text === '[object Object]' ? '' : text;
    }
  }

  if (typeof value !== 'object') return '';

  const fullName =
    value.name ||
    `${value.last_name ?? ''} ${value.first_name ?? ''}`.trim() ||
    `${value.lastName ?? ''} ${value.firstName ?? ''}`.trim();

  return fullName || value.username || value.email || '';
}

export function parseCourseName(c) {
  const course = parseCourse(c);
  if (course.name) return course.name;
  try { return JSON.parse(c?.['{}name']) ?? 'Хичээл'; } catch {}
  return 'Хичээл';
}

export function parseCourse(c) {
  if (!c || typeof c !== 'object') return {};
  const normalized = parseJsonFields(c);
  const nested =
    normalized.course && typeof normalized.course === 'object'
      ? normalized.course
      : {};

  return {
    ...nested,
    ...normalized,
    id: normalized.course_id ?? normalized.id ?? nested.id,
    name: normalized.name ?? nested.name,
    description: normalized.description ?? nested.description,
    start_on: normalized.start_on ?? nested.start_on,
    end_on: normalized.end_on ?? nested.end_on,
    school_id: normalized.school_id ?? nested.school_id,
  };
}

export function parseCourseTeacher(course) {
  const direct =
    parsePersonName(course?.teacher) ||
    parsePersonName(course?.teacher_name) ||
    parsePersonName(course?.teacherName) ||
    parsePersonName(course?.['{}teacher']);

  if (direct) return direct;

  try {
    const nestedCourse = JSON.parse(course?.['{}course'] ?? 'null');
    return parseCourseTeacher(nestedCourse);
  } catch {
    return '';
  }
}

export function getSubmissionGradeValue(submission) {
  const raw = submission?.grade_point;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isSubmissionGraded(submission) {
  const gradeValue = getSubmissionGradeValue(submission);
  if (gradeValue === null) return false;
  if (gradeValue !== 0) return true;

  const createdOn = submission?.created_on ? new Date(submission.created_on).getTime() : null;
  const updatedOn = submission?.updated_on ? new Date(submission.updated_on).getTime() : null;

  if (createdOn && updatedOn && updatedOn > createdOn) return true;
  if (submission?.updated_by && String(submission.updated_by) !== String(submission?.created_by ?? submission?.user_id ?? '')) return true;
  return false;
}

function normalizeRoleKey(role) {
  return String(role || '').trim().toLowerCase();
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item?.id ?? item?.user_id ?? item?.course_id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function getAdminCourses(user) {
  // Зөвхөн хэрэглэгчийн өөрийн сургуулиудаас хичээл авна (school 0 оруулахгүй)
  let schoolIds = [];

  try {
    const userSchoolsPayload = await api.get(`/users/${user.id}/schools`);
    const allSchools = extractItems(userSchoolsPayload);
    // school 0 (Humuun.edu.mn автомат) болон student-only school-уудыг хасна
    schoolIds = allSchools
      .filter((s) => {
        if (String(s.id) === '0') return false;
        const roles = Array.isArray(s.roles) ? s.roles : [];
        // teacher эсвэл admin эрхтэй сургуулиудыг л авна
        return roles.some((r) => {
          const n = String(r.name ?? r.id ?? '').toLowerCase();
          return n.includes('багш') || n.includes('сургагч') || n.includes('admin') || n.includes('админ') || Number(r.id) === 10 || Number(r.id) === 20;
        }) || roles.length === 0;
      })
      .map((s) => s.id)
      .filter(Boolean);
  } catch {
    schoolIds = [];
  }

  if (!schoolIds.length) return [];

  const coursePayloads = await Promise.all(
    [...new Set(schoolIds.map((id) => String(id)))]
      .map((schoolId) => api.get(`/schools/${schoolId}/courses`)),
  );

  return uniqueById(coursePayloads.flatMap((payload) => extractItems(payload)));
}

export const submissionAPI = {
  getByLesson: (lessonId)          => api.get(`/lessons/${lessonId}/submissions`),
  getOne:      (submissionId)      => api.get(`/submissions/${submissionId}`),
  create:      (lessonId, data)    => api.post(`/lessons/${lessonId}/submissions`, data),
  update:      (submissionId, data)=> api.put(`/submissions/${submissionId}`, data),
  delete:      (submissionId)      => api.delete(`/submissions/${submissionId}`),
};

export const courseAPI = {
  getEnrolled:  (userId)             => api.get(`/users/${userId}/courses/enrolled`),
  getTeaching:  (userId)             => api.get(`/users/${userId}/courses/teaching`),
  getVisible:   async (role, user) => {
    const roleKey = normalizeRoleKey(role);
    if (roleKey === 'student') return api.get(`/users/${user?.id}/courses/enrolled`);
    if (roleKey === 'teacher') {
      // Тусгайлан оноогдсон хичээлүүд + сургуулийн бүх хичээлүүд хоёуланг нэгтгэнэ
      const [teaching, schoolCourses] = await Promise.allSettled([
        api.get(`/users/${user?.id}/courses/teaching`),
        getAdminCourses(user),
      ]);
      const a = teaching.status === 'fulfilled' ? extractItems(teaching.value) : [];
      const b = schoolCourses.status === 'fulfilled' ? schoolCourses.value : [];
      return { items: uniqueById([...a, ...b]) };
    }
    if (roleKey === 'schooladmin' || roleKey === 'systemadmin') {
      return { items: await getAdminCourses(user) };
    }
    return api.get(`/users/${user?.id}/courses/enrolled`);
  },
  getOne:       (courseId)           => api.get(`/courses/${courseId}`),
  create:       (schoolId, data)     => api.post(`/schools/${schoolId}/courses`, withCurrentUser(data)),
  update:       (courseId, data)     => api.put(`/courses/${courseId}`, withCurrentUser(data)),
  delete:       (courseId)           => api.delete(`/courses/${courseId}`),
  duplicate:    (courseId)           => api.post(`/courses/${courseId}`, withCurrentUser()),
  getUsers:     (courseId)           => api.get(`/courses/${courseId}/users`),
  getStudents:  (courseId)           => api.get(`/courses/${courseId}/students`),
  getTeachers:  (courseId)           => api.get(`/courses/${courseId}/teachers`),
  addTeacher:   (courseId, data)     => api.post(`/courses/${courseId}/teachers`, withCurrentUser(data)),
  removeTeacher:(courseId, teacherId)=> api.delete(`/courses/${courseId}/teachers/${teacherId}`),
};

export const lessonAPI = {
  getByCourse: (courseId)      => api.get(`/courses/${courseId}/lessons`),
  getOne:      (lessonId)      => api.get(`/lessons/${lessonId}`),
  create:      (courseId, data)=> api.post(`/courses/${courseId}/lessons`, data),
  update:      (lessonId, data)=> api.put(`/lessons/${lessonId}`, data),
  delete:      (lessonId)      => api.delete(`/lessons/${lessonId}`),
};

export const timetableAPI = {
  getByCourse: (courseId) => api.get(`/courses/${courseId}/timetables`),
};

export const lessonTypeAPI = {
  getAll: () => api.get('/lesson-types'),
};

export const attendanceTypeAPI = {
  getAll: () => api.get('/attendance-types'),
};

export const userAPI = {
  getAll:         ()          => api.get('/users'),
  getOne:         (id)        => api.get(`/users/${id}`),
  create:         (data)      => api.post('/users', data),
  update:         (id, data)  => api.put(`/users/${id}`, withCurrentUser(data)),
  updateMe:       (data)      => api.put('/users/me', withCurrentUser(data)),
  delete:         (id)        => api.delete(`/users/${id}`),
  deleteMe:       ()          => api.delete('/users/me'),
  getMe:          ()          => api.get('/users/me'),
  getGrades:      ()          => api.get('/users/me/grades'),
  getSchools:     (id)        => api.get(`/users/${id}/schools`),
  changePassword: (data)      => api.put('/users/me/password', withCurrentUser(data)),
  uploadPicture:  (formData)  => api.post('/users/me/picture', formData),
};

export const schoolAPI = {
  getAll:      ()                   => api.get('/schools?limit=1000'),
  getOne:      (schoolId)           => api.get(`/schools/${schoolId}`),
  create:      (data)               => api.post('/schools', withCurrentUser(data)),
  update:      (schoolId, data)     => api.put(`/schools/${schoolId}`, withCurrentUser(data)),
  delete:      (schoolId)           => api.delete(`/schools/${schoolId}`),
  getUsers:    (schoolId)           => api.get(`/schools/${schoolId}/users`),
  addUser:     (schoolId, data)     => api.post(`/schools/${schoolId}/users`, withCurrentUser(data)),
  removeUser:  (schoolId, userId)   => api.delete(`/schools/${schoolId}/users/${userId}`),
  getCourses:  (schoolId)           => api.get(`/schools/${schoolId}/courses`),
};

export const groupAPI = {
  getByCourse: (courseId)         => api.get(`/courses/${courseId}/groups`),
  getOne:      (groupId)          => api.get(`/groups/${groupId}`),
  create:      (courseId, data)   => api.post(`/courses/${courseId}/groups`, withCurrentUser(data)),
  update:      (groupId, data)    => api.put(`/groups/${groupId}`, withCurrentUser(data)),
  delete:      (groupId)          => api.delete(`/groups/${groupId}`),
};

export const creditPriceAPI = {
  getAll:  (schoolId)       => api.get(`/schools/${schoolId}/credit-prices`),
  create:  (schoolId, data) => api.post(`/schools/${schoolId}/credit-prices`, withCurrentUser(data)),
  delete:  (schoolId, id)   => api.delete(`/schools/${schoolId}/credit-prices/${id}`),
};

export const courseLevelAPI = {
  getAll: (schoolId) => api.get(`/schools/${schoolId}/course-levels`),
};

export const paymentAPI = {
  getByStudent:  (schoolId, userId)        => localRequest('GET',  `/schools/${schoolId}/users/${userId}/payments`),
  create:        (schoolId, userId, data)  => localRequest('POST', `/schools/${schoolId}/users/${userId}/payments`, withCurrentUser(data)),
  verify:        (schoolId, userId, payId) => localRequest('POST', `/schools/${schoolId}/users/${userId}/payments/${payId}/verify`, withCurrentUser()),
  reject:        (schoolId, userId, payId, data = {}) => localRequest('POST', `/schools/${schoolId}/users/${userId}/payments/${payId}/reject`, withCurrentUser(data)),
  getDebtReport: (schoolId)                => localRequest('GET',  `/schools/${schoolId}/payment-debt-report`),
};

export const debtAPI = {
  get:    (schoolId, userId)       => localRequest('GET', `/schools/${schoolId}/users/${userId}/debt`),
  update: (schoolId, userId, data) => api.put(`/schools/${schoolId}/users/${userId}/debt`, data),
};

export const paymentPolicyAPI = {
  get:                  (schoolId)       => api.get(`/schools/${schoolId}/payment-policy`),
  update:               (schoolId, data) => api.put(`/schools/${schoolId}/payment-policy`, withCurrentUser(data)),
  getMasterPolicies:    ()               => api.get('/payment-policies'),
  getMasterRestrictions:()               => api.get('/restriction-policies'),
  getBankInfo:          (schoolId)       => api.get(`/schools/${schoolId}/bank-info`),
};

export const courseUserAPI = {
  getByCourse: (courseId) => api.get(`/courses/${courseId}/users`),
  getOne: (courseId, userId) => api.get(`/courses/${courseId}/users/${userId}`),
  add: (courseId, payload) => api.post(`/courses/${courseId}/users`, withCurrentUser(payload)),
  update: (courseId, userId, payload) => api.put(`/courses/${courseId}/users/${userId}`, withCurrentUser(payload)),
  remove: (courseId, userId) => api.delete(appendCurrentUser(`/courses/${courseId}/users/${userId}`)),
};

export const roleAPI = {
  getAll: () => api.get('/roles'),
};

export const schoolRequestAPI = {
  getAll:   ()            => api.get('/school-requests'),
  getOne:   (id)          => api.get(`/school-requests/${id}`),
  create:   (data)        => api.post('/school-requests', withCurrentUser(data)),
  approve:  (id)          => api.post(`/school-requests/${id}/approve`, withCurrentUser()),
  reject:   (id, reason)  => api.post(`/school-requests/${id}/reject`, withCurrentUser({ rejection_reason: reason })),
};

export const loginAPI = {
  email: (credentials) => api.post('/token/email', credentials),
};

export const authAPI = {
  register: (payload) => api.post('/auth/register', payload),
};

export const attendanceAPI = {
  getCourseAttendances:    (courseId)                    => api.get(`/courses/${courseId}/attendances`),
  getCourseApprovals:      (courseId)                    => api.get(`/courses/${courseId}/attendance-request-approvals`),
  approveRequest:          (approvalId, payload = {})    => api.post(`/attendance-request-approvals/${approvalId}/approve`, payload),
  rejectRequest:           (approvalId, payload = {})    => api.post(`/attendance-request-approvals/${approvalId}/reject`, payload),
  getLessonAttendances:    (lessonId)                    => api.get(`/lessons/${lessonId}/attendances`),
  getLessonAttendance:     (lessonId, userId)             => api.get(`/lessons/${lessonId}/attendances/${userId}`),
  createLessonAttendance:  (lessonId, data)              => api.post(`/lessons/${lessonId}/attendances`, data),
  updateLessonAttendance:  (lessonId, userId, payload)   => api.put(`/lessons/${lessonId}/attendances/${userId}`, payload),
  deleteLessonAttendance:  (lessonId, userId)            => api.delete(`/lessons/${lessonId}/attendances/${userId}`),
  createMyRequest:         (payload)                     => api.post('/users/me/attendance-requests', payload),
  getMyRequests:           ()                            => api.get('/users/me/attendance-requests'),
  getMyRequest:            (id)                          => api.get(`/users/me/attendance-requests/${id}`),
};

export const gradebookAPI = {
  getCourseGrades:          (courseId) => api.get(`/courses/${courseId}/gradebook`),
  getCourseSubmissionGrades:(courseId) => api.get(`/courses/${courseId}/gradebook/submissions`),
  getCourseAttendanceGrades:(courseId) => api.get(`/courses/${courseId}/gradebook/attendances`),
  getCourseExamGrades:      (courseId) => api.get(`/courses/${courseId}/gradebook/exams`),
};

export const examAPI = {
  getAll:         ()                        => localRequest('GET', '/exams'),
  getOne:         (examId)                  => localRequest('GET', `/exams/${examId}`),
  getByCourse:    (courseId)                => localRequest('GET', `/courses/${courseId}/exams`),
  getBySchool:    (schoolId)                => localRequest('GET', `/schools/${schoolId}/exams`),
  create:         (courseId, data)          => localRequest('POST', `/courses/${courseId}/exams`, withCurrentUser(data)),
  update:         (examId, data)            => localRequest('PUT', `/exams/${examId}`, withCurrentUser(data)),
  delete:         (examId)                  => localRequest('DELETE', `/exams/${examId}`),
  getUsers:       (examId)                  => localRequest('GET', `/exams/${examId}/users`),
  getVariants:    (examId)                  => localRequest('GET', `/exams/${examId}/variants`),
  getVariant:     (examId, id)              => localRequest('GET', `/exams/${examId}/variants/${id}`),
  createVariant:  (examId, data)            => localRequest('POST', `/exams/${examId}/variants`, withCurrentUser(data)),
  updateVariant:  (examId, id, data)        => localRequest('PUT', `/exams/${examId}/variants/${id}`, withCurrentUser(data)),
  getReport:      (examId)                  => localRequest('GET', `/exams/${examId}/report`),
  getQuestions:   (examId)                  => localRequest('GET', `/exams/${examId}/questions`),
  addQuestion:    (examId, data)            => localRequest('POST', `/exams/${examId}/questions`, data),
  updateQuestion: (examId, qId, data)       => localRequest('PUT', `/exams/${examId}/questions/${qId}`, data),
  deleteQuestion: (examId, qId)             => localRequest('DELETE', `/exams/${examId}/questions/${qId}`),
  submitAttempt:  (examId, studentId, data) => localRequest('POST', `/exams/${examId}/students/${studentId}/attempts`, data),
  getLatestAttempt:(examId, studentId)      => localRequest('GET', `/exams/${examId}/students/${studentId}/attempts/latest`),
  getResult:      (examId, studentId)       => localRequest('GET', `/exams/${examId}/students/${studentId}/result`),
};

export const variantAPI = {
  getOne:        (variantId)          => api.get(`/variants/${variantId}`),
  update:        (variantId, data)    => api.put(`/variants/${variantId}`, withCurrentUser(data)),
  getQuestions:  (variantId)          => api.get(`/variants/${variantId}/questions`),
  addQuestion:   (variantId, data)    => api.post(`/variants/${variantId}/questions`, data),
  deleteQuestion:(variantId, qId)     => api.delete(`/variants/${variantId}/questions/${qId}`),
};

export const questionAPI = {
  getByCourse:   (courseId)           => api.get(`/courses/${courseId}/questions`),
  getSummary:    (courseId)           => api.get(`/courses/${courseId}/questions/summary`),
  create:        (courseId, data)     => api.post(`/courses/${courseId}/questions`, withCurrentUser(data)),
  getOne:        (questionId)         => api.get(`/questions/${questionId}`),
  update:        (questionId, data)   => api.put(`/questions/${questionId}`, withCurrentUser(data)),
  delete:        (questionId)         => api.delete(`/questions/${questionId}`),
};

export const questionTypeAPI = {
  getAll:  ()              => api.get('/question-types'),
  getOne:  (id)            => api.get(`/question-types/${id}`),
  create:  (data)          => api.post('/question-types', data),
  update:  (id, data)      => api.put(`/question-types/${id}`, data),
  delete:  (id)            => api.delete(`/question-types/${id}`),
};

export const questionLevelAPI = {
  getAll:  ()              => api.get('/question-levels'),
  getOne:  (id)            => api.get(`/question-levels/${id}`),
  create:  (data)          => api.post('/question-levels', data),
  update:  (id, data)      => api.put(`/question-levels/${id}`, data),
  delete:  (id)            => api.delete(`/question-levels/${id}`),
};

export const categoryAPI = {
  getBySchool: (schoolId)          => api.get(`/schools/${schoolId}/categories`),
  create:      (schoolId, data)    => api.post(`/schools/${schoolId}/categories`, withCurrentUser(data)),
  getOne:      (categoryId)        => api.get(`/categories/${categoryId}`),
  update:      (categoryId, data)  => api.put(`/categories/${categoryId}`, withCurrentUser(data)),
  delete:      (categoryId)        => api.delete(`/categories/${categoryId}`),
  getCourses:  (categoryId)        => api.get(`/categories/${categoryId}/courses`),
};

export const periodAPI = {
  getBySchool: (schoolId)        => api.get(`/schools/${schoolId}/periods`),
  create:      (schoolId, data)  => api.post(`/schools/${schoolId}/periods`, withCurrentUser(data)),
  update:      (periodId, data)  => api.put(`/periods/${periodId}`, withCurrentUser(data)),
  delete:      (periodId)        => api.delete(`/periods/${periodId}`),
};

export const tokenAPI = {
  logout: () => api.delete('/token'),
};

export default api;

export async function gradeSubmission(submissionId, gradePoint, submission = null) {
  // Oracle NOT NULL constraints — include all required fields from the existing submission
  const payload = {
    grade_point: String(gradePoint),
    content:     submission?.content    ?? '',
    lesson_id:   submission?.lesson_id  ?? submission?.lesson?.id  ?? '',
    user_id:     submission?.user_id    ?? submission?.user?.id    ?? '',
    parent_id:   submission?.parent_id  ?? '',
    sibling_id:  submission?.sibling_id ?? '',
  };

  // Remove empty strings for optional fields to avoid overwriting with empty
  if (!payload.parent_id)  delete payload.parent_id;
  if (!payload.sibling_id) delete payload.sibling_id;

  const res = await authFetch(`/submissions/${submissionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await parseResponseBody(res);

  return {
    ok: res.ok,
    data,
    error: res.ok ? '' : formatApiError(data, `Request failed ${res.status}`),
  };
}
