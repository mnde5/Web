import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useTeam2User from '../hooks/useTeam2User';
import useTeam2Role from '../hooks/useTeam2Role';
import ShutisLogo from './ShutisLogo';
import { clearSession } from '../services/api';
import { canGrade, canManageUsers, canManagePayments, canSubmit, isStudent, getRoleLabel } from '../utils/role';

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.8V21h14V9.8" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

function CourseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h4l2.5 7 4.5-14 2.5 7H20" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12a8 8 0 0 1 16 0" />
      <path d="M4 12v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z" />
      <path d="M20 12v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
      <path d="M12 20h1.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
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

function ReportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z" />
      <path d="M8 15V9" />
      <path d="M12 15V7" />
      <path d="M16 15v-4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronDownIcon({ open = false }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function NavLink({ to, icon, label, caption, onClick }) {
  const { pathname } = useLocation();
  const path = to === '/' ? '/' : to.replace(/\/$/, '');
  const active = path === '/'
    ? pathname === '/'
    : pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Link
      to={path}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-[22px] px-3.5 py-3 transition ${
        active
          ? 'bg-[linear-gradient(180deg,#1f3b8f_0%,#162e76_100%)] text-white shadow-[0_24px_44px_-28px_rgba(22,46,118,0.96)]'
          : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] transition ${
          active
            ? 'bg-white/14 text-white'
            : 'bg-slate-100 text-slate-500 group-hover:bg-[rgba(31,59,143,0.08)] group-hover:text-[#1f3b8f]'
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {caption && (
          <span className={`mt-0.5 block truncate text-xs ${active ? 'text-white/72' : 'text-slate-400'}`}>
            {caption}
          </span>
        )}
      </span>
    </Link>
  );
}

function SidebarContent({ role, onNavigate, admin = false }) {
  if (admin) {
    return (
      <>
        <div className="mb-4 px-2">
          <ShutisLogo />
          <div className="mt-4 app-panel-soft px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Системийн орчин</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Хэрэглэгч, сургууль, тайлан</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Админ эрхээр бүртгэл, тохиргоо, мэдээллийг удирдана.</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          <NavLink to="/" onClick={onNavigate} icon={<HomeIcon />} label="Хяналтын самбар" />
          <NavLink to="/users" onClick={onNavigate} icon={<UsersIcon />} label="Хэрэглэгчид" />
          <NavLink to="/schools" onClick={onNavigate} icon={<SchoolIcon />} label="Сургууль" />
          <NavLink to="/courses" onClick={onNavigate} icon={<CourseIcon />} label="Хичээл" />
          <NavLink to="/categories" onClick={onNavigate} icon={<GridIcon />} label="Ангилал" />
          <NavLink to="/report" onClick={onNavigate} icon={<ReportIcon />} label="Тайлан" />
          {canManagePayments(role) && (
            <>
              <NavLink to="/payment-debt-report" onClick={onNavigate} icon={<ReportIcon />} label="Өр тайлан" />
              <NavLink to="/credit-prices" onClick={onNavigate} icon={<GradeIcon />} label="Кредит үнэлгээ" />
              <NavLink to="/payment-policy" onClick={onNavigate} icon={<SettingsIcon />} label="Төлбөрийн бодлого" />
            </>
          )}
          <NavLink to="/settings" onClick={onNavigate} icon={<SettingsIcon />} label="Тохиргоо" />
        </nav>

        <div className="app-panel-soft mt-6 overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,rgba(31,59,143,0.08),rgba(14,165,233,0.06))] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Шинэ боломж</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Системийн шинэчлэлүүдийг шалгана уу</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Шинэ хэрэглэгч, сургууль, тайлангийн урсгалыг нэг дороос удирдана.</p>
            <button type="button" onClick={() => onNavigate('/users/create')} className="mt-4 app-button-primary px-4 py-2.5 text-xs">
              Шинэ хэрэглэгч
            </button>
          </div>
          <div className="flex items-end justify-end px-4 pb-4 pt-2">
            <div className="relative h-20 w-24">
              <div className="absolute bottom-0 right-0 h-10 w-14 rounded-2xl bg-[#1f3b8f] shadow-[0_18px_30px_-20px_rgba(31,59,143,0.8)]" />
              <div className="absolute bottom-5 right-6 h-9 w-16 rounded-2xl bg-[#f1b64c] shadow-[0_14px_22px_-18px_rgba(233,164,35,0.7)]" />
              <div className="absolute bottom-9 right-10 h-8 w-18 rounded-2xl bg-white border border-slate-100 shadow-sm" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 px-2">
        <div className="app-panel-soft px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
              <CalendarIcon />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хуанли</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">2025-2026 Хавар</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">XIII долоо хоног</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Суралцах хэсэг</p>
          <nav className="mt-2 flex flex-col gap-1.5">
            <NavLink to="/" onClick={onNavigate} icon={<HomeIcon />} label="Хяналтын самбар" caption="Ерөнхий төлөв" />
            {!canGrade(role) && (
              <NavLink to="/schools/current" onClick={onNavigate} icon={<SchoolIcon />} label="Хичээл сонголт" caption="Сургууль, хичээл сонгох" />
            )}
            <NavLink to="/courses" onClick={onNavigate} icon={<CourseIcon />} label="Хичээлүүд" caption="Судалж буй болон зааж буй" />
            {!canGrade(role) && (
              <NavLink to="/submissions/create" onClick={onNavigate} icon={<PlusIcon />} label="Илгээлт илгээх" caption="Шинэ даалгавар" />
            )}
            <NavLink to="/grade" onClick={onNavigate} icon={<GradeIcon />} label="Дүн" caption="Оноо, журнал" />
            <NavLink to="/statistics" onClick={onNavigate} icon={<ChartIcon />} label="Статистик" caption="Ахиц, тойм" />
            <NavLink to="/attendance" onClick={onNavigate} icon={<CalendarIcon />} label="Ирц" caption="Ирцийн мэдээлэл" />
            <NavLink to="/groups" onClick={onNavigate} icon={<GroupIcon />} label="Бүлгүүд" caption="Хамрагдсан бүлгүүд" />
          </nav>
        </div>

        {isStudent(role) && (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Төлбөр</p>
            <nav className="mt-2 flex flex-col gap-1.5">
              <NavLink to="/payments" onClick={onNavigate}
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
                label="Миний төлбөр" caption="Төлбөр, өрийн мэдээлэл" />
            </nav>
          </div>
        )}

        {canManageUsers(role) && (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Удирдлага</p>
            <nav className="mt-2 flex flex-col gap-1.5">
              <NavLink to="/users" onClick={onNavigate} icon={<UsersIcon />} label="Хэрэглэгчид" caption="Эрх ба бүртгэл" />
              {canManagePayments(role) && (
                <>
                  <NavLink to="/payment-debt-report" onClick={onNavigate}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                    label="Өр тайлан" caption="Оюутны төлбөрийн байдал" />
                  <NavLink to="/credit-prices" onClick={onNavigate}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                    label="Кредит үнэлгээ" caption="Үнэ тарифын тохиргоо" />
                  <NavLink to="/payment-policy" onClick={onNavigate}
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                    label="Төлбөрийн бодлого" caption="Дүрэм, хязгаарлалт" />
                </>
              )}
            </nav>
          </div>
        )}

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хувийн хэсэг</p>
          <nav className="mt-2 flex flex-col gap-1.5">
            <NavLink to="/profile" onClick={onNavigate} icon={<ProfileIcon />} label="Профайл" caption="Хувийн мэдээлэл" />
            <NavLink to="/settings" onClick={onNavigate} icon={<SettingsIcon />} label="Тохиргоо" caption="Мэдэгдэл ба тохиргоо" />
          </nav>
        </div>
      </div>

      <div className="app-panel-soft mt-6 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Одоогийн эрх</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">{getRoleLabel(role)}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Эрхээс шалтгаалж зарим цэс, хуудас, үйлдлийн товч өөрчлөгдөнө.</p>
      </div>
    </>
  );
}

function IconTile({ to, icon, title, note, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      className="app-surface-muted flex w-full items-start gap-3 px-4 py-4 text-left transition hover:border-[rgba(31,59,143,0.18)] hover:bg-white"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{note}</span>
      </span>
    </button>
  );
}

export default function Layout() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const navigate = useNavigate();
  const location = useLocation();
  const actionsRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('');
  const isAdminShell = canManageUsers(role);

  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
    setActivePanel('');
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !activePanel && !navOpen) return undefined;

    const handlePointerDown = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setMenuOpen(false);
        setActivePanel('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setNavOpen(false);
        setActivePanel('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, activePanel, navOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    setNavOpen(false);
    setActivePanel('');
    clearSession({ clearProfile: true });
    navigate('/login', { replace: true });
  };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    setNavOpen(false);
    setActivePanel('');
    navigate(path);
  };

  const togglePanel = (panelName) => {
    setMenuOpen(false);
    setActivePanel((current) => (current === panelName ? '' : panelName));
  };

  const initials = user ? ((user.last_name?.[0] ?? '') + (user.first_name?.[0] ?? '')).toUpperCase() || 'А' : 'А';
  const displayName = user
    ? `${user.last_name ?? ''} ${user.first_name ?? ''}`.trim() || user.username || user.email || 'Хэрэглэгч'
    : 'Хэрэглэгч';
  const roleLabel = getRoleLabel(role);
  const todayLabel = new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const notificationItems = [
    { id: 1, title: 'Шинэ даалгавар нээгдлээ', note: 'Веб систем ба технологи хичээл дээр шинэ материал орсон.', time: '10 мин', tone: 'bg-sky-50 text-sky-700' },
    { id: 2, title: 'Оноо шинэчлэгдлээ', note: 'Сүүлийн илгээлтийн үнэлгээ журнал дээр гарсан байна.', time: '1 цаг', tone: 'bg-emerald-50 text-emerald-700' },
    { id: 3, title: 'Хугацааны сануулга', note: 'Энэ долоо хоногт дуусах даалгавруудаа шалгана уу.', time: 'Өнөөдөр', tone: 'bg-amber-50 text-amber-700' },
  ];

  const quickLinks = canGrade(role)
    ? [
        { to: '/courses', title: 'Хичээлүүд', note: 'Зааж буй хичээлүүд', icon: <CourseIcon /> },
        { to: '/grade', title: 'Журнал', note: 'Оюутны үнэлгээ', icon: <GradeIcon /> },
        { to: '/statistics', title: 'Статистик', note: 'Ахицын тойм', icon: <ChartIcon /> },
        { to: canManageUsers(role) ? '/users' : '/profile', title: canManageUsers(role) ? 'Хэрэглэгчид' : 'Профайл', note: canManageUsers(role) ? 'Эрх ба бүртгэл' : 'Хувийн хэсэг', icon: canManageUsers(role) ? <UsersIcon /> : <ProfileIcon /> },
      ]
    : [
        { to: '/courses', title: 'Хичээлүүд', note: 'Судалж буй хичээлүүд', icon: <CourseIcon /> },
        { to: '/schools/current', title: 'Хичээл сонголт', note: 'Сургууль, хичээл сонгох', icon: <SchoolIcon /> },
        { to: '/submissions/create', title: 'Илгээлт илгээх', note: 'Шинэ бодлого, даалгавар', icon: <PlusIcon /> },
        { to: '/grade', title: 'Миний дүн', note: 'Оноо, үнэлгээ', icon: <GradeIcon /> },
        { to: '/profile', title: 'Профайл', note: 'Хувийн мэдээлэл', icon: <ProfileIcon /> },
      ];

  const helpLinks = [
    { to: '/notifications', title: 'Мэдэгдэл', note: 'Шинэ мэдээлэл, сануулга', icon: <BellIcon /> },
    { to: '/settings', title: 'Тохиргоо', note: 'Мэдэгдэл ба харагдах байдал', icon: <SettingsIcon /> },
    { to: canSubmit(role) ? '/submissions' : '/courses', title: canSubmit(role) ? 'Миний илгээлт' : 'Хичээлүүд', note: canSubmit(role) ? 'Илгээсэн ажлууд' : 'Суралцах орчин', icon: canSubmit(role) ? <HomeIcon /> : <CourseIcon /> },
  ];

  if (isAdminShell) {
    return (
      <div className="app-shell-bg min-h-screen text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex h-[72px] max-w-[1800px] items-center gap-4 px-4 sm:h-[86px] sm:px-6 lg:gap-6 lg:px-8">
            <Link to="/" className="min-w-0 shrink-0">
              <ShutisLogo className="min-w-0" />
            </Link>

            <div className="relative ml-auto flex shrink-0 items-center gap-3" ref={actionsRef}>
              <button
                type="button"
                className="app-icon-button"
                aria-label="Мэдэгдэл"
              >
                <BellIcon />
                <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>

              <div className="h-10 border-l border-slate-200" />

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-[20px] border border-slate-200 bg-white px-2 py-1.5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-white"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold leading-none text-slate-900">{displayName}</p>
                  <p className="mt-1 text-xs text-slate-400">{roleLabel}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#1f3b8f_0%,#162e76_100%)] text-[11px] font-bold text-white">
                  {initials}
                </div>
                <ChevronDownIcon open={menuOpen} />
              </button>

              {menuOpen && (
                <div className="app-float-panel absolute right-0 top-full z-50 mt-3 w-[min(92vw,320px)] overflow-hidden">
                  <div className="border-b border-slate-100 px-5 py-5">
                    <ShutisLogo showSubtitle={false} titleClassName="tracking-[0.18em]" />
                    <p className="mt-4 text-base font-bold text-slate-900">{displayName}</p>
                    <p className="mt-1 text-sm text-slate-500">{user?.email || user?.username || 'И-мэйл бүртгэгдээгүй'}</p>
                    <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="p-3">
                    <button
                      type="button"
                      onClick={() => handleNavigate('/profile')}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <ProfileIcon />
                      Профайл
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigate('/settings')}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <SettingsIcon />
                      Тохиргоо
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <LogoutIcon />
                      Гарах
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {navOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={() => setNavOpen(false)}>
            <div
              className="app-panel h-full w-[min(88vw,340px)] rounded-none rounded-r-[28px] border-l-0 px-4 py-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between px-2">
                <div>
                  <p className="text-lg font-black tracking-tight text-slate-900">Үндсэн цэс</p>
                  <p className="text-sm text-slate-500">Системийн навигаци</p>
                </div>
                <button type="button" onClick={() => setNavOpen(false)} className="app-icon-button" aria-label="Цэс хаах">
                  <CloseIcon />
                </button>
              </div>
              <SidebarContent role={role} admin onNavigate={() => setNavOpen(false)} />
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-[1800px] gap-4 px-3 py-4 sm:px-4 lg:gap-5 lg:px-6">
          <aside className="hidden lg:flex lg:w-80 lg:shrink-0">
            <div className="app-panel sticky top-24 flex min-h-[calc(100vh-7.5rem)] w-full flex-col p-4">
              <SidebarContent role={role} admin />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="min-h-[calc(100vh-7.5rem)]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-bg min-h-screen text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1800px] items-center gap-3 px-3 sm:h-[86px] sm:px-6 lg:gap-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="app-icon-button lg:hidden"
              aria-label="Цэс нээх"
            >
              <MenuIcon />
            </button>

            <Link to="/" className="min-w-0">
              <ShutisLogo className="min-w-0" />
            </Link>
          </div>

          <div className="hidden 2xl:block">
            <div className="app-panel-soft flex items-center gap-3 px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
                <CalendarIcon />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хичээлийн жил</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">2025-2026 оны хаврын улирал</p>
                <p className="mt-1 text-xs text-slate-500">{todayLabel}</p>
              </div>
            </div>
          </div>

          <div className="relative ml-auto flex shrink-0 items-center gap-2 sm:gap-3" ref={actionsRef}>
            <button
              type="button"
              onClick={() => togglePanel('alerts')}
              className={`app-icon-button ${activePanel === 'alerts' ? 'app-icon-button-active' : ''}`}
              aria-label="Мэдэгдэл"
            >
              <BellIcon />
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel('shortcuts')}
              className={`app-icon-button ${activePanel === 'shortcuts' ? 'app-icon-button-active' : ''}`}
              aria-label="Түргэн холбоос"
            >
              <GridIcon />
            </button>

            <button
              type="button"
              onClick={() => togglePanel('help')}
              className={`app-icon-button ${activePanel === 'help' ? 'app-icon-button-active' : ''}`}
              aria-label="Тусламж"
            >
              <SupportIcon />
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePanel('');
                setMenuOpen((open) => !open);
              }}
              className="flex items-center gap-2.5 rounded-[20px] border border-slate-200 bg-white px-2 py-1.5 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-none text-slate-900">{displayName}</p>
                <p className="mt-1 text-xs text-slate-400">{roleLabel}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[linear-gradient(180deg,#1f3b8f_0%,#162e76_100%)] text-[11px] font-bold text-white">
                {initials}
              </div>
              <ChevronDownIcon open={menuOpen} />
            </button>

            {activePanel === 'alerts' && (
              <div className="app-float-panel absolute right-0 top-full z-50 mt-3 w-[min(92vw,360px)] overflow-hidden p-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Мэдэгдэл</p>
                    <p className="text-xs text-slate-500">Шинэ мэдээлэл, сануулга</p>
                  </div>
                  <button type="button" onClick={() => handleNavigate('/notifications')} className="text-xs font-semibold text-[#1f3b8f]">
                    Бүгдийг харах
                  </button>
                </div>
                <div className="space-y-2">
                  {notificationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate('/notifications')}
                      className="app-surface-muted flex w-full items-start gap-3 px-4 py-4 text-left transition hover:border-[rgba(31,59,143,0.18)] hover:bg-white"
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] ${item.tone}`}>
                        <BellIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.note}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">{item.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'shortcuts' && (
              <div className="app-float-panel absolute right-0 top-full z-50 mt-3 w-[min(92vw,420px)] overflow-hidden p-4">
                <div className="px-2 pb-3">
                  <p className="text-sm font-bold text-slate-900">Түргэн үйлдэл</p>
                  <p className="text-xs text-slate-500">Хамгийн их ашиглагддаг хэсгүүд рүү шууд очно.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {quickLinks.map((item) => (
                    <IconTile key={item.to} to={item.to} icon={item.icon} title={item.title} note={item.note} onNavigate={handleNavigate} />
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'help' && (
              <div className="app-float-panel absolute right-0 top-full z-50 mt-3 w-[min(92vw,360px)] overflow-hidden p-4">
                <div className="app-surface-muted px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Түргэн тусламж</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Сургалтын портал ашиглах зөвлөмж</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Цэс, мэдэгдэл, профайлын тохиргоогоо энэ хэсгээс удирдана.</p>
                </div>
                <div className="mt-3 space-y-2">
                  {helpLinks.map((item) => (
                    <IconTile key={item.to} to={item.to} icon={item.icon} title={item.title} note={item.note} onNavigate={handleNavigate} />
                  ))}
                </div>
                <div className="mt-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Санамж</p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">Ирж буй даалгавар, шинэ дүн, системийн мэдэгдлийг өдөр бүр шалгаж хэвшээрэй.</p>
                </div>
              </div>
            )}

            {menuOpen && (
              <div className="app-float-panel absolute right-0 top-full z-50 mt-3 w-[min(92vw,320px)] overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-5">
                  <ShutisLogo showSubtitle={false} titleClassName="tracking-[0.18em]" />
                  <p className="mt-4 text-base font-bold text-slate-900">{displayName}</p>
                  <p className="mt-1 text-sm text-slate-500">{user?.email || user?.username || 'И-мэйл бүртгэгдээгүй'}</p>
                  <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {roleLabel}
                  </span>
                </div>

                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => handleNavigate('/profile')}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <ProfileIcon />
                    Профайл
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/settings')}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <SettingsIcon />
                    Тохиргоо
                  </button>
                </div>

                <div className="border-t border-slate-100 p-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <LogoutIcon />
                    Гарах
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={() => setNavOpen(false)}>
          <div
            className="app-panel h-full w-[min(88vw,340px)] rounded-none rounded-r-[28px] border-l-0 px-4 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between px-2">
              <div>
                <p className="text-lg font-black tracking-tight text-slate-900">Үндсэн цэс</p>
                <p className="text-sm text-slate-500">Хуудсууд руу шилжих</p>
              </div>
              <button type="button" onClick={() => setNavOpen(false)} className="app-icon-button" aria-label="Цэс хаах">
                <CloseIcon />
              </button>
            </div>
            <SidebarContent role={role} onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1800px] gap-4 px-3 py-4 sm:px-4 lg:gap-5 lg:px-6">
        <aside className="hidden lg:flex lg:w-80 lg:shrink-0">
          <div className="app-panel sticky top-24 flex min-h-[calc(100vh-7.5rem)] w-full flex-col p-4">
            <SidebarContent role={role} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-7.5rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
