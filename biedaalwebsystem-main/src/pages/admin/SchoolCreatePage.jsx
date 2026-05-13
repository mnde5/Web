import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { schoolAPI, schoolRequestAPI, extractItem } from '../../services/api';

export default function SchoolCreatePage() {
  const { school_id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!school_id;

  const [form, setForm] = useState({ name: '', picture: '', priority: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!school_id) return;
    schoolAPI.getOne(school_id).then((res) => {
      const s = extractItem(res);
      if (!s) return;
      setForm({
        name: s.name ?? '',
        picture: s.picture ?? '',
        priority: s.priority ?? '',
      });
    });
  }, [school_id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Сургуулийн нэр заавал оруулна уу.'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        ...(form.picture.trim() && { picture: form.picture.trim() }),
        ...(form.priority !== '' && { priority: String(form.priority) }),
      };
      if (isEdit) {
        await schoolAPI.update(school_id, body);
      } else {
        // 1) Хүсэлт үүсгэнэ
        const reqRes = await schoolRequestAPI.create(body);
        const req = extractItem(reqRes);
        // 2) Шууд approve хийнэ
        if (req?.id) await schoolRequestAPI.approve(req.id);
      }
      navigate('/schools');
    } catch (e) {
      setError(e.message ?? 'Алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link to="/schools" className="hover:text-slate-900">Сургуулиуд</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{isEdit ? 'Засах' : 'Сургууль нэмэх'}</span>
      </div>

      <div className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
          {isEdit ? 'Засах' : 'Шинэ сургууль'}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
          {isEdit ? 'Сургуулийн мэдээлэл засах' : 'Сургууль бүртгэх'}
        </h1>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Сургуулийн нэр *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              type="text"
              placeholder="Сургуулийн нэр"
              className="app-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Зургийн URL
            </label>
            <input
              value={form.picture}
              onChange={(e) => set('picture', e.target.value)}
              type="text"
              placeholder="https://..."
              className="app-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Эрэмбэ (priority)
            </label>
            <input
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
              type="number"
              min={0}
              placeholder="1"
              className="app-input"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="app-button-primary"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {saving ? 'Хадгалж байна...' : isEdit ? 'Өөрчлөлт хадгалах' : 'Сургууль бүртгэх'}
          </button>
          <Link to="/schools" className="app-button-secondary">
            Болих
          </Link>
        </div>
      </div>
    </div>
  );
}
