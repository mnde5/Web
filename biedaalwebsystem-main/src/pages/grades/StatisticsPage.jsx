import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, lessonAPI, submissionAPI, extractItems, getSubmissionGradeValue, isSubmissionGraded, parseCourseName, parseUser } from '../../services/api';
import { canGrade } from '../../utils/role';

function Bar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1"><span>{label}</span><span className="font-semibold">{pct}%</span></div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`${color} h-full rounded-full`} style={{ width:`${pct}%` }}></div></div>
    </div>
  );
}

function FileIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7" /></svg>; }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 20V10" /><path d="M12 20V4" /><path d="M18 20v-6" /></svg>; }
function TrophyIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M17 5h2a2 2 0 0 1 2 2c0 2.5-2 4-4 4" /><path d="M7 5H5a2 2 0 0 0-2 2c0 2.5 2 4 4 4" /></svg>; }

export default function StatisticsPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => { setLoading(true);
      try {
        const cp = await courseAPI.getVisible(role, user);
        const courses = extractItems(cp).map(c => ({ id: c.course_id??c.id, name: parseCourseName(c) }));
        let all = [];
        for (const c of courses) {
          try {
            const lp = await lessonAPI.getByCourse(c.id);
            for (const l of extractItems(lp)) {
              try {
                const sp = await submissionAPI.getByLesson(l.id);
                extractItems(sp).forEach(s => { s._courseName = c.name; s._lessonName = l.name; s.user = parseUser(s); all.push(s); });
              } catch {}
            }
          } catch {}
        }
        setList(all);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [user, user?.id, role]);

  const graded = list.filter((submission) => isSubmissionGraded(submission));
  const scores = graded.map((submission) => getSubmissionGradeValue(submission));
  const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
  const top = scores.length ? Math.max(...scores) : 0;

  const dist = [['A (90-100)', scores.filter(s=>s>=90).length,'bg-green-500'],['B (80-89)', scores.filter(s=>s>=80&&s<90).length,'bg-blue-500'],['C (70-79)', scores.filter(s=>s>=70&&s<80).length,'bg-indigo-500'],['D (60-69)', scores.filter(s=>s>=60&&s<70).length,'bg-yellow-400'],['F (<60)', scores.filter(s=>s<60).length,'bg-red-400']];
  const courseMap = {};
  list.forEach(s => {
    const k = s._courseName??'Бусад';
    if(!courseMap[k]) courseMap[k]={scores:[],courseId:s.course_id ?? s.lesson?.course_id ?? null};
    if(isSubmissionGraded(s)) courseMap[k].scores.push(getSubmissionGradeValue(s));
  });
  const top5 = [...graded].sort((a,b) => getSubmissionGradeValue(b) - getSubmissionGradeValue(a)).slice(0,5);
  const recent = [...list].sort((a, b) => new Date(b.created_on ?? 0) - new Date(a.created_on ?? 0)).slice(0, 5);

  const StatCard = ({ label, value, icon, bg }) => (
    <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between">
      <div><p className="text-xs font-medium text-gray-400 mb-1">{label}</p><p className="text-3xl font-bold leading-none">{loading ? '…' : value}</p></div>
      <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-bold">Статистик</h1><p className="text-sm text-gray-400 mt-0.5">Илгээлт, үнэлгээний нэгтгэсэн үзүүлэлтүүд</p></div>
      <div className="grid gap-4 mb-7 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Нийт илгээлт" value={list.length} icon={<FileIcon />} bg="bg-blue-500 text-white" />
        <StatCard label="Дүгнэгдсэн" value={graded.length} icon={<CheckIcon />} bg="bg-green-500 text-white" />
        <StatCard label="Дундаж оноо" value={avg+'%'} icon={<ChartIcon />} bg="bg-purple-500 text-white" />
        <StatCard label="Хамгийн өндөр" value={top+'%'} icon={<TrophyIcon />} bg="bg-yellow-400 text-white" />
      </div>
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-5">Дүнгийн тархалт</h3>
          <div className="space-y-3">
            {loading ? <div className="text-gray-400 text-sm">Ачааллаж байна...</div>
              : dist.map(([l,c,cl]) => <Bar key={l} label={l} pct={scores.length ? Math.round(c/scores.length*100) : 0} color={cl} />)}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-5">Хичээл тус бүрийн дундаж</h3>
          <div className="space-y-3">
            {loading ? <div className="text-gray-400 text-sm">Ачааллаж байна...</div>
              : Object.entries(courseMap).length === 0 ? <p className="text-sm text-gray-400">Мэдээлэл байхгүй</p>
              : Object.entries(courseMap).map(([k,v]) => {
                const a = v.scores.length ? Math.round(v.scores.reduce((a,b)=>a+b,0)/v.scores.length) : 0;
                const cl = a>=90?'bg-green-500':a>=75?'bg-blue-500':a>=60?'bg-yellow-400':'bg-red-400';
                return (
                  <button key={k} type="button" className="block w-full text-left" onClick={() => v.courseId && navigate(`/courses/${v.courseId}/submissions`)}>
                    <Bar label={k} pct={a} color={cl} />
                  </button>
                );
              })}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold">Шилдэг илгээлтүүд</h3></div>
        {top5.length === 0 ? <div className="px-6 py-10 text-center text-gray-400 text-sm">Мэдээлэл байхгүй</div>
          : top5.map((s,i) => {
            const un = s.user ? `${s.user.last_name??''} ${s.user.first_name??''}`.trim() || 'Оюутан' : 'Оюутан';
            const bgClass = i===0?'bg-yellow-400':i===1?'bg-gray-300':i===2?'bg-orange-300':'bg-slate-100';
            return (
              <div key={s.id} className="px-6 py-3.5 border-b border-gray-50 flex items-center gap-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/submissions/${s.id}`)}>
                <div className={`w-7 h-7 rounded-full ${bgClass} flex items-center justify-center text-xs font-bold`}>{i+1}</div>
                <div className="flex-1"><p className="text-sm font-medium">{canGrade(role) ? un : 'Миний илгээлт'}</p><p className="text-xs text-gray-400">{s._lessonName ?? ''}</p></div>
                <span className="text-sm font-bold text-green-600">{getSubmissionGradeValue(s)}%</span>
              </div>
            );
          })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-5">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold">Сүүлийн илгээлтүүд</h3></div>
        {recent.length === 0 ? <div className="px-6 py-10 text-center text-gray-400 text-sm">Илгээлт байхгүй байна</div>
          : recent.map((s) => {
            const un = s.user ? `${s.user.last_name??''} ${s.user.first_name??''}`.trim() || 'Оюутан' : 'Оюутан';
            return (
              <div key={`recent-${s.id}`} className="px-6 py-3.5 border-b border-gray-50 flex items-center gap-4 hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/submissions/${s.id}`)}>
                <div className="flex-1">
                  <p className="text-sm font-medium">{canGrade(role) ? un : 'Миний илгээлт'}</p>
                  <p className="text-xs text-gray-400">{s._courseName ?? 'Хичээл'} · {s._lessonName ?? 'Сэдэв'}</p>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${isSubmissionGraded(s) ? 'bg-green-100 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {isSubmissionGraded(s) ? `${getSubmissionGradeValue(s)}%` : 'Хүлээлт'}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
