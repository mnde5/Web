import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { examAPI, extractItems } from '../../services/api';
import { canGrade } from '../../utils/role';

function formatDate(value) {
  if (!value) return 'Огноо тохируулаагүй';
  return new Date(value).toLocaleString('mn-MN');
}

function statusLabel(status) {
  if (status === 'published') return 'Нээлттэй';
  if (status === 'closed') return 'Хаагдсан';
  return 'Ноорог';
}

export default function ExamListPage() {
  const { course_id: courseId } = useParams();
  const role = useTeam2Role();
  const user = useTeam2User();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const request = courseId ? examAPI.getByCourse(courseId) : examAPI.getAll();
    request
      .then((payload) => {
        if (!active) return;
        setExams(extractItems(payload));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Шалгалтын жагсаалт ачааллаж чадсангүй.');
        setExams([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [courseId]);

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Шалгалт</div>
            <h1 className="mt-4 app-page-title">{courseId ? 'Хичээлийн шалгалтууд' : 'Шалгалтын жагсаалт'}</h1>
            <p className="app-page-subtitle">Багш шалгалт үүсгэж, оюутан нээлттэй шалгалтыг өгнө.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Нийт</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{loading ? '...' : exams.length}</p>
            </div>
            {canGrade(role) && courseId && (
              <Link to={`/courses/${courseId}/exams/create`} className="app-button-primary">
                + Шалгалт үүсгэх
              </Link>
            )}
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="app-empty">Шалгалтуудыг ачааллаж байна...</div>
      ) : exams.length === 0 ? (
        <div className="app-empty">Шалгалт бүртгэгдээгүй байна.</div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <div key={exam.id} className="app-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="app-chip bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">{statusLabel(exam.status)}</span>
                <span className="text-xs font-semibold text-slate-400">{Number(exam.total_point) || 0} оноо</span>
              </div>
              <h3 className="mt-5 text-lg font-bold leading-snug text-slate-900">{exam.name || 'Шалгалт'}</h3>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">{exam.description || 'Тайлбар оруулаагүй байна.'}</p>
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <p>Эхлэх: {formatDate(exam.starts_on)}</p>
                <p>Дуусах: {formatDate(exam.ends_on)}</p>
                <p>Хугацаа: {Number(exam.duration) || 0} минут</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {canGrade(role) ? (
                  <button type="button" onClick={() => navigate(`/exams/${exam.id}`)} className="app-button-secondary">
                    Дэлгэрэнгүй
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/exams/${exam.id}/students/${user?.id || 'student-1'}`)}
                    className="app-button-primary"
                    disabled={exam.status === 'closed'}
                  >
                    Шалгалт өгөх
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
