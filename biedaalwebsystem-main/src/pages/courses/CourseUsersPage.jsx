import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import {
  courseAPI,
  courseUserAPI,
  extractItem,
  extractItems,
  groupAPI,
  parseCourseName,
  parseJsonFields,
  parseUser,
  schoolAPI,
  userAPI,
} from '../../services/api';
import { canManageCourseUsers, getSchoolIds, resolveUserRole } from '../../utils/role';

function normalizeUser(item) {
  return parseUser(item) || parseJsonFields(item);
}

function resolveRole(user) {
  return resolveUserRole(user);
}

function fullName(user) {
  return `${user?.last_name ?? ''} ${user?.first_name ?? ''}`.trim() || user?.email || user?.username || 'Хэрэглэгч';
}

export default function CourseUsersPage() {
  const { course_id } = useParams();
  const role = useTeam2Role();
  const currentUser = useTeam2User();
  const accessRole = canManageCourseUsers(role) ? role : resolveUserRole(currentUser);
  const [course, setCourse] = useState(null);
  const [groups, setGroups] = useState([]);
  const [courseUsers, setCourseUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({ userId: '', groupId: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canManageCourseUsers(accessRole)) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [coursePayload, groupPayload, userPayload] = await Promise.all([
          courseAPI.getOne(course_id),
          groupAPI.getByCourse(course_id),
          courseUserAPI.getByCourse(course_id),
        ]);

        let candidateItems = [];
        const schoolIds = getSchoolIds(currentUser).filter((id) => String(id) !== '0');
        if (schoolIds.length) {
          const responses = await Promise.all(schoolIds.map((id) => schoolAPI.getUsers(id).then((payload) => ({ schoolId: id, payload }))));
          const all = responses.flatMap(({ schoolId, payload }) => (
            extractItems(payload).map((item) => ({ ...parseJsonFields(item), _roleSchoolId: String(schoolId) }))
          ));
          candidateItems = all.filter((u) => resolveRole(u) === 'student');
        }

        if (!active) return;

        const nextCourseUsers = extractItems(userPayload).map((item) => {
          const parsed = parseJsonFields(item);
          let group = null;
          try { group = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
          return {
            ...parsed,
            user: normalizeUser(parsed),
            group,
          };
        });

        const uniqueCandidates = [];
        const seen = new Set();
        for (const candidate of candidateItems) {
          const id = String(candidate?.id ?? candidate?.user_id ?? '');
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniqueCandidates.push(candidate);
        }

        setCourse(extractItem(coursePayload));
        setGroups(extractItems(groupPayload));
        setCourseUsers(nextCourseUsers);
        setCandidates(uniqueCandidates.filter((c) => resolveRole(c) !== 'schooladmin' && resolveRole(c) !== 'teacher'));
      } catch (err) {
        if (!active) return;
        setError(err.message ?? 'Хичээлийн хэрэглэгчдийг ачаалах үед алдаа гарлаа.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [course_id, accessRole, currentUser]);

  const enrolledIds = useMemo(
    () => new Set(courseUsers.map((item) => String(item.user_id ?? item.user?.id ?? ''))),
    [courseUsers],
  );

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => !enrolledIds.has(String(candidate.id))),
    [candidates, enrolledIds],
  );

  const refreshCourseUsers = async () => {
    const userPayload = await courseUserAPI.getByCourse(course_id);
    setCourseUsers(extractItems(userPayload).map((item) => {
      const parsed = parseJsonFields(item);
      let group = null;
      try { group = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
      return {
        ...parsed,
        user: normalizeUser(parsed),
        group,
      };
    }));
  };

  const handleAdd = async () => {
    const userId = selectedUser?.id ?? form.userId;
    if (!userId) { setError('Хэрэглэгч сонгоно уу.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await courseUserAPI.add(course_id, {
        current_user: String(currentUser?.id ?? ''),
        user_id: String(userId),
        ...(form.groupId && { group_id: String(form.groupId) }),
      });
      setSelectedUser(null);
      setUserSearch('');
      setForm({ userId: '', groupId: '' });
      await refreshCourseUsers();
    } catch (err) {
      setError(err.message ?? 'Хэрэглэгч нэмэх үед алдаа гарлаа.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupChange = async (userId, groupId) => {
    try {
      setError('');
      await courseUserAPI.update(course_id, userId, { group_id: groupId ? String(groupId) : '' });
      await refreshCourseUsers();
    } catch (err) {
      setError(err.message ?? 'Бүлэг солих үед алдаа гарлаа.');
    }
  };

  const handleRemove = async (userId) => {
    if (!userId) return;
    if (!window.confirm('Энэ хэрэглэгчийг хичээлээс хасах уу?')) return;
    try {
      setError('');
      await courseUserAPI.remove(course_id, userId);
      await refreshCourseUsers();
    } catch (err) {
      setError(err.message ?? 'Хэрэглэгч хасах үед алдаа гарлаа.');
    }
  };

  if (!canManageCourseUsers(accessRole)) {
    return <div className="app-empty">Энэ хэсгийг удирдах эрхгүй байна.</div>;
  }

  if (loading) return <div className="app-empty">Хичээлийн хэрэглэгчдийг ачааллаж байна...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/courses" className="hover:text-indigo-900">Хичээлүүд</Link>
        <span>›</span>
        <Link to={`/courses/${course_id}`} className="hover:text-indigo-900">{parseCourseName(course ?? {})}</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">Хэрэглэгчид</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Course Users</div>
            <h1 className="mt-4 app-page-title">{parseCourseName(course ?? {})} - хэрэглэгчид</h1>
            <p className="app-page-subtitle">Хичээлд оюутан нэмэх, шууд бүлэг оноох, одоо байгаа enrollment-ийг удирдах хэсэг.</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Нийт enrollment</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{courseUsers.length}</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <section className="app-panel px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Нэмэх сурагч</label>
            <div className="relative">
              <input
                value={selectedUser ? fullName(selectedUser) : userSearch}
                onChange={(e) => { setSelectedUser(null); setUserSearch(e.target.value); setForm((f) => ({ ...f, userId: '' })); }}
                placeholder="Нэр, и-мэйл, username-ээр хайх..."
                className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-900"
              />
              {selectedUser && (
                <button type="button" onClick={() => { setSelectedUser(null); setUserSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
              )}
              {!selectedUser && userSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {availableCandidates
                    .filter((c) => `${fullName(c)} ${c.email ?? ''} ${c.username ?? ''}`.toLowerCase().includes(userSearch.toLowerCase()))
                    .slice(0, 8)
                    .map((c) => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelectedUser(c); setUserSearch(''); setForm((f) => ({ ...f, userId: String(c.id) })); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 text-sm">
                        <span className="font-medium">{fullName(c)}</span>
                        <span className="text-gray-400 text-xs truncate">{c.email ?? c.username ?? ''}</span>
                      </button>
                    ))}
                  {availableCandidates.filter((c) => `${fullName(c)} ${c.email ?? ''} ${c.username ?? ''}`.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400">Олдсонгүй</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Эхний бүлэг</label>
            <select
              value={form.groupId}
              onChange={(event) => setForm((current) => ({ ...current, groupId: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-900"
            >
              <option value="">Бүлэггүй</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting || !form.userId}
            className="inline-flex h-[44px] items-center justify-center self-end rounded-xl bg-[#1f3b8f] px-5 text-sm font-semibold text-white transition hover:bg-[#162e76] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Нэмж байна...' : 'Хичээлд нэмэх'}
          </button>
        </div>
      </section>

      <section className="app-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Enrollment жагсаалт</h2>
        </div>
        {courseUsers.length === 0 ? (
          <div className="app-empty">Одоогоор enrollment байхгүй байна.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {courseUsers.map((item) => (
              <div key={item.id ?? `${item.course_id}-${item.user_id}`} className="grid gap-4 px-6 py-4 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{fullName(item.user)}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.user?.email || item.user?.username || 'Имэйлгүй'}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Бүлэг</label>
                  <select
                    value={item.group_id ?? ''}
                    onChange={(event) => handleGroupChange(item.user_id, event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-900"
                  >
                    <option value="">Бүлэггүй</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.user_id ?? item.user?.id)}
                  className="inline-flex h-[42px] items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Хичээлээс хасах
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
