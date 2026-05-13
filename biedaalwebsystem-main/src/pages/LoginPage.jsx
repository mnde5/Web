import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ShutisLogo from '../components/ShutisLogo';
import { authAPI, extractAuthTokens, formatApiError, loginAPI, saveSession } from '../services/api';
import { syncRole } from '../utils/role';

const TEST_USERS = [
  ['Системийн админ', 'admin@must.edu.mn'],
  ['Сургуулийн админ', 'danton@gmail.com'],
  ['Сургуулийн багш', 'tezher2@must.edu.mn'],
  ['Сургуулийн оюутан', 'schoolstudent@must.edu.mn'],
];

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export default function LoginPage({ initialTab = 'login' }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [reg, setReg] = useState({
    last_name: '',
    first_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    password2: '',
  });

  const fillLogin = (value) => {
    setEmail(value);
    setPassword('123');
    setTab('login');
  };

  const doLogin = async () => {
    if (!email || !password) {
      setMsg({ text: 'Нэвтрэх и-мэйл болон нууц үгээ оруулна уу.', ok: false });
      return;
    }

    setLoading(true);
    setMsg({ text: '', ok: true });

    try {
      const data = await loginAPI.email({ email, password });
      const { accessToken, refreshToken } = extractAuthTokens(data);
      if (!accessToken) {
        setMsg({ text: formatApiError(data, 'Нэвтрэх токен олдсонгүй.'), ok: false });
        return;
      }

      saveSession({ accessToken, refreshToken });
      await syncRole();
      navigate('/');
    } catch {
      setMsg({ text: 'Сервертэй холбогдож чадсангүй.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const doRegister = async () => {
    if (!reg.last_name || !reg.first_name || !reg.email || !reg.password || !reg.password2) {
      setMsg({ text: 'Заавал бөглөх талбаруудаа гүйцээнэ үү.', ok: false });
      return;
    }
    if (reg.password !== reg.password2) {
      setMsg({ text: 'Нууц үг хоорондоо таарахгүй байна.', ok: false });
      return;
    }

    setLoading(true);
    setMsg({ text: '', ok: true });

    try {
      await authAPI.register({
        last_name: reg.last_name.trim(),
        first_name: reg.first_name.trim(),
        username: reg.username.trim(),
        email: reg.email.trim(),
        phone: reg.phone.trim(),
        password: reg.password,
      });

      setMsg({ text: 'Бүртгэлийн хүсэлт амжилттай илгээгдлээ. Одоо нэвтрэх эсвэл админаар баталгаажуулна уу.', ok: true });
      setTab('login');
      setEmail(reg.email.trim());
      setPassword('');
      setReg({
        last_name: '',
        first_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        password2: '',
      });
    } catch (error) {
      setMsg({ text: formatApiError(error?.response?.data, error?.message || 'Бүртгүүлэх үед алдаа гарлаа.'), ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1180px] items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="app-panel overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
            <ShutisLogo />
            <div className="mt-6 max-w-xl">
              <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Сургалтын нэгдсэн портал</div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Хичээл, даалгавар, дүнгээ
                <span className="block text-[#1f3b8f]">нэг дороос удирдана</span>
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                Оюутан, багш, админ хэрэглэгчид хичээлийн мэдээлэл, илгээлт, үнэлгээ, мэдэгдлээ нэг интерфэйсээс ашиглана.
              </p>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                ['Даалгавар', 'Илгээлт илгээх, шалгах урсгал'],
                ['Үнэлгээ', 'Журнал, оноо, ахицын тойм'],
                ['Мэдэгдэл', 'Шинэ материал, хугацааны сануулга'],
              ].map(([title, note]) => (
                <div key={title} className="app-panel-soft px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
                    <CheckIcon />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="app-surface-muted px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хичээлийн жил</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">2025-2026 оны хаврын улирал</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Responsive, role-based интерфэйсээр бүх төхөөрөмж дээр ашиглана.</p>
              </div>
              <div className="app-surface-muted px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Туршилтын хэрэглэгч</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">4 өөр эрхээр нэвтэрч шалгана</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Нууц үг бүгдэд нь ижил: <span className="font-semibold text-slate-700">123</span></p>
              </div>
            </div>
          </section>

          <section className="app-panel px-6 py-7 sm:px-8 sm:py-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Нэвтрэх хэсэг</p>
                <p className="mt-1 text-xs text-slate-500">Өөрийн эрхээр систем рүү орно.</p>
              </div>
              <div className="inline-flex rounded-[20px] bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                    tab === 'login' ? 'bg-white text-[#1f3b8f] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Нэвтрэх
                </button>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                    tab === 'register' ? 'bg-white text-[#1f3b8f] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Эрх хүсэх
                </button>
              </div>
            </div>

            {msg.text && (
              <div
                className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
                  msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {msg.text}
              </div>
            )}

            {tab === 'login' ? (
              <>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">И-мэйл</label>
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="text"
                      placeholder="name@must.edu.mn"
                      className="app-input"
                      onKeyDown={(event) => event.key === 'Enter' && doLogin()}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нууц үг</label>
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      placeholder="Нууц үгээ оруулна уу"
                      className="app-input"
                      onKeyDown={(event) => event.key === 'Enter' && doLogin()}
                    />
                  </div>

                  <button type="button" onClick={doLogin} disabled={loading} className="app-button-primary mt-2 w-full">
                    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {loading ? 'Нэвтэрч байна...' : 'Систем рүү нэвтрэх'}
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <Link to="/forgot-password" className="font-medium text-[#1f3b8f] transition hover:text-[#162e76]">
                      Нууц үг мартсан уу?
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTab('register')}
                      className="font-medium text-slate-500 transition hover:text-slate-900"
                    >
                      Шинэ хэрэглэгчийн эрх хүсэх
                    </button>
                  </div>
                </div>

                <div className="app-panel-soft mt-6 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Туршилтын хэрэглэгчид</p>
                      <p className="text-xs text-slate-400">Нэг дарж автоматаар бөглөж болно.</p>
                    </div>
                    <span className="app-chip bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">4 эрх</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {TEST_USERS.map(([label, value]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => fillLogin(value)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[rgba(31,59,143,0.2)] hover:shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
                          <p className="mt-1 truncate text-xs text-slate-400">{value}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#1f3b8f]">Сонгох</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                  Энэ демо орчинд шинэ хэрэглэгчийг сургуулийн админ бүртгэнэ. Доорх мэдээллээ бөглөж эрх хүсэх загварыг ашиглаж болно.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={reg.last_name}
                    onChange={(event) => setReg({ ...reg, last_name: event.target.value })}
                    placeholder="Овог"
                    className="app-input"
                  />
                  <input
                    value={reg.first_name}
                    onChange={(event) => setReg({ ...reg, first_name: event.target.value })}
                    placeholder="Нэр"
                    className="app-input"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={reg.username}
                    onChange={(event) => setReg({ ...reg, username: event.target.value })}
                    placeholder="Хэрэглэгчийн нэр"
                    className="app-input"
                  />
                  <input
                    value={reg.phone}
                    onChange={(event) => setReg({ ...reg, phone: event.target.value })}
                    placeholder="Утасны дугаар"
                    className="app-input"
                  />
                </div>

                <input
                  value={reg.email}
                  onChange={(event) => setReg({ ...reg, email: event.target.value })}
                  type="email"
                  placeholder="И-мэйл"
                  className="app-input"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    value={reg.password}
                    onChange={(event) => setReg({ ...reg, password: event.target.value })}
                    type="password"
                    placeholder="Нууц үг"
                    className="app-input"
                  />
                  <input
                    value={reg.password2}
                    onChange={(event) => setReg({ ...reg, password2: event.target.value })}
                    type="password"
                    placeholder="Нууц үг давтах"
                    className="app-input"
                  />
                </div>

                <button type="button" onClick={doRegister} disabled={loading} className="app-button-primary w-full">
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {loading ? 'Илгээж байна...' : 'Эрхийн хүсэлт илгээх'}
                </button>

                <button type="button" onClick={() => setTab('login')} className="app-button-secondary w-full">
                  Нэвтрэх хэсэг рүү буцах
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
