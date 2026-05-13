import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import { lessonAPI, submissionAPI, extractItems, extractItem, getSubmissionGradeValue, isSubmissionGraded, parseUser } from '../../services/api';
import { canGrade, getErrorMessage } from '../../utils/role';

export default function LessonSubmissionsPage() {
  const { course_id, lesson_id } = useParams();
  const role = useTeam2Role();
  const [lesson, setLesson]         = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [lRes, sRes] = await Promise.all([
          lessonAPI.getOne(lesson_id),
          submissionAPI.getByLesson(lesson_id),
        ]);
        setLesson(extractItem(lRes));
        setSubmissions(extractItems(sRes).map((submission) => ({ ...submission, user: parseUser(submission) })));
      } catch (e) {
        setError(getErrorMessage(e, 'Мэдээлэл ачааллахад алдаа гарлаа.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lesson_id]);

  const badge = (s) => isSubmissionGraded(s)
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{getSubmissionGradeValue(s)}%</span>
    : <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Хүлээлт</span>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={course_id ? `/courses/${course_id}/submissions` : '/'} className="hover:text-blue-600">Илгээлтүүд</Link>
        <span>›</span>
        <span className="text-slate-700">{lesson?.name ?? 'Сэдэв'}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">{lesson?.name ?? 'Сэдвийн илгээлтүүд'}</h1>
          <p className="mt-2 text-slate-500">{submissions.length} илгээлт</p>
        </div>
        {!canGrade(role) && (
          <Link to={`/courses/${course_id}/lessons/${lesson_id}/submissions/create`}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition text-sm">
            + Илгээх
          </Link>
        )}
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="grid px-6 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400"
          style={{ gridTemplateColumns: '2fr 1.5fr 1fr 0.5fr' }}>
          <span>Оюутан</span><span>Огноо</span><span>Дүн</span><span />
        </div>
        {loading ? (
          <div className="py-16 text-center text-gray-400">Ачааллаж байна...</div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Илгээлт байхгүй байна</div>
        ) : (
          submissions.map(s => {
            const name = s.user ? `${s.user.last_name ?? ''} ${s.user.first_name ?? ''}`.trim() : 'Оюутан';
            const dt = s.created_on ? new Date(s.created_on).toLocaleDateString('mn-MN') : '—';
            return (
              <Link key={s.id} to={`/submissions/${s.id}`}
                className="grid items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition last:border-b-0"
                style={{ gridTemplateColumns: '2fr 1.5fr 1fr 0.5fr' }}>
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="text-sm text-gray-400">{dt}</span>
                <span>{badge(s)}</span>
                <span className="text-gray-300 text-right">›</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
