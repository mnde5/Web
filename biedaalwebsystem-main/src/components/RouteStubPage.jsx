export default function RouteStubPage({ title = 'Тун удахгүй', summary = '' }) {
  return (
    <div className="app-panel mx-auto max-w-4xl px-8 py-8">
      <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Тун удахгүй</div>
      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{title}</h1>
      {summary && <p className="mt-4 text-sm leading-7 text-slate-500">{summary}</p>}
    </div>
  );
}
