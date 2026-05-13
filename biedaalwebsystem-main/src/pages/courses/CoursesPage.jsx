import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, extractItems, parseCourse } from '../../services/api';
import { canGrade, isSchoolAdmin, isSystemAdmin } from '../../utils/role';

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default function CoursesPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const response = await courseAPI.getVisible(role, user);

        setCourses(extractItems(response).map((course) => {
          const parsed = parseCourse(course);
          return {
            id: parsed.id,
            name: parsed.name || 'Хичээл',
            description: parsed.description || 'Хичээлийн тайлбар оруулаагүй байна.',
          };
        }).filter((course) => course.id));
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, user?.id, role]);

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Хичээлүүд</div>
            <h1 className="mt-4 app-page-title">
              {isSystemAdmin(role) || isSchoolAdmin(role)
                ? 'Бүх хичээлүүд'
                : canGrade(role)
                  ? 'Зааж буй хичээлүүд'
                  : 'Судалж буй хичээлүүд'}
            </h1>
            <p className="app-page-subtitle">Хичээл тус бүрийн агуулга, илгээлт, үнэлгээ, холбогдох хэсгүүд рүү эндээс орно.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Нийт хичээл</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{loading ? '...' : courses.length}</p>
            </div>
            {isSchoolAdmin(role) && (
              <Link to="/courses/create" className="app-button-primary">
                + Хичээл үүсгэх
              </Link>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="app-empty">Хичээлүүдийг ачааллаж байна...</div>
      ) : courses.length === 0 ? (
        <div className="app-empty">Харагдах хичээл олдсонгүй.</div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              className="app-panel overflow-hidden p-6 text-left transition hover:-translate-y-1 hover:border-[rgba(31,59,143,0.18)] hover:shadow-[0_30px_70px_-34px_rgba(22,46,118,0.42)]"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
                  <BookIcon />
                </div>
                <span className="app-chip bg-slate-100 text-slate-600">
                  {isSystemAdmin(role) || isSchoolAdmin(role) ? 'Админ' : canGrade(role) ? 'Багш' : 'Оюутан'}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold leading-snug text-slate-900">{course.name}</h3>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-slate-500">{course.description}</p>

              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1f3b8f]">
                Дэлгэрэнгүй харах
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
