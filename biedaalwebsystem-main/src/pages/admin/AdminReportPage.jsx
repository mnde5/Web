import { useEffect, useState } from 'react';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { courseAPI, extractItems, schoolAPI, userAPI } from '../../services/api';
import { getSchoolIds, isSchoolAdmin } from '../../utils/role';

function StatCard({ label, value, note }) {
  return (
    <div className="app-panel px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}

export default function AdminReportPage() {
  const role = useTeam2Role();
  const user = useTeam2User();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ schools: 0, users: 0, courses: 0, students: 0, teachers: 0 });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        let schools = [];
        if (isSchoolAdmin(role)) {
          const ids = getSchoolIds(user);
          const payload = await userAPI.getSchools(user.id);
          schools = extractItems(payload).filter((school) => ids.includes(String(school.id)));
        } else {
          schools = extractItems(await schoolAPI.getAll());
        }

        const schoolIds = [...new Set(schools.map((school) => String(school.id)).filter(Boolean))];
        const [userPayloads, coursePayloads] = await Promise.all([
          Promise.all(schoolIds.map((schoolId) => schoolAPI.getUsers(schoolId))),
          Promise.all(schoolIds.map((schoolId) => schoolAPI.getCourses(schoolId))),
        ]);

        const users = userPayloads.flatMap((payload) => extractItems(payload));
        const courses = coursePayloads.flatMap((payload) => extractItems(payload));
        const teachers = users.filter((item) => {
          const text = JSON.stringify(item).toLowerCase();
          return text.includes('teacher') || text.includes('"4"');
        }).length;
        const schoolAdmins = users.filter((item) => {
          const text = JSON.stringify(item).toLowerCase();
          return text.includes('schooladmin') || text.includes('school_admin') || text.includes('"3"');
        }).length;

        if (!active) return;
        setSummary({
          schools: schoolIds.length,
          users: users.length,
          courses: courses.length,
          students: Math.max(0, users.length - teachers - schoolAdmins),
          teachers,
        });
      } catch (err) {
        if (!active) return;
        setError(err.message ?? 'Тайлан ачаалах үед алдаа гарлаа.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (user?.id) load();
    return () => {
      active = false;
    };
  }, [role, user, user?.id]);

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div>
          <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Тайлан</div>
          <h1 className="mt-4 app-page-title">{isSchoolAdmin(role) ? 'Сургуулийн тайлан' : 'Системийн тайлан'}</h1>
          <p className="app-page-subtitle">Сургууль, хэрэглэгч, хичээлийн нэгтгэсэн тоон үзүүлэлтүүд.</p>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Сургууль" value={loading ? '...' : summary.schools} note="Харагдах сургууль" />
        <StatCard label="Хэрэглэгч" value={loading ? '...' : summary.users} note="Нийт бүртгэл" />
        <StatCard label="Хичээл" value={loading ? '...' : summary.courses} note="Идэвхтэй хичээлүүд" />
        <StatCard label="Багш" value={loading ? '...' : summary.teachers} note="Заах бүрэлдэхүүн" />
        <StatCard label="Сурагч" value={loading ? '...' : summary.students} note="Суралцагчид" />
      </section>
    </div>
  );
}
