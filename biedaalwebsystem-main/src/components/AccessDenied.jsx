export default function AccessDenied({
  title = 'Нэвтрэх эрх хүрэлцэхгүй байна',
  message = 'Таны эрх энэ хуудсыг нээхэд хүрэлцэхгүй байна.',
}) {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="max-w-md w-full rounded-3xl border border-red-100 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-500">
          !
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{message}</p>
      </div>
    </div>
  );
}
