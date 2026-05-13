import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import {
  courseAPI,
  courseUserAPI,
  extractItems,
  getSubmissionGradeValue,
  gradeSubmission,
  groupAPI,
  isSubmissionGraded,
  lessonAPI,
  parseJsonFields,
  parseUser,
  submissionAPI,
} from '../../services/api';
import { canGrade, getErrorMessage } from '../../utils/role';
import { buildSubmissionContent, parseSubmissionContent } from '../../utils/submissionContent';

function lessonTypeName(lesson) {
  if (lesson?.type && typeof lesson.type === 'object') return lesson.type.name || '';
  try {
    const parsed = JSON.parse(lesson?.['{}type'] ?? 'null');
    return parsed?.name || '';
  } catch {
    return lesson?.type_name || '';
  }
}

function isTeamLesson(lesson) {
  return /баг|бүлэг|team|group/i.test(`${lessonTypeName(lesson)} ${lesson?.type_name ?? ''}`);
}

function getEnrollmentGroupId(item) {
  const parsed = parseJsonFields(item) || {};
  let group = null;
  if (parsed.group && typeof parsed.group === 'object') group = parsed.group;
  else {
    try { group = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
  }
  return String(parsed.group_id ?? group?.id ?? '');
}

function rowGrade(row) {
  if (row._teamRow) {
    const graded = row.submissions?.map(getSubmissionGradeValue).find((value) => value !== null);
    return graded ?? null;
  }
  return getSubmissionGradeValue(row);
}

function isRowGraded(row) {
  return row._teamRow ? rowGrade(row) !== null : isSubmissionGraded(row);
}

export default function SubmissionsPage() {
  const { course_id: paramCourse } = useParams();
  const user = useTeam2User();
  const role = useTeam2Role();

  const [courses, setCourses]         = useState([]);
  const [selectedCourse, setSelected] = useState(paramCourse ?? '');
  const [submissions, setSubmissions] = useState([]);
  const [courseName, setCourseName]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [gradingId, setGradingId]     = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const payload = await courseAPI.getVisible(role, user);
        const list = extractItems(payload).map(c => ({
          id: c.course_id ?? c.id,
          name: c.name ?? (() => { try { return JSON.parse(c['{}course']).name; } catch { return 'Хичээл'; } })(),
        }));
        setCourses(list);
      } catch {}
    };
    load();
  }, [user?.id, role]);

  useEffect(() => {
    if (!selectedCourse) { setSubmissions([]); setCourseName(''); return; }
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const c = await courseAPI.getOne(selectedCourse);
        setCourseName(c?.name ?? '');
        const [lessonPayload, groupPayload, courseUserPayload] = await Promise.all([
          lessonAPI.getByCourse(selectedCourse),
          groupAPI.getByCourse(selectedCourse).catch(() => ({ items: [] })),
          courseUserAPI.getByCourse(selectedCourse).catch(() => ({ items: [] })),
        ]);
        const lessons = extractItems(lessonPayload).filter(l => l.has_submission);
        const groups = extractItems(groupPayload);
        const courseUsers = extractItems(courseUserPayload).map((item) => ({
          ...parseJsonFields(item),
          user: parseUser(item) || parseJsonFields(item)?.user,
        }));
        let all = [];
        for (const lesson of lessons) {
          try {
            const subPayload = await submissionAPI.getByLesson(lesson.id);
            const subs = extractItems(subPayload).map((submission) => {
              submission.user = parseUser(submission);
              submission._contentMeta = parseSubmissionContent(submission.content);
              return submission;
            });
            if (isTeamLesson(lesson)) {
              const lessonRows = groups.map((group) => {
                const members = courseUsers.filter((item) => getEnrollmentGroupId(item) === String(group.id));
                if (!members.length) return null;
                const memberIds = new Set(members.map((item) => String(item.user_id ?? item.user?.id ?? '')));
                const groupSubs = subs.filter((submission) => (
                  String(submission._contentMeta?.groupId ?? '') === String(group.id) ||
                  memberIds.has(String(submission.user_id ?? submission.user?.id ?? ''))
                ));
                return {
                  id: `team-${lesson.id}-${group.id}`,
                  _teamRow: true,
                  _lessonName: lesson.name,
                  lesson_id: lesson.id,
                  groupId: String(group.id),
                  groupName: group.name ?? `Бүлэг #${group.id}`,
                  members,
                  submissions: groupSubs,
                  created_on: groupSubs.map((item) => item.created_on).filter(Boolean).sort().at(-1),
                };
              }).filter(Boolean);
              all = all.concat(lessonRows);
            } else {
              subs.forEach(s => { s._lessonName = lesson.name; });
              all = all.concat(subs);
            }
          } catch {}
        }
        setSubmissions(all);
      } catch (e) {
        setError(getErrorMessage(e, 'Мэдээлэл ачааллахад алдаа гарлаа.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCourse]);

  const filtered = useMemo(() => {
    if (!search) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(s => {
      const name = s.user ? `${s.user.last_name ?? ''} ${s.user.first_name ?? ''}`.toLowerCase() : '';
      return name.includes(q) || s._lessonName?.toLowerCase().includes(q);
    });
  }, [submissions, search]);

  const handleGradeTeam = async (row) => {
    const raw = window.prompt(`${row.groupName} бүлгийн оноо (0-100)`);
    if (raw === null) return;
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError('0-100 хооронд оноо оруулна уу.');
      return;
    }
    setGradingId(row.id);
    setError('');
    try {
      await Promise.all(row.members.map(async (member) => {
        const userId = member.user_id ?? member.user?.id;
        if (!userId) return;
        const existing = row.submissions.find((submission) => String(submission.user_id ?? submission.user?.id ?? '') === String(userId));
        if (existing?.id) {
          await gradeSubmission(existing.id, score, existing);
          return;
        }
        await submissionAPI.create(row.lesson_id, {
          current_user: String(user?.id ?? ''),
          user_id: String(userId),
          grade_point: String(score),
          content: buildSubmissionContent({
            text: 'Багийн ажлын үнэлгээ',
            groupId: row.groupId,
            groupName: row.groupName,
            isTeamAssignment: true,
          }),
        });
      }));
      setSubmissions((current) => current.map((item) => (
        item.id === row.id
          ? {
              ...item,
              submissions: item.members.map((member) => ({
                id: `graded-${row.lesson_id}-${row.groupId}-${member.user_id ?? member.user?.id}`,
                lesson_id: row.lesson_id,
                user_id: member.user_id ?? member.user?.id,
                content: buildSubmissionContent({
                  text: 'Багийн ажлын үнэлгээ',
                  groupId: row.groupId,
                  groupName: row.groupName,
                  isTeamAssignment: true,
                }),
                grade_point: score,
              })),
            }
          : item
      )));
    } catch (e) {
      setError(getErrorMessage(e, 'Багийн оноо хадгалахад алдаа гарлаа.'));
    } finally {
      setGradingId('');
    }
  };

  const badge = (s) => isRowGraded(s)
    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{rowGrade(s)}%</span>
    : <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">Хүлээлт</span>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Илгээлтүүд</h1>
          {courseName && <p className="mt-2 text-slate-500">{courseName}</p>}
        </div>
        {!canGrade(role) && (
          <Link to="/submissions/create"
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition text-sm">
            + Илгээх
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center">
        <select value={selectedCourse} onChange={e => setSelected(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
          <option value="">— Хичээл сонгоно уу —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Хайх..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="grid px-6 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400"
          style={{ gridTemplateColumns: canGrade(role) ? '2fr 2fr 1.5fr 1fr 0.5fr' : '2fr 1.5fr 1fr 0.5fr' }}>
          {canGrade(role) && <span>Оюутан</span>}
          <span>Сэдэв</span>
          <span>Огноо</span>
          <span>Дүн</span>
          <span />
        </div>

        {!selectedCourse ? (
          <div className="py-16 text-center text-gray-400">Хичээл сонгоно уу</div>
        ) : loading ? (
          <div className="py-16 text-center text-gray-400">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Илгээлт олдсонгүй</div>
        ) : (
          filtered.map(s => {
            const studentName = s._teamRow
              ? `${s.groupName} (${s.members.length} гишүүн)`
              : s.user ? `${s.user.last_name ?? ''} ${s.user.first_name ?? ''}`.trim() : 'Оюутан';
            const dt = s.created_on ? new Date(s.created_on).toLocaleDateString('mn-MN') : (s._teamRow ? 'Илгээгээгүй' : '—');
            const className = "grid items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition last:border-b-0";
            const style = { gridTemplateColumns: canGrade(role) ? '2fr 2fr 1.5fr 1fr 0.5fr' : '2fr 1.5fr 1fr 0.5fr' };
            const cells = (
              <>
                {canGrade(role) && <span className="text-sm font-medium text-slate-800">{studentName}</span>}
                <span className="text-sm text-slate-500">{s._lessonName ?? '—'}</span>
                <span className="text-sm text-gray-400">{dt}</span>
                <span>{badge(s)}</span>
                <span className="text-right">
                  {s._teamRow ? (
                    <button
                      type="button"
                      onClick={() => handleGradeTeam(s)}
                      disabled={gradingId === s.id}
                      className="text-xs font-semibold text-indigo-900 hover:underline disabled:opacity-60"
                    >
                      {gradingId === s.id ? 'Хадгалж байна...' : 'Оноо өгөх'}
                    </button>
                  ) : (
                    <span className="text-gray-300">›</span>
                  )}
                </span>
              </>
            );
            return s._teamRow ? (
              <div key={s.id} className={className} style={style}>{cells}</div>
            ) : (
              <Link key={s.id} to={`/submissions/${s.id}`} className={className} style={style}>{cells}</Link>
            );
          })
        )}
      </div>
    </div>
  );
}
