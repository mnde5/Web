import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { canManageCourseUsers, getSchoolIds, resolveUserRole } from '../../utils/role';
import { courseUserAPI, extractItem, extractItems, groupAPI, parseJsonFields, parseUser, schoolAPI } from '../../services/api';

const AVCOLS = ['#3b4fd8','#6b7280','#7c3aed','#0891b2','#059669','#dc2626'];
function avc(s) { let h=0; for (const c of String(s)) h=(h*31+c.charCodeAt(0))&0xffff; return AVCOLS[h%AVCOLS.length]; }
function resolveUser(item) { return parseUser(item) || parseJsonFields(item); }
function resolveRole(user) { return resolveUserRole(user); }
function displayName(user) { return `${user?.last_name??''} ${user?.first_name??''}`.trim() || user?.email || 'Хэрэглэгч'; }

export default function GroupDetailPage() {
  const { course_id, group_id } = useParams();
  const role = useTeam2Role();
  const currentUser = useTeam2User();
  const accessRole = canManageCourseUsers(role) ? role : resolveUserRole(currentUser);
  const [group, setGroup] = useState(null);
  const [courseUsers, setCourseUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const groupPayload = await groupAPI.getOne(group_id);
        const g = extractItem(groupPayload);
        const normalizedGroup = parseJsonFields(g);
        const resolvedCourseId = normalizedGroup.course_id ?? course_id;

        const courseUserPayload = resolvedCourseId ? await courseUserAPI.getByCourse(resolvedCourseId) : { items: [] };
        const nextCourseUsers = extractItems(courseUserPayload).map((item) => {
          const parsed = parseJsonFields(item);
          let linkedGroup = null;
          try { linkedGroup = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
          return {
            ...parsed,
            user: resolveUser(parsed),
            group: linkedGroup,
          };
        });

        let candidateItems = [];
        if (canManageCourseUsers(accessRole)) {
          const schoolIds = getSchoolIds(currentUser).filter((id) => String(id) !== '0');
          if (schoolIds.length) {
            const responses = await Promise.all(schoolIds.map((id) => schoolAPI.getUsers(id).then((payload) => ({ schoolId: id, payload }))));
            const all = responses.flatMap(({ schoolId, payload }) => (
              extractItems(payload).map((item) => ({ ...parseJsonFields(item), _roleSchoolId: String(schoolId) }))
            ));
            candidateItems = all.filter((u) => resolveRole(u) === 'student');
          }
        }

        if (!active) return;
        setGroup(normalizedGroup);
        setCourseUsers(nextCourseUsers);

        const seen = new Set();
        const uniqueCandidates = [];
        for (const candidate of candidateItems) {
          const id = String(candidate?.id ?? candidate?.user_id ?? '');
          if (!id || seen.has(id) || resolveRole(candidate) !== 'student') continue;
          seen.add(id);
          uniqueCandidates.push(candidate);
        }
        setCandidates(uniqueCandidates);
      } catch (err) {
        if (!active) return;
        setError(err.message ?? 'Бүлгийн мэдээлэл ачаалах үед алдаа гарлаа.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [group_id, course_id, role, accessRole, currentUser]);

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Ачааллаж байна...</div>;
  if (!group) return <div className="text-red-400 text-center py-24">Бүлэг олдсонгүй</div>;

  const resolvedCourseId = group.course_id ?? course_id;
  const members = courseUsers.filter((item) => String(item.group_id ?? '') === String(group.id)).map((item) => item.user);
  const memberIds = new Set(members.map((user) => String(user?.id ?? '')));
  const enrolledIds = new Set(courseUsers.map((item) => String(item.user_id ?? item.user?.id ?? '')));
  const availableCandidates = candidates.filter((candidate) => !memberIds.has(String(candidate.id)));

  const refreshCourseUsers = async () => {
    if (!resolvedCourseId) return;
    const courseUserPayload = await courseUserAPI.getByCourse(resolvedCourseId);
    setCourseUsers(extractItems(courseUserPayload).map((item) => {
      const parsed = parseJsonFields(item);
      let linkedGroup = null;
      try { linkedGroup = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
      return {
        ...parsed,
        user: resolveUser(parsed),
        group: linkedGroup,
      };
    }));
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Гишүүнийг бүлгээс хасах уу?')) return;
    setSaving(true);
    setError('');
    try {
      await courseUserAPI.update(resolvedCourseId, userId, {
        current_user: String(currentUser?.id ?? ''),
        group_id: '',
      });
      await refreshCourseUsers();
    } catch (err) {
      setError(err.message ?? 'Хасахад алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !resolvedCourseId) {
      setError('Сурагч сонгоно уу.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (enrolledIds.has(String(selectedUserId))) {
        await courseUserAPI.update(resolvedCourseId, selectedUserId, {
          current_user: String(currentUser?.id ?? ''),
          group_id: String(group.id),
        });
      } else {
        await courseUserAPI.add(resolvedCourseId, {
          current_user: String(currentUser?.id ?? ''),
          user_id: String(selectedUserId),
          group_id: String(group.id),
        });
      }
      setSelectedUserId('');
      await refreshCourseUsers();
    } catch (err) {
      setError(err.message ?? 'Бүлэгт сурагч нэмэх үед алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={course_id ? `/courses/${course_id}/groups` : '/groups'} className="hover:text-indigo-900">Бүлгүүд</Link>
        <span>›</span><span className="text-gray-700 font-medium">{group.name ?? 'Бүлэг'}</span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns:'1fr 300px', alignItems:'start' }}>
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a1a6e" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div><h1 className="text-xl font-bold">{group.name ?? 'Бүлэг'}</h1></div>
            </div>
            {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
            {canManageCourseUsers(accessRole) && (
              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-900"
                >
                  <option value="">Энэ бүлэгт сурагч нэмэх</option>
                  {availableCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{displayName(candidate)} ({candidate.email || candidate.username || candidate.id})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={saving || !selectedUserId}
                  className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#1f3b8f] px-5 text-sm font-semibold text-white transition hover:bg-[#162e76] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Нэмж байна...' : 'Бүлэгт нэмэх'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold">👥 Гишүүд</h3>
              <span className="text-xs text-gray-400">{members.length} гишүүн</span>
            </div>
            {members.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">Гишүүн байхгүй байна</div>
            ) : members.map(u => {
              const n = displayName(u);
              return (
                <div key={u.id} className="px-6 py-3.5 border-b border-gray-50 flex items-center gap-3 hover:bg-slate-50 transition">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avc(u.email ?? n) }}>
                    {((u.last_name?.[0]??'')+(u.first_name?.[0]??'')).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium">{n}</p><p className="text-xs text-gray-400">{u.email ?? ''}</p></div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{u.role?.name ?? 'Оюутан'}</span>
                  {canManageCourseUsers(accessRole) && (
                    <button type="button" onClick={() => handleRemoveMember(u.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition ml-2">
                      Хасах
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Мэдээлэл</h3>
          <div className="space-y-3 text-sm">
            {[['Бүлгийн нэр', group.name], ['Гишүүн тоо', members.length]].map(([l,v]) => (
              <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span className="font-medium">{v ?? '—'}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
