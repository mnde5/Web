import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attendanceAPI, extractItems, parseJsonFields } from '../../services/api';
import { getErrorMessage } from '../../utils/role';

function parseApproval(item) {
  const normalized = parseJsonFields(item);

  const request = normalized.request && typeof normalized.request === 'object'
    ? normalized.request
    : {};
  const student = normalized.student && typeof normalized.student === 'object'
    ? normalized.student
    : {};
  const lesson = normalized.lesson && typeof normalized.lesson === 'object'
    ? normalized.lesson
    : {};
  const currentType = normalized.current_type && typeof normalized.current_type === 'object'
    ? normalized.current_type
    : {};

  return {
    ...normalized,
    request,
    student,
    lesson,
    currentType,
  };
}

export default function AttendanceRequestsPage() {
  const { course_id, lesson_id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await attendanceAPI.getCourseApprovals(course_id);
      setItems(extractItems(payload).map(parseApproval));
    } catch (err) {
      setError(getErrorMessage(err, 'Ирцийн хүсэлтүүдийг ачаалж чадсангүй.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [course_id]);

  const filtered = useMemo(() => {
    if (!lesson_id) return items;
    return items.filter((item) => String(item.lesson?.id ?? item.lesson_id ?? item.lesson_timetable_id ?? '') === String(lesson_id));
  }, [items, lesson_id]);

  const updateStatus = async (approvalId, action) => {
    setSavingId(String(approvalId));
    try {
      if (action === 'approve') await attendanceAPI.approveRequest(approvalId, {});
      else await attendanceAPI.rejectRequest(approvalId, {});
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Хүсэлтийн төлөв шинэчлэх үед алдаа гарлаа.'));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to={`/courses/${course_id}/attendances`} className="hover:text-[#1f3b8f]">Ирц</Link>
        <span>›</span>
        <span className="text-slate-700 font-medium">{lesson_id ? 'Сэдвийн хүсэлтүүд' : 'Хичээлийн хүсэлтүүд'}</span>
      </div>

      <section className="app-panel px-6 py-6">
        <h1 className="app-page-title">{lesson_id ? 'Тухайн сэдвийн чөлөөний хүсэлтүүд' : 'Хичээлийн ирцийн хүсэлтүүд'}</h1>
        <p className="app-page-subtitle">Ирцийн хүсэлтүүдийг эндээс хянаж, зөвшөөрөх эсвэл татгалзах боломжтой.</p>
      </section>

      {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="app-table-shell">
        <div className="grid border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" style={{ gridTemplateColumns: '1.4fr 1.2fr 1.1fr 1.2fr 1fr' }}>
          <span>Оюутан</span>
          <span>Сэдэв</span>
          <span>Тайлбар</span>
          <span>Одоогийн төлөв</span>
          <span>Үйлдэл</span>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Хүсэлт алга байна.</div>
        ) : filtered.map((item) => {
          const studentName = `${item.student?.last_name ?? ''} ${item.student?.first_name ?? ''}`.trim() || item.student?.email || 'Оюутан';
          const note = item.request?.description || item.request?.reason || 'Тайлбаргүй';
          const lessonName = item.lesson?.name || `#${item.lesson_timetable_id ?? item.request?.lesson_id ?? ''}`;
          const currentType = item.currentType?.name || item.currentType?.label || `Төлөв ${item.status_id ?? '—'}`;

          return (
            <div key={item.id} className="grid items-center border-b border-slate-100 px-6 py-4" style={{ gridTemplateColumns: '1.4fr 1.2fr 1.1fr 1.2fr 1fr' }}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{studentName}</p>
                <p className="mt-1 text-xs text-slate-400">{item.student?.email || ''}</p>
              </div>
              <span className="text-sm text-slate-600">{lessonName}</span>
              <span className="truncate text-sm text-slate-500" title={note}>{note}</span>
              <span className="text-sm text-slate-600">{currentType}</span>
              <div className="flex gap-2">
                <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={savingId === String(item.id)} onClick={() => updateStatus(item.id, 'approve')}>
                  Зөвшөөрөх
                </button>
                <button type="button" className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={savingId === String(item.id)} onClick={() => updateStatus(item.id, 'reject')}>
                  Татгалзах
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
