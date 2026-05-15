import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examAPI, extractItem, extractItems } from '../../services/api';

export default function ExamVariantListPage() {
  const { exam_id: examId } = useParams();
  const [exam, setExam] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      examAPI.getOne(examId),
      examAPI.getVariants(examId),
    ])
      .then(([examPayload, variantPayload]) => {
        if (!active) return;
        setExam(extractItem(examPayload));
        setVariants(extractItems(variantPayload));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Вариантын жагсаалт ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId]);

  if (loading) return <div className="app-empty">Вариантууд ачааллаж байна...</div>;
  if (error) return <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>;

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Вариант</div>
            <h1 className="mt-4 app-page-title">{exam?.name || 'Шалгалтын вариант'}</h1>
            <p className="app-page-subtitle">Шалгалтын вариантын жагсаалт, сонгогдсон асуултын бүрдэл.</p>
          </div>
          <Link to={`/exams/${examId}/variants/create`} className="app-button-primary">+ Вариант нэмэх</Link>
        </div>
      </section>

      {variants.length === 0 ? (
        <div className="app-empty">Вариант бүртгэгдээгүй байна.</div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {variants.map((variant) => (
            <div key={variant.id} className="app-panel p-6">
              <span className="app-chip bg-slate-100 text-slate-600">{variant.status || 'published'}</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{variant.name}</h3>
              <p className="mt-2 min-h-14 text-sm leading-6 text-slate-500">{variant.description || 'Тайлбаргүй.'}</p>
              <p className="mt-3 text-xs font-semibold text-slate-400">Асуулт: {(variant.question_ids || []).length}</p>
              <div className="mt-5 flex gap-2">
                <Link to={`/exams/${examId}/variants/${variant.id}`} className="app-button-secondary">Харах</Link>
                <Link to={`/exams/${examId}/variants/${variant.id}/edit`} className="app-button-secondary">Засах</Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
