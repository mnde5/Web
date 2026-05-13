export default function ShutisLogo({
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  markClassName = '',
  showSubtitle = true,
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-[18px] bg-white shadow-[0_18px_42px_-24px_rgba(22,46,118,0.42)] ${markClassName}`}
      >
        <img src="/shutis-logo.svg" alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
      </div>

      <div className="min-w-0">
        <p className={`truncate text-sm font-black tracking-[0.22em] text-slate-900 ${titleClassName}`}>
          ШУТИС
        </p>
        {showSubtitle && (
          <p className={`truncate text-xs text-slate-500 ${subtitleClassName}`}>
            Шинжлэх Ухаан, Технологийн Их Сургууль
          </p>
        )}
      </div>
    </div>
  );
}
