import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import { examAPI, extractItem, extractItems } from '../../services/api';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('mn-MN');
}

export default function ExamDetailPage() {
  const { exam_id: examId } = useParams();
  const user = useTeam2User();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      examAPI.getOne(examId),
      examAPI.getQuestions(examId),
    ])
      .then(([examPayload, questionPayload]) => {
        if (!active) return;
        setExam(extractItem(examPayload));
        setQuestions(extractItems(questionPayload));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Шалгалтын мэдээлэл ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId]);

  if (loading) return <div className="app-empty">Шалгалтын мэдээлэл ачааллаж байна...</div>;
  if (error) return <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>;
  if (!exam) return <div className="app-empty">Шалгалт олдсонгүй.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={`/courses/${exam.course_id}/exams`} className="hover:text-indigo-900">Шалгалтууд</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{exam.name}</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Шалгалтын дэлгэрэнгүй</div>
            <h1 className="mt-4 app-page-title">{exam.name}</h1>
            <p className="app-page-subtitle">{exam.description || 'Тайлбар оруулаагүй байна.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/exams/${exam.id}/edit`} className="app-button-secondary">
              Засах
            </Link>
            <Link to={`/exams/${exam.id}/variants`} className="app-button-secondary">
              Вариантууд
            </Link>
            <Link to={`/exams/${exam.id}/report`} className="app-button-secondary">
              Тайлан
            </Link>
            <Link to={`/exams/${exam.id}/students/${user?.id || 'student-1'}`} className="app-button-primary">
              Сурагчийн горимоор өгөх
            </Link>
            <Link to={`/courses/${exam.course_id}/exams/create`} className="app-button-secondary">
              Шинэ шалгалт
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Оноо</p>
            <p className="mt-2 text-xl font-black text-slate-900">{exam.total_point}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Минут</p>
            <p className="mt-2 text-xl font-black text-slate-900">{exam.duration}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Эхлэх</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{formatDate(exam.starts_on)}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Дуусах</p>
            <p className="mt-2 text-sm font-bold text-slate-900">{formatDate(exam.ends_on)}</p>
          </div>
        </div>
      </section>

      <section className="app-panel overflow-hidden px-0 py-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Асуултууд</h2>
        </div>
        {questions.length === 0 ? (
          <div className="app-empty">Асуулт нэмэгдээгүй байна.</div>
        ) : questions.map((question, index) => (
          <div key={question.id} className="border-b border-slate-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">{index + 1}. {question.question}</p>
                <p className="mt-1 text-xs text-slate-400">{question.point} оноо</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(question.answers || []).map((answer) => (
                <div key={answer.id} className={`rounded-xl border px-3 py-2 text-sm ${
                  answer.is_correct ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-600'
                }`}>
                  {answer.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
