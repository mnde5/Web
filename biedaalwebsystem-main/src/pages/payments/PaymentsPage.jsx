import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { paymentAPI, debtAPI, userAPI, extractItems } from '../../services/api';
import { canManagePayments, getSchoolId, getSchoolIds, getErrorMessage } from '../../utils/role';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}

function StatusBadge({ item }) {
  const verified = isPaymentVerified(item);
  if (verified)
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Баталгаажсан</span>;
  return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Хүлээлт</span>;
}

function isPaymentVerified(payment) {
  return payment?.status === 'verified' || Boolean(payment?.verified_on || payment?.verified_by);
}

async function resolveSchoolIds(user) {
  const ids = new Set(getSchoolIds(user));

  const fromCache = getSchoolId(user);
  if (fromCache) ids.add(String(fromCache));

  if (user?.id) {
    try {
      const res = await userAPI.getSchools(user.id);
      extractItems(res)
        .map((school) => String(school.id ?? school.school_id ?? ''))
        .filter(Boolean)
        .forEach((schoolId) => ids.add(schoolId));
    } catch {
      // Stored user data is still enough for local payment history in dev mode.
    }
  }

  return [...ids];
}

function normalizePayment(payment, schoolId) {
  return {
    ...payment,
    school_id: payment.school_id ?? schoolId,
  };
}

function paymentSortValue(payment) {
  return payment.created_on ?? payment.updated_on ?? payment.payment_date ?? '';
}

function getPaymentType(payment) {
  return payment.payment_type_id ?? payment.payment_type ?? payment.requested_payment_method ?? '—';
}

export default function PaymentsPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const [payments, setPayments] = useState([]);
  const [debt, setDebt]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    setError('');

    resolveSchoolIds(user).then(async schoolIds => {
      if (!active) return;
      if (!schoolIds.length) {
        setLoading(false);
        setError('Сургуулийн мэдээлэл олдсонгүй. Та сургуульд бүртгэлтэй эсэхийг шалгана уу.');
        return;
      }

      try {
        const results = await Promise.all(schoolIds.map(async (schoolId) => {
          const [paymentPayload, debtPayload] = await Promise.all([
            paymentAPI.getByStudent(schoolId, userId),
            debtAPI.get(schoolId, userId).catch(() => null),
          ]);

          return {
            schoolId,
            payments: extractItems(paymentPayload).map((payment) => normalizePayment(payment, schoolId)),
            debt: debtPayload,
          };
        }));

        if (!active) return;

        const mergedPayments = results
          .flatMap((result) => result.payments)
          .sort((a, b) => String(paymentSortValue(b)).localeCompare(String(paymentSortValue(a))));
        const mergedDebtAmount = results.reduce((sum, result) => (
          sum + (Number(result.debt?.debt_amount) || 0)
        ), 0);

        setPayments(mergedPayments);
        setDebt({ debt_amount: mergedDebtAmount });
      } catch (e) {
        if (!active) return;
        setError(getErrorMessage(e, 'Төлбөрийн мэдээлэл ачааллаж чадсангүй.'));
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => { active = false; };
  }, [user, userId]);

  const totalPaid = payments
    .filter(isPaymentVerified)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const totalPending = payments
    .filter(p => !isPaymentVerified(p))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const debtAmount = Math.max(Number(debt?.debt_amount ?? 0), totalPending);
  const hasDebt    = debtAmount > 0;

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400 text-sm">
        <span className="text-3xl">🔐</span>
        <span>Нэвтрэх шаардлагатай</span>
        <Link to="/login" className="text-indigo-900 font-semibold underline underline-offset-2">Нэвтрэх</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Миний төлбөр</h1>
          <p className="text-sm text-gray-400 mt-0.5">Төлбөрийн түүх, мэдээлэл</p>
        </div>
        {canManagePayments(role) && (
          <Link to="/payment-debt-report"
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-900 text-gray-600 text-sm font-medium px-4 py-2 rounded-xl transition">
            Өр тайлан
          </Link>
        )}
      </div>

      {hasDebt && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">
              Төлбөрийн өр: {fmt(debtAmount)}
              {debt?.due_date && <span className="ml-2 font-normal text-red-600">— Дуусах: {new Date(debt.due_date).toLocaleDateString('mn-MN')}</span>}
            </p>
            <p className="text-sm text-red-600 mt-0.5">Өрөө барагдуулсны дараа бүлэгт нэвтрэх боломжтой болно.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Өр дүн', value: fmt(debtAmount), bg: hasDebt ? 'bg-red-50' : 'bg-gray-50', icon: hasDebt ? '⚠️' : '✅' },
          { label: 'Баталгаажсан', value: fmt(totalPaid), bg: 'bg-green-50', icon: '✅' },
          { label: 'Хүлээлтэд', value: fmt(totalPending), bg: 'bg-yellow-50', icon: '⏳' },
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

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Төлбөрийн түүх</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
        ) : payments.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <span className="text-3xl">💳</span>
            <span>Төлбөрийн мэдээлэл байхгүй байна</span>
          </div>
        ) : (
          <>
            <div className="grid px-6 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.5fr 1.5fr' }}>
              <span>Дүн</span><span>Огноо</span><span>Төрөл</span><span>Баримт</span><span>Статус</span>
            </div>
            {payments.map(p => {
              const dt = p.payment_date ? new Date(p.payment_date).toLocaleDateString('mn-MN') : '—';
              return (
                <div key={p.id}
                  className="grid px-6 py-4 border-b border-gray-50 items-center hover:bg-slate-50 transition"
                  style={{ gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.5fr 1.5fr' }}>
                  <span className="text-sm font-semibold text-gray-900">{fmt(p.amount)}</span>
                  <span className="text-sm text-gray-500">{dt}</span>
                  <span className="text-sm text-gray-500">{getPaymentType(p)}</span>
                  <span className="text-sm text-gray-500 truncate">{p.bank_receipt || '—'}</span>
                  <StatusBadge item={p} />
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
