import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, lessonAPI, submissionAPI, extractItems, getSubmissionGradeValue, isSubmissionGraded, parseCourseName, parseUser } from '../../services/api';

function barColor(pct) { if(pct>=90) return 'bg-green-500'; if(pct>=75) return 'bg-blue-500'; if(pct>=60) return 'bg-yellow-400'; return 'bg-red-400'; }
function FileIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7" /></svg>; }
function ClockIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>; }
function ChartIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 20V10" /><path d="M12 20V4" /><path d="M18 20v-6" /></svg>; }
function avatarColor(seed) {
  const palette = ['#1f3b8f', '#0f766e', '#d97706', '#7c3aed', '#0ea5e9', '#dc2626', '#2563eb', '#475569'];
  let hash = 0;
  for (const char of String(seed || '')) hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  return palette[hash % palette.length];
}
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '??';
}

export default function GradesPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const [map, setMap] = useState({});
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ total:0, graded:0, pending:0, avg:'N/A' });
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
                extractItems(sp).forEach(s => {
                  s._courseName = c.name;
                  s._lessonName = l.name;
                  s.user = parseUser(s);
                  all.push(s);
                });
              } catch {}
            }
          } catch {}
        }
        all.sort((a, b) => new Date(b.created_on ?? 0) - new Date(a.created_on ?? 0));
        const graded = all.filter((submission) => isSubmissionGraded(submission));
        const scores = graded.map((submission) => getSubmissionGradeValue(submission));
        const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)+'%' : 'N/A';
        setStats({ total: all.length, graded: graded.length, pending: all.length - graded.length, avg });
        setRecent(all.slice(0, 5));
        const m = {};
        all.forEach(s => {
          const k = s._courseName ?? 'Хичээл';
          if(!m[k]) m[k]={name:k,count:0,scores:[],courseId:s.course_id ?? s.lesson?.course_id ?? null};
          m[k].count++;
          if(isSubmissionGraded(s)) m[k].scores.push(getSubmissionGradeValue(s));
        });
        setMap(m);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [user, user?.id, role]);

  const StatCard = ({ label, value, icon, bg }) => (
    <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between">
      <div><p className="text-xs font-medium text-gray-400 mb-1">{label}</p><p className="text-3xl font-bold text-gray-900 leading-none">{loading ? '…' : value}</p></div>
      <div className={`${bg} w-12 h-12 rounded-xl flex items-center justify-center text-xl`}>{icon}</div>
    </div>
  );

  return (
    <div>
      <div className="mb-6"><h1 className="text-xl font-bold text-gray-900">Дүн</h1><p className="text-sm text-gray-400 mt-0.5">Нийт илгээлт ба үнэлгээний ерөнхий тойм</p></div>
      <div className="grid gap-4 mb-7 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Нийт" value={stats.total} icon={<FileIcon />} bg="bg-blue-500 text-white" />
        <StatCard label="Дүгнэсэн" value={stats.graded} icon={<CheckIcon />} bg="bg-green-500 text-white" />
        <StatCard label="Хүлээлт" value={stats.pending} icon={<ClockIcon />} bg="bg-orange-500 text-white" />
        <StatCard label="Дундаж" value={stats.avg} icon={<ChartIcon />} bg="bg-purple-500 text-white" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">Дүнгийн дэлгэрэнгүй</h2></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['Хичээл','Илгээлт','Дундаж','Үзүүлэлт','Үйлдэл'].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="text-center text-gray-400 py-12 text-sm">Ачааллаж байна...</td></tr>
            : Object.values(map).length === 0 ? <tr><td colSpan="5" className="text-center text-gray-400 py-10 text-sm">Мэдээлэл олдсонгүй</td></tr>
            : Object.values(map).map(row => {
              const avg = row.scores.length ? Math.round(row.scores.reduce((a,b)=>a+b,0)/row.scores.length) : null;
              return (
                <tr key={row.name} className="border-b border-gray-50 hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 text-gray-500">{row.count}</td>
                  <td className={`px-6 py-4 font-semibold ${avg!=null?'text-gray-900':'text-gray-400'}`}>{avg!=null?avg+'%':'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="h-2 max-w-44 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${barColor(avg??0)}`} style={{width:`${avg??0}%`}}></div></div>
                  </td>
                  <td className="px-6 py-4">
                    {row.courseId ? (
                      <Link
                        to={`/courses/${row.courseId}/submissions`}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        Илгээлтүүд харах
                        <span>›</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-bold text-slate-900">Сүүлийн илгээлтүүд</h2>
            <p className="mt-1 text-sm text-slate-400">Сүүлийн илгээгдсэн ажлуудын жагсаалт.</p>
          </div>
          <Link to="/grade-report" className="text-sm font-semibold text-[#1f3b8f]">Журнал руу очих</Link>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" style={{ gridTemplateColumns: '2fr 1.6fr 0.9fr 0.9fr 0.8fr' }}>
              {['Нэр', 'Хичээл', 'Огноо', 'Төлөв', 'Оноо'].map((heading) => <span key={heading}>{heading}</span>)}
            </div>

            {loading ? (
              <div className="px-6 py-14 text-center text-sm text-slate-400">Мэдээлэл ачааллаж байна...</div>
            ) : recent.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-400">Одоогоор харагдах илгээлт алга байна.</div>
            ) : recent.map((item) => {
              const personName = item.user ? `${item.user.last_name ?? ''} ${item.user.first_name ?? ''}`.trim() || 'Оюутан Оюутан' : 'Оюутан Оюутан';
              const title = item._lessonName || item.content || 'Илгээлт';
              const created = item.created_on ? new Date(item.created_on).toLocaleDateString('mn-MN', { month: '2-digit', day: '2-digit' }) : '—';
              const graded = isSubmissionGraded(item);
              return (
                <Link
                  key={item.id}
                  to={`/submissions/${item.id}`}
                  className="grid items-center border-b border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50/70"
                  style={{ gridTemplateColumns: '2fr 1.6fr 0.9fr 0.9fr 0.8fr' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] text-xs font-bold text-white" style={{ background: avatarColor(personName) }}>
                      {initials(personName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{personName}</p>
                    </div>
                  </div>
                  <span className="truncate text-sm text-slate-600">{item._courseName ?? '—'}</span>
                  <span className="text-sm text-slate-400">{created}</span>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {graded ? 'Дүгнэсэн' : 'Хүлээгдэж буй'}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{graded ? `${getSubmissionGradeValue(item)}%` : 'Хүлээгдэж байна'}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
