import { useEffect, useState } from 'react';
import useTeam2Role from '../../hooks/useTeam2Role';
import { userAPI, extractItem } from '../../services/api';
import { getRoleLabel } from '../../utils/role';

export default function ProfilePage() {
  const role = useTeam2Role();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });

  useEffect(() => {
    userAPI.getMe()
      .then((response) => setProfile(extractItem(response)))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePw = async () => {
    if (!pwOld || !pwNew || !pwConfirm) {
      setMsg({ text: 'Бүх талбарыг бөглөнө үү.', ok: false });
      return;
    }
    if (pwNew !== pwConfirm) {
      setMsg({ text: 'Шинэ нууц үг хоорондоо таарахгүй байна.', ok: false });
      return;
    }

    try {
      await userAPI.changePassword({ password: pwOld, new_password: pwNew });
      setMsg({ text: 'Нууц үг амжилттай шинэчлэгдлээ.', ok: true });
      setPwOld('');
      setPwNew('');
      setPwConfirm('');
    } catch (error) {
      setMsg({ text: error.message ?? 'Нууц үг шинэчлэх үед алдаа гарлаа.', ok: false });
    }
  };

  if (loading) return <div className="app-empty">Мэдээлэл ачааллаж байна...</div>;
  if (!profile) return <div className="app-empty">Профайлын мэдээллийг ачаалж чадсангүй.</div>;

  const initials = `${profile.last_name?.[0] ?? ''}${profile.first_name?.[0] ?? ''}`.toUpperCase() || 'А';
  const fullName = `${profile.last_name ?? ''} ${profile.first_name ?? ''}`.trim() || 'Хэрэглэгч';

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#1f3b8f_0%,#162e76_100%)] text-3xl font-black text-white shadow-[0_24px_48px_-28px_rgba(22,46,118,0.92)]">
              {initials}
            </div>
            <div>
              <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">{getRoleLabel(role)}</div>
              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{fullName}</h1>
              <p className="mt-2 text-sm text-slate-500">{profile.email ?? 'И-мэйл бүртгэгдээгүй'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хэрэглэгчийн нэр</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{profile.username ?? '—'}</p>
            </div>
            <div className="app-surface-muted px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Эрх</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{getRoleLabel(role)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="app-panel px-6 py-6">
          <h2 className="app-section-title">Хувийн мэдээлэл</h2>
          <p className="app-section-note">Профайлд бүртгэгдсэн үндсэн мэдээлэл.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['Нэр', profile.first_name],
              ['Овог', profile.last_name],
              ['Ургийн овог', profile.family_name],
              ['И-мэйл', profile.email],
              ['Хэрэглэгчийн нэр', profile.username],
              ['Эрх', getRoleLabel(role)],
            ].map(([label, value]) => (
              <div key={label} className="app-surface-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="app-panel px-6 py-6">
          <h2 className="app-section-title">Нууц үг шинэчлэх</h2>
          <p className="app-section-note">Хэрэглэгчийн бүртгэлээ аюулгүй байлгахын тулд нууц үгээ шинэчилж болно.</p>

          {msg.text && (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {msg.text}
            </div>
          )}

          <div className="mt-5 space-y-3">
            <input
              type="password"
              value={pwOld}
              onChange={(event) => setPwOld(event.target.value)}
              placeholder="Одоогийн нууц үг"
              className="app-input"
            />
            <input
              type="password"
              value={pwNew}
              onChange={(event) => setPwNew(event.target.value)}
              placeholder="Шинэ нууц үг"
              className="app-input"
            />
            <input
              type="password"
              value={pwConfirm}
              onChange={(event) => setPwConfirm(event.target.value)}
              placeholder="Шинэ нууц үг давтах"
              className="app-input"
            />
          </div>

          <button type="button" onClick={handleChangePw} className="app-button-primary mt-5">
            Шинэчлэх
          </button>
        </div>
      </section>
    </div>
  );
}
