import { Link } from 'react-router-dom';
import useTeam2Role from '../hooks/useTeam2Role';
import { getRoleLabel } from '../utils/role';

export default function RequireAccess({
  allow,
  title = 'Хандах эрхгүй',
  summary = 'Таны одоогийн эрхээр энэ хуудас руу нэвтрэх боломжгүй байна.',
  children,
}) {
  const role = useTeam2Role();

  if (allow(role)) return children;

  return (
    <div className="app-panel mx-auto max-w-4xl overflow-hidden px-8 py-8">
      <div className="app-kicker bg-red-100 text-red-700">Хандах эрхгүй</div>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">{summary}</p>
        </div>
        <div className="rounded-[24px] border border-red-100 bg-red-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Таны эрх</p>
          <p className="mt-2 text-sm font-bold text-red-700">{getRoleLabel(role)}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm font-semibold text-slate-900">Яагаад энэ хуудас хаалттай вэ?</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Таны нэвтэрсэн эрх энэ хэсгийг ашиглах боломжгүй тул мэдээлэлтэй сануулга дэлгэц харуулж байна.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Дараагийн алхам</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Зөв эрхтэй хэрэглэгчээр дахин нэвтрэх эсвэл нээлттэй хэсэг рүү буцаж үргэлжлүүлнэ.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/"
          className="app-button-primary"
        >
          Нүүр хуудас
        </Link>
        <Link
          to="/courses"
          className="app-button-secondary"
        >
          Хичээлүүд
        </Link>
      </div>
    </div>
  );
}
