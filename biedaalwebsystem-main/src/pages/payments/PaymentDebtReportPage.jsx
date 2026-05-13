import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { paymentAPI, schoolAPI, userAPI, extractItems } from '../../services/api';
import { canManagePayments, getSchoolId, getErrorMessage } from '../../utils/role';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}

const AVCOLS = ['#3b4fd8','#6b7280','#7c3aed','#0891b2','#059669','#dc2626'];
function avc(s) { let h=0; for (const c of String(s)) h=(h*31+c.charCodeAt(0))&0xffff; return AVCOLS[h%AVCOLS.length]; }

function getReportDebtAmount(item) {
  const debt = Number(item?.debt_amount ?? 0) || 0;
  const pending = Number(
    item?.pending_amount ??
    item?.pending_payment_amount ??
    item?.unverified_amount ??
    item?.payment_pending_amount ??
    0,
  ) || 0;
  return Math.max(debt, pending);
}

function isPaymentVerified(payment) {
  return Boolean(payment?.verified_on || payment?.verified_by);
}

function getUserId(item) {
  return String(item?.user_id ?? item?.id ?? '').trim();
}

function getUserNameParts(user) {
  return {
    first_name: user?.first_name ?? user?.user_first_name ?? '',
    last_name: user?.last_name ?? user?.user_last_name ?? '',
  };
}

function newestPayment(payments) {
  return payments
    .slice()
    .sort((a, b) => String(b.payment_date ?? b.created_on ?? '').localeCompare(String(a.payment_date ?? a.created_on ?? '')))[0] ?? null;
}

function mergePendingPayments(reportItems, users, paymentsByUser) {
  const usersById = new Map(users.map((item) => [getUserId(item), item]).filter(([id]) => id));
  const byUser = new Map(reportItems.map((item) => [String(item.user_id ?? item.id ?? ''), { ...item }]).filter(([id]) => id));

  paymentsByUser.forEach((payments, userId) => {
    const pendingPayments = payments.filter((payment) => !isPaymentVerified(payment));
    if (!pendingPayments.length) return;

    const pendingAmount = pendingPayments.reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0);
    const latest = newestPayment(pendingPayments);
    const existing = byUser.get(userId);
    const user = usersById.get(userId) || {};
    const names = getUserNameParts(user);

    byUser.set(userId, {
      ...existing,
      user_id: userId,
      school_id: existing?.school_id ?? latest?.school_id,
      first_name: existing?.first_name ?? names.first_name,
      last_name: existing?.last_name ?? names.last_name,
      debt_amount: Math.max(Number(existing?.debt_amount ?? 0), pendingAmount),
      pending_payment_amount: pendingAmount,
      debt_status_name: existing?.debt_status_name ?? 'Төлбөр хүлээгдэж байна',
      payment_status_name: existing?.payment_status_name ?? 'Хүлээлт',
      last_payment_amount: existing?.last_payment_amount ?? latest?.amount,
      last_payment_date: existing?.last_payment_date ?? latest?.payment_date ?? latest?.created_on,
    });
  });

  return Array.from(byUser.values());
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

export default function PaymentDebtReportPage() {
  const user     = useTeam2User();
  const role     = useTeam2Role();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    if (!canManagePayments(role)) { navigate('/'); return; }
    if (!user?.id) return;

    let active = true;
    setLoading(true);
    setError('');

    resolveSchoolId(user).then((schoolId) => {
      if (!active) return null;
      if (!schoolId) {
        setError('Сургуулийн мэдээлэл олдсонгүй.');
        setLoading(false);
        return null;
      }
      return Promise.all([
        paymentAPI.getDebtReport(schoolId).catch(() => ({ items: [] })),
        schoolAPI.getUsers(schoolId).catch(() => ({ items: [] })),
      ])
        .then(async ([reportPayload, usersPayload]) => {
          if (!active) return;
          const reportItems = extractItems(reportPayload);
          const schoolUsers = extractItems(usersPayload);
          const paymentsByUser = new Map();

          await Promise.allSettled(
            schoolUsers
              .map((schoolUser) => getUserId(schoolUser))
              .filter(Boolean)
              .map(async (studentId) => {
                const payload = await paymentAPI.getByStudent(schoolId, studentId);
                paymentsByUser.set(studentId, extractItems(payload));
              }),
          );

          if (!active) return;
          setItems(mergePendingPayments(reportItems, schoolUsers, paymentsByUser));
        })
        .catch(e => { if (active) setError(getErrorMessage(e, 'Тайлан ачааллаж чадсангүй.')); })
        .finally(() => { if (active) setLoading(false); });
    });

    return () => { active = false; };
  }, [role, user]);

  const filtered = items.filter(i => {
    const name = `${i.last_name ?? ''} ${i.first_name ?? ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    if (filter === 'debt')    return matchSearch && getReportDebtAmount(i) > 0;
    if (filter === 'paid')    return matchSearch && getReportDebtAmount(i) === 0;
    return matchSearch;
  });

  const totalDebt = items.reduce((s, i) => s + getReportDebtAmount(i), 0);
  const debtors   = items.filter(i => getReportDebtAmount(i) > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Өр, төлбөрийн тайлан</h1>
          <p className="text-sm text-gray-400 mt-0.5">Оюутнуудын төлбөрийн байдал</p>
        </div>
        <Link to="/credit-prices"
          className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-900 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl transition">
          Кредит үнэлгээ
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Нийт оюутан', value: items.length, bg: 'bg-blue-50', icon: '👥' },
          { label: 'Өртэй оюутан', value: debtors, bg: 'bg-red-50', icon: '⚠️' },
          { label: 'Нийт өр дүн', value: fmt(totalDebt), bg: 'bg-orange-50', icon: '💰' },
        ].map(({ label, value, bg, icon }) => (
          <div key={label} className={`${bg} rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4`}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-lg font-bold text-gray-900">{loading ? '…' : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <input type="text" placeholder="Хайх..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-900 transition w-52" />
          <div className="flex gap-2 ml-auto">
            {[['all','Бүгд'],['debt','Өртэй'],['paid','Барагдсан']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filter === v ? 'bg-indigo-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <span className="text-3xl">📋</span><span>Мэдээлэл байхгүй байна</span>
          </div>
        ) : (
          <>
            <div className="grid px-6 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1.5fr 1.5fr 0.8fr' }}>
              <span>Оюутан</span><span>Өр дүн</span><span>Статус</span><span>Сүүлийн төлбөр</span><span>Дуусах огноо</span><span></span>
            </div>
            {filtered.map(item => {
              const name  = `${item.last_name ?? ''} ${item.first_name ?? ''}`.trim() || 'Оюутан';
              const debt  = getReportDebtAmount(item);
              const due   = item.due_date ? new Date(item.due_date).toLocaleDateString('mn-MN') : '—';
              const lastPay = item.last_payment_date
                ? `${fmt(item.last_payment_amount)} (${new Date(item.last_payment_date).toLocaleDateString('mn-MN')})`
                : '—';
              return (
                <div key={item.user_id}
                  className="grid px-6 py-4 border-b border-gray-50 items-center hover:bg-slate-50 transition"
                  style={{ gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1.5fr 1.5fr 0.8fr' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: avc(String(item.user_id)) }}>
                      {((item.last_name?.[0] ?? '') + (item.first_name?.[0] ?? '')).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {debt > 0 ? fmt(debt) : '✓ 0₮'}
                  </span>
                  <div>
                    {(item.payment_status_name || item.debt_status_name) && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        debt > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {item.payment_status_name || item.debt_status_name}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 truncate">{lastPay}</span>
                  <span className="text-sm text-gray-500">{due}</span>
                  <Link to={`/payments/users/${item.user_id}`}
                    className="text-xs text-indigo-900 font-semibold underline underline-offset-2 text-right">
                    Харах
                  </Link>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
