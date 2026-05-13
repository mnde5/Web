import { useState } from 'react';

const MOCK = [
  { id: 1, read: false, type: 'grade', title: 'Оноо шинэчлэгдлээ', body: 'Лаборатори №3 даалгаврын үнэлгээ журнал дээр орлоо.', time: '2 цагийн өмнө' },
  { id: 2, read: false, type: 'assignment', title: 'Шинэ даалгавар нээгдлээ', body: 'Веб систем ба технологи хичээлийн шинэ материал нэмэгдсэн байна.', time: 'Өчигдөр' },
  { id: 3, read: true, type: 'deadline', title: 'Хугацааны сануулга', body: 'Үүлэн тооцоолол хичээлийн даалгаврын хугацаа 2 хоногийн дараа дуусна.', time: '2 өдрийн өмнө' },
  { id: 4, read: true, type: 'comment', title: 'Багш тайлбар үлдээлээ', body: 'Илгээлтийн агуулгыг дахин нягтлах зөвлөмж ирсэн байна.', time: '3 өдрийн өмнө' },
];

function NotificationIcon({ type }) {
  if (type === 'grade') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h4l2.5 7 4.5-14 2.5 7H20" />
      </svg>
    );
  }

  if (type === 'assignment') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  }

  if (type === 'deadline') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function tone(type, read) {
  if (read) return 'bg-slate-100 text-slate-500';
  if (type === 'grade') return 'bg-emerald-50 text-emerald-700';
  if (type === 'assignment') return 'bg-sky-50 text-sky-700';
  if (type === 'deadline') return 'bg-amber-50 text-amber-700';
  return 'bg-indigo-50 text-indigo-700';
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK);

  const markRead = (id) => setNotifs((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
  const markAll = () => setNotifs((items) => items.map((item) => ({ ...item, read: true })));

  return (
    <div className="space-y-5">
      <section className="app-panel px-6 py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Мэдэгдэл</div>
            <h1 className="mt-4 app-page-title">Системийн мэдэгдэл</h1>
            <p className="app-page-subtitle">Шинэ даалгавар, үнэлгээ, хугацааны сануулга, багшийн тайлбарууд энд төвлөрнө.</p>
          </div>
          <button onClick={markAll} className="app-button-secondary">
            Бүгдийг уншсан болгох
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {notifs.length === 0 ? (
          <div className="app-empty">Шинэ мэдэгдэл алга байна.</div>
        ) : notifs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`app-panel flex w-full items-start gap-4 px-5 py-5 text-left transition hover:-translate-y-0.5 ${item.read ? '' : 'ring-1 ring-[rgba(31,59,143,0.08)]'}`}
            onClick={() => markRead(item.id)}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${tone(item.type, item.read)}`}>
              <NotificationIcon type={item.type} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-400">{item.time}</span>
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-500">{item.body}</span>
            </span>
            {!item.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1f3b8f]" />}
          </button>
        ))}
      </section>
    </div>
  );
}
