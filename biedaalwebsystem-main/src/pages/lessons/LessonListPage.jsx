import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, lessonAPI, submissionAPI, extractItems, parseCourseName } from '../../services/api';
import { canGrade } from '../../utils/role';

function hasSubmissionEnabled(lesson) {
  return Number(lesson?.has_submission ?? 0) === 1;
}

export default function LessonListPage() {
  const { course_id: paramCourse } = useParams();
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelected] = useState(paramCourse ?? '');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    const fn = async () => { setLoading(true);
      const res = canGrade(role) ? await courseAPI.getTeaching(user.id) : await courseAPI.getEnrolled(user.id);
      setCourses(extractItems(res).map(c => ({ id: c.course_id??c.id, name: parseCourseName(c) })));
    };
    fn();
  }, [user?.id, role]);

  useEffect(() => {
    setSelected(paramCourse ?? '');
  }, [paramCourse]);

  useEffect(() => {
    if (!selectedCourse) { setLessons([]); return; }
    setLoading(true);
    lessonAPI.getByCourse(selectedCourse)
      .then(async (res) => {
        const parsedLessons = extractItems(res).map((lesson) => {
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
        setLessons(parsedLessons.map((lesson) => ({
          ...lesson,
          submissionCount: countMap.get(lesson.id) ?? null,
        })));
      })
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Сэдвүүд</h1><p className="text-sm text-gray-400 mt-0.5">Хичээлийн бүх сэдэв</p></div>
        <div className="flex items-center gap-3">
          {canGrade(role) && selectedCourse && (
            <Link
              to={`/courses/${selectedCourse}/lessons/create`}
              className="bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              + Даалгавар нэмэх
            </Link>
          )}
          <select value={selectedCourse} onChange={e => setSelected(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-900 bg-white">
            <option value="">Бүх хичээл</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="grid px-6 py-2.5 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ gridTemplateColumns:'3fr 2fr 1fr 1fr 0.5fr' }}>
          <span>Сэдэв</span><span>Хичээл</span><span>Төрөл</span><span>Илгээлт</span><span></span>
        </div>
        {!selectedCourse ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Хичээл сонгоно уу</div>
        : loading ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
        : lessons.length === 0 ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Сэдэв олдсонгүй</div>
        : lessons.map((l, i) => (
          <div key={l.id} className="grid items-center px-6 py-3.5 border-b border-gray-50 hover:bg-slate-50 transition cursor-pointer"
            style={{ gridTemplateColumns:'3fr 2fr 1fr 1fr 0.5fr' }}
            onClick={() => navigate(paramCourse ? `/courses/${paramCourse}/lessons/${l.id}` : `/lessons/${l.id}`)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
              <span className="text-sm font-medium">{l.name ?? 'Сэдэв'}</span>
            </div>
            <span className="text-sm text-gray-600 truncate">{courses.find(c=>c.id==selectedCourse)?.name ?? '—'}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-gray-600 px-2 py-1 rounded-lg w-fit">{l.type?.name ?? '—'}</span>
              {hasSubmissionEnabled(l) && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg w-fit">Даалгавар</span>}
            </div>
            <span className="text-sm font-medium">
              {hasSubmissionEnabled(l)
                ? l.submissionCount == null
                  ? '—'
                  : `${l.submissionCount} илгээлт`
                : '—'}
            </span>
            <div className="flex items-center justify-end gap-3">
              {canGrade(role) && (
                <Link
                  to={`/courses/${selectedCourse}/lessons/${l.id}/edit`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-xs text-indigo-900 font-medium hover:underline"
                >
                  Засах
                </Link>
              )}
              <span className="text-xs text-indigo-900 font-medium">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
