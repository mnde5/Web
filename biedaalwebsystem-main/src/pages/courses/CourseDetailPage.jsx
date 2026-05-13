import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { courseAPI, schoolAPI, lessonAPI, submissionAPI, extractItem, extractItems } from '../../services/api';
import { getSchoolMemberships } from '../../utils/role';
import { canGrade, canManageCourseUsers, canManageUsers, canSubmit } from '../../utils/role';

function hasSubmissionEnabled(lesson) {
  return Number(lesson?.has_submission ?? 0) === 1;
}

export default function CourseDetailPage() {
  const { course_id } = useParams();
  const role = useTeam2Role();
  const user = useTeam2User();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [addingTeacher, setAddingTeacher] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cr, lr] = await Promise.all([courseAPI.getOne(course_id), lessonAPI.getByCourse(course_id)]);
        const parsedLessons = extractItems(lr).map((lesson) => {
          const nextLesson = { ...lesson };
          try { nextLesson.type = JSON.parse(nextLesson['{}type']); } catch {}
          return nextLesson;
        });
        const counts = await Promise.all(parsedLessons.map(async (lesson) => {
          if (!hasSubmissionEnabled(lesson)) return [lesson.id, null];
          try {
            const submissionPayload = await submissionAPI.getByLesson(lesson.id);
            return [lesson.id, extractItems(submissionPayload).length];
          } catch {
            return [lesson.id, null];
          }
        }));
        const countMap = new Map(counts);

        setCourse(extractItem(cr));
        setLessons(parsedLessons.map((lesson) => ({
          ...lesson,
          submissionCount: countMap.get(lesson.id) ?? null,
        })));
        courseAPI.getTeachers(course_id).then((r) => setTeachers(extractItems(r))).catch(() => {});
      } catch {}
      finally { setLoading(false); }
    };
    load();
    const schoolIds = getSchoolMemberships(user)
      .filter((s) => String(s.id) !== '0' && s.id)
      .map((s) => s.id);
    if (schoolIds.length) {
      Promise.all(schoolIds.map((id) => schoolAPI.getUsers(id)))
        .then((responses) => setAllUsers(responses.flatMap((r) => extractItems(r))))
        .catch(() => {});
    }
  }, [course_id, user]);

  const filteredTeachers = allUsers.filter((u) => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return false;
    return `${u.last_name ?? ''} ${u.first_name ?? ''} ${u.email ?? ''} ${u.username ?? ''}`.toLowerCase().includes(q);
  }).slice(0, 5);

  const tName = (u) => `${u.last_name ?? ''} ${u.first_name ?? ''}`.trim() || u.username || u.email || `ID ${u.id}`;

  const handleAddTeacher = async () => {
    if (!selectedTeacher) return;
    setAddingTeacher(true);
    try {
      await courseAPI.addTeacher(course_id, { user_id: selectedTeacher.id });
      setTeachers((prev) => [...prev, selectedTeacher]);
      setSelectedTeacher(null);
      setTeacherSearch('');
    } catch (e) {
      alert(e.message ?? 'Алдаа гарлаа.');
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleRemoveTeacher = async (teacherId) => {
    if (!confirm('Багшийг хасах уу?')) return;
    try {
      await courseAPI.removeTeacher(course_id, teacherId);
      setTeachers((prev) => prev.filter((t) => String(t.id ?? t.user_id) !== String(teacherId)));
    } catch (e) {
      alert(e.message ?? 'Алдаа гарлаа.');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Ачааллаж байна...</div>;
  if (!course) return <div className="text-red-400 text-center py-24">Хичээл олдсонгүй</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-sm text-gray-400">
          <Link to="/courses" className="hover:text-indigo-900">Хичээлүүд</Link>
          <span>›</span><span className="truncate text-gray-700 font-medium">{course.name}</span>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          {canGrade(role) && <Link to={`/courses/${course_id}/lessons/create`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-950">+ Даалгавар нэмэх</Link>}
          {canGrade(role) && <Link to={`/courses/${course_id}/edit`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-900">Засах</Link>}
          {canManageCourseUsers(role) && <Link to={`/courses/${course_id}/users`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-900">Хэрэглэгчид</Link>}
          {canGrade(role) && <Link to={`/courses/${course_id}/groups`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-900">Бүлгүүд</Link>}
          {canGrade(role) && <Link to={`/courses/${course_id}/grade`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-900">Журнал</Link>}
          {canSubmit(role) && <Link to={`/courses/${course_id}/submissions`} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-950">Миний илгээлтүүд</Link>}
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 300px', alignItems:'start' }}>
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-900 flex items-center justify-center shrink-0">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{course.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{course.description ?? 'Тайлбар байхгүй'}</p>
              <div className="flex gap-4 mt-3 text-xs text-gray-400">
                {course.start_on && <span>{course.start_on}</span>}
                {course.end_on && <span>🏁 {course.end_on}</span>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Сэдвүүд</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{lessons.length} сэдэв</span>
                {canGrade(role) && (
                  <Link
                    to={`/courses/${course_id}/lessons/create`}
                    className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-800 transition"
                  >
                    + Даалгавар
                  </Link>
                )}
              </div>
            </div>
            {lessons.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">Сэдэв байхгүй байна</div>
            ) : lessons.map((l, i) => (
              <div key={l.id} className="px-6 py-4 border-b border-gray-50 hover:bg-slate-50 transition cursor-pointer flex items-center gap-4" onClick={() => navigate(`/courses/${course_id}/lessons/${l.id}`)}>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{l.name ?? 'Сэдэв'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{l.type?.name ?? ''}</p>
                </div>
                {hasSubmissionEnabled(l) && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">Даалгавар</span>}
                {l.is_attendable && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">Ирц</span>}
                {hasSubmissionEnabled(l) && l.submissionCount != null && (
                  <span className="text-xs text-gray-500">{l.submissionCount} илгээлт</span>
                )}
                {canGrade(role) && (
                  <Link
                    to={`/courses/${course_id}/lessons/${l.id}/edit`}
                    onClick={(event) => event.stopPropagation()}
                    className="text-xs text-indigo-900 font-medium hover:underline"
                  >
                    Засах
                  </Link>
                )}
                <span className="text-xs text-gray-400">›</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Мэдээлэл</h3>
            <div className="space-y-3">
              {[['Нэр', course.name], ['Эхлэх огноо', course.start_on], ['Дуусах огноо', course.end_on], ['Сэдэв', lessons.length + ' сэдэв']].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-400">{l}</span>
                  <span className="font-medium text-gray-900">{v ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {canManageUsers(role) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Багш нар</h3>

              {teachers.length > 0 && (
                <div className="mb-3 space-y-2">
                  {teachers.map((t) => {
                    const id = t.id ?? t.user_id;
                    return (
                      <div key={id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-700">{tName(t)}</span>
                        <button type="button" onClick={() => handleRemoveTeacher(id)} className="text-xs text-red-400 hover:text-red-600">Хасах</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <input
                  value={selectedTeacher ? tName(selectedTeacher) : teacherSearch}
                  onChange={(e) => { setSelectedTeacher(null); setTeacherSearch(e.target.value); }}
                  placeholder="Багш хайх..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-900 bg-slate-50"
                />
                {selectedTeacher && (
                  <button type="button" onClick={() => { setSelectedTeacher(null); setTeacherSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">✕</button>
                )}
                {!selectedTeacher && filteredTeachers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                    {filteredTeachers.map((u) => (
                      <button key={u.id} type="button" onClick={() => { setSelectedTeacher(u); setTeacherSearch(''); }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 text-sm">
                        <span className="font-medium">{tName(u)}</span>
                        <span className="text-gray-400 text-xs">{u.email ?? ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={handleAddTeacher} disabled={!selectedTeacher || addingTeacher} className="mt-2 w-full bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition">
                {addingTeacher ? 'Нэмж байна...' : '+ Багш нэмэх'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
