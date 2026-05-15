import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examAPI, extractItem } from '../../services/api';

export default function ExamResultPage() {
  const { exam_id: examId, student_id: studentId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    examAPI.getResult(examId, studentId)
      .then((payload) => {
        if (!active) return;
        setResult(extractItem(payload));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Шалгалтын үр дүн олдсонгүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId, studentId]);

  const attempt = result?.attempt;
  const percent = useMemo(() => {
    if (!attempt?.total_point) return 0;
    return Math.round((Number(attempt.grade_point) / Number(attempt.total_point)) * 100);
  }, [attempt]);

  if (loading) return <div className="app-empty">Үр дүн ачааллаж байна...</div>;
  if (error || !result) {
    return (
      <div className="app-panel mx-auto max-w-3xl px-6 py-7">
        <h1 className="app-page-title">Үр дүн олдсонгүй</h1>
        <p className="app-page-subtitle mt-3">{error}</p>
        <Link to={`/exams/${examId}/students/${studentId}`} className="mt-5 inline-flex app-button-primary">Шалгалт өгөх</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Үр дүн</div>
        <h1 className="mt-4 app-page-title">{result.exam?.name || 'Шалгалт'}</h1>
        <p className="app-page-subtitle">Таны авсан оноо болон зөв хариултын харьцуулалт.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Авсан оноо</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{attempt.grade_point}/{attempt.total_point}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хувь</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{percent}%</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Төлөв</p>
            <p className="mt-2 text-2xl font-black text-slate-900">Илгээсэн</p>
          </div>
        </div>
      </section>

      <section className="app-panel overflow-hidden px-0 py-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Хариултын дэлгэрэнгүй</h2>
        </div>
        {(result.questions || []).map((question, index) => {
          const selected = question.selected_answer;
          const correct = question.correct_answers || [];
          return (
            <div key={question.id} className="border-b border-slate-50 px-6 py-5">
              <p className="text-sm font-bold text-slate-900">{index + 1}. {question.question}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                  selected?.is_correct ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600'
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Таны хариулт</p>
                  <p className="mt-1 font-medium">{selected?.answer_text || '—'}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Зөв хариулт</p>
                  <p className="mt-1 font-medium">{correct.map((answer) => answer.text).join(', ') || '—'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
