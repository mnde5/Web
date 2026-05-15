import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import { examAPI, extractItem, extractItems } from '../../services/api';

function makeAnswer(text = '', isCorrect = false) {
  return { text, is_correct: isCorrect };
}

function makeQuestion() {
  return {
    question: '',
    point: 5,
    answers: [
      makeAnswer('', true),
      makeAnswer('', false),
      makeAnswer('', false),
      makeAnswer('', false),
    ],
  };
}

function toDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ExamCreatePage() {
  const { course_id: courseId, exam_id: examId } = useParams();
  const navigate = useNavigate();
  const user = useTeam2User();
  const isEdit = Boolean(examId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadedQuestionIds, setLoadedQuestionIds] = useState([]);
  const [form, setForm] = useState({
    course_id: courseId || '',
    name: '',
    description: '',
    duration: 60,
    starts_on: '',
    ends_on: '',
    status: 'published',
  });
  const [questions, setQuestions] = useState([makeQuestion()]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      examAPI.getOne(examId),
      examAPI.getQuestions(examId),
    ])
      .then(([examPayload, questionPayload]) => {
        if (!active) return;
        const exam = extractItem(examPayload);
        const loadedQuestions = extractItems(questionPayload);
        setForm({
          course_id: exam?.course_id || courseId || '',
          name: exam?.name || '',
          description: exam?.description || '',
          duration: Number(exam?.duration) || 60,
          starts_on: toDateTimeInput(exam?.starts_on),
          ends_on: toDateTimeInput(exam?.ends_on),
          status: exam?.status || 'published',
        });
        setLoadedQuestionIds(loadedQuestions.map((question) => String(question.id || question._id)).filter(Boolean));
        setQuestions(loadedQuestions.length
          ? loadedQuestions.map((question) => ({
            id: question.id || question._id,
            question: question.question || '',
            point: Number(question.point) || 0,
            answers: (question.answers || []).length ? question.answers : makeQuestion().answers,
          }))
          : [makeQuestion()]);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Шалгалтын мэдээлэл ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [courseId, examId, isEdit]);

  const totalPoint = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.point) || 0), 0),
    [questions],
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateQuestion = (index, patch) => {
    setQuestions((current) => current.map((question, i) => (
      i === index ? { ...question, ...patch } : question
    )));
  };

  const updateAnswer = (questionIndex, answerIndex, patch) => {
    setQuestions((current) => current.map((question, i) => {
      if (i !== questionIndex) return question;
      return {
        ...question,
        answers: question.answers.map((answer, j) => (
          j === answerIndex ? { ...answer, ...patch } : answer
        )),
      };
    }));
  };

  const markCorrect = (questionIndex, answerIndex) => {
    setQuestions((current) => current.map((question, i) => {
      if (i !== questionIndex) return question;
      return {
        ...question,
        answers: question.answers.map((answer, j) => ({ ...answer, is_correct: j === answerIndex })),
      };
    }));
  };

  const addQuestion = () => setQuestions((current) => [...current, makeQuestion()]);
  const removeQuestion = (index) => setQuestions((current) => current.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const targetCourseId = courseId || form.course_id;
    if (!isEdit && !targetCourseId) {
      setError('Хичээлийн ID олдсонгүй.');
      return;
    }
    if (!form.name.trim()) {
      setError('Шалгалтын нэр оруулна уу.');
      return;
    }
    if (questions.some((question) => !question.question.trim())) {
      setError('Бүх асуултын текстийг бөглөнө үү.');
      return;
    }
    if (questions.some((question) => question.answers.filter((answer) => answer.text.trim()).length < 2)) {
      setError('Асуулт бүр дор хаяж 2 хариулттай байх ёстой.');
      return;
    }
    if (questions.some((question) => !question.answers.some((answer) => answer.is_correct && answer.text.trim()))) {
      setError('Асуулт бүр нэг зөв хариулттай байх ёстой.');
      return;
    }

    setSaving(true);
    try {
      const normalizedQuestions = questions.map((question, index) => ({
        id: question.id,
        question: question.question,
        type: question.type || 'single_choice',
        order: index + 1,
        point: Number(question.point) || 0,
        answers: question.answers.filter((answer) => answer.text.trim()),
      }));
      const payload = {
        ...form,
        total_point: totalPoint,
        current_user: user?.id,
        questions: normalizedQuestions,
      };

      if (isEdit) {
        const updated = await examAPI.update(examId, payload);
        const currentIds = new Set(normalizedQuestions.map((question) => String(question.id || '')).filter(Boolean));
        await Promise.all(loadedQuestionIds
          .filter((questionId) => !currentIds.has(String(questionId)))
          .map((questionId) => examAPI.deleteQuestion(examId, questionId)));
        await Promise.all(normalizedQuestions.map((question) => (
          question.id
            ? examAPI.updateQuestion(examId, question.id, question)
            : examAPI.addQuestion(examId, question)
        )));
        const exam = extractItem(updated);
        navigate(`/exams/${exam?.id || exam?._id || examId}`);
        return;
      }

      const created = await examAPI.create(targetCourseId, payload);
      const exam = extractItem(created);
      navigate(`/exams/${exam?.id || exam?._id}`);
    } catch (err) {
      setError(err?.message || (isEdit ? 'Шалгалт засахад алдаа гарлаа.' : 'Шалгалт үүсгэхэд алдаа гарлаа.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-empty">Шалгалтын мэдээлэл ачааллаж байна...</div>;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={courseId || form.course_id ? `/courses/${courseId || form.course_id}/exams` : '/exams'} className="hover:text-indigo-900">Шалгалтууд</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{isEdit ? 'Шалгалт засах' : 'Шалгалт үүсгэх'}</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Багш</div>
        <h1 className="mt-4 app-page-title">{isEdit ? 'Шалгалт засах' : 'Шалгалт үүсгэх'}</h1>
        <p className="app-page-subtitle">Шалгалтын мэдээлэл, асуулт, зөв хариултыг MongoDB-тэй шууд синк хийнэ.</p>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="app-panel p-6">
          <h2 className="text-base font-bold text-slate-900">Ерөнхий мэдээлэл</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нэр</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} className="app-input" placeholder="Жишээ: Явцын шалгалт 1" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Тайлбар</label>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} className="app-input min-h-24 resize-none" placeholder="Шалгалтын товч тайлбар" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Хугацаа минут</label>
              <input type="number" min="1" value={form.duration} onChange={(e) => setField('duration', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Төлөв</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="app-input">
                <option value="published">Нээлттэй</option>
                <option value="draft">Ноорог</option>
                <option value="closed">Хаагдсан</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Эхлэх</label>
              <input type="datetime-local" value={form.starts_on} onChange={(e) => setField('starts_on', e.target.value)} className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Дуусах</label>
              <input type="datetime-local" value={form.ends_on} onChange={(e) => setField('ends_on', e.target.value)} className="app-input" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Асуултууд</h2>
              <p className="text-sm text-slate-500">Нийт оноо: {totalPoint}</p>
            </div>
            <button type="button" onClick={addQuestion} className="app-button-secondary">+ Асуулт нэмэх</button>
          </div>

          {questions.map((question, questionIndex) => (
            <div key={questionIndex} className="app-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-900">Асуулт {questionIndex + 1}</h3>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(questionIndex)} className="text-sm font-semibold text-red-500">Устгах</button>
                )}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Асуулт</label>
                  <input value={question.question} onChange={(e) => updateQuestion(questionIndex, { question: e.target.value })} className="app-input" placeholder="Асуултаа бичнэ үү" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Оноо</label>
                  <input type="number" min="0" value={question.point} onChange={(e) => updateQuestion(questionIndex, { point: e.target.value })} className="app-input" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {question.answers.map((answer, answerIndex) => (
                  <div key={answerIndex} className="grid gap-3 md:grid-cols-[40px_minmax(0,1fr)] md:items-center">
                    <button
                      type="button"
                      onClick={() => markCorrect(questionIndex, answerIndex)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition ${
                        answer.is_correct ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
                      }`}
                      title="Зөв хариулт"
                    >
                      ✓
                    </button>
                    <input value={answer.text} onChange={(e) => updateAnswer(questionIndex, answerIndex, { text: e.target.value })} className="app-input" placeholder={`Хариулт ${answerIndex + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to={isEdit ? `/exams/${examId}` : `/courses/${courseId}/exams`} className="app-button-secondary">Буцах</Link>
          <button type="submit" disabled={saving} className="app-button-primary disabled:opacity-60">
            {saving ? 'Хадгалж байна...' : (isEdit ? 'Өөрчлөлт хадгалах' : 'Шалгалт хадгалах')}
          </button>
        </div>
      </form>
    </div>
  );
}
