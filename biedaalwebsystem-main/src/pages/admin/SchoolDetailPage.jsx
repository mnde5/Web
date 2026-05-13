import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { schoolAPI, userAPI, extractItems, extractItem } from '../../services/api';

const ROLE_OPTIONS = [
  { id: 10, label: 'Админ' },
  { id: 20, label: 'Багш' },
  { id: 30, label: 'Суралцагч' },
];

function userName(u) {
  return `${u.last_name ?? ''} ${u.first_name ?? ''}`.trim() || u.username || u.email || `ID ${u.id}`;
}

function formatAddUserError(error) {
  const message = String(error?.message || '');
  if (message.includes('ORA-01403')) {
    return 'Ийм username/и-мэйлтэй хэрэглэгч олдсонгүй. Эхлээд хэрэглэгч үүсгээд, дараа нь сургуульд нэмнэ үү.';
  }
  return message || 'Хэрэглэгч нэмэхэд алдаа гарлаа.';
}

const EMPTY_NEW = { first_name: '', last_name: '', username: '', email: '', phone: '', password: '' };

export default function SchoolDetailPage() {
  const { school_id } = useParams();
  const [school, setSchool]     = useState(null);
  const [members, setMembers]   = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // existing user search
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [roleId, setRoleId]     = useState(String(ROLE_OPTIONS[0].id));
  const [adding, setAdding]     = useState(false);
  const [addMsg, setAddMsg]     = useState({ text: '', ok: true });

  // create + add new user
  const [tab, setTab]           = useState('search'); // 'search' | 'create'
  const [newForm, setNewForm]   = useState(EMPTY_NEW);
  const [newRoleId, setNewRoleId] = useState(String(ROLE_OPTIONS[0].id));
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState({ text: '', ok: true });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [schoolRes, membersRes, usersRes] = await Promise.all([
        schoolAPI.getOne(school_id),
        schoolAPI.getUsers(school_id),
        userAPI.getAll(),
      ]);
      setSchool(extractItem(schoolRes));
      setMembers(extractItems(membersRes));
      setAllUsers(extractItems(usersRes));
    } catch (e) {
      setError(e.message ?? 'Мэдээлэл ачаалахад алдаа гарлаа.');
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => { loadData(); }, [school_id]);

  const memberIds = useMemo(
    () => new Set(members.map((m) => String(m.id ?? m.user_id ?? ''))),
    [members],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter((u) => !memberIds.has(String(u.id ?? '')))
      .filter((u) => `${userName(u)} ${u.email ?? ''} ${u.username ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allUsers, memberIds]);

  const findUserByIdentifier = (value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!key) return null;
    return allUsers.find((user) => (
      String(user.username || '').trim().toLowerCase() === key ||
      String(user.email || '').trim().toLowerCase() === key
    )) || null;
  };

  // --- Add existing user ---
  const handleAdd = async () => {
    if (!selected) { setAddMsg({ text: 'Хэрэглэгч сонгоно уу.', ok: false }); return; }
    const parsedRole = parseInt(roleId);
    if (!parsedRole) { setAddMsg({ text: 'Role ID оруулна уу (тоон утга).', ok: false }); return; }
    const targetUser = selected._manual ? findUserByIdentifier(selected.username) : selected;
    if (!targetUser) {
      setAddMsg({ text: 'Ийм username/и-мэйлтэй хэрэглэгч олдсонгүй. Эхлээд хэрэглэгч үүсгээд, дараа нь сургуульд нэмнэ үү.', ok: false });
      return;
    }
    const targetUsername = targetUser.username || targetUser.email;
    if (!targetUsername) {
      setAddMsg({ text: 'Сонгосон хэрэглэгчийн username олдсонгүй.', ok: false });
      return;
    }
    setAdding(true);
    setAddMsg({ text: '', ok: true });
    try {
      await schoolAPI.addUser(school_id, {
        username: targetUsername,
        role_id: parsedRole,
      });
      setAddMsg({ text: `"${userName(targetUser)}" амжилттай нэмэгдлээ.`, ok: true });
      setSelected(null);
      setSearch('');
      loadData();
    } catch (e) {
      setAddMsg({ text: formatAddUserError(e), ok: false });
    } finally {
      setAdding(false);
    }
  };

  // --- Create new user then add ---
  const setNew = (k, v) => setNewForm((f) => ({ ...f, [k]: v }));

  const handleCreateAndAdd = async () => {
    if (!newForm.first_name || !newForm.last_name || !newForm.username || !newForm.email) {
      setCreateMsg({ text: 'Нэр, овог, username, и-мэйл заавал оруулна уу.', ok: false });
      return;
    }
    setCreating(true);
    setCreateMsg({ text: '', ok: true });
    try {
      // 1) Create user
      await userAPI.create({
        first_name: newForm.first_name.trim(),
        last_name:  newForm.last_name.trim(),
        username:   newForm.username.trim(),
        email:      newForm.email.trim(),
        ...(newForm.phone.trim() && { phone: newForm.phone.trim() }),
        password:   newForm.password || '123',
      });

      // 2) Add to school
      await schoolAPI.addUser(school_id, {
        username: newForm.username.trim(),
        role_id:  parseInt(newRoleId),
      });

      setCreateMsg({ text: `"${newForm.last_name} ${newForm.first_name}" үүсгэж сургуульд нэмлээ.`, ok: true });
      setNewForm(EMPTY_NEW);
      loadData();
    } catch (e) {
      setCreateMsg({ text: e.message ?? 'Алдаа гарлаа.', ok: false });
    } finally {
      setCreating(false);
    }
  };

  // --- Remove ---
  const handleRemove = async (userId) => {
    if (!confirm('Хэрэглэгчийг сургуулиас хасах уу?')) return;
    try {
      await schoolAPI.removeUser(school_id, userId);
      loadData();
    } catch (e) {
      setError(e.message ?? 'Хасахад алдаа гарлаа.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/schools" className="hover:text-slate-900">Сургуулиуд</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{school?.name ?? `ID ${school_id}`}</span>
      </div>

      {/* Header */}
      <div className="app-panel px-6 py-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Сургуулийн мэдээлэл</div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
              {loading ? '...' : (school?.name ?? 'Сургууль')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="app-chip bg-slate-100 text-slate-600">ID {school_id}</span>
            <Link to={`/schools/${school_id}/edit`} className="app-button-secondary text-sm">Засах</Link>
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      </div>

      {/* Add user panel */}
      <div className="app-panel px-6 py-7">
        <div className="app-kicker bg-emerald-50 text-emerald-700">Хэрэглэгч нэмэх</div>

        {/* Tab switcher */}
        <div className="mt-4 inline-flex rounded-[20px] bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${tab === 'search' ? 'bg-white text-[#1f3b8f] shadow-sm' : 'text-slate-500'}`}
          >
            Байгаа хэрэглэгч
          </button>
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${tab === 'create' ? 'bg-white text-[#1f3b8f] shadow-sm' : 'text-slate-500'}`}
          >
            Шинэ хэрэглэгч үүсгэх
          </button>
        </div>

        {/* Search existing */}
        {tab === 'search' && (
          <div className="mt-5 space-y-4">
            {addMsg.text && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${addMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {addMsg.text}
              </div>
            )}

            {/* Direct username input */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Username / И-мэйл шууд оруулах
              </label>
              <div className="flex gap-3">
                <input
                  value={selected ? (selected.username ?? selected.email ?? '') : search}
                  onChange={(e) => { setSelected(null); setSearch(e.target.value); }}
                  type="text"
                  placeholder="Username эсвэл и-мэйл"
                  className="app-input flex-1"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || selected || !search.trim()) return;
                    setSelected(findUserByIdentifier(search) || { username: search.trim(), _manual: true });
                  }}
                />
                {!selected && search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSelected(findUserByIdentifier(search) || { username: search.trim(), _manual: true })}
                    className="app-button-secondary shrink-0"
                  >
                    Сонгох
                  </button>
                )}
                {selected && (
                  <button type="button" onClick={() => { setSelected(null); setSearch(''); }}
                    className="app-button-secondary shrink-0">✕ Цуцлах</button>
                )}
              </div>
              {selected?._manual && (
                <p className="mt-1 text-xs text-slate-400">Username: <span className="font-semibold text-slate-700">{selected.username}</span></p>
              )}
            </div>

            {/* Dropdown from loaded users */}
            {!selected && filtered.length > 0 && (
              <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
                {filtered.map((u) => (
                  <button key={u.id} type="button"
                    onClick={() => { setSelected(u); setSearch(''); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(31,59,143,0.08)] text-xs font-bold text-[#1f3b8f]">
                      {(u.last_name?.[0] ?? u.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{userName(u)}</p>
                      <p className="truncate text-xs text-slate-400">{u.email ?? u.username ?? ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="app-input flex-1">
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.label}</option>
                ))}
              </select>
              <button type="button" onClick={handleAdd} disabled={adding || !selected || !roleId} className="app-button-primary shrink-0">
                {adding && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {adding ? 'Нэмж байна...' : 'Нэмэх'}
              </button>
            </div>
          </div>
        )}

        {/* Create new user */}
        {tab === 'create' && (
          <div className="mt-5 space-y-4">
            {createMsg.text && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${createMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {createMsg.text}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нэр *</label>
                <input value={newForm.first_name} onChange={(e) => setNew('first_name', e.target.value)} placeholder="Нэр оруулна уу" className="app-input" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Овог *</label>
                <input value={newForm.last_name} onChange={(e) => setNew('last_name', e.target.value)} placeholder="Овог оруулна уу" className="app-input" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Username *</label>
              <input value={newForm.username} onChange={(e) => setNew('username', e.target.value)} placeholder="Username оруулна уу" className="app-input" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">И-мэйл *</label>
              <input value={newForm.email} onChange={(e) => setNew('email', e.target.value)} type="email" placeholder="И-мэйл хаяг" className="app-input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Утас</label>
                <input value={newForm.phone} onChange={(e) => setNew('phone', e.target.value)} placeholder="99001234" className="app-input" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нууц үг</label>
                <input value={newForm.password} onChange={(e) => setNew('password', e.target.value)} type="password" placeholder="Хоосон = '123'" className="app-input" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Сургууль дахь эрх</label>
              <select value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)} className="app-input">
                {ROLE_OPTIONS.map((r) => <option key={r.id} value={String(r.id)}>{r.label}</option>)}
              </select>
            </div>
            <button type="button" onClick={handleCreateAndAdd} disabled={creating} className="app-button-primary">
              {creating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {creating ? 'Үүсгэж байна...' : 'Хэрэглэгч үүсгэж сургуульд нэмэх'}
            </button>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="app-panel px-6 py-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Гишүүд</div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Хэрэглэгчдийн жагсаалт</h2>
          </div>
          <span className="app-chip bg-slate-100 text-slate-600">{members.length} хэрэглэгч</span>
        </div>
        {loading ? (
          <div className="app-empty mt-5">Ачааллаж байна...</div>
        ) : members.length === 0 ? (
          <div className="app-empty mt-5">Бүртгэлтэй хэрэглэгч байхгүй байна.</div>
        ) : (
          <div className="mt-5 space-y-2">
            {members.map((u) => {
              const id = u.id ?? u.user_id;
              const role = u.role?.name ?? u.role ?? '';
              return (
                <div key={id} className="app-surface-muted flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(31,59,143,0.08)] text-xs font-bold text-[#1f3b8f]">
                      {(u.last_name?.[0] ?? u.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{userName(u)}</p>
                      <p className="truncate text-xs text-slate-400">{u.email ?? u.username ?? ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {role && <span className="app-chip bg-slate-100 text-slate-600">{role}</span>}
                    <button type="button" onClick={() => handleRemove(id)}
                      className="text-xs font-semibold text-red-500 transition hover:text-red-700">
                      Хасах
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
