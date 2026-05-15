import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { paymentAPI, debtAPI, userAPI, courseUserAPI, extractItems, extractItem } from '../../services/api';
import { canManagePayments, getSchoolId, getErrorMessage } from '../../utils/role';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('mn-MN') + '₮';
}

function StatusBadge({ item }) {
  if (item?.status === 'rejected') {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Татгалзсан</span>;
  }
  if (item?.status === 'cancelled') {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Цуцалсан</span>;
  }
  const verified = isPaymentVerified(item);
  if (verified) {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Баталгаажсан</span>;
  }
  return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">Хүлээлт</span>;
}

function isPaymentVerified(payment) {
  return payment?.status === 'verified' || Boolean(payment?.verified_on || payment?.verified_by);
}

function isPaymentPending(payment) {
  return payment?.status !== 'rejected' && payment?.status !== 'cancelled' && !isPaymentVerified(payment);
}

function getPaymentType(payment) {
  return payment.payment_type_id ?? payment.payment_type ?? payment.requested_payment_method ?? '—';
}

function getReceiptUrl(payment) {
  return payment?.receipt_image_url || payment?.receipt_image_data || '';
}

const PAYMENT_TYPES = [
  { value: 'bank_transfer', label: 'Банкны шилжүүлэг' },
  { value: 'cash', label: 'Бэлэн мөнгө' },
  { value: 'card', label: 'Карт' },
  { value: 'qpay', label: 'QPay' },
];

function getPaymentCourseIds(payment) {
  if (Array.isArray(payment?.course_ids)) return payment.course_ids.map(String).filter(Boolean);
  if (typeof payment?.course_ids === 'string' && payment.course_ids.trim()) {
    try {
      const parsed = JSON.parse(payment.course_ids);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return payment.course_ids.split(',').map((id) => id.trim()).filter(Boolean);
    }
  }
  if (Array.isArray(payment?.courses)) {
    return payment.courses.map((course) => String(course.id ?? course.course_id ?? '')).filter(Boolean);
  }
  return [];
}

export default function UserPaymentsPage() {
  const { user_id }   = useParams();
  const currentUser   = useTeam2User();
  const role          = useTeam2Role();
  const [student, setStudent]     = useState(null);
  const [payments, setPayments]   = useState([]);
  const [debt, setDebt]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');
  const [verifying, setVerifying] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [form, setForm] = useState({
    amount:       '',
    bank_receipt: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_type: 'bank_transfer',
    status:       'pending',
  });

  const [schoolId, setSchoolId] = useState(() => currentUser?.school_id ?? getSchoolId(currentUser));

  useEffect(() => {
    if (!canManagePayments(role)) return;
    if (!user_id) { setError('Мэдээлэл олдсонгүй.'); setLoading(false); return; }

    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let sid = currentUser?.school_id ?? getSchoolId(currentUser);
        if (!sid && currentUser?.id) {
          const schoolPayload = await userAPI.getSchools(currentUser.id);
          const schools = extractItems(schoolPayload);
          sid = schools[0]?.id ?? schools[0]?.school_id ?? null;
        }
        if (!sid) throw new Error('Сургуулийн мэдээлэл олдсонгүй.');
        if (active) setSchoolId(sid);

        const [u, p, d] = await Promise.all([
          userAPI.getOne(user_id).catch(() => null),
          paymentAPI.getByStudent(sid, user_id).catch(() => []),
          debtAPI.get(sid, user_id).catch(() => null),
        ]);
        if (!active) return;
        setStudent(u ? (extractItem(u) ?? u) : null);
        setPayments(extractItems(p));
        setDebt(d);
      } catch (e) {
        if (active) setError(getErrorMessage(e, 'Мэдээлэл ачааллаж чадсангүй.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [currentUser, role, user_id]);

  const reload = () => {
    Promise.all([
      paymentAPI.getByStudent(schoolId, user_id),
      debtAPI.get(schoolId, user_id).catch(() => null),
    ]).then(([p, d]) => {
      setPayments(extractItems(p));
      setDebt(d);
    }).catch(() => {});
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.amount) { setSaveErr('Дүнгээ оруулна уу.'); return; }
    setSaving(true); setSaveErr('');
    const paymentRecord = {
      amount: Number(form.amount),
      bank_receipt: form.bank_receipt || `ADMIN-${Date.now().toString().slice(-6)}`,
      payment_date: form.payment_date,
      payment_type: form.payment_type,
      status: form.status,
      school_id: schoolId,
      user_id,
      created_by: currentUser?.id,
    };
    try {
      await paymentAPI.create(schoolId, user_id, {
        amount:       paymentRecord.amount,
        bank_receipt: paymentRecord.bank_receipt,
        payment_date: paymentRecord.payment_date,
        payment_type: paymentRecord.payment_type,
        status:       paymentRecord.status,
      });
      setForm(f => ({ ...f, amount: '', bank_receipt: '' }));
      reload();
    } catch (e) {
      setSaveErr(getErrorMessage(e, 'Төлбөр хадгалж чадсангүй.'));
    } finally { setSaving(false); }
  };

  const handleVerify = async (payId) => {
    setVerifying(payId);
    try {
      const targetPayment = payments.find((payment) => String(payment.id) === String(payId));
      const courseIds = getPaymentCourseIds(targetPayment);
      const verifiedPatch = { verified_on: new Date().toISOString(), verified_by: currentUser?.id };
      await paymentAPI.verify(schoolId, user_id, payId);
      if (courseIds.length) {
        await Promise.all(courseIds.map((courseId) => courseUserAPI.add(courseId, {
          user_id,
          current_user: currentUser?.id,
        }).catch(() => null)));
      }
      setPayments(prev => prev.map(p =>
        String(p.id) === String(payId) ? { ...p, ...verifiedPatch, enrolled_course_ids: courseIds } : p
      ));
      reload();
    } catch (e) {
      alert(getErrorMessage(e, 'Баталгаажуулахад алдаа гарлаа.'));
    } finally { setVerifying(null); }
  };

  const handleReject = async (payId) => {
    const reason = window.prompt('Татгалзсан шалтгаанаа бичнэ үү', 'Төлбөрийн мэдээлэл баталгаажихгүй байна');
    if (!reason) return;
    setRejecting(payId);
    try {
      await paymentAPI.reject(schoolId, user_id, payId, { reason });
      reload();
    } catch (e) {
      alert(getErrorMessage(e, 'Татгалзахад алдаа гарлаа.'));
    } finally {
      setRejecting(null);
    }
  };

  if (!canManagePayments(role)) {
    return <div className="text-center py-24 text-gray-400 text-sm">Эрх байхгүй байна</div>;
  }

  const studentName = student
    ? `${student.last_name ?? ''} ${student.first_name ?? ''}`.trim() || student.email || 'Оюутан'
    : 'Оюутан';

  const totalPaid    = payments.filter(isPaymentVerified).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPending = payments.filter(isPaymentPending).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const debtAmount   = Math.max(Number(debt?.debt_amount ?? 0), totalPending);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/payment-debt-report" className="hover:text-indigo-900">Өр тайлан</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{studentName}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{studentName} — Төлбөр</h1>
          <p className="text-sm text-gray-400 mt-0.5">Оюутны төлбөрийн бүртгэл</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>}

      {debtAmount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-red-500">⚠️</span>
          <span className="text-sm font-semibold text-red-700">
            Өр дүн: {fmt(debtAmount)}
            {debt?.due_date && <span className="ml-2 font-normal">— Дуусах: {new Date(debt.due_date).toLocaleDateString('mn-MN')}</span>}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Өр дүн', value: fmt(debtAmount), bg: debtAmount > 0 ? 'bg-red-50' : 'bg-gray-50', icon: debtAmount > 0 ? '⚠️' : '✅' },
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

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Төлбөрийн жагсаалт</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Ачааллаж байна...</div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <span className="text-3xl">💳</span><span>Төлбөр байхгүй байна</span>
            </div>
          ) : (
            <>
              <div className="grid px-6 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr' }}>
                <span>Дүн</span><span>Огноо</span><span>Хэлбэр</span><span>Баримт</span><span>Статус</span><span></span>
              </div>
              {payments.map(p => {
                const dt = p.payment_date ? new Date(p.payment_date).toLocaleDateString('mn-MN') : '—';
                const isVerified = isPaymentVerified(p);
                const isPending = isPaymentPending(p);
                const receiptUrl = getReceiptUrl(p);
                return (
                  <div key={p.id}
                    className="grid px-6 py-4 border-b border-gray-50 items-center hover:bg-slate-50 transition"
                    style={{ gridTemplateColumns: '1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1fr' }}>
                    <span className="text-sm font-semibold text-gray-900">{fmt(p.amount)}</span>
                    <span className="text-sm text-gray-500">{dt}</span>
                    <span className="text-sm text-gray-500">{getPaymentType(p)}</span>
                    <span className="min-w-0 text-sm text-gray-500">
                      <span className="block truncate">{p.bank_receipt || '—'}</span>
                      {receiptUrl && (
                        <a href={receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-indigo-900 hover:underline">
                          Зураг харах
                        </a>
                      )}
                    </span>
                    <span>
                      <StatusBadge item={p} />
                      {p.status === 'rejected' && p.rejected_reason && (
                        <span className="mt-1 block text-xs text-red-500">{p.rejected_reason}</span>
                      )}
                    </span>
                    {isPending ? (
                      <span className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleVerify(p.id)}
                          disabled={verifying === p.id || rejecting === p.id}
                          className="text-xs text-indigo-900 font-semibold hover:underline disabled:opacity-50 text-right">
                          {verifying === p.id ? '...' : 'Баталгаажуулах'}
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          disabled={verifying === p.id || rejecting === p.id}
                          className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50 text-right">
                          {rejecting === p.id ? '...' : 'Татгалзах'}
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 text-right">{isVerified ? '✓' : '—'}</span>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">+ Төлбөр оруулах</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Дүн (₮)</label>
              <input type="number" min="0" placeholder="Жишээ: 500000"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Төлбөрийн хэлбэр</label>
              <select value={form.payment_type}
                onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition bg-white">
                {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Банкны баримт №</label>
              <input type="text" placeholder="Гүйлгээний дугаар"
                value={form.bank_receipt}
                onChange={e => setForm(f => ({ ...f, bank_receipt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Огноо</label>
              <input type="date" value={form.payment_date}
                onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
            </div>
            {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
              {saving ? 'Хадгалж байна...' : 'Оруулах'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
