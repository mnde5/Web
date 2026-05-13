import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { courseAPI, userAPI, categoryAPI, extractItem, extractItems } from '../../services/api';
import { canManageUsers, getSchoolMemberships } from '../../utils/role';

export default function CourseCreatePage() {
  const { course_id } = useParams();
  const navigate = useNavigate();
  const role = useTeam2Role();
  const user = useTeam2User();
  const isEdit = !!course_id;

  const [form, setForm] = useState({
    name: '', description: '', start_on: '', end_on: '', category_id: '',
    credit: '3', priority: '1',
    max_semester_point: '100', max_attendance_point: '100',
    max_assignment_point: '100', max_exam_point: '100',
  });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resolvedSchoolId, setResolvedSchoolId] = useState(null);

  // Багш хайлт
  const [allUsers, setAllUsers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // School 0 болон student-only сургуулиудыг хасаж, admin/teacher эрхтэй сургуулиа авна
  const schoolId = (() => {
    const memberships = getSchoolMemberships(user);
    const match = memberships.find((s) => {
      if (String(s.id) === '0' || !s.id) return false;
      const roles = Array.isArray(s.roles) ? s.roles : [];
      if (!roles.length) return true;
      return roles.some((r) => Number(r.id) === 10 || Number(r.id) === 20);
    });
    return match?.id ?? null;
  })();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!canManageUsers(role)) navigate('/courses');
  }, [role]);

  useEffect(() => {
    if (!course_id) return;
    courseAPI.getOne(course_id).then((res) => {
      const c = extractItem(res);
      if (!c) return;
      setForm({
        name: c.name ?? '',
        description: c.description ?? '',
        start_on: c.start_on?.slice(0, 10) ?? '',
        end_on: c.end_on?.slice(0, 10) ?? '',
      });
    });
  }, [course_id]);

  useEffect(() => {
    userAPI.getAll().then((res) => setAllUsers(extractItems(res))).catch(() => {});
  }, []);

  // Категори ачаална
  useEffect(() => {
    const sid = schoolId ?? resolvedSchoolId;
    if (!sid) return;
    categoryAPI.getBySchool(sid).then((res) => {
      const cats = extractItems(res);
      setCategories(cats);
      if (cats.length > 0 && !form.category_id) {
        setForm((f) => ({ ...f, category_id: String(cats[0].id) }));
      }
    }).catch(() => {});
  }, [schoolId, resolvedSchoolId]);

  // localStorage-д school олдохгүй бол API-аас шууд авна
  useEffect(() => {
    if (!user?.id || schoolId) return;
    userAPI.getSchools(user.id).then((res) => {
      const schools = extractItems(res);
      const match = schools.find((s) => {
        if (String(s.id) === '0' || !s.id) return false;
        const roles = Array.isArray(s.roles) ? s.roles : [];
        if (!roles.length) return true;
        return roles.some((r) => Number(r.id) === 10 || Number(r.id) === 20);
      });
      if (match?.id) setResolvedSchoolId(match.id);
    }).catch(() => {});
  }, [user?.id, schoolId]);

  const filteredTeachers = allUsers.filter((u) => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return false;
    return `${u.last_name ?? ''} ${u.first_name ?? ''} ${u.email ?? ''} ${u.username ?? ''}`.toLowerCase().includes(q);
  }).slice(0, 6);

  const teacherName = (u) => `${u.last_name ?? ''} ${u.first_name ?? ''}`.trim() || u.username || u.email || `ID ${u.id}`;

  const handleSave = async () => {
    const effectiveSchoolId = schoolId ?? resolvedSchoolId;
    if (!form.name.trim()) { setError('Хичээлийн нэр оруулна уу.'); return; }
    if (!isEdit && !form.category_id) { setError('Ангилал сонгоно уу.'); return; }
    if (!isEdit && !effectiveSchoolId) { setError('Сургуулийн мэдээлэл олдсонгүй. Эхлээд нэвтэрнэ үү.'); return; }
    setSaving(true);
    setError('');
    try {
      const toISO = (d) => d ? `${d}T00:00:00Z` : undefined;
      const body = {
        name: form.name.trim(),
        category_id: form.category_id,
        access_type_id: 1,
        max_semester_point: Number(form.max_semester_point) || 100,
        max_attendance_point: Number(form.max_attendance_point) || 100,
        max_assignment_point: Number(form.max_assignment_point) || 100,
        max_exam_point: Number(form.max_exam_point) || 100,
        credit: Number(form.credit) || 3,
        priority: Number(form.priority) || 1,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.start_on && { start_on: toISO(form.start_on) }),
        ...(form.end_on && { end_on: toISO(form.end_on) }),
      };

      if (isEdit) {
        await courseAPI.update(course_id, body);
        navigate('/courses');
      } else {
        // 1) Хичээл үүсгэнэ
        const res = await courseAPI.create(effectiveSchoolId, body);
        const created = extractItem(res);
        const newCourseId = created?.id ?? created?.course_id;

        // 2) Багш оноох
        if (newCourseId && selectedTeacher) {
          await courseAPI.addTeacher(newCourseId, { user_id: selectedTeacher.id });
        }

        navigate('/courses');
      }
    } catch (e) {
      setError(e.message ?? 'Алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link to="/courses" className="hover:text-slate-900">Хичээлүүд</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{isEdit ? 'Засах' : 'Хичээл үүсгэх'}</span>
      </div>

      <div className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
          {isEdit ? 'Засах' : 'Шинэ хичээл'}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
          {isEdit ? 'Хичээл засах' : 'Хичээл үүсгэх'}
        </h1>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Хичээлийн нэр *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              type="text"
              placeholder="Хичээлийн нэр"
              className="app-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Тайлбар
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Хичээлийн агуулга"
              className="app-input resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Кредит</label>
              <input type="number" min="1" value={form.credit} onChange={(e) => set('credit', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Эрэмбэ</label>
              <input type="number" min="1" value={form.priority} onChange={(e) => set('priority', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нийт оноо</label>
              <input type="number" min="0" value={form.max_semester_point} onChange={(e) => set('max_semester_point', e.target.value)} className="app-input" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Ирцийн оноо</label>
              <input type="number" min="0" value={form.max_attendance_point} onChange={(e) => set('max_attendance_point', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Даалгаврын оноо</label>
              <input type="number" min="0" value={form.max_assignment_point} onChange={(e) => set('max_assignment_point', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Шалгалтын оноо</label>
              <input type="number" min="0" value={form.max_exam_point} onChange={(e) => set('max_exam_point', e.target.value)} className="app-input" />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Ангилал *
              </label>
              {categories.length > 0 ? (
                <select
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className="app-input"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name ?? `Ангилал ${c.id}`}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-400">Ангилал ачаалагдаж байна...</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Эхлэх огноо
              </label>
              <input
                type="date"
                value={form.start_on}
                onChange={(e) => set('start_on', e.target.value)}
                className="app-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Дуусах огноо
              </label>
              <input
                type="date"
                value={form.end_on}
                onChange={(e) => set('end_on', e.target.value)}
                className="app-input"
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Багш оноох
              </label>
              <div className="relative">
                <input
                  value={selectedTeacher ? teacherName(selectedTeacher) : teacherSearch}
                  onChange={(e) => { setSelectedTeacher(null); setTeacherSearch(e.target.value); }}
                  type="text"
                  placeholder="Нэр, и-мэйл, username-ээр хайх..."
                  className="app-input"
                />
                {selectedTeacher && (
                  <button
                    type="button"
                    onClick={() => { setSelectedTeacher(null); setTeacherSearch(''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >✕</button>
                )}
                {!selectedTeacher && filteredTeachers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-lg">
                    {filteredTeachers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedTeacher(u); setTeacherSearch(''); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(31,59,143,0.08)] text-xs font-bold text-[#1f3b8f]">
                          {(u.last_name?.[0] ?? u.username?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{teacherName(u)}</p>
                          <p className="truncate text-xs text-slate-400">{u.email ?? u.username ?? ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!selectedTeacher && (
                <p className="mt-1 text-xs text-slate-400">Хоосон үлдээвэл багшгүй үүснэ — хожим нэмж болно.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="app-button-primary"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Хадгалж байна...' : isEdit ? 'Өөрчлөлт хадгалах' : 'Хичээл үүсгэх'}
          </button>
          <Link to="/courses" className="app-button-secondary">Болих</Link>
        </div>
      </div>
    </div>
  );
}
