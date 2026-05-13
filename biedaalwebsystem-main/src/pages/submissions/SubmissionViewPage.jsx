import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { gradeSubmission, submissionAPI, extractItem, getSubmissionGradeValue, isSubmissionGraded, parseUser } from '../../services/api';
import { canGrade, getErrorMessage } from '../../utils/role';
import { getYoutubeId, parseSubmissionContent } from '../../utils/submissionContent';
import { getSubmissionGroupMeta, gradeTeamSubmissionFromOne } from '../../utils/teamSubmissionGrade';

export default function SubmissionViewPage() {
  const { submission_id } = useParams();
  const navigate = useNavigate();
  const user = useTeam2User();
  const role = useTeam2Role();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradeVal, setGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text:'', ok:true });

  useEffect(() => {
    submissionAPI.getOne(submission_id)
      .then(res => {
        const s = extractItem(res);
        if (s) {
          s.user = parseUser(s);
          try { if (typeof s['{}lesson'] === 'string') s.lesson = JSON.parse(s['{}lesson']); } catch {}
        }
        setSub(s);
        const gradeValue = getSubmissionGradeValue(s);
        if (gradeValue !== null) setGrade(String(gradeValue));
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, [submission_id]);

  const handleGrade = async (e) => {
    e.preventDefault();
    if (gradeVal === '') return;
    setSaving(true); setMsg({ text:'', ok:true });
    try {
      const result = getSubmissionGroupMeta(sub).isTeamAssignment
        ? await gradeTeamSubmissionFromOne(submission_id, parseFloat(gradeVal), sub, user?.id)
        : await gradeSubmission(submission_id, parseFloat(gradeVal), sub);
      if (!result.ok) {
        const err = new Error(result.error || 'Хадгалахад алдаа гарлаа.');
        err.status = 500;
        err.response = { data: result.data };
        throw err;
      }
      setSub(prev => ({ ...prev, grade_point: parseFloat(gradeVal) }));
      setMsg({ text: result.teamGraded ? `Багийн ${result.count ?? ''} гишүүнд дүн хадгалагдлаа.` : 'Дүн амжилттай хадгалагдлаа.', ok:true });
    } catch(e) {
      setMsg({ text: getErrorMessage(e,'Хадгалахад алдаа гарлаа.'), ok:false });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-24 text-center text-gray-400">Ачааллаж байна...</div>;
  if (!sub) return <div className="py-24 text-center text-red-400">Илгээлт олдсонгүй</div>;

  const studentName = sub.user ? `${sub.user.last_name??''} ${sub.user.first_name??''}`.trim() || 'Оюутан' : 'Оюутан';
  const lessonName = sub.lesson?.name ?? sub._lessonName ?? '—';
  const courseName = sub.lesson?.course?.name ?? sub._courseName ?? '—';
  const courseId = sub.lesson?.course?.id ?? sub.lesson?.course_id ?? sub.course_id;
  const parsedContent = parseSubmissionContent(sub.content);
  const groupMeta = getSubmissionGroupMeta(sub);
  const ytId = getYoutubeId(parsedContent.youtubeUrl);
  const textContent = parsedContent.text;
  const isOwn = sub.user_id === user?.id;
  const graded = isSubmissionGraded(sub);
  const canEdit = isOwn && !graded;

  const handleDelete = async () => {
    if (!window.confirm('Энэ илгээлтийг устгах уу?')) return;
    try {
      await submissionAPI.delete(submission_id);
      navigate(courseId ? `/courses/${courseId}/submissions` : '/');
    } catch(e) { alert(getErrorMessage(e,'Устгахад алдаа гарлаа.')); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link to={courseId ? `/courses/${courseId}/submissions` : '/'} className="hover:text-indigo-900">Бүх илгээлтүүд</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">{studentName} – {lessonName}</span>
        </div>
        <div className="flex items-center gap-2">
          {canGrade(role) && (
            <Link to={`/submissions/${submission_id}/grade`}
              className="flex items-center gap-2 bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold px-5 py-2 rounded-xl transition">
              Оноо өгөх
            </Link>
          )}
          {canEdit && (
            <Link to={`/submissions/${submission_id}/edit`}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-900 text-gray-600 text-sm font-medium px-5 py-2 rounded-xl transition">
              Засах
            </Link>
          )}
          {canGrade(role) && (
            <button onClick={handleDelete}
              className="flex items-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-500 text-sm font-medium px-5 py-2 rounded-xl transition">
              Устгах
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 340px', alignItems:'start' }}>
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Ерөнхий мэдээлэл</h3>
              {graded
                ? <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Дүгнэсэн</span>
                : <span className="inline-flex px-3 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Хүлээлт</span>}
            </div>
            <div className="px-6 py-5 grid grid-cols-4 gap-4">
              {[['Оюутан', studentName],['Хичээл', courseName],['Илгээсэн', sub.created_on ? new Date(sub.created_on).toLocaleDateString('mn-MN') : '—'],['Сэдэв', lessonName]].map(([l,v]) => (
                <div key={l}><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{l}</p><p className="text-sm font-medium text-gray-900">{v}</p></div>
              ))}
              {groupMeta.isTeamAssignment && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Баг</p>
                  <p className="text-sm font-medium text-indigo-700">{groupMeta.groupName || `Бүлэг #${groupMeta.groupId}`}</p>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {textContent && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Агуулга</h3></div>
              <div className="px-6 py-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{textContent}</div>
            </div>
          )}

          {/* YouTube */}
          {ytId && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">YouTube видео</h3></div>
              <div className="p-4 aspect-video">
                <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full rounded-xl" allowFullScreen />
              </div>
            </div>
          )}

          {parsedContent.imageUrl && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Зураг</h3></div>
              <div className="p-4">
                <img src={parsedContent.imageUrl} alt="Submission asset" className="max-h-[420px] w-full rounded-xl object-contain bg-slate-50" />
              </div>
            </div>
          )}

          {parsedContent.fileUrl && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Файл / PPT</h3></div>
              <div className="p-6">
                <a
                  href={parsedContent.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  {parsedContent.fileLabel || 'Файл нээх'}
                  <span>↗</span>
                </a>
                <p className="mt-3 break-all text-xs text-slate-400">{parsedContent.fileUrl}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: grade panel */}
        <div className="space-y-5">
          {graded ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Үнэлгээ</h3></div>
              <div className="p-6 text-center border-b border-gray-100">
                <p className={`text-5xl font-bold leading-none ${getSubmissionGradeValue(sub)>=90?'text-green-600':getSubmissionGradeValue(sub)>=75?'text-blue-600':getSubmissionGradeValue(sub)>=60?'text-yellow-600':'text-red-500'}`}>{getSubmissionGradeValue(sub)}</p>
                <p className="text-sm text-gray-400 mt-1">/ 100 оноо</p>
              </div>
              {sub.content_grade && (
                <div className="p-6">
                  <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-2">Багшийн тайлбар</p>
                  <div className="bg-indigo-50 border-l-4 border-indigo-900 rounded-r-xl px-4 py-3 text-sm text-gray-700 leading-relaxed">{sub.content_grade}</div>
                </div>
              )}
              {canGrade(role) && (
                <div className="px-6 pb-6">
                  <Link to={`/submissions/${submission_id}/grade`}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                    Оноо засах
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
              {canGrade(role) ? (
                <Link to={`/submissions/${submission_id}/grade`}
                  className="block mb-3 bg-indigo-900 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-950 transition text-sm">
                  Оноо өгөх
                </Link>
              ) : null}
              <p>Одоогоор оноо тавигдаагүй байна</p>
            </div>
          )}

          {/* Quick grade for teacher */}
          {canGrade(role) && !graded && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Хурдан дүн тавих</h3>
              {msg.text && <div className={`text-sm whitespace-pre-line px-3 py-2 rounded-xl mb-3 ${msg.ok?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{msg.text}</div>}
              <form onSubmit={handleGrade} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Оноо (0–100)</label>
                  <input type="number" min="0" max="100" value={gradeVal} onChange={e => setGrade(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 bg-slate-50" />
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Энэ хэсэг дээр зөвхөн оноо хадгална. Тайлбарын тусдаа талбар одоогоор ашиглахгүй байна.
                </div>
                <button type="submit" disabled={saving}
                  className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                  💾 Дүн хадгалах
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
