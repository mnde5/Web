import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import { lessonAPI, submissionAPI, extractItem, extractItems, getSubmissionGradeValue, isSubmissionGraded } from '../../services/api';
import { canGrade, canSubmit } from '../../utils/role';

export default function LessonDetailPage() {
  const { lesson_id } = useParams();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [lr, sr] = await Promise.all([lessonAPI.getOne(lesson_id), submissionAPI.getByLesson(lesson_id)]);
        const l = extractItem(lr);
        try { l.type = JSON.parse(l['{}type']); } catch {}
        setLesson(l);
        setSubs(extractItems(sr).map(s => { try { s.user = JSON.parse(s['{}user']); } catch {} return s; }));
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [lesson_id]);

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Ачааллаж байна...</div>;
  if (!lesson) return <div className="text-red-400 text-center py-24">Сэдэв олдсонгүй</div>;

  const cId = lesson.course_id;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/courses" className="hover:text-indigo-900">Хичээлүүд</Link><span>›</span>
        {cId && <><Link to={`/courses/${cId}`} className="hover:text-indigo-900">Хичээл</Link><span>›</span></>}
        <span className="text-gray-700 font-medium">{lesson.name ?? 'Сэдэв'}</span>
      </div>

      {canGrade(role) && cId && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            to={`/courses/${cId}/lessons/create`}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-950"
          >
            + Даалгавар нэмэх
          </Link>
          <Link
            to={`/courses/${cId}/lessons/${lesson_id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-900"
          >
            Даалгавар засах
          </Link>
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 300px', alignItems:'start' }}>
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div><h1 className="text-lg font-bold text-gray-900">{lesson.name ?? 'Сэдэв'}</h1><p className="text-xs text-gray-400">{lesson.type?.name ?? ''}</p></div>
              {lesson.has_submission && <span className="ml-auto text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">Даалгавар</span>}
            </div>
            {lesson.content
              ? <div className="text-sm text-gray-700 leading-relaxed bg-slate-50 rounded-xl p-4">{lesson.content}</div>
              : <p className="text-sm text-gray-400">Агуулга байхгүй</p>}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Илгээлтүүд</h3>
              {canSubmit(role) && (
                <Link to={cId ? `/courses/${cId}/lessons/${lesson_id}/submissions/create` : '/submissions/create'} className="text-xs bg-indigo-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-950 transition">+ Илгээх</Link>
              )}
            </div>
            {subs.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">Илгээлт байхгүй байна</div>
            ) : subs.map(s => {
              const un = s.user ? `${s.user.last_name??''} ${s.user.first_name??''}`.trim() : 'Оюутан';
              return (
                <div key={s.id} className="px-6 py-3.5 border-b border-gray-50 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer" onClick={() => navigate(`/submissions/${s.id}`)}>
                  <span className="text-sm font-medium text-gray-900">{canGrade(role) ? un : 'Миний илгээлт'}</span>
                  <div className="flex items-center gap-3">
                    {isSubmissionGraded(s)
                      ? <><span className="text-sm font-semibold text-green-600">{getSubmissionGradeValue(s)}%</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Дүгнэсэн</span></>
                      : <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Хүлээлт</span>}
                    <span className="text-xs text-indigo-900 font-medium">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Мэдээлэл</h3>
          <div className="space-y-3 text-sm">
            {[['Сэдэв', lesson.name], ['Төрөл', lesson.type?.name], ['Оноо', lesson.point], ['Ирц', lesson.is_attendable ? 'Тийм' : 'Үгүй']].map(([lb, v]) => (
              <div key={lb} className="flex justify-between">
                <span className="text-gray-400">{lb}</span>
                <span className="font-medium text-gray-900">{v ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
