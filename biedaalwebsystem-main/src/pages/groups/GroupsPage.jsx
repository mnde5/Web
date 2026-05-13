import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { courseAPI, courseUserAPI, groupAPI, debtAPI, extractItems, paymentAPI, parseCourseName, parseJsonFields } from '../../services/api';
import { canGrade, isSchoolAdmin, isStudent, isSystemAdmin, getSchoolId, resolveUserRole } from '../../utils/role';

export default function GroupsPage() {
  const { course_id: paramCourse } = useParams();
  const user = useTeam2User();
  const role = useTeam2Role();
  const accessRole = canGrade(role) ? role : resolveUserRole(user);
  const navigate = useNavigate();
  const [courses, setCourses]   = useState([]);
  const [selected, setSelected] = useState(paramCourse ?? '');
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [hasDebt, setHasDebt]   = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const mergeGroupsWithStudentCounts = (groupPayload, courseUserPayload) => {
    const studentCounts = new Map();

    extractItems(courseUserPayload).forEach((item) => {
      const parsed = parseJsonFields(item) || {};
      let linkedGroup = null;
      if (parsed.group && typeof parsed.group === 'object') {
        linkedGroup = parsed.group;
      } else {
        try { linkedGroup = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
      }

      const groupId =
        parsed.group_id ??
        parsed.lesson_group_id ??
        parsed.student_group_id ??
        parsed.group?.id ??
        linkedGroup?.id;
      if (!groupId) return;

      const key = String(groupId);
      studentCounts.set(key, (studentCounts.get(key) ?? 0) + 1);
    });

    return extractItems(groupPayload).map((group) => ({
      ...group,
      studentCount: studentCounts.get(String(group.id)) ?? 0,
    }));
  };

  useEffect(() => {
    if (!user?.id) return;
    const schoolId = getSchoolId(user);
    if (isStudent(accessRole) && schoolId) {
      Promise.all([
        debtAPI.get(schoolId, user.id).catch(() => null),
        paymentAPI.getByStudent(schoolId, user.id).catch(() => ({ items: [] })),
      ])
        .then(([debt, paymentPayload]) => {
          const pendingAmount = extractItems(paymentPayload)
            .filter((payment) => !payment?.verified_on && !payment?.verified_by)
            .reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0);
          setHasDebt(Number(debt?.debt_amount ?? 0) > 0 || pendingAmount > 0);
        })
        .catch(() => {});
    }
    const fn = async () => { setLoading(true);
      try {
        const res = await courseAPI.getVisible(accessRole, user);
        setCourses(extractItems(res).map(c => ({ id: c.course_id??c.id, name: parseCourseName(c) })));
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fn();
  }, [user?.id, role, accessRole]);

  useEffect(() => {
    setSelected(paramCourse ?? '');
  }, [paramCourse]);

  useEffect(() => {
    if (!selected) { setGroups([]); return; }
    setLoading(true);
    Promise.all([
      groupAPI.getByCourse(selected),
      courseUserAPI.getByCourse(selected).catch(() => ({ items: [] })),
    ])
      .then(([groupResponse, courseUserResponse]) => {
        setGroups(mergeGroupsWithStudentCounts(groupResponse, courseUserResponse));
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selected) return;
    setCreating(true);
    setCreateError('');
    try {
      await groupAPI.create(selected, { name: newGroupName.trim(), priority: groups.length + 1 });
      setNewGroupName('');
      const [groupResponse, courseUserResponse] = await Promise.all([
        groupAPI.getByCourse(selected),
        courseUserAPI.getByCourse(selected).catch(() => ({ items: [] })),
      ]);
      setGroups(mergeGroupsWithStudentCounts(groupResponse, courseUserResponse));
    } catch (e) {
      setCreateError(e.message ?? 'Бүлэг үүсгэхэд алдаа гарлаа.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (event, group) => {
    event.stopPropagation();
    if (!group?.id) return;
    if (!window.confirm(`"${group.name ?? 'Бүлэг'}" бүлгийг устгах уу?`)) return;
    setDeletingId(group.id);
    setCreateError('');
    try {
      await groupAPI.delete(group.id);
      setGroups((current) => current.filter((item) => String(item.id) !== String(group.id)));
    } catch (e) {
      const message = String(e?.message || '');
      setCreateError(
        message.includes('ORA-02292')
          ? 'Энэ бүлэгт сурагч холбогдсон байна. Эхлээд сурагчдыг бүлгээс хасаад дахин оролдоно уу.'
          : message || 'Бүлэг устгахад алдаа гарлаа.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {hasDebt && isStudent(accessRole) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">🔒</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Баталгаажаагүй төлбөр байна — Бүлэгт нэвтрэх хязгаарлагдсан</p>
            <p className="text-sm text-red-600 mt-0.5">Төлбөрөө барагдуулсны дараа бүлэгт нэвтрэх боломжтой.</p>
          </div>
          <Link to="/payments" className="text-xs text-red-700 font-semibold underline underline-offset-2 shrink-0 mt-0.5">
            Төлбөр харах
          </Link>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold">Бүлгүүд</h1><p className="text-sm text-gray-400 mt-0.5">Хичээлийн бүлгүүд</p></div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-900 bg-white">
          <option value="">Хичээл сонгоно уу</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {canGrade(accessRole) && selected && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Шинэ бүлэг үүсгэх</h3>
          {createError && <p className="text-sm text-red-600 mb-2">{createError}</p>}
          <div className="flex gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Бүлгийн нэр"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 bg-slate-50"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            />
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={creating || !newGroupName.trim()}
              className="bg-indigo-900 hover:bg-indigo-950 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              {creating ? 'Үүсгэж байна...' : '+ Үүсгэх'}
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-5">
        {!selected ? <div className="col-span-3 text-gray-400 text-center py-16 text-sm">Хичээл сонгоно уу</div>
        : loading ? <div className="col-span-3 text-gray-400 text-center py-16 text-sm">Ачааллаж байна...</div>
        : groups.length === 0 ? <div className="col-span-3 text-gray-400 text-center py-16 text-sm">Бүлэг байхгүй байна</div>
        : groups.map(g => (
          <div
            key={g.id}
            className={`bg-white rounded-2xl border border-gray-200 p-5 transition ${hasDebt && isStudent(accessRole) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
            onClick={() => { if (hasDebt && isStudent(accessRole)) return; navigate(paramCourse ? `/courses/${paramCourse}/groups/${g.id}/users` : `/groups/${g.id}`); }}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a6e" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 className="font-semibold text-gray-900">{g.name ?? 'Бүлэг'}</h3>
            <p className="text-sm text-gray-400 mt-1">{courses.find(c=>c.id==selected)?.name ?? '—'}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">{g.studentCount ?? 0} сурагч</span>
              <div className="flex items-center gap-3">
                {canGrade(accessRole) && (
                  <button
                    type="button"
                    onClick={(event) => handleDeleteGroup(event, g)}
                    disabled={String(deletingId) === String(g.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {String(deletingId) === String(g.id) ? 'Устгаж байна...' : 'Устгах'}
                  </button>
                )}
                {hasDebt && isStudent(accessRole)
                  ? <span className="text-xs text-red-500 font-medium">🔒 Хаалттай</span>
                  : <span className="text-xs text-indigo-900 font-medium">
                      {(isSystemAdmin(accessRole) || isSchoolAdmin(accessRole) || canGrade(accessRole)) ? 'Удирдах ›' : 'Дэлгэрэнгүй ›'}
                    </span>
                }
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
