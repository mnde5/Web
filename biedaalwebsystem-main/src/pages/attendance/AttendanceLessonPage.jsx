import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attendanceAPI, attendanceTypeAPI, courseAPI, extractItem, extractItems, lessonAPI } from '../../services/api';
import { getErrorMessage } from '../../utils/role';

function normalizeCourseUsers(payload) {
  return extractItems(payload).map((item) => {
    const user = item.user && typeof item.user === 'object' ? item.user : item;
    return {
      id: user.user_id ?? user.id,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
    };
  }).filter((item) => item.id != null);
}

export default function AttendanceLessonPage() {
  const { course_id, lesson_id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [savingUserId, setSavingUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [lessonPayload, userPayload, typePayload, attendancePayload] = await Promise.all([
          lessonAPI.getOne(lesson_id),
          courseAPI.getUsers(course_id),
          attendanceTypeAPI.getAll(),
          attendanceAPI.getLessonAttendances(lesson_id),
        ]);

        if (!active) return;

        setLesson(extractItem(lessonPayload));
        setUsers(normalizeCourseUsers(userPayload));
        setTypes(extractItems(typePayload));

        const nextMap = {};
        for (const item of extractItems(attendancePayload)) {
          nextMap[String(item.user_id)] = item;
        }
        setAttendanceMap(nextMap);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Ирцийн мэдээлэл ачааллахад алдаа гарлаа.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [course_id, lesson_id]);

  const rows = useMemo(() => users.map((user) => {
    const record = attendanceMap[String(user.id)];
    return {
      ...user,
      type_id: record?.type_id != null ? String(record.type_id) : '',
    };
  }), [attendanceMap, users]);

  const handleSave = async (userId, typeId) => {
    if (!typeId) return;
    setSavingUserId(String(userId));
    try {
      await attendanceAPI.updateLessonAttendance(lesson_id, userId, { type_id: Number(typeId) });
      setAttendanceMap((current) => ({
        ...current,
        [String(userId)]: {
          ...(current[String(userId)] || {}),
          user_id: userId,
          lesson_id,
          type_id: Number(typeId),
        },
      }));
    } catch (err) {
      setError(getErrorMessage(err, 'Ирц хадгалах үед алдаа гарлаа.'));
    } finally {
      setSavingUserId('');
    }
  };

  if (loading) return <div className="app-empty">Ирцийн мэдээлэл ачааллаж байна...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to={`/courses/${course_id}/attendances`} className="hover:text-[#1f3b8f]">Хичээлийн ирц</Link>
        <span>›</span>
        <span className="text-slate-700 font-medium">{lesson?.name ?? `Сэдэв ${lesson_id}`}</span>
      </div>

      <section className="app-panel px-6 py-6">
        <h1 className="app-page-title">Сэдвийн ирцийн удирдлага</h1>
        <p className="app-page-subtitle">{lesson?.name ?? 'Сэдэв'} дээрх оюутнуудын ирцийн төрлийг энэ хэсгээс шинэчилнэ.</p>
      </section>

      {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="app-table-shell">
        <div className="grid border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" style={{ gridTemplateColumns: '1.6fr 1.3fr 1fr 0.7fr' }}>
          <span>Оюутан</span>
          <span>И-мэйл</span>
          <span>Ирцийн төрөл</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Одоогоор харагдах хэрэглэгч алга байна.</div>
        ) : rows.map((row) => (
          <div key={row.id} className="grid items-center border-b border-slate-100 px-6 py-4" style={{ gridTemplateColumns: '1.6fr 1.3fr 1fr 0.7fr' }}>
            <div>
              <p className="text-sm font-semibold text-slate-900">{`${row.last_name} ${row.first_name}`.trim() || `#${row.id}`}</p>
              <p className="mt-1 text-xs text-slate-400">ID: {row.id}</p>
            </div>
            <span className="text-sm text-slate-500">{row.email || '—'}</span>
            <select
              className="app-select max-w-[220px]"
              defaultValue={row.type_id}
              onChange={(event) => {
                event.currentTarget.dataset.value = event.target.value;
              }}
            >
              <option value="">Ирц сонгох</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="app-button-primary px-4 py-2.5"
              disabled={savingUserId === String(row.id)}
              onClick={(event) => {
                const select = event.currentTarget.parentElement?.querySelector('select');
                handleSave(row.id, select?.value || '');
              }}
            >
              {savingUserId === String(row.id) ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
