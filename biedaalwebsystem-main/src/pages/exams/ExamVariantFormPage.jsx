import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import { examAPI, extractItem, extractItems } from '../../services/api';

export default function ExamVariantFormPage() {
  const { exam_id: examId, id: variantId } = useParams();
  const navigate = useNavigate();
  const user = useTeam2User();
  const isEdit = Boolean(variantId);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'published',
    question_ids: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      examAPI.getOne(examId),
      examAPI.getQuestions(examId),
      isEdit ? examAPI.getVariant(examId, variantId) : Promise.resolve(null),
    ])
      .then(([examPayload, questionPayload, variantPayload]) => {
        if (!active) return;
        const loadedExam = extractItem(examPayload);
        const loadedQuestions = extractItems(questionPayload);
        const variant = variantPayload ? extractItem(variantPayload) : null;
        setExam(loadedExam);
        setQuestions(loadedQuestions);
        setForm({
          name: variant?.name || `Вариант ${(loadedQuestions.length && 1) || 1}`,
          description: variant?.description || '',
          status: variant?.status || 'published',
          question_ids: variant?.question_ids?.length
            ? variant.question_ids.map(String)
            : loadedQuestions.map((question) => String(question.id || question._id)),
        });
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Вариантын мэдээлэл ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId, isEdit, variantId]);

  const selectedCount = useMemo(() => form.question_ids.length, [form.question_ids]);

  const toggleQuestion = (questionId) => {
    setForm((current) => {
      const id = String(questionId);
      const exists = current.question_ids.includes(id);
      return {
        ...current,
        question_ids: exists
          ? current.question_ids.filter((item) => item !== id)
          : [...current.question_ids, id],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Вариантын нэр оруулна уу.');
      return;
    }
    if (!form.question_ids.length) {
      setError('Дор хаяж нэг асуулт сонгоно уу.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        current_user: user?.id,
      };
      const saved = isEdit
        ? await examAPI.updateVariant(examId, variantId, payload)
        : await examAPI.createVariant(examId, payload);
      const variant = extractItem(saved);
      navigate(`/exams/${examId}/variants/${variant?.id || variant?._id || variantId}`);
    } catch (err) {
      setError(err?.message || 'Вариант хадгалахад алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-empty">Вариантын мэдээлэл ачааллаж байна...</div>;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={`/exams/${examId}/variants`} className="hover:text-indigo-900">Вариантууд</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{isEdit ? 'Вариант засах' : 'Вариант нэмэх'}</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Вариант</div>
        <h1 className="mt-4 app-page-title">{isEdit ? 'Вариант засах' : 'Вариант нэмэх'}</h1>
        <p className="app-page-subtitle">{exam?.name || 'Шалгалт'} дээр ашиглах асуултын бүрдлийг сонгоно.</p>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="app-panel p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нэр</label>
              <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Төлөв</label>
              <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="app-input">
                <option value="published">Нээлттэй</option>
                <option value="draft">Ноорог</option>
                <option value="closed">Хаагдсан</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Тайлбар</label>
              <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="app-input min-h-24 resize-none" />
            </div>
          </div>
        </section>

        <section className="app-panel overflow-hidden px-0 py-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Асуултууд</h2>
            <span className="text-sm font-semibold text-slate-500">Сонгосон: {selectedCount}</span>
          </div>
          {questions.length === 0 ? (
            <div className="app-empty">Энэ шалгалтад асуулт байхгүй байна.</div>
          ) : questions.map((question, index) => {
            const questionId = String(question.id || question._id);
            const checked = form.question_ids.includes(questionId);
            return (
              <button
                key={questionId}
                type="button"
                onClick={() => toggleQuestion(questionId)}
                className={`flex w-full items-start gap-4 border-b border-slate-50 px-6 py-4 text-left transition ${
                  checked ? 'bg-[rgba(31,59,143,0.06)]' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                  checked ? 'border-[#1f3b8f] bg-[#1f3b8f] text-white' : 'border-slate-200 text-slate-300'
                }`}>
                  {checked ? '✓' : ''}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">{index + 1}. {question.question}</span>
                  <span className="mt-1 block text-xs text-slate-400">{question.point} оноо</span>
                </span>
              </button>
            );
          })}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to={`/exams/${examId}/variants`} className="app-button-secondary">Буцах</Link>
          <button type="submit" disabled={saving} className="app-button-primary disabled:opacity-60">
            {saving ? 'Хадгалж байна...' : 'Вариант хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}
