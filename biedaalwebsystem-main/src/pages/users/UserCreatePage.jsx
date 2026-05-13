import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { userAPI, extractItem } from '../../services/api';

export default function UserCreatePage() {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!user_id;

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user_id) return;
    userAPI.getOne(user_id).then((res) => {
      const u = extractItem(res);
      if (!u) return;
      setForm({
        first_name: u.first_name ?? '',
        last_name: u.last_name ?? '',
        username: u.username ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        password: '',
      });
    });
  }, [user_id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setError('Нэр, овог, и-мэйл заавал оруулна уу.');
      return;
    }
    if (!isEdit && !form.username) {
      setError('Username заавал оруулна уу.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await userAPI.update(user_id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
        });
      } else {
        await userAPI.create({
          first_name: form.first_name,
          last_name: form.last_name,
          username: form.username,
          email: form.email,
          ...(form.phone.trim() && { phone: form.phone.trim() }),
          password: form.password || '123',
        });
      }
      navigate('/users');
    } catch (e) {
      setError(e.message ?? 'Алдаа гарлаа.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link to="/users" className="hover:text-slate-900">Хэрэглэгчид</Link>
        <span>›</span>
        <span className="font-medium text-slate-700">{isEdit ? 'Засах' : 'Хэрэглэгч нэмэх'}</span>
      </div>

      <div className="app-panel px-6 py-7">
        <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
          {isEdit ? 'Засах' : 'Шинэ хэрэглэгч'}
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
          {isEdit ? 'Хэрэглэгч засах' : 'Хэрэглэгч нэмэх'}
        </h1>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Нэр *
              </label>
              <input
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                type="text"
                placeholder="Нэр"
                className="app-input"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Овог *
              </label>
              <input
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                type="text"
                placeholder="Овог"
                className="app-input"
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Username *
              </label>
              <input
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                type="text"
                placeholder="Username оруулна уу"
                className="app-input"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              И-мэйл *
            </label>
            <input
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              type="email"
              placeholder="И-мэйл хаяг"
              className="app-input"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Утас
            </label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              type="text"
              placeholder="99001234"
              className="app-input"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Нууц үг
              </label>
              <input
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                type="password"
                placeholder="Хоосон үлдээвэл '123' болно"
                className="app-input"
              />
            </div>
          )}
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
            {saving ? 'Хадгалж байна...' : isEdit ? 'Өөрчлөлт хадгалах' : 'Хэрэглэгч нэмэх'}
          </button>
          <Link to="/users" className="app-button-secondary">Болих</Link>
        </div>
      </div>
    </div>
  );
}
