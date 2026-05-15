import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examAPI, extractItem, extractItems } from '../../services/api';

export default function ExamTakePage() {
  const { exam_id: examId, student_id: studentId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [startedOn] = useState(() => new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
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

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.answer_id || answers[question.id]?.answer_text).length,
    [questions, answers],
  );

  const setChoice = (questionId, answer) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        question_id: questionId,
        answer_id: answer.id,
        answer_text: answer.text,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (answeredCount !== questions.length) {
      setError('Бүх асуултад хариулна уу.');
      return;
    }

    setSaving(true);
    try {
      await examAPI.submitAttempt(examId, studentId, {
        started_on: startedOn,
        submitted_on: new Date().toISOString(),
        answers: Object.values(answers),
      });
      navigate(`/exams/${examId}/students/${studentId}/result`);
    } catch (err) {
      setError(err?.message || 'Шалгалтын хариу илгээхэд алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-empty">Шалгалт ачааллаж байна...</div>;
  if (error && !exam) return <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>;
  if (!exam) return <div className="app-empty">Шалгалт олдсонгүй.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Сурагч</div>
            <h1 className="mt-4 app-page-title">{exam.name}</h1>
            <p className="app-page-subtitle">{exam.description || 'Шалгалтын асуултуудад хариулаад илгээнэ үү.'}</p>
          </div>
          <div className="app-surface-muted px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хариулсан</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{answeredCount}/{questions.length}</p>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}

      {questions.length === 0 ? (
        <div className="app-empty">Энэ шалгалтад асуулт нэмэгдээгүй байна.</div>
      ) : questions.map((question, index) => (
        <section key={question.id} className="app-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-base font-bold leading-7 text-slate-900">{index + 1}. {question.question}</h2>
            <span className="app-chip bg-slate-100 text-slate-600">{question.point} оноо</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(question.answers || []).map((answer) => {
              const selected = answers[question.id]?.answer_id === answer.id;
              return (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => setChoice(question.id, answer)}
                  className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    selected ? 'border-[#1f3b8f] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1f3b8f]'
                  }`}
                >
                  {answer.text}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap justify-end gap-3">
        <Link to={`/exams/${examId}/students/${studentId}/result`} className="app-button-secondary">Өмнөх дүн харах</Link>
        <button type="submit" disabled={saving || questions.length === 0} className="app-button-primary disabled:opacity-60">
          {saving ? 'Илгээж байна...' : 'Шалгалт илгээх'}
        </button>
      </div>
    </form>
  );
}
