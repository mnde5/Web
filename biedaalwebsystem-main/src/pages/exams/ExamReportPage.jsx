import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { examAPI, extractItem } from '../../services/api';

function fmtScore(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

export default function ExamReportPage() {
  const { exam_id: examId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    examAPI.getReport(examId)
      .then((payload) => {
        if (active) setReport(extractItem(payload));
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Шалгалтын тайлан ачааллаж чадсангүй.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [examId]);

  if (loading) return <div className="app-empty">Тайлан ачааллаж байна...</div>;
  if (error) return <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>;
  if (!report) return <div className="app-empty">Тайлан олдсонгүй.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={`/exams/${examId}`} className="hover:text-indigo-900">Шалгалт</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">Тайлан</span>
      </div>

      <section className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Report</div>
        <h1 className="mt-4 app-page-title">{report.exam?.name || 'Шалгалтын тайлан'}</h1>
        <p className="app-page-subtitle">Оролдлого, оноо, асуулт бүрийн зөв/буруу хариултын статистик.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            ['Оролдлого', report.attempt_count],
            ['Дундаж оноо', `${fmtScore(report.average_score)}/${report.total_point}`],
            ['Хамгийн өндөр', fmtScore(report.highest_score)],
            ['Вариант', report.variant_count],
          ].map(([label, value]) => (
            <div key={label} className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
              <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="app-panel overflow-hidden px-0 py-0">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Асуултын статистик</h2>
        </div>
        {(report.question_stats || []).length === 0 ? (
          <div className="app-empty">Асуултын статистик байхгүй байна.</div>
        ) : (report.question_stats || []).map((question, index) => (
          <div key={question.question_id} className="border-b border-slate-50 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{index + 1}. {question.question}</p>
                <p className="mt-1 text-xs text-slate-400">Нийт хариулт: {question.total_answers}</p>
              </div>
              <span className="app-chip bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">{question.correct_rate}% зөв</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Зөв: <strong>{question.correct_count}</strong>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                Буруу: <strong>{question.wrong_count}</strong>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
