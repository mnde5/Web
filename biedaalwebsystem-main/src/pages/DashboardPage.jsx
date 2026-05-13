import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useTeam2User from '../hooks/useTeam2User';
import useTeam2Role from '../hooks/useTeam2Role';
import {
  attendanceAPI,
  courseAPI,
  extractItems,
  gradebookAPI,
  getSubmissionGradeValue,
  isSubmissionGraded,
  lessonAPI,
  parseCourseName,
  parseJsonFields,
  parseUser,
  submissionAPI,
  userAPI,
} from '../services/api';
import { canGrade, getRoleLabel } from '../utils/role';

const AVCOLS = ['#1f3b8f', '#0f766e', '#d97706', '#7c3aed', '#0ea5e9', '#dc2626', '#2563eb', '#475569'];

const TONE_STYLES = {
  blue: { panel: 'bg-[#edf3ff] text-[#2454d3]', text: 'text-[#2454d3]', line: '#2454d3', soft: 'bg-[#edf3ff]' },
  emerald: { panel: 'bg-[#ebfaf1] text-[#16935d]', text: 'text-[#16935d]', line: '#16935d', soft: 'bg-[#ebfaf1]' },
  amber: { panel: 'bg-[#fff5e8] text-[#d9871c]', text: 'text-[#d9871c]', line: '#d9871c', soft: 'bg-[#fff5e8]' },
  violet: { panel: 'bg-[#f2efff] text-[#7356db]', text: 'text-[#7356db]', line: '#7356db', soft: 'bg-[#f2efff]' },
  cyan: { panel: 'bg-[#eaf8ff] text-[#0d8fc7]', text: 'text-[#0d8fc7]', line: '#0d8fc7', soft: 'bg-[#eaf8ff]' },
};

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h4l2.5 7 4.5-14 2.5 7H20" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.86" />
      <path d="M16 3.14a4 4 0 0 1 0 7.72" />
    </svg>
  );
}

function avatarColor(seed) {
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  return AVCOLS[hash % AVCOLS.length];
}

function initials(name) {
  return String(name || '')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || '??';
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('mn-MN', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatDueLabel(value) {
  if (!value) return 'Төлөвлөгөөгүй';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Төлөвлөгөөгүй';
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diff <= 0) return 'Өнөөдөр';
  if (diff === 1) return 'Маргааш';
  return `${diff} хоног`;
}

function parseCourseObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function SectionHeading({ title, note, linkTo, linkLabel }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="app-section-title">{title}</h2>
        {note && <p className="app-section-note">{note}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="shrink-0 text-sm font-semibold text-[#1f3b8f]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function StatCard({ label, value, hint, progress, icon, tone = 'blue' }) {
  const palette = TONE_STYLES[tone];
  const clampedProgress = Math.round(Math.max(0, Math.min(100, Number(progress) || 0)));

  return (
    <div className="app-dashboard-card flex flex-col justify-between px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold leading-5 text-slate-500">{label}</p>
          <p className="mt-3 break-words text-[1.9rem] font-black leading-none tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">{hint}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${palette.panel}`}>
          {icon}
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="app-progress-track flex-1">
          <div className="app-progress-fill" style={{ width: `${clampedProgress}%`, background: palette.line }} />
        </div>
        <span className={`min-w-9 text-right text-xs font-semibold ${palette.text}`}>{clampedProgress}%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const isStaff = canGrade(role);

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, graded: 0, pending: 0, avg: '—' });
  const [attendancePct, setAttendancePct] = useState(0);
  const [gradeEntries, setGradeEntries] = useState([]);
  const [notices, setNotices] = useState([]);
  const [courseMetrics, setCourseMetrics] = useState({});
  const [summaryCounts, setSummaryCounts] = useState({ students: 0, approvals: 0 });

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const coursePayload = isStaff ? await courseAPI.getTeaching(user.id) : await courseAPI.getEnrolled(user.id);
        const visibleCourses = extractItems(coursePayload).map((course) => ({
          id: course.course_id ?? course.id,
          name: parseCourseName(course),
        }));
        setCourses(visibleCourses);

        let allSubmissions = [];
        let totalPresent = 0;
        let totalAttendance = 0;
        let uniqueStudents = new Set();
        let totalApprovals = 0;
        let approvalFeed = [];
        let gradeFeed = [];
        let metricMap = {};

        if (isStaff) {
          for (const course of visibleCourses) {
            try {
            const [submissionGradePayload, attendanceGradePayload, gradebookPayload, approvalPayload, courseUsersPayload] = await Promise.all([
                gradebookAPI.getCourseSubmissionGrades(course.id),
                gradebookAPI.getCourseAttendanceGrades(course.id),
                gradebookAPI.getCourseGrades(course.id),
                attendanceAPI.getCourseApprovals(course.id),
                courseAPI.getUsers(course.id),
              ]);

              const gradebookRows = extractItems(gradebookPayload);
              const courseUserRows = extractItems(courseUsersPayload);
              const submissionRows = extractItems(submissionGradePayload);
              const attendanceRows = extractItems(attendanceGradePayload);
              const approvalRows = extractItems(approvalPayload).map((item) => {
                const normalized = parseJsonFields(item);
                return {
                  id: normalized.id,
                  title: parseJsonFields(normalized.student)?.email || 'Оюутны хүсэлт',
                  note: `${course.name} хичээлийн ирцийн хүсэлт`,
                  created: formatShortDate(normalized.created_on),
                  link: `/course/${course.id}/attendances/requests`,
                };
              });

              const studentIds = new Set(
                (courseUserRows.length ? courseUserRows : gradebookRows)
                  .map((row) => String(row.user_id ?? ''))
                  .filter(Boolean),
              );

              studentIds.forEach((id) => uniqueStudents.add(id));
              totalApprovals += approvalRows.length;
              approvalFeed = approvalFeed.concat(approvalRows);
              totalPresent += attendanceRows.filter((row) => Number(row.type_id) === 1 || Number(row.point) > 0).length;
              totalAttendance += attendanceRows.length;

              const gradedRows = submissionRows.filter((row) => isSubmissionGraded(row));
              const avgScore = gradedRows.length
                ? Math.round(gradedRows.reduce((sum, row) => sum + Number(getSubmissionGradeValue(row) || 0), 0) / gradedRows.length)
                : 0;

              metricMap[String(course.id)] = {
                students: studentIds.size,
                avgScore,
                pending: submissionRows.filter((row) => !isSubmissionGraded(row)).length,
                total: submissionRows.length,
              };
            } catch {
              metricMap[String(course.id)] = metricMap[String(course.id)] || { students: 0, avgScore: 0, pending: 0, total: 0 };
            }
          }
        } else {
          try {
            const [gradePayload, requestPayload] = await Promise.all([
              userAPI.getGrades(),
              attendanceAPI.getMyRequests(),
            ]);

            gradeFeed = extractItems(gradePayload).map((item) => {
              const course = parseCourseObject(item['{}course']);
              return {
                ...item,
                courseName: course?.name || `Хичээл ${item.course_id}`,
              };
            });

            setGradeEntries(gradeFeed);

            const requestRows = extractItems(requestPayload).map((item) => {
              const normalized = parseJsonFields(item);
              const type = parseJsonFields(normalized.type);
              const summary = parseJsonFields(normalized.summary);
              return {
                id: normalized.id,
                title: type?.name || 'Ирцийн хүсэлт',
                note: summary?.name || normalized.description || 'Хүсэлтийн мэдээлэл',
                created: formatShortDate(normalized.created_on),
                link: '/attendance',
              };
            });
            approvalFeed = requestRows;
          } catch {
            setGradeEntries([]);
          }
        }

        for (const course of visibleCourses) {
          try {
            const lessonPayload = await lessonAPI.getByCourse(course.id);
            const lessons = extractItems(lessonPayload);

            for (const lesson of lessons) {
              try {
                const submissionPayload = await submissionAPI.getByLesson(lesson.id);
                const lessonSubs = extractItems(submissionPayload).map((submission) => ({
                  ...submission,
                  user: parseUser(submission),
                  _courseName: course.name,
                  _lessonName: lesson.name,
                }));
                allSubmissions = allSubmissions.concat(lessonSubs);
              } catch {
                // Ignore submission failures on dashboard.
              }
            }
          } catch {
            // Ignore lesson failures on dashboard.
          }

          try {
            const attendancePayload = await attendanceAPI.getCourseAttendances(course.id);
            const items = extractItems(attendancePayload);
            totalPresent += items.filter((row) => Number(row.type_id) === 1 || row.present).length;
            totalAttendance += items.length;
          } catch {
            // Ignore attendance failures on dashboard.
          }
        }

        allSubmissions.sort((left, right) => new Date(right.created_on ?? 0) - new Date(left.created_on ?? 0));

        const graded = allSubmissions.filter((submission) => isSubmissionGraded(submission));
        const scores = graded.map((submission) => Number(getSubmissionGradeValue(submission))).filter((value) => Number.isFinite(value));
        const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

        setSubmissions(allSubmissions.slice(0, 10));
        setStats({
          total: allSubmissions.length,
          graded: graded.length,
          pending: allSubmissions.length - graded.length,
          avg: scores.length ? `${average}%` : '—',
        });
        setAttendancePct(totalAttendance ? Math.round((totalPresent / totalAttendance) * 100) : 0);
        setCourseMetrics(metricMap);
        setSummaryCounts({ students: uniqueStudents.size, approvals: totalApprovals });
        setNotices((approvalFeed.length ? approvalFeed : gradeFeed.map((item) => ({
          id: item.course_id,
          title: item.courseName,
          note: `${item.grade_point ?? 0}/${item.max_semester_point ?? 100} оноо`,
          created: 'Одоо',
          link: '/grade',
        }))).slice(0, 5));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isStaff, role, user, user?.id]);

  const displayName = user
    ? `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim() || user.email || 'Хэрэглэгч'
    : 'Хэрэглэгч';

  const todayLabel = useMemo(() => new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date()), []);

  const completionRate = stats.total ? Math.round((stats.graded / stats.total) * 100) : 0;
  const gpaLike = stats.avg === '—' ? '—' : (Math.max(2, Math.min(4, Number(stats.avg.replace('%', '')) / 25)).toFixed(2));

  const statCards = isStaff
    ? [
        { label: 'Зааж буй хичээл', value: loading ? '...' : courses.length, hint: 'Таны хариуцаж буй хичээлүүд', progress: Math.min(100, courses.length * 20), icon: <BookIcon />, tone: 'blue' },
        { label: 'Журналд буй оюутан', value: loading ? '...' : summaryCounts.students, hint: 'Gradebook дээр бүртгэлтэй', progress: Math.min(100, summaryCounts.students), icon: <UsersIcon />, tone: 'violet' },
        { label: 'Шалгах даалгавар', value: loading ? '...' : stats.pending, hint: 'Дүн хүлээж буй submission', progress: Math.min(100, stats.pending * 12), icon: <FileIcon />, tone: 'amber' },
        { label: 'Дундаж үнэлгээ', value: loading ? '...' : stats.avg, hint: 'Submission grade дундаж', progress: completionRate, icon: <ChartIcon />, tone: 'emerald' },
        { label: 'Ирцийн төлөв', value: loading ? '...' : `${attendancePct}%`, hint: 'Course attendance aggregate', progress: attendancePct, icon: <CheckIcon />, tone: 'cyan' },
      ]
    : [
        { label: 'Голч дүн', value: loading ? '...' : gpaLike, hint: 'Таны явцын дүнгийн нэгтгэл', progress: stats.avg === '—' ? 0 : Number(stats.avg.replace('%', '')), icon: <ChartIcon />, tone: 'violet' },
        { label: 'Бүртгэлтэй хичээл', value: loading ? '...' : courses.length, hint: 'Судалж буй хичээлийн тоо', progress: Math.min(100, courses.length * 20), icon: <BookIcon />, tone: 'blue' },
        { label: 'Хүлээгдэж буй даалгавар', value: loading ? '...' : stats.pending, hint: 'Дүн гараагүй submission', progress: Math.min(100, stats.pending * 16), icon: <FileIcon />, tone: 'amber' },
        { label: 'Ирцийн төлөв', value: loading ? '...' : `${attendancePct}%`, hint: 'Course attendance aggregate', progress: attendancePct, icon: <CheckIcon />, tone: 'emerald' },
        { label: 'Явцын дүн', value: loading ? '...' : `${gradeEntries.length}`, hint: 'Бүртгэгдсэн дүнгийн мөр', progress: Math.min(100, gradeEntries.length * 15), icon: <GradeIcon />, tone: 'cyan' },
      ];

  const quickActions = isStaff
    ? [
        { to: '/grade', label: 'Дүн оруулах', note: `${stats.pending} submission шалгана`, icon: <GradeIcon />, tone: 'blue' },
        { to: '/attendance', label: 'Ирц', note: `${summaryCounts.approvals} хүсэлт хүлээгдэж байна`, icon: <ClockIcon />, tone: 'amber' },
        { to: '/courses', label: 'Хичээлүүд', note: `${courses.length} course идэвхтэй`, icon: <BookIcon />, tone: 'emerald' },
      ]
    : [
        { to: '/submissions/create', label: 'Илгээлт', note: `${stats.pending} ажил хүлээгдэж байна`, icon: <SendIcon />, tone: 'blue' },
        { to: '/grade', label: 'Миний дүн', note: `${gradeEntries.length} явцын дүн`, icon: <GradeIcon />, tone: 'violet' },
        { to: '/attendance', label: 'Ирц', note: `${attendancePct}% оролцоо`, icon: <CheckIcon />, tone: 'emerald' },
      ];

  const courseCards = (courses.length ? courses.slice(0, 4) : []).map((course, index) => {
    const metric = courseMetrics[String(course.id)] || {};
    const studentGrade = gradeEntries.find((item) => String(item.course_id) === String(course.id));
    const score = isStaff
      ? `${metric.students || 0} суралцагч`
      : `${studentGrade?.grade_point ?? 0}/${studentGrade?.max_semester_point ?? 100}`;
    const progress = isStaff
      ? Math.min(100, metric.avgScore || 0)
      : Math.min(100, Math.round((Number(studentGrade?.grade_point || 0) / Math.max(1, Number(studentGrade?.max_semester_point || 100))) * 100));

    return {
      ...course,
      code: `${isStaff ? 'TC' : 'ST'}-${course.id}`,
      tone: ['blue', 'emerald', 'violet', 'amber'][index % 4],
      score,
      subtitle: isStaff ? `${metric.pending || 0} дүн хүлээгдэж байна` : 'Тухайн хичээлийн явцын дүн',
      progress,
    };
  });

  const activityItems = submissions.slice(0, 5).map((submission) => {
    const personName = isStaff
      ? `${submission.user?.last_name ?? ''} ${submission.user?.first_name ?? ''}`.trim() || 'Оюутан'
      : displayName;

    return {
      id: submission.id,
      title: submission._lessonName ?? 'Даалгавар',
      course: submission._courseName ?? 'Хичээл',
      personName,
      created: formatShortDate(submission.created_on),
      graded: isSubmissionGraded(submission),
      score: isSubmissionGraded(submission) ? `${getSubmissionGradeValue(submission)}%` : 'Хүлээгдэж байна',
    };
  });

  const deadlineItems = submissions.slice(0, 4).map((submission) => ({
    id: submission.id,
    title: submission._lessonName ?? 'Даалгавар',
    note: submission._courseName ?? 'Хичээл',
    due: formatDueLabel(submission.deadline ?? submission.created_on),
    date: formatShortDate(submission.deadline ?? submission.created_on),
    tone: isSubmissionGraded(submission) ? 'emerald' : 'amber',
  }));

  const recentItems = notices.length
    ? notices
    : activityItems.map((item) => ({
        id: item.id,
        title: item.title,
        note: item.course,
        created: item.created,
        link: '/submissions',
      }));

  const roleSummary = isStaff
    ? { title: 'Багшийн самбар', note: 'Хичээл, ирц, approval, submission мэдээлэлд тулгуурласан өдөр тутмын тойм.' }
    : { title: 'Сайн байна уу, Оюутан', note: 'Таны хичээл, илгээлт, ирц, дүнгийн нэгтгэсэн өдөр тутмын тойм.' };

  return (
    <div className="space-y-5 pb-6">
      <section className="app-panel px-6 py-6 sm:px-8">
        <div className="max-w-3xl">
          <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">{getRoleLabel(role)}</div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-[2.35rem]">{roleSummary.title}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">{roleSummary.note}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <section className="app-panel px-6 py-6">
            <SectionHeading title="Хичээл бүрийн тойм" note="Хичээл тус бүрийн дүн, илгээлт, оролцооны гол үзүүлэлтүүд." linkTo="/courses" linkLabel="Бүгдийг харах" />
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {courseCards.length === 0 ? (
                <div className="app-empty md:col-span-2 2xl:col-span-4">Хичээлийн мэдээлэл олдсонгүй.</div>
              ) : courseCards.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="min-h-[220px] rounded-[20px] border border-slate-100 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-[rgba(31,59,143,0.16)] hover:shadow-[0_18px_34px_-28px_rgba(31,59,143,0.4)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-[16px] ${TONE_STYLES[course.tone].panel}`}>
                      <BookIcon />
                    </span>
                    <span className={`app-chip shrink-0 ${TONE_STYLES[course.tone].soft} ${TONE_STYLES[course.tone].text}`}>{course.code}</span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-slate-900">{course.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{course.subtitle}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Төлөв</span>
                    <span className={`text-sm font-semibold ${TONE_STYLES[course.tone].text}`}>{course.score}</span>
                  </div>
                  <div className="mt-3 app-progress-track">
                    <div className="app-progress-fill" style={{ width: `${Math.max(0, Math.min(100, course.progress || 0))}%`, background: TONE_STYLES[course.tone].line }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="app-table-shell">
            <div className="border-b border-slate-100 px-6 py-5">
              <SectionHeading
                title={isStaff ? 'Сүүлийн илгээлтүүд' : 'Миний сүүлийн илгээлтүүд'}
                note="Сүүлийн илгээгдсэн ажлуудын жагсаалт."
                linkTo={isStaff ? '/grade' : '/submissions'}
                linkLabel={isStaff ? 'Журнал руу очих' : 'Бүгдийг харах'}
              />
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" style={{ gridTemplateColumns: '2fr 1.6fr 0.9fr 0.9fr 0.8fr' }}>
                  {['Нэр', 'Хичээл', 'Огноо', 'Төлөв', 'Оноо'].map((heading) => <span key={heading}>{heading}</span>)}
                </div>

                {loading ? (
                  <div className="px-6 py-14 text-center text-sm text-slate-400">Мэдээлэл ачааллаж байна...</div>
                ) : activityItems.length === 0 ? (
                  <div className="px-6 py-14 text-center text-sm text-slate-400">Одоогоор харагдах илгээлт алга байна.</div>
                ) : activityItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="grid w-full items-center border-b border-slate-100 px-6 py-4 text-left transition hover:bg-slate-50/70"
                    style={{ gridTemplateColumns: '2fr 1.6fr 0.9fr 0.9fr 0.8fr' }}
                    onClick={() => navigate(`/submissions/${item.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[16px] text-xs font-bold text-white" style={{ background: avatarColor(item.personName) }}>
                        {initials(item.personName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{item.personName}</p>
                      </div>
                    </div>
                    <span className="truncate text-sm text-slate-600">{item.course}</span>
                    <span className="text-sm text-slate-400">{item.created}</span>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${item.graded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.graded ? 'Дүгнэсэн' : 'Хүлээгдэж буй'}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{item.score}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="app-panel px-6 py-6">
            <SectionHeading title={isStaff ? 'Хүлээгдэж буй ажил' : 'Удахгүй дуусах даалгавар'} linkTo="/submissions" linkLabel="Бүгдийг харах" />
            <div className="mt-4 space-y-3">
              {deadlineItems.length === 0 ? (
                <div className="app-empty">Харагдах ажил алга байна.</div>
              ) : deadlineItems.map((item, index) => {
                const tone = TONE_STYLES[item.tone || ['blue', 'emerald', 'amber'][index % 3]];
                return (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-[18px] border border-slate-100 px-4 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.panel.split(' ')[0]}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{item.note}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${tone.text}`}>{item.due}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="app-panel px-6 py-6">
            <SectionHeading title="Мэдэгдлүүд" linkTo={isStaff ? '/attendance' : '/grade'} linkLabel="Дэлгэрэнгүй" />
            <div className="mt-4 space-y-3">
              {recentItems.length === 0 ? (
                <div className="app-empty">Мэдэгдэл алга байна.</div>
              ) : recentItems.map((item, index) => (
                <Link key={item.id} to={item.link || '#'} className="flex items-start gap-3 rounded-[18px] border border-slate-100 px-4 py-4 transition hover:bg-slate-50/70">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${TONE_STYLES[['blue', 'emerald', 'violet'][index % 3]].panel}`}>
                    <BellIcon />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
                  </div>
                  <span className="text-xs text-slate-400">{item.created}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="app-panel px-6 py-6">
            <SectionHeading title="Түргэн холбоос" />
            <div className="mt-4 space-y-3">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="flex items-start gap-3 rounded-[18px] border border-slate-100 px-4 py-4 transition hover:border-[rgba(31,59,143,0.16)] hover:bg-slate-50/70">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ${TONE_STYLES[action.tone].panel}`}>{action.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{action.note}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="app-panel px-6 py-6">
            <SectionHeading title={isStaff ? 'Ажиллах төлөв' : 'Миний ахиц'} />
            <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[20px] border border-slate-100 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">{isStaff ? 'Энэ долоо хоногийн ачаалал' : 'Одоогийн ахиц'}</p>
                <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{isStaff ? `${stats.pending} ажил` : `${completionRate}%`}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {isStaff ? `${summaryCounts.approvals} approval ба ${stats.pending} submission шалгах үлдсэн.` : `${stats.graded} илгээлт дүгнэгдсэн, ${stats.pending} илгээлт хүлээгдэж байна.`}
                </p>
                <div className="mt-5 app-progress-track">
                  <div className="app-progress-fill" style={{ width: `${isStaff ? Math.min(100, stats.pending * 10) : completionRate}%`, background: isStaff ? '#d9871c' : '#16935d' }} />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-[20px] border border-slate-100 px-4 py-4">
                <div className="app-ring-progress" style={{ '--progress': isStaff ? Math.min(100, stats.pending * 10) : completionRate }}>
                  <div className="app-ring-progress-inner">
                    <span className="text-2xl font-black text-slate-900">{isStaff ? Math.min(100, stats.pending * 10) : completionRate}%</span>
                  </div>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">{isStaff ? 'Хяналтын төлөв' : 'Дүгнэгдсэн хувь'}</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
