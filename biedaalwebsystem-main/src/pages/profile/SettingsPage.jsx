import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession } from '../../services/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState({
    grade: true,
    assignment: true,
    deadline: true,
    comment: false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (id) => setToggles((current) => ({ ...current, [id]: !current[id] }));

  const handleLogout = () => {
    clearSession({ clearProfile: true });
    navigate('/login', { replace: true });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const notifItems = [
    ['Оноо шинэчлэгдэх үед мэдэгдэх', 'grade'],
    ['Шинэ даалгавар нээгдэх үед мэдэгдэх', 'assignment'],
    ['Хугацааны сануулга илгээх', 'deadline'],
    ['Багшийн тайлбар ирэхэд мэдэгдэх', 'comment'],
  ];

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Тохиргоо</div>
            <h1 className="mt-4 app-page-title">Хэрэглэгчийн тохиргоо</h1>
            <p className="app-page-subtitle">Мэдэгдэл, хэл, харагдах байдал болон системийн хувийн тохиргоог энд удирдана.</p>
          </div>
          <button type="button" onClick={handleSave} className="app-button-primary">
            Хадгалах
          </button>
        </div>
      </section>

      {saved && (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Тохиргоо амжилттай хадгалагдлаа.
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="app-panel px-6 py-6">
            <h2 className="app-section-title">Мэдэгдлийн тохиргоо</h2>
            <p className="app-section-note">Ямар төрлийн мэдээллийг шууд авахыг сонгоно.</p>

            <div className="mt-5 space-y-3">
              {notifItems.map(([label, id]) => (
                <div key={id} className="app-surface-muted flex items-center justify-between gap-4 px-4 py-4">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${toggles[id] ? 'bg-[#1f3b8f]' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${toggles[id] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="app-panel px-6 py-6">
            <h2 className="app-section-title">Харагдах байдал</h2>
            <p className="app-section-note">Интерфэйсийн үндсэн сонголтууд.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Хэл</label>
                <select className="app-select">
                  <option>Монгол</option>
                  <option>English</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Нэг хуудсанд харах тоо</label>
                <select className="app-select">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="app-panel px-6 py-6">
            <h2 className="app-section-title">Аюулгүй байдал</h2>
            <p className="app-section-note">Нэвтрэлт болон хэрэглэгчийн орчны талаарх санамж.</p>

            <div className="mt-5 space-y-3">
              <div className="app-surface-muted px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Хэрэглэгчийн эрх</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Таны эрхээс шалтгаалж зарим цэс болон үйлдэл өөрчлөгдөнө.</p>
              </div>
              <div className="app-surface-muted px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Мэдэгдэл</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Шинэ даалгавар, үнэлгээ, тайлбараа тогтмол шалгаж хэвшээрэй.</p>
              </div>
            </div>
          </div>

          <div className="app-panel border-red-200 px-6 py-6">
            <h2 className="text-lg font-black tracking-tight text-red-700">Системээс гарах</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Энэ төхөөрөмжөөс гарах бол доорх товчийг ашиглана.</p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Системээс гарах уу?')) handleLogout();
              }}
              className="mt-5 inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Гарах
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
