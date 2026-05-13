import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, lessonAPI, submissionAPI, extractItems, getSubmissionGradeValue, isSubmissionGraded, parseCourseName, parseUser } from '../../services/api';
import { canGrade } from '../../utils/role';

export default function GradeReportPage() {
  const { course_id: paramCourse } = useParams();
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(paramCourse ?? '');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fn = async () => { setLoading(true);
      const res = await courseAPI.getVisible(role, user);
      setCourses(extractItems(res).map(c => ({ id: c.course_id??c.id, name: parseCourseName(c) })));
    };
    fn();
  }, [user, user?.id, role]);

  useEffect(() => {
    setSelected(paramCourse ?? '');
  }, [paramCourse]);

  useEffect(() => {
    if (!courses.length) return;
    const load = async () => { setLoading(true);
      setLoading(true);
      let all = [];
      const targets = selected ? courses.filter(c => c.id == selected) : courses;
      for (const c of targets) {
        try {
          const lp = await lessonAPI.getByCourse(c.id);
          for (const l of extractItems(lp)) {
            try {
              const sp = await submissionAPI.getByLesson(l.id);
              extractItems(sp).forEach(s => { s._courseName = c.name; s.user = parseUser(s); all.push(s); });
            } catch {}
          }
        } catch {}
      }
      setList(all);
      setLoading(false);
    };
    load();
  }, [selected, courses]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Дүнгийн тайлан</h1><p className="text-sm text-gray-400 mt-0.5">Оюутан бүрийн дүнгийн жагсаалт</p></div>
        <div className="flex gap-3 items-center">
          <select value={selected} onChange={e => setSelected(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-900 bg-white">
            <option value="">Бүх хичээл</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-900 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl transition">Хэвлэх</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="grid px-6 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ gridTemplateColumns:'2.5fr 2fr 1fr 1.5fr 1fr' }}>
          <span>Оюутан</span><span>Хичээл</span><span>Огноо</span><span>Статус</span><span>Дүн</span>
        </div>
        {loading ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
        : list.length === 0 ? <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Мэдээлэл байхгүй</div>
        : list.map(s => {
          const un = canGrade(role) ? (s.user ? `${s.user.last_name??''} ${s.user.first_name??''}`.trim() || 'Оюутан' : 'Оюутан') : 'Миний илгээлт';
          const dt = s.created_on ? new Date(s.created_on).toLocaleDateString('mn-MN') : '—';
          return (
            <div key={s.id} className="grid items-center px-6 py-3.5 border-b border-gray-50 hover:bg-slate-50 transition cursor-pointer"
              style={{ gridTemplateColumns:'2.5fr 2fr 1fr 1.5fr 1fr' }}
              onClick={() => navigate(`/submissions/${s.id}`)}>
              <span className="text-sm font-medium text-gray-900">{un}</span>
              <span className="text-sm text-gray-600 truncate">{s._courseName ?? '—'}</span>
              <span className="text-xs text-gray-400">{dt}</span>
              {isSubmissionGraded(s)
                ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 w-fit">Дүгнэсэн</span>
                : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 w-fit">Хүлээлт</span>}
              <span className={`text-sm font-bold ${isSubmissionGraded(s)?'text-gray-900':'text-gray-300'}`}>{isSubmissionGraded(s)?`${getSubmissionGradeValue(s)}%`:'—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
