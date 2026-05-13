import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { schoolAPI, userAPI, extractItems } from '../../services/api';
import { canManageUsers, isSchoolAdmin } from '../../utils/role';

const SHUTIS_SCHOOLS = [];

function normalizeSchools(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item?.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function withFallbackSchools(items) {
  return normalizeSchools(items.length ? items : SHUTIS_SCHOOLS);
}

export default function SchoolsPage() {
  const role = useTeam2Role();
  const user = useTeam2User();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setError('');
      try {
        // Зөвхөн хэрэглэгчийн өөрийн сургуулиуд (school 0 болон student-only хасна)
        const payload = await userAPI.getSchools(user.id);
        if (!active) return;
        const all = extractItems(payload);
        const mine = all.filter((s) => {
          if (String(s.id) === '0') return false;
          const roles = Array.isArray(s.roles) ? s.roles : [];
          if (!roles.length) return true;
          return roles.some((r) => Number(r.id) === 10 || Number(r.id) === 20);
        });
        setSchools(normalizeSchools(mine));
      } catch (err) {
        if (!active) return;
        setError(err.message ?? 'Сургуулийн жагсаалт ачаалахад алдаа гарлаа.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();


    return () => {
      active = false;
    };
  }, [role, user, user?.id]);


  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Сургуулиуд</div>
            <h1 className="mt-4 app-page-title">{isSchoolAdmin(role) ? 'Миний сургуулиуд' : 'Сургуулийн жагсаалт'}</h1>
            <p className="app-page-subtitle">
              {isSchoolAdmin(role)
                ? 'Таны удирдах эрхтэй сургуулиудын мэдээлэл.'
                : 'Системд бүртгэлтэй сургуулиудын мэдээлэл.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Нийт сургууль</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{loading ? '...' : schools.length}</p>
            </div>
            {canManageUsers(role) && (
              <Link to="/schools/create" className="app-button-primary">
                + Сургууль нэмэх
              </Link>
            )}
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}


      {loading ? (
        <div className="app-empty">Сургуулиудыг ачааллаж байна...</div>
      ) : schools.length === 0 ? (
        <div className="app-empty">Харагдах сургууль олдсонгүй.</div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {schools.map((school) => (
            <div key={school.id} className="app-panel px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 11.5 12 7l9 4.5-9 4.5-9-4.5Z" />
                    <path d="M5 12.5V17l7 3 7-3v-4.5" />
                  </svg>
                </div>
                <span className="app-chip bg-slate-100 text-slate-600">ID {school.id}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold leading-snug text-slate-900">{school.name ?? 'Сургууль'}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Төлбөрийн хугацаа: {school.payment_due_days ?? '—'} хоног</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1f3b8f]">
                <Link to={`/schools/${school.id}`}>Дэлгэрэнгүй</Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
