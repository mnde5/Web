import { useEffect, useState } from 'react';
import useTeam2User from '../../hooks/useTeam2User';
import useTeam2Role from '../../hooks/useTeam2Role';
import { paymentPolicyAPI, extractItems, extractItem, userAPI } from '../../services/api';
import { canManagePayments, getSchoolId, getErrorMessage } from '../../utils/role';

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

export default function PaymentPolicyPage() {
  const user = useTeam2User();
  const role = useTeam2Role();
  const [policy, setPolicy]         = useState(null);
  const [policies, setPolicies]     = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState({ text: '', ok: true });
  const [editing, setEditing]       = useState(false);
  const [schoolId, setSchoolId]     = useState('');
  const [form, setForm]             = useState({
    payment_due_days:  '',
    max_debt:          '',
    payment_policy:    '',
    restriction_policy:'',
    bank_account_info: '',
  });

  const isAdmin  = canManagePayments(role);

  useEffect(() => {
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
        paymentPolicyAPI.get(resolvedSchoolId).catch(() => null),
        paymentPolicyAPI.getMasterPolicies().catch(() => []),
        paymentPolicyAPI.getMasterRestrictions().catch(() => []),
      ]).then(([p, pol, res]) => {
        if (!active) return;
        const pol_data = p ? (extractItem(p) ?? p) : null;
        setPolicy(pol_data);
        setPolicies(extractItems(pol));
        setRestrictions(extractItems(res));
        if (pol_data) {
          setForm({
            payment_due_days:   String(pol_data.payment_due_days ?? ''),
            max_debt:           String(pol_data.max_debt ?? ''),
            payment_policy:     pol_data.payment_policy ?? '',
            restriction_policy: pol_data.restriction_policy ?? '',
            bank_account_info:  pol_data.bank_account_info ?? '',
          });
        }
      });
    }).catch(e => {
      if (active) setError(getErrorMessage(e, 'Мэдээлэл ачааллаж чадсангүй.'));
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveMsg({ text: '', ok: true });
    try {
      const updated = await paymentPolicyAPI.update(schoolId, {
        payment_due_days:   Number(form.payment_due_days) || 0,
        max_debt:           Number(form.max_debt) || 0,
        payment_policy:     form.payment_policy,
        restriction_policy: form.restriction_policy,
        bank_account_info:  form.bank_account_info,
      });
      const d = updated ? (extractItem(updated) ?? updated) : form;
      setPolicy(d);
      setSaveMsg({ text: 'Амжилттай хадгаллаа.', ok: true });
      setEditing(false);
    } catch (e) {
      setSaveMsg({ text: getErrorMessage(e, 'Хадгалахад алдаа гарлаа.'), ok: false });
    } finally { setSaving(false); }
  };

  const fmt = (n) => n != null ? Number(n).toLocaleString('mn-MN') + '₮' : '—';

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '—'}</span>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Төлбөрийн бодлого</h1>
        <p className="text-sm text-gray-400 mt-0.5">Сургуулийн төлбөр болон өрийн бодлогын тохиргоо</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-5 py-3 mb-5">{error}</div>}

      <div className="grid gap-6" style={{ gridTemplateColumns: isAdmin ? '1fr 400px' : '1fr', alignItems: 'start' }}>
        {/* Current policy */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Одоогийн бодлого</h3>
            {isAdmin && !editing && (
              <button onClick={() => setEditing(true)}
                className="text-xs text-indigo-900 font-semibold underline underline-offset-2">
                Засах
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Ачааллаж байна...</div>
          ) : !policy ? (
            <div className="text-gray-400 text-sm py-8 text-center">Бодлого тохируулаагүй байна</div>
          ) : (
            <div>
              <InfoRow label="Төлбөр хийх хугацаа" value={policy.payment_due_days != null ? policy.payment_due_days + ' өдөр' : null} />
              <InfoRow label="Хамгийн их өр дүн" value={policy.max_debt != null ? fmt(policy.max_debt) : null} />
              <InfoRow label="Төлбөрийн бодлого" value={policy.payment_policy} />
              <InfoRow label="Хязгаарлалтын бодлого" value={policy.restriction_policy} />
              {policy.bank_account_info && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 font-medium mb-2">Дансны мэдээлэл</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{policy.bank_account_info}</p>
                </div>
              )}
            </div>
          )}

          {/* Master policies list */}
          {(policies.length > 0 || restrictions.length > 0) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              {policies.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Төлбөрийн бодлогын сонголтууд</p>
                  <div className="space-y-2">
                    {policies.map(p => (
                      <div key={p.id} className="flex items-start justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 transition">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                        </div>
                        {isAdmin && (
                          <button onClick={() => setForm(f => ({ ...f, payment_policy: p.code }))}
                            className="text-xs text-indigo-900 font-semibold shrink-0 ml-3 underline underline-offset-2">
                            Сонгох
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {restrictions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Хязгаарлалтын бодлогын сонголтууд</p>
                  <div className="space-y-2">
                    {restrictions.map(r => (
                      <div key={r.id} className="flex items-start justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 transition">
                        <div>
                          <p className="text-sm font-medium">{r.name}</p>
                          {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                        </div>
                        {isAdmin && (
                          <button onClick={() => setForm(f => ({ ...f, restriction_policy: r.code }))}
                            className="text-xs text-indigo-900 font-semibold shrink-0 ml-3 underline underline-offset-2">
                            Сонгох
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit form */}
        {isAdmin && (editing || !policy) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Бодлого тохируулах</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Төлбөр хийх хугацаа (өдөр)</label>
                <input type="number" min="0" placeholder="30"
                  value={form.payment_due_days}
                  onChange={e => setForm(f => ({ ...f, payment_due_days: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Хамгийн их өр дүн (₮)</label>
                <input type="number" min="0" placeholder="500000"
                  value={form.max_debt}
                  onChange={e => setForm(f => ({ ...f, max_debt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Төлбөрийн бодлого</label>
                <input type="text" placeholder="Бодлогын код"
                  value={form.payment_policy}
                  onChange={e => setForm(f => ({ ...f, payment_policy: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Хязгаарлалтын бодлого</label>
                <input type="text" placeholder="Хязгаарлалтын код"
                  value={form.restriction_policy}
                  onChange={e => setForm(f => ({ ...f, restriction_policy: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Дансны мэдээлэл</label>
                <textarea rows={3} placeholder="Банкны нэр, дансны дугаар..."
                  value={form.bank_account_info}
                  onChange={e => setForm(f => ({ ...f, bank_account_info: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition resize-none" />
              </div>
              {saveMsg.text && (
                <p className={`text-xs ${saveMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{saveMsg.text}</p>
              )}
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-900 hover:bg-indigo-950 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-60">
                  {saving ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
                {policy && (
                  <button type="button" onClick={() => setEditing(false)}
                    className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-xl transition">
                    Болих
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
