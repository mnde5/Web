import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examAPI, extractItem, extractItems } from '../../services/api';

export default function ExamVariantDetailPage() {
  const { exam_id: examId, id: variantId } = useParams();
  const [variant, setVariant] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      examAPI.getVariant(examId, variantId),
      examAPI.getQuestions(examId),
    ])
      .then(([variantPayload, questionPayload]) => {
        if (!active) return;
        setVariant(extractItem(variantPayload));
        setQuestions(extractItems(questionPayload));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Вариантын мэдээлэл ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId, variantId]);

  const selectedQuestions = useMemo(() => {
    const ids = new Set((variant?.question_ids || []).map(String));
    return questions.filter((question) => ids.has(String(question.id || question._id)));
  }, [questions, variant]);

  if (loading) return <div className="app-empty">Вариант ачааллаж байна...</div>;
  if (error) return <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>;
  if (!variant) return <div className="app-empty">Вариант олдсонгүй.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={`/exams/${examId}/variants`} className="hover:text-indigo-900">Вариантууд</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{variant.name}</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Вариантын дэлгэрэнгүй</div>
            <h1 className="mt-4 app-page-title">{variant.name}</h1>
            <p className="app-page-subtitle">{variant.description || 'Тайлбар оруулаагүй байна.'}</p>
          </div>
          <Link to={`/exams/${examId}/variants/${variant.id}/edit`} className="app-button-primary">Вариант засах</Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Асуулт</p>
            <p className="mt-2 text-xl font-black text-slate-900">{selectedQuestions.length}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Төлөв</p>
            <p className="mt-2 text-xl font-black text-slate-900">{variant.status}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Оноо</p>
            <p className="mt-2 text-xl font-black text-slate-900">{selectedQuestions.reduce((sum, question) => sum + (Number(question.point) || 0), 0)}</p>
          </div>
        </div>
      </section>

      <section className="app-panel overflow-hidden px-0 py-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Вариантын асуултууд</h2>
        </div>
        {selectedQuestions.length === 0 ? (
          <div className="app-empty">Сонгосон асуулт байхгүй байна.</div>
        ) : selectedQuestions.map((question, index) => (
          <div key={question.id} className="border-b border-slate-50 px-6 py-5">
            <p className="text-sm font-bold text-slate-900">{index + 1}. {question.question}</p>
            <p className="mt-1 text-xs text-slate-400">{question.point} оноо</p>
          </div>
        ))}
      </section>
    </div>
  );
}
