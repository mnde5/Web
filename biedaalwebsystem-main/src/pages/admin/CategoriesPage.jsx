import { useEffect, useState } from 'react';
import { categoryAPI, extractItems, extractItem } from '../../services/api';
import useTeam2User from '../../hooks/useTeam2User';
import { getSchoolMemberships } from '../../utils/role';

export default function CategoriesPage() {
  const user = useTeam2User();

  const schoolId = (() => {
    const memberships = getSchoolMemberships(user);
    const match = memberships.find((s) => {
      if (String(s.id) === '0' || !s.id) return false;
      const roles = Array.isArray(s.roles) ? s.roles : [];
      if (!roles.length) return true;
      return roles.some((r) => Number(r.id) === 10 || Number(r.id) === 20);
    });
    return match?.id ?? null;
  })();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState({ text: '', ok: true });

  const load = () => {
    if (!schoolId) return;
    setLoading(true);
    categoryAPI.getBySchool(schoolId)
      .then((res) => setCategories(extractItems(res)))
      .catch((e) => setError(e.message ?? 'Ачаалахад алдаа гарлаа.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [schoolId]);

  const handleAdd = async () => {
    if (!newName.trim()) { setAddMsg({ text: 'Нэр оруулна уу.', ok: false }); return; }
    setAdding(true);
    setAddMsg({ text: '', ok: true });
    try {
      await categoryAPI.create(schoolId, { name: newName.trim(), priority: String(categories.length + 1) });
      setNewName('');
      setAddMsg({ text: `"${newName.trim()}" амжилттай нэмэгдлээ.`, ok: true });
      load();
    } catch (e) {
      setAddMsg({ text: e.message ?? 'Алдаа гарлаа.', ok: false });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" ангиллыг устгах уу?`)) return;
    try {
      await categoryAPI.delete(id);
      load();
    } catch (e) {
      setError(e.message ?? 'Устгахад алдаа гарлаа.');
    }
  };

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Ангилал</div>
            <h1 className="mt-4 app-page-title">Хичээлийн ангилалууд</h1>
            <p className="app-page-subtitle">Хичээлүүдийг ангилах категориуд. Хичээл үүсгэхэд заавал сонгоно.</p>
          </div>
          <span className="app-chip bg-slate-100 text-slate-600">{categories.length} ангилал</span>
        </div>
      </section>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Нэмэх */}
      <div className="app-panel px-6 py-6">
        <div className="app-kicker bg-emerald-50 text-emerald-700">Шинэ ангилал</div>
        {addMsg.text && (
          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${addMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {addMsg.text}
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            type="text"
            placeholder="Ангиллын нэр"
            className="app-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" onClick={handleAdd} disabled={adding} className="app-button-primary shrink-0">
            {adding && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {adding ? 'Нэмж байна...' : '+ Нэмэх'}
          </button>
        </div>
      </div>

      {/* Жагсаалт */}
      {loading ? (
        <div className="app-empty">Ачааллаж байна...</div>
      ) : categories.length === 0 ? (
        <div className="app-empty">Ангилал байхгүй байна. Дээрх хэсгээс нэмнэ үү.</div>
      ) : (
        <div className="app-panel divide-y divide-slate-100 overflow-hidden px-0 py-0">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{c.name ?? `Ангилал ${c.id}`}</p>
                <p className="text-xs text-slate-400">ID: {c.id}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id, c.name)}
                className="text-xs font-semibold text-red-500 hover:text-red-700 transition"
              >
                Устгах
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
