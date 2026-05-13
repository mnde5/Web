import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { attendanceAPI, courseAPI, extractItems, parseCourseName } from '../../services/api';
import { canGrade } from '../../utils/role';

function CalendarIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M3 10h18" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7" /></svg>; }
function CloseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>; }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 20V10" /><path d="M12 20V4" /><path d="M18 20v-6" /></svg>; }

export default function AttendancePage() {
  const { course_id: paramCourse } = useParams();
  const user = useTeam2User();
  const role = useTeam2Role();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(paramCourse ?? '');
  const [attList, setAttList] = useState([]);
  const [stats, setStats] = useState({ total:0, present:0, absent:0, pct:'—' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fn = async () => { setLoading(true);
      const res = canGrade(role) ? await courseAPI.getTeaching(user.id) : await courseAPI.getEnrolled(user.id);
      setCourses(extractItems(res).map(c => ({ id: c.course_id??c.id, name: parseCourseName(c) })));
    };
    fn();
  }, [user?.id, role]);

  useEffect(() => {
    setSelected(paramCourse ?? '');
  }, [paramCourse]);

  useEffect(() => {
    if (!selected) { setAttList([]); setStats({ total:0,present:0,absent:0,pct:'—' }); return; }
    setLoading(true);
    attendanceAPI.getCourseAttendances(selected)
      .then((data) => {
        const arr = extractItems(data);
        const present = arr.filter(a => a.type_id===1 || a.present).length;
        const total = arr.length;
        setStats({ total, present, absent: total-present, pct: total ? Math.round(present/total*100)+'%' : '—' });
        setAttList(arr);
      })
      .catch(() => setAttList([]))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Ирцийн бүртгэл</h1><p className="text-sm text-gray-400 mt-0.5">Хичээлийн ирцийг харах</p></div>
        <div className="flex items-center gap-3">
          {selected && canGrade(role) && (
            <Link to={`/course/${selected}/attendances/requests`} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-900">
              Хүсэлтүүд
            </Link>
          )}
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-900 bg-white">
            <option value="">Хичээл сонгох...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-4 mb-7 md:grid-cols-2 xl:grid-cols-4">
        {[['Нийт цаг',stats.total,<CalendarIcon />,'bg-blue-500 text-white'],['Ирсэн',stats.present,<CheckIcon />,'bg-green-500 text-white'],['Тасалсан',stats.absent,<CloseIcon />,'bg-red-400 text-white'],['Ирц %',stats.pct,<ChartIcon />,'bg-purple-500 text-white']].map(([l,v,ic,bg]) => (
          <div key={l} className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between">
            <div><p className="text-xs text-gray-400 mb-1">{l}</p><p className="text-3xl font-bold">{loading ? '…' : v}</p></div>
            <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center text-xl`}>{ic}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold">Ирцийн дэлгэрэнгүй</h3></div>
        {!selected ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Хичээл сонгоно уу</div>
        : loading ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
        : attList.length === 0 ? <div className="text-center text-gray-400 py-16 text-sm">Ирцийн мэдээлэл байхгүй</div>
        : <>
          <div className="grid px-6 py-2.5 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ gridTemplateColumns:'2fr 1.5fr 1fr' }}>
            <span>Сэдэв</span><span>Огноо</span><span>Ирц</span>
          </div>
          {attList.map((a,i) => {
            const dt = a.created_on ? new Date(a.created_on).toLocaleDateString('mn-MN') : '—';
            const present = a.present || a.type_id===1;
            return (
              <div key={i} className="grid px-6 py-3.5 border-b border-gray-50 hover:bg-slate-50 items-center" style={{ gridTemplateColumns:'2fr 1.5fr 1fr' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{a.lesson?.name ?? a.name ?? '—'}</span>
                  {selected && canGrade(role) && (
                    <Link to={`/course/${selected}/attendances/${a.lesson_id ?? a.id}`} className="text-xs font-semibold text-indigo-900">
                      Удирдах
                    </Link>
                  )}
                </div>
                <span className="text-sm text-gray-400">{dt}</span>
                {present
                  ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">Ирсэн</span>
                  : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 w-fit">Тасалсан</span>}
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}
