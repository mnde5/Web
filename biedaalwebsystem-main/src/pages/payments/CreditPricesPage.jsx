import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { creditPriceAPI, courseLevelAPI, extractItems, schoolAPI, userAPI } from '../../services/api';
import { DEFAULT_PRICE_PER_CREDIT } from '../../data/paymentDefaults';
import { canManagePayments, getSchoolId, getErrorMessage } from '../../utils/role';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}

const currentYear = new Date().getFullYear();
const DEFAULT_LEVELS = [
  { id: '1', name: 'Бакалавр', code: 'BACHELOR' },
  { id: '2', name: 'Магистр', code: 'MASTER' },
  { id: '3', name: 'Доктор', code: 'DOCTOR' },
];

function normalizeLevel(item) {
  const id = item?.id ?? item?.level_id ?? item?.course_level_id;
  if (id == null || id === '') return null;
  return {
    id: String(id),
    name: item?.name ?? item?.level_name ?? item?.course_level_name ?? `Түвшин ${id}`,
    code: item?.code ?? item?.level_code ?? '',
  };
}

function uniqueLevels(...sources) {
  const seen = new Set();
  return sources
    .flatMap((source) => extractItems(source).map(normalizeLevel))
    .filter(Boolean)
    .filter((level) => {
      if (seen.has(level.id)) return false;
      seen.add(level.id);
      return true;
    });
}

async function resolveSchoolId(user) {
  const cachedSchoolId = getSchoolId(user);
  if (cachedSchoolId) return cachedSchoolId;
  if (!user?.id) return null;

  try {
    const payload = await userAPI.getSchools(user.id);
    const schools = extractItems(payload);
    return schools[0]?.id ?? schools[0]?.school_id ?? null;
  } catch {
    return null;
  }
}

export default function CreditPricesPage() {
  const user     = useTeam2User();
  const role     = useTeam2Role();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [levels, setLevels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [form, setForm]       = useState({
    level_id:        '',
    effective_year:  String(currentYear),
    enrollment_year: String(currentYear),
    price_per_credit:String(DEFAULT_PRICE_PER_CREDIT),
  });

  useEffect(() => {
    if (!canManagePayments(role)) { navigate('/'); return; }
    let active = true;
    setLoading(true);
    setError('');

    resolveSchoolId(user).then((resolvedSchoolId) => {
      if (!active) return;
      if (!resolvedSchoolId) {
        setSchoolId('');
        setError('Сургуулийн мэдээлэл олдсонгүй.');
        setLoading(false);
        return;
      }
      setSchoolId(String(resolvedSchoolId));
      return Promise.all([
        creditPriceAPI.getAll(resolvedSchoolId),
        courseLevelAPI.getAll(resolvedSchoolId).catch(() => []),
        schoolAPI.getCourses(resolvedSchoolId).catch(() => []),
      ]).then(([prices, lvls, courses]) => {
        if (!active) return;
        setItems(extractItems(prices));
        const nextLevels = uniqueLevels(lvls, prices, courses);
        setLevels(nextLevels.length ? nextLevels : DEFAULT_LEVELS);
      });
    }).catch(e => {
      if (active) setError(getErrorMessage(e, 'Мэдээлэл ачааллаж чадсангүй.'));
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [role, user, navigate]);

  const load = () => {
    if (!schoolId) return;
    creditPriceAPI.getAll(schoolId)
      .then(r => setItems(extractItems(r)))
      .catch(() => {});
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.level_id) { setSaveErr('Сургалтын түвшин сонгох эсвэл level_id оруулна уу.'); return; }
    if (!form.price_per_credit) { setSaveErr('1 кредитийн үнийг оруулна уу.'); return; }
    setSaving(true); setSaveErr('');
    try {
      await creditPriceAPI.create(schoolId, {
        level_id:        Number(form.level_id),
        effective_year:  Number(form.effective_year),
        enrollment_year: Number(form.enrollment_year),
        price_per_credit:Number(form.price_per_credit),
      });
      setForm(f => ({ ...f, level_id: '', price_per_credit: String(DEFAULT_PRICE_PER_CREDIT) }));
      load();
    } catch (e) {
      setSaveErr(getErrorMessage(e, 'Нэмэхэд алдаа гарлаа.'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Устгах уу?')) return;
    try {
      await creditPriceAPI.delete(schoolId, id);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (e) {
      alert(getErrorMessage(e, 'Устгахад алдаа гарлаа.'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Кредитийн үнэлгээ</h1>
          <p className="text-sm text-gray-400 mt-0.5">Түвшин, оноор тооцох кредитийн үнэ</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>}

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Үнэлгээний жагсаалт</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Үнэлгээ байхгүй байна</div>
          ) : (
            <>
              <div className="grid px-6 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 0.5fr' }}>
                <span>Түвшин</span><span>Хүчинтэй жил</span><span>Элсэлтийн жил</span><span>Кредит үнэ</span><span></span>
              </div>
              {items.map(item => (
                <div key={item.id}
                  className="grid px-6 py-4 border-b border-gray-50 items-center hover:bg-slate-50 transition"
                  style={{ gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 0.5fr' }}>
                  <div>
                    <span className="text-sm font-medium">{item.level_name ?? '—'}</span>
                    {item.level_code && <span className="ml-2 text-xs text-gray-400">{item.level_code}</span>}
                  </div>
                  <span className="text-sm text-gray-600">{item.effective_year ?? '—'}</span>
                  <span className="text-sm text-gray-600">{item.enrollment_year ?? '—'}</span>
                  <span className="text-sm font-semibold text-gray-900">{fmt(item.price_per_credit)}</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-500 font-semibold hover:text-red-700 transition text-right">
                    Устгах
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">+ Үнэлгээ нэмэх</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Сургалтын түвшин</label>
              <select
                value={form.level_id}
                onChange={e => setForm(f => ({ ...f, level_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition bg-white">
                <option value="">Сонгоно уу</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ''}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={form.level_id}
                onChange={e => setForm(f => ({ ...f, level_id: e.target.value }))}
                placeholder="эсвэл level_id гараар оруулах"
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
              />
              <p className="mt-2 text-xs leading-5 text-gray-400">
                Сонголтоос сонгох эсвэл backend-д байгаа level_id-г шууд оруулж болно.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Хүчинтэй жил</label>
                <input
                  type="number" min="2000" max="2100"
                  value={form.effective_year}
                  onChange={e => setForm(f => ({ ...f, effective_year: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Элсэлтийн жил</label>
                <input
                  type="number" min="2000" max="2100"
                  value={form.enrollment_year}
                  onChange={e => setForm(f => ({ ...f, enrollment_year: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">1 кредитийн үнэ (₮)</label>
              <input
                type="number" min="0" placeholder={`Default: ${DEFAULT_PRICE_PER_CREDIT}`}
                value={form.price_per_credit}
                onChange={e => setForm(f => ({ ...f, price_per_credit: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
              />
            </div>
            {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
            <button
              type="submit" disabled={saving}
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
              {saving ? 'Хадгалж байна...' : 'Нэмэх'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
