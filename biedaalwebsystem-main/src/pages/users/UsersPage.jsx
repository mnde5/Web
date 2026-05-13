import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { schoolAPI, extractItems, parseJsonFields } from '../../services/api';
import { canManageUsers, getSchoolIds, isSchoolAdmin, resolveUserRole } from '../../utils/role';

const ROLE_LABELS = {
  systemadmin: 'Системийн админ',
  schooladmin: 'Сургуулийн админ',
  teacher: 'Багш',
  student: 'Оюутан',
};

const ROLE_OPTIONS = [
  ['Бүгд', 'all'],
  ['Админ', 'schooladmin'],
  ['Багш', 'teacher'],
  ['Оюутан', 'student'],
];

const STATUS_OPTIONS = [
  ['Бүгд', 'all'],
  ['Идэвхтэй', 'active'],
  ['Идэвхгүй', 'inactive'],
];

const ROLE_COLORS = {
  systemadmin: 'bg-orange-50 text-orange-600',
  schooladmin: 'bg-violet-50 text-violet-700',
  teacher: 'bg-emerald-50 text-emerald-700',
  student: 'bg-blue-50 text-blue-700',
};

const STATUS_COLORS = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-rose-50 text-rose-700',
};

function resolveRoleKey(user) {
  return user?._resolvedRole || resolveUserRole(user, user?._roleSchoolId);
}

function resolveRoleLabel(user) {
  const key = resolveRoleKey(user);
  return ROLE_LABELS[key] ?? user?.role?.name ?? '—';
}

function resolveStatus(user) {
  const raw = String(user?.status ?? user?.is_active ?? user?.active ?? 'active').toLowerCase();
  return raw === 'inactive' || raw === 'false' || raw === '0' ? 'inactive' : 'active';
}

function fullName(user) {
  return `${user?.last_name ?? ''} ${user?.first_name ?? ''}`.trim() || '—';
}

function userNote(user) {
  return (
    user?.description ??
    user?.note ??
    user?.bio ??
    resolveRoleLabel(user)
  );
}

function userInitials(user) {
  return `${user?.last_name?.[0] ?? ''}${user?.first_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function avatarColor(seed) {
  const palette = ['#1f3b8f', '#7c3aed', '#0f766e', '#d97706', '#2563eb', '#dc2626'];
  let hash = 0;
  for (const char of String(seed || '')) hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  return palette[hash % palette.length];
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.86" />
      <path d="M16 3.14a4 4 0 0 1 0 7.72" />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 7l9 4.5-9 4.5-9-4.5Z" />
      <path d="M5 12.5V17l7 3 7-3v-4.5" />
      <path d="M12 7V4" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
      <path d="M7 11.5V16c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5" />
    </svg>
  );
}

function TotalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-15.5-6.4L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 15.5 6.4L21 16" />
      <path d="M21 21v-5h-5" />
    </svg>
  );
}

function roleCount(users, key) {
  return users.filter((user) => resolveRoleKey(user) === key).length;
}

function formatUserDeleteError(err) {
  const message = String(err?.message || '');
  if (message.includes('ORA-02292') || message.includes('STUDENT_TIMETABLE_FK_USER')) {
    return 'Энэ хэрэглэгч хичээлийн цагийн хуваарьтай холбогдсон байна. Хэрэглэгчийг бүр мөсөн устгахын оронд сургуулиас нь хасна уу.';
  }
  return message || 'Сургуулиас хасах үед алдаа гарлаа.';
}

function StatCard({ label, value, note, icon, accent, percent = 0 }) {
  return (
    <div className="app-panel px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{note}</p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] ${accent}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#1f3b8f_0%,#6d8df2_100%)]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function Badge({ tone, children }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{children}</span>;
}

export default function UsersPage() {
  const role = useTeam2Role();
  const currentUser = useTeam2User();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!canManageUsers(role)) {
      navigate('/');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        // Зөвхөн өөрийн сургуулийн хэрэглэгчид (school 0 хасна)
        const schoolIds = getSchoolIds(currentUser).filter((id) => String(id) !== '0');
        if (!schoolIds.length) {
          if (!active) return;
          setUsers([]);
          return;
        }
        const responses = await Promise.all(schoolIds.map((id) => schoolAPI.getUsers(id).then((payload) => ({ schoolId: id, payload }))));
        const merged = [];
        const seen = new Set();
        for (const { schoolId, payload } of responses) {
          for (const item of extractItems(payload)) {
            const normalized = parseJsonFields(item);
            const id = String(normalized.id ?? normalized.user_id ?? '');
            if (!id) continue;
            if (seen.has(id)) {
              const existing = merged.find((user) => String(user.id ?? user.user_id ?? '') === id);
              if (existing && !existing._schoolIds.includes(String(schoolId))) {
                existing._schoolIds = [...existing._schoolIds, String(schoolId)];
              }
              continue;
            }
            seen.add(id);
            merged.push({
              ...normalized,
              id: normalized.id ?? normalized.user_id,
              _roleSchoolId: String(schoolId),
              _resolvedRole: resolveUserRole(normalized, schoolId),
              _schoolIds: [String(schoolId)],
            });
          }
        }
        if (!active) return;
        setUsers(merged);
      } catch (err) {
        if (!active) return;
        setError(err.message ?? 'Өгөгдөл ачаалах үед алдаа гарлаа.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [role, navigate, currentUser]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    const haystack = [
      user.username,
      user.email,
      user.first_name,
      user.last_name,
      user.family_name,
      user.note,
      resolveRoleLabel(user),
    ].join(' ').toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesRole = roleFilter === 'all' || resolveRoleKey(user) === roleFilter;
    const matchesStatus = statusFilter === 'all' || resolveStatus(user) === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const total = users.length;
  const stats = {
    total,
    systemadmin: roleCount(users, 'systemadmin'),
    schooladmin: roleCount(users, 'schooladmin'),
    teacher: roleCount(users, 'teacher'),
    student: roleCount(users, 'student'),
  };

  const handleDelete = async (targetUser) => {
    const userId = targetUser?.id ?? targetUser?.user_id;
    const targetSchoolIds = (targetUser?._schoolIds?.length ? targetUser._schoolIds : getSchoolIds(currentUser))
      .map((schoolId) => String(schoolId))
      .filter((schoolId) => schoolId && schoolId !== '0');
    if (!userId || !targetSchoolIds.length) {
      setError('Сургуулиас хасахад шаардлагатай school_id эсвэл user_id олдсонгүй.');
      return;
    }
    if (!window.confirm('Энэ хэрэглэгчийг сургуулиас хасах уу?')) return;
    setDeletingId(userId);
    setError('');
    try {
      await Promise.all(targetSchoolIds.map((schoolId) => schoolAPI.removeUser(schoolId, userId)));
      setUsers((current) => current
        .map((user) => {
          const id = String(user.id ?? user.user_id ?? '');
          if (id !== String(userId)) return user;
          const remainingSchoolIds = (user._schoolIds || []).filter((schoolId) => !targetSchoolIds.includes(String(schoolId)));
          return { ...user, _schoolIds: remainingSchoolIds };
        })
        .filter((user) => String(user.id ?? user.user_id ?? '') !== String(userId) || user._schoolIds?.length));
    } catch (err) {
      setError(formatUserDeleteError(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="app-panel overflow-hidden px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Хэрэглэгчийн удирдлага</div>
            <h1 className="mt-4 app-page-title">Хэрэглэгчийн удирдлага</h1>
            <p className="app-page-subtitle">
              {isSchoolAdmin(role)
                ? 'Өөрийн сургуулийн хэрэглэгчдийг бүртгэх, эрх тохируулах, засах үйлдлүүдийг энэ хуудсаас удирдана.'
                : 'Системийн хэрэглэгчдийг бүртгэх, эрх тохируулах, идэвхжүүлэх, засах үйлдлүүдийг энэ хуудсаас удирдана.'}
            </p>
          </div>

        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Нийт хэрэглэгч"
          value={loading ? '...' : stats.total}
          note="Бүртгэлтэй хэрэглэгч"
          icon={<TotalIcon />}
          accent="bg-blue-50 text-blue-700"
          percent={100}
        />
        <StatCard
          label="Системийн админ"
          value={loading ? '...' : stats.systemadmin}
          note="Системийн түвшин"
          icon={<UsersIcon />}
          accent="bg-orange-50 text-orange-600"
          percent={total ? Math.round((stats.systemadmin / total) * 100) : 0}
        />
        <StatCard
          label="Сургуулийн админ"
          value={loading ? '...' : stats.schooladmin}
          note="Сургууль удирдах эрх"
          icon={<SchoolIcon />}
          accent="bg-violet-50 text-violet-700"
          percent={total ? Math.round((stats.schooladmin / total) * 100) : 0}
        />
        <StatCard
          label="Багш"
          value={loading ? '...' : stats.teacher}
          note="Хичээл, дүнгийн удирдлага"
          icon={<TeacherIcon />}
          accent="bg-emerald-50 text-emerald-700"
          percent={total ? Math.round((stats.teacher / total) * 100) : 0}
        />
        <StatCard
          label="Оюутан"
          value={loading ? '...' : stats.student}
          note="Суралцагч хэрэглэгч"
          icon={<StudentIcon />}
          accent="bg-blue-50 text-blue-700"
          percent={total ? Math.round((stats.student / total) * 100) : 0}
        />
      </section>

      <section className="app-panel px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr]">
            <label className="relative block">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="text"
                placeholder="Хэрэглэгч хайх..."
                className="app-input pl-12"
              />
            </label>

            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="app-select">
              {ROLE_OPTIONS.map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="app-select">
              {STATUS_OPTIONS.map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="app-button-secondary"
            >
              <RefreshIcon />
              Шүүлтүүр цэвэрлэх
            </button>
            <Link to="/users/create" className="app-button-primary">
              + Шинэ хэрэглэгч
            </Link>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="app-table-shell overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="app-section-title">Хэрэглэгчдийн жагсаалт</h2>
            <p className="app-section-note">
              {filteredUsers.length === users.length
                ? `Нийт ${filteredUsers.length} хэрэглэгч харагдаж байна.`
                : `Шүүлтүүрийн дагуу ${filteredUsers.length} хэрэглэгч олдлоо.`}
            </p>
          </div>
          <div className="hidden text-right text-xs text-slate-400 sm:block">
            Хуудас {currentPage} / {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1260px]">
            <div
              className="grid border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 sm:px-6"
              style={{ gridTemplateColumns: '60px 2.1fr 0.9fr 1fr 1fr 1fr 1.6fr 1fr 0.9fr 0.9fr' }}
            >
              <span>№</span>
              <span>Хэрэглэгчийн нэр</span>
              <span>Нууц үг</span>
              <span>Нэр</span>
              <span>Эцэг эхийн нэр</span>
              <span>Ургийн овог</span>
              <span>Тайлбар</span>
              <span>Үүрэг</span>
              <span>Статус</span>
              <span>Үйлдэл</span>
            </div>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">Ачааллаж байна...</div>
            ) : pageUsers.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">Хэрэглэгч олдсонгүй</div>
            ) : (
              pageUsers.map((user, index) => {
                const roleKey = resolveRoleKey(user);
                const roleLabel = resolveRoleLabel(user);
                const status = resolveStatus(user);
                const displayName = fullName(user);
                const email = user.email ?? user.username ?? '—';
                const familyName = user.family_name ?? '—';
                const parentName = user.parent_name ?? user.father_name ?? user.middle_name ?? '—';
                const password = user.password ?? '123';
                const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('mn-MN') : '—';
                const globalIndex = (currentPage - 1) * pageSize + index + 1;

                return (
                  <div
                    key={user.id}
                    className="grid items-center border-b border-slate-50 px-5 py-4 transition hover:bg-slate-50/80 sm:px-6"
                    style={{ gridTemplateColumns: '60px 2.1fr 0.9fr 1fr 1fr 1fr 1.6fr 1fr 0.9fr 0.9fr' }}
                  >
                    <span className="text-sm font-semibold text-slate-700">{globalIndex}</span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,0.5)]"
                          style={{ background: avatarColor(email || displayName) }}
                        >
                          {userInitials(user)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{email}</p>
                          <p className="truncate text-xs text-slate-400">{displayName}</p>
                        </div>
                      </div>
                    </div>

                    <span className="text-sm text-slate-600">{password}</span>
                    <span className="truncate text-sm text-slate-700">{user.first_name ?? '—'}</span>
                    <span className="truncate text-sm text-slate-700">{parentName}</span>
                    <span className="truncate text-sm text-slate-700">{familyName}</span>
                    <span className="truncate text-sm text-slate-500">{userNote(user)}</span>

                    <div>
                      <Badge tone={ROLE_COLORS[roleKey] ?? 'bg-slate-100 text-slate-600'}>
                        {roleLabel}
                      </Badge>
                    </div>

                    <div>
                      <Badge tone={STATUS_COLORS[status]}>
                        {status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/users/${user.id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100"
                        title="Засах"
                      >
                        <EditIcon />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={String(deletingId) === String(user.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Сургуулиас хасах"
                      >
                        {String(deletingId) === String(user.id) ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                        ) : (
                          <TrashIcon />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">
            Нийт {filteredUsers.length} бичлэгээс {filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredUsers.length)} харуулж байна
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 transition disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1}
            >
              Өмнөх
            </button>
            <button
              type="button"
              className="rounded-2xl border border-[#1f3b8f] bg-[#1f3b8f] px-4 py-2.5 text-sm font-semibold text-white"
              disabled
            >
              {currentPage}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 transition disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage >= totalPages}
            >
              Дараах
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
