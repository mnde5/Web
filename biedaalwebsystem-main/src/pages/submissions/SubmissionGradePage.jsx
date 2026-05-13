import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { gradeSubmission, submissionAPI, extractItem, getSubmissionGradeValue, parseUser } from '../../services/api';
import { canGrade, getErrorMessage } from '../../utils/role';
import { getSubmissionGroupMeta, gradeTeamSubmissionFromOne } from '../../utils/teamSubmissionGrade';

function gradeLabel(v) { if(v>=90)return'A · Онцлох'; if(v>=80)return'B+ · Сайн'; if(v>=70)return'B · Дунд'; if(v>=60)return'C · Хангалттай'; return'F · Хангалтгүй'; }
function gradeColor(v) { if(v>=90)return'text-green-600'; if(v>=80)return'text-blue-600'; if(v>=70)return'text-indigo-600'; if(v>=60)return'text-yellow-600'; return'text-red-500'; }

export default function SubmissionGradePage() {
  const { submission_id } = useParams();
  const role = useTeam2Role();
  const user = useTeam2User();
  const navigate = useNavigate();

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text:'', ok:true });

  useEffect(() => {
    if (!canGrade(role)) navigate('/');
  }, [role]);

  useEffect(() => {
    submissionAPI.getOne(submission_id)
      .then(res => {
        const s = extractItem(res);
        if (s) { s.user = parseUser(s); try { s.lesson = JSON.parse(s['{}lesson']); } catch {} }
        setSub(s);
        const gradeValue = getSubmissionGradeValue(s);
        if (gradeValue !== null) setScore(String(gradeValue));
      })
      .finally(() => setLoading(false));
  }, [submission_id]);

  const handleSave = async () => {
    const val = parseInt(score);
    if (isNaN(val) || val < 0 || val > 100) { setMsg({ text: '0-100 хооронд оноо оруулна уу', ok:false }); return; }
    setSaving(true); setMsg({ text:'', ok:true });
    try {
      const result = getSubmissionGroupMeta(sub).isTeamAssignment
        ? await gradeTeamSubmissionFromOne(submission_id, val, sub, user?.id)
        : await gradeSubmission(submission_id, val, sub);
      if (!result.ok) {
        const err = new Error(result.error || 'Алдаа гарлаа');
        err.status = 500;
        err.response = { data: result.data };
        throw err;
      }
      setMsg({ text: result.teamGraded ? `Багийн ${result.count ?? ''} гишүүнд оноо хадгалагдлаа.` : 'Оноо амжилттай хадгалагдлаа!', ok:true });
      setTimeout(() => navigate(`/submissions/${submission_id}`), 1200);
    } catch(e) {
      setMsg({ text: getErrorMessage(e, 'Алдаа гарлаа'), ok:false });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Ачааллаж байна...</div>;
  if (!sub) return <div className="text-center text-red-400 py-24">Илгээлт олдсонгүй</div>;

  const uname = sub.user ? `${sub.user.last_name??''} ${sub.user.first_name??''}`.trim() || 'Оюутан' : 'Оюутан';
  const course = sub.lesson?.course?.name ?? '—';
  const courseId = sub.lesson?.course?.id ?? sub.lesson?.course_id ?? sub.course_id;
  const groupMeta = getSubmissionGroupMeta(sub);
  const date = sub.created_on ? new Date(sub.created_on).toLocaleDateString('mn-MN') : '—';
  const numScore = parseInt(score) || 0;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={courseId ? `/courses/${courseId}/submissions` : '/'} className="hover:text-indigo-900">Бүх илгээлтүүд</Link>
        <span>›</span>
        <Link to={`/submissions/${submission_id}`} className="hover:text-indigo-900">{uname}</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">Оноо өгөх</span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 360px', alignItems:'start' }}>
        {/* Left: submission content */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Оюутан</h3></div>
            <div className="px-6 py-5">
              <p className="font-semibold text-gray-900 text-base">{uname}</p>
              <p className="text-sm text-gray-400 mt-0.5">{course} · {date}</p>
              {groupMeta.isTeamAssignment && (
                <p className="mt-2 text-sm font-medium text-indigo-700">{groupMeta.groupName || `Бүлэг #${groupMeta.groupId}`} · Багийн ажил</p>
              )}
            </div>
          </div>
          {sub.content && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Илгээсэн агуулга</h3></div>
              <div className="px-6 py-5 text-sm leading-relaxed text-gray-700 bg-slate-50 whitespace-pre-wrap">{sub.content}</div>
            </div>
          )}
        </div>

        {/* Right: simple grading */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-20">
          <div className="px-6 py-5 border-b border-gray-100 text-center">
            <p className={`text-5xl font-bold leading-none ${gradeColor(numScore)}`}>{score || '—'}</p>
            <p className="text-sm text-gray-400 mt-1">/ 100 оноо</p>
            {score && <p className={`text-sm font-medium mt-1 ${gradeColor(numScore)}`}>{gradeLabel(numScore)}</p>}
          </div>

          <div className="p-6 space-y-4">
            {msg.text && (
              <div className={`text-sm whitespace-pre-line px-3 py-2 rounded-xl ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Оноо (0–100)</label>
              <input
                type="number" min="0" max="100"
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="85"
                className="w-full text-center text-3xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-900 bg-slate-50 transition"
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Одоогоор зөвхөн оноо хадгална. Тайлбарын тусдаа талбар хадгалахгүй.
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-900 hover:bg-indigo-950 text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                💾 Хадгалах
              </button>
              <Link to={`/submissions/${submission_id}`}
                className="px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 rounded-xl transition text-sm font-medium">
                Болих
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
