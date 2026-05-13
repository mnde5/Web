import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import {
  courseAPI,
  courseUserAPI,
  extractItems,
  lessonAPI,
  parseCourseName,
  parseCourseTeacher,
  parseJsonFields,
  submissionAPI,
} from '../../services/api';
import { canGrade, getErrorMessage } from '../../utils/role';
import { buildSubmissionContent, classifyAttachmentLink, getYoutubeId } from '../../utils/submissionContent';

export default function SubmissionCreatePage() {
  const { course_id: paramCourseId, lesson_id: paramLessonId } = useParams();
  const navigate = useNavigate();
  const user = useTeam2User();
  const role = useTeam2Role();

  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [courseUsers, setCourseUsers] = useState([]);
  const [courseId, setCourseId] = useState(paramCourseId ?? '');
  const [lessonId, setLessonId] = useState(paramLessonId ?? '');
  const [teachers, setTeachers] = useState([]);
  const [content, setContent] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (canGrade(role)) navigate('/', { replace: true });
  }, [role, navigate]);

  useEffect(() => {
    if (paramCourseId) setCourseId(paramCourseId);
  }, [paramCourseId]);

  useEffect(() => {
    if (paramLessonId) setLessonId(paramLessonId);
  }, [paramLessonId]);

  useEffect(() => {
    let active = true;
    if (!user?.id) return;
    const loadCourses = async () => {
      try {
        const payload = await courseAPI.getVisible(role, user);
        const parsed = extractItems(payload).map(c => ({
          id: c.course_id ?? c.id,
          name: parseCourseName(c),
          teacher: parseCourseTeacher(c),
        }));

        if (paramCourseId && !parsed.some((course) => String(course.id) === String(paramCourseId))) {
          try {
            const coursePayload = await courseAPI.getOne(paramCourseId);
            parsed.unshift({
              id: coursePayload.course_id ?? coursePayload.id ?? paramCourseId,
              name: parseCourseName(coursePayload),
              teacher: parseCourseTeacher(coursePayload),
            });
          } catch {}
        }

        if (!active) return;
        setCourses(parsed);
      } catch (e) {
        if (!active) return;
        setCourses([]);
        setError(getErrorMessage(e, 'Хичээлийн жагсаалт ачааллахад алдаа гарлаа.'));
      }
    };
    loadCourses();
    return () => {
      active = false;
    };
  }, [user, role, paramCourseId]);

  useEffect(() => {
    let active = true;
    if (!courseId) { setLessons([]); setCourseUsers([]); setLessonId(''); return; }
    Promise.all([
      lessonAPI.getByCourse(courseId),
      courseUserAPI.getByCourse(courseId).catch(() => ({ items: [] })),
    ])
      .then(([lessonPayload, courseUserPayload]) => {
        if (!active) return;
        setLessons(extractItems(lessonPayload).filter((lesson) => Number(lesson?.has_submission ?? 0) === 1));
        setCourseUsers(extractItems(courseUserPayload).map((item) => parseJsonFields(item) || {}));
      })
      .catch(e => {
        if (!active) return;
        setLessons([]);
        setCourseUsers([]);
        setLessonId('');
        setError(getErrorMessage(e, 'Сэдвийн жагсаалт ачааллахад алдаа гарлаа.'));
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    let active = true;
    if (!courseId) { setTeachers([]); return () => { active = false; }; }

    courseAPI.getTeachers(courseId)
      .then((payload) => {
        if (!active) return;
        setTeachers(extractItems(payload));
      })
      .catch(() => {
        if (!active) return;
        setTeachers([]);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const selectedCourse = courses.find((course) => String(course.id) === String(courseId));
  const selectedLesson = lessons.find((lesson) => String(lesson.id) === String(lessonId));
  const lessonType = (() => {
    if (!selectedLesson) return {};
    if (selectedLesson.type && typeof selectedLesson.type === 'object') return selectedLesson.type;
    try { return JSON.parse(selectedLesson['{}type'] ?? 'null') || {}; } catch { return {}; }
  })();
  const isTeamAssignment = /баг|team|group/i.test(`${lessonType.name ?? ''} ${selectedLesson?.type_name ?? ''}`);
  const myCourseUser = courseUsers.find((item) => String(item.user_id ?? item.user?.id ?? '') === String(user?.id));
  const myGroup = (() => {
    if (!myCourseUser) return null;
    if (myCourseUser.group && typeof myCourseUser.group === 'object') return myCourseUser.group;
    try { return JSON.parse(myCourseUser['{}group'] ?? 'null'); } catch { return null; }
  })();
  const myGroupId = myCourseUser?.group_id ?? myGroup?.id ?? '';
  const myGroupName = myGroup?.name ?? (myGroupId ? `Бүлэг #${myGroupId}` : '');
  const selectedTeacher = teachers.length
    ? teachers
      .map((teacher) => `${teacher?.last_name ?? ''} ${teacher?.first_name ?? ''}`.trim() || teacher?.username || teacher?.email)
      .filter(Boolean)
      .join(', ')
    : selectedCourse?.teacher || '';
  const attachment = classifyAttachmentLink(attachmentUrl);
  const attachmentYoutubeId = getYoutubeId(attachment.youtubeUrl);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lessonId) { setError('Сэдэв сонгоно уу.'); return; }
    if (!content.trim() && !attachmentUrl.trim()) {
      setError('Текст эсвэл хавсралтын холбоосоос дор хаяж нэгийг оруулна уу.');
      return;
    }
    setLoading(true); setError('');
    try {
      await submissionAPI.create(lessonId, {
        current_user: String(user?.id ?? ''),
        content: buildSubmissionContent({
          text: content,
          attachmentUrl,
          isTeamAssignment,
          groupId: isTeamAssignment ? myGroupId : '',
          groupName: isTeamAssignment ? myGroupName : '',
        }),
      });
      navigate(`/courses/${courseId}/lessons/${lessonId}/submissions`);
    } catch (e) {
      setError(getErrorMessage(e, 'Илгээхэд алдаа гарлаа.'));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={courseId ? `/courses/${courseId}/submissions` : '/'} className="hover:text-indigo-900">
          {courseId ? 'Хичээлийн илгээлтүүд' : 'Бүх илгээлтүүд'}
        </Link>
        <span>›</span><span className="text-gray-700 font-medium">Илгээлт үүсгэх</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Даалгавар илгээх</h1>
      <p className="text-sm text-gray-400 mb-6">Хичээл болон сэдвийг сонгоод текст болон нэг хавсралтын холбоосоо оруулна уу</p>

      <div className="space-y-5">
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

        {/* Course + Lesson */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Хичээл сонгох</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Хичээл</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)}
                disabled={Boolean(paramCourseId)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition">
                <option value="">— Хичээл сонгох —</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.teacher ? `${c.name} — ${c.teacher}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Сэдэв / Даалгавар</label>
              <select value={lessonId} onChange={e => setLessonId(e.target.value)}
                disabled={!courseId || Boolean(paramLessonId)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition disabled:opacity-50">
                <option value="">— Сэдэв сонгох —</option>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.name || l.title || `Сэдэв #${l.id}`}</option>)}
              </select>
            </div>
          </div>
          {selectedCourse && (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-600">
                <span>
                  <span className="text-gray-400">Хичээл:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedCourse.name}</span>
                </span>
                <span>
                  <span className="text-gray-400">Багш:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedTeacher || '—'}</span>
                </span>
                {isTeamAssignment && (
                  <span>
                    <span className="text-gray-400">Баг:</span>{' '}
                    <span className="font-medium text-gray-900">{myGroupName || 'Бүлэг оноогдоогүй'}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Текст тайлбар</h3>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
            placeholder="Даалгаврынхаа тайлбарыг энд бичнэ үү..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-900 resize-none transition" />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Хавсралт / холбоос</h3>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Холбоос</label>
          <input
            type="url"
            value={attachmentUrl}
            onChange={e => setAttachmentUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... эсвэл https://example.com/file.pdf"
            className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
          />
          <p className="mt-3 text-xs text-gray-400">YouTube, зураг, PDF, PPT зэрэг ямар ч нэг холбоос оруулж болно. Систем төрлийг нь автоматаар танина.</p>

          <div className="mt-5 space-y-4">
            {attachmentYoutubeId && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">YouTube preview</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-slate-50">
                  <iframe src={`https://www.youtube.com/embed/${attachmentYoutubeId}`} className="w-full h-full" allowFullScreen />
                </div>
              </div>
            )}

            {attachment.imageUrl && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500">Зургийн preview</p>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-50">
                  <img src={attachment.imageUrl} alt="Submission preview" className="max-h-[320px] w-full object-contain" />
                </div>
              </div>
            )}

            {attachment.fileUrl && (
              <div className="rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-gray-600">
                <span className="text-gray-400">Холбоос:</span>{' '}
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-900 underline underline-offset-2">
                  {attachment.fileUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 bg-indigo-900 hover:bg-indigo-950 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm disabled:opacity-60">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            📤 Илгээх
          </button>
          <Link to={courseId && lessonId ? `/courses/${courseId}/lessons/${lessonId}/submissions` : courseId ? `/courses/${courseId}/submissions` : '/'} className="px-6 py-2.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 font-medium rounded-xl transition text-sm">Болих</Link>
        </div>
      </div>
    </div>
  );
}
