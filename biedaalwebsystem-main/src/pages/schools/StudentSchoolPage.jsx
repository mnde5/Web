import { useEffect, useMemo, useState } from 'react';
import useTeam2User from '../../hooks/useTeam2User';
import { creditPriceAPI, extractItem, extractItems, parseCourseName, parseJsonFields, paymentAPI, paymentPolicyAPI, schoolAPI, userAPI } from '../../services/api';
import { getFallbackSchoolCourses, normalizeSchoolId, SHUTIS_SCHOOLS } from '../../data/shutisSchools';
import { DEFAULT_PRICE_PER_CREDIT } from '../../data/paymentDefaults';
import { getErrorMessage, getSchoolIds, getSchoolMemberships } from '../../utils/role';

const MAX_CREDITS = 21;
const PAYMENT_METHODS = [
  { value: 'qpay', apiValue: 'qpay', label: 'QPay', caption: 'QR нэхэмжлэх', prefix: 'QP' },
  { value: 'bank_app', apiValue: 'bank_transfer', label: 'Банк апп', caption: 'Аппаар шилжүүлэх', prefix: 'APP' },
  { value: 'bank_transfer', apiValue: 'bank_transfer', label: 'Данс', caption: 'Данс руу шилжүүлэх', prefix: 'BNK' },
];

function formatPrice(value) {
  const amount = parseMoney(value);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `${new Intl.NumberFormat('mn-MN').format(amount)}₮`;
}

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = raw.replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNestedObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeCourse(course, creditPrices = []) {
  const normalized = {
    ...parseNestedObject(course?.['{}course']),
    ...parseJsonFields(course),
  };
  const credits = parseMoney(
    normalized.credit ?? normalized.credits ?? normalized.credit_count ?? normalized.creditCount ?? 3,
  ) || 0;
  const levelId = normalized.level_id ?? normalized.course_level_id ?? normalized.courseLevelId ?? null;
  const directPrice = parseMoney(
    normalized.tuition_fee ??
    normalized.tuitionFee ??
    normalized.price ??
    normalized.payment_amount ??
    normalized.paymentAmount ??
    normalized.amount ??
    normalized.total_price ??
    normalized.totalPrice ??
    0,
  );
  const pricePerCredit = findCreditPrice(creditPrices, levelId);

  return {
    id: String(normalized.course_id ?? normalized.id ?? ''),
    school_id: String(normalized.school_id ?? ''),
    name: parseCourseName(normalized),
    description: normalized.description || normalized.focus || 'Энэ хичээлийн дэлгэрэнгүй мэдээлэл удахгүй нэмэгдэнэ.',
    credits,
    level_id: levelId,
    price: directPrice > 0 ? directPrice : credits * pricePerCredit,
    price_per_credit: pricePerCredit,
    start_on: normalized.start_on ?? '',
    end_on: normalized.end_on ?? '',
    priority: normalized.priority ?? 0,
    raw: normalized,
  };
}

function findCreditPrice(creditPrices, levelId) {
  if (!creditPrices.length) return DEFAULT_PRICE_PER_CREDIT;
  const currentYear = new Date().getFullYear();
  const byLevel = creditPrices.filter((item) => (
    levelId == null || String(item.level_id) === String(levelId)
  ));
  const candidates = byLevel.length ? byLevel : creditPrices;
  const exactYear = candidates.find((item) => parseMoney(item.effective_year) === currentYear);
  const latest = candidates
    .slice()
    .sort((a, b) => parseMoney(b.effective_year) - parseMoney(a.effective_year))[0];
  return parseMoney((exactYear ?? latest)?.price_per_credit) || DEFAULT_PRICE_PER_CREDIT;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = normalizeSchoolId(item?.id ?? item?.school_id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeSchool(school) {
  if (!school || typeof school !== 'object') return null;
  const id = normalizeSchoolId(school.id ?? school.school_id);
  if (!id) return null;
  return {
    ...school,
    id,
    name: school.name || school.school_name || 'Харьяа сургууль',
  };
}

function mergeAssignedSchools(memberships, apiSchools, allSchools) {
  const byId = new Map(allSchools.map((school) => [String(school.id), school]));
  const rawSchools = [...memberships, ...apiSchools]
    .map((school) => normalizeSchool(school))
    .filter(Boolean)
    .map((school) => ({ ...byId.get(String(school.id)), ...school }));
  return uniqueById(rawSchools);
}

function SchoolIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 7l9 4.5-9 4.5-9-4.5Z" />
      <path d="M5 12.5V17l7 3 7-3v-4.5" />
      <path d="M12 7V4" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h8.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function QPayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3" />
      <path d="M21 14v7h-7" />
      <path d="M17 17h4" />
    </svg>
  );
}

function BankAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M10 18h4" />
      <path d="M10 6h4" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10h18" />
      <path d="M5 10v8" />
      <path d="M9 10v8" />
      <path d="M15 10v8" />
      <path d="M19 10v8" />
      <path d="M3 18h18" />
      <path d="M12 3 3 8h18l-9-5Z" />
    </svg>
  );
}

function PaymentMethodIcon({ method }) {
  if (method === 'bank_app') return <BankAppIcon />;
  if (method === 'bank_transfer') return <BankIcon />;
  return <QPayIcon />;
}

export default function StudentSchoolPage() {
  const user = useTeam2User();
  const [schools, setSchools] = useState(SHUTIS_SCHOOLS);
  const [assignedSchools, setAssignedSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [courses, setCourses] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [purchasedDetails, setPurchasedDetails] = useState({});
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [savingCourseId, setSavingCourseId] = useState('');
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('qpay');
  const [paymentPolicy, setPaymentPolicy] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;

    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const [schoolPayload, userSchoolPayload] = await Promise.allSettled([
          schoolAPI.getAll(),
          user?.id ? userAPI.getSchools(user.id) : Promise.resolve({ items: [] }),
        ]);
        const apiSchools = schoolPayload.status === 'fulfilled' ? extractItems(schoolPayload.value) : [];
        const userSchools = userSchoolPayload.status === 'fulfilled' ? extractItems(userSchoolPayload.value) : [];
        const memberships = getSchoolMemberships(user);
        const membershipIds = getSchoolIds(user);
        const allSchools = apiSchools.length ? apiSchools : SHUTIS_SCHOOLS;
        const assigned = mergeAssignedSchools(memberships, userSchools, allSchools);
        const assignedWithIdOnly = membershipIds
          .filter((id) => !assigned.some((school) => String(school.id) === String(id)))
          .map((id) => normalizeSchool(allSchools.find((school) => String(school.id) === String(id)) || { id }));
        const nextAssignedSchools = uniqueById([...assigned, ...assignedWithIdOnly].filter(Boolean));

        if (!active) return;
        setSchools(allSchools);
        setAssignedSchools(nextAssignedSchools);
        setSelectedSchoolId(nextAssignedSchools[0]?.id || '');
      } catch {
        if (!active) return;
        const memberships = getSchoolMemberships(user);
        const assigned = mergeAssignedSchools(memberships, [], SHUTIS_SCHOOLS);
        setSchools(SHUTIS_SCHOOLS);
        setAssignedSchools(assigned);
        setSelectedSchoolId(assigned[0]?.id || '');
      } finally {
        if (active) setLoadingSchools(false);
      }
    };

    if (user?.id) loadSchools();
    return () => {
      active = false;
    };
  }, [user, user?.id]);

  useEffect(() => {
    let active = true;
    const schoolId = selectedSchoolId;

    const loadCourses = async () => {
      setLoadingCourses(true);
      setMessage('');
      try {
        const [coursePayload, creditPricePayload] = await Promise.all([
          schoolAPI.getCourses(schoolId),
          creditPriceAPI.getAll(schoolId).catch(() => ({ items: [] })),
        ]);
        const creditPrices = extractItems(creditPricePayload);
        const apiCourses = extractItems(coursePayload)
          .map((course) => normalizeCourse(course, creditPrices))
          .filter((course) => course.id)
          .sort((a, b) => Number(a.priority) - Number(b.priority));
        if (!active) return;
        setCourses(apiCourses.length ? apiCourses : getFallbackSchoolCourses(schoolId).map(normalizeCourse));
      } catch {
        if (active) setCourses(getFallbackSchoolCourses(schoolId).map(normalizeCourse));
      } finally {
        if (active) setLoadingCourses(false);
      }
    };

    if (schoolId) loadCourses();
    else setCourses([]);
    return () => {
      active = false;
    };
  }, [selectedSchoolId]);

  useEffect(() => {
    let active = true;
    setPaymentPolicy(null);

    if (!selectedSchoolId) return () => {
      active = false;
    };

    paymentPolicyAPI.get(selectedSchoolId)
      .then((payload) => {
        if (!active) return;
        setPaymentPolicy(extractItem(payload) ?? payload ?? null);
      })
      .catch(() => {
        if (active) setPaymentPolicy(null);
      });

    return () => {
      active = false;
    };
  }, [selectedSchoolId]);

  const selectedSchool = useMemo(
    () => assignedSchools.find((school) => String(school.id) === String(selectedSchoolId))
      || schools.find((school) => String(school.id) === String(selectedSchoolId))
      || null,
    [assignedSchools, schools, selectedSchoolId],
  );

  const selectedCourses = purchasedIds
    .map((id) => courses.find((course) => String(course.id) === String(id)) || purchasedDetails[id])
    .filter(Boolean);
  const totalPrice = selectedCourses.reduce((sum, course) => sum + parseMoney(course.price), 0);
  const selectedCredits = selectedCourses.reduce((sum, course) => sum + parseMoney(course.credits), 0);
  const remainingCredits = Math.max(MAX_CREDITS - selectedCredits, 0);
  const filteredCourses = courses.filter((course) => (
    `${course.name} ${course.description}`.toLowerCase().includes(query.trim().toLowerCase())
  ));
  const selectedPaymentMethod = PAYMENT_METHODS.find((method) => method.value === paymentMethod) ?? PAYMENT_METHODS[0];
  const bankAccountInfo = String(paymentPolicy?.bank_account_info ?? '').trim();

  const createPaymentRequest = async (paymentRecord) => {
    const minimalPayload = {
      amount: paymentRecord.amount,
      bank_receipt: paymentRecord.bank_receipt,
      payment_date: paymentRecord.payment_date,
      payment_type: paymentRecord.payment_type,
      status: paymentRecord.status,
    };
    const fullPayload = {
      ...minimalPayload,
      course_count: paymentRecord.course_count,
      credits: paymentRecord.credits,
      course_ids: paymentRecord.course_ids,
      courses: paymentRecord.courses,
    };

    try {
      return await paymentAPI.create(selectedSchoolId, user.id, fullPayload);
    } catch (firstError) {
      try {
        return await paymentAPI.create(selectedSchoolId, user.id, minimalPayload);
      } catch (retryError) {
        if (retryError?.message) throw retryError;
        throw firstError;
      }
    }
  };

  const handlePurchase = async (course) => {
    if (!user?.id) {
      setMessage('Хичээл авахын тулд эхлээд нэвтэрсэн байх шаардлагатай.');
      return;
    }

    const nextCreditTotal = selectedCredits + (Number(course.credits) || 0);
    if (nextCreditTotal > MAX_CREDITS) {
      setMessage(`Нийт ${MAX_CREDITS} кредитээс хэтэрч болохгүй. Танд ${remainingCredits} кредитийн зай үлдсэн байна.`);
      return;
    }

    setSavingCourseId(course.id);
    setMessage('');
    const nextIds = [...new Set([...purchasedIds, String(course.id)])];
    setPurchasedIds(nextIds);
    setPurchasedDetails((current) => ({
      ...current,
      [course.id]: {
        id: course.id,
        school_id: course.school_id,
        name: course.name,
        credits: course.credits,
        price: course.price,
        price_per_credit: course.price_per_credit,
      },
    }));
    setSavingCourseId('');
    setMessage(`${course.name} хичээл сонголтод нэмэгдлээ.`);
  };

  const handleRemoveCourse = (courseId) => {
    setPurchasedIds((current) => current.filter((id) => String(id) !== String(courseId)));
    setPurchasedDetails((current) => {
      const next = { ...current };
      delete next[courseId];
      return next;
    });
    setPaymentInvoice(null);
    setMessage('Хичээлийг сонголтоос хаслаа.');
  };

  const handleCreatePayment = async () => {
    if (!selectedCourses.length) {
      setMessage('Төлбөр үүсгэхийн өмнө хичээл сонгоно уу.');
      return;
    }

    if (!user?.id || !selectedSchoolId) {
      setMessage('Төлбөр үүсгэхийн тулд хэрэглэгч болон сургуулийн мэдээлэл шаардлагатай.');
      return;
    }

    if (totalPrice <= 0) {
      setMessage('Сонгосон хичээлийн төлбөр 0₮ байна. Хичээлийн үнэ ачаалагдсаны дараа дахин оролдоно уу.');
      return;
    }

    const invoice = {
      id: `${selectedPaymentMethod.prefix}-${Date.now().toString().slice(-6)}`,
      amount: totalPrice,
      courseCount: selectedCourses.length,
      credits: selectedCredits,
      method: selectedPaymentMethod.value,
      methodLabel: selectedPaymentMethod.label,
    };

    setCreatingPayment(true);
    setPaymentInvoice(invoice);
    const paymentRecord = {
      amount: invoice.amount,
      bank_receipt: invoice.id,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_type: selectedPaymentMethod.apiValue,
      requested_payment_method: selectedPaymentMethod.value,
      status: 'pending',
      school_id: selectedSchoolId,
      user_id: user.id,
      course_count: invoice.courseCount,
      credits: invoice.credits,
      course_ids: selectedCourses.map((course) => course.id),
      courses: selectedCourses.map((course) => ({
        id: course.id,
        name: course.name,
        credits: course.credits,
        price: course.price,
      })),
    };

    try {
      await createPaymentRequest(paymentRecord);
      setMessage(`${selectedPaymentMethod.label} төлбөрийн хүсэлт үүслээ. Төлбөрийн түүх дээр хүлээгдэж буй төлбөрөөр бүртгэгдэнэ.`);
    } catch (error) {
      setPaymentInvoice(null);
      setMessage(getErrorMessage(error, 'Төлбөрийн API дээр бүртгэж чадсангүй. Дахин оролдоно уу.'));
    } finally {
      setCreatingPayment(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="app-panel overflow-hidden px-0 py-0">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="app-kicker bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">Хичээл сонголтын систем</div>
              <h1 className="mt-4 app-page-title">{selectedSchool?.name || 'Харьяа сургууль'}</h1>
              <p className="app-page-subtitle">
                Оюутан зөвхөн өөрийн харьяа сургуулийн нээлттэй хичээлүүдээс сонголт хийнэ.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="app-surface-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Хичээл</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedCourses.length}</p>
              </div>
              <div className="app-surface-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Кредит</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedCredits}/{MAX_CREDITS}</p>
              </div>
              <div className="app-surface-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Төлбөр</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatPrice(totalPrice)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 px-6 py-4 text-sm font-semibold text-slate-500 md:grid-cols-3">
          <div>
            <span className="text-[#1f3b8f]">1. Сургууль</span>
            <span className="ml-2 text-slate-400">харьяа нэгж</span>
          </div>
          <div>
            <span className="text-[#1f3b8f]">2. Хичээл</span>
            <span className="ml-2 text-slate-400">21 кредит хүртэл сонгох</span>
          </div>
          <div>
            <span className="text-[#1f3b8f]">3. Төлбөр</span>
            <span className="ml-2 text-slate-400">QPay нэхэмжлэх үүсгэх</span>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-[22px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium leading-6 text-sky-800">
          {message}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="app-panel px-4 py-4">
          <div className="flex items-center justify-between gap-3 px-2">
            <div>
              <p className="text-sm font-bold text-slate-900">Харьяа сургууль</p>
              <p className="mt-1 text-xs text-slate-500">{loadingSchools ? 'Ачааллаж байна...' : 'Админаас оноосон'}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">
              <SchoolIcon />
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {assignedSchools.length === 0 ? (
              <div className="rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                Таны харьяа сургуулийн мэдээлэл бүртгэгдээгүй байна.
              </div>
            ) : (
              assignedSchools.map((school) => (
                <button
                  type="button"
                  key={school.id}
                  onClick={() => {
                    setSelectedSchoolId(school.id);
                    setPaymentInvoice(null);
                    setMessage('');
                  }}
                  className={`rounded-[22px] px-4 py-3 ${
                    String(school.id) === String(selectedSchoolId)
                      ? 'bg-[linear-gradient(180deg,#1f3b8f_0%,#162e76_100%)] text-white shadow-[0_22px_44px_-28px_rgba(22,46,118,0.88)]'
                      : 'bg-slate-50 text-slate-700'
                  } text-left transition hover:bg-slate-100`}
                >
                  <span className="block text-sm font-bold">{school.code || school.shortName || 'ШУТИС'}</span>
                  <span className={`mt-1 block text-xs leading-5 ${String(school.id) === String(selectedSchoolId) ? 'text-white/74' : 'text-slate-500'}`}>
                    {school.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="app-panel px-6 py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Хичээл сонголт</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {selectedSchool?.focus || 'Тухайн сургуулийн идэвхтэй хичээлүүд'}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Хичээл хайх"
                  className="h-11 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1f3b8f] sm:w-64"
                />
                <span className="app-chip bg-slate-100 text-slate-600">{loadingCourses ? 'Ачааллаж байна' : `${filteredCourses.length} хичээл`}</span>
              </div>
            </div>
          </div>

          {loadingCourses ? (
            <div className="app-empty">Хичээлүүдийг ачааллаж байна...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="app-empty">Энэ сургууль дээр сонгох хичээл одоогоор алга.</div>
          ) : (
            <div className="grid gap-4">
              {filteredCourses.map((course) => {
                const purchased = purchasedIds.includes(String(course.id));
                return (
                  <article key={course.id} className="app-panel px-5 py-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_120px_140px_150px] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="app-chip bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]">{course.credits} кредит</span>
                          {course.start_on && <span className="app-chip bg-slate-100 text-slate-600">{course.start_on}</span>}
                        </div>
                        <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">{course.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{course.description}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Код</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{course.id}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Төлбөр</p>
                        <p className="mt-1 text-sm font-black text-slate-900">
                          {formatPrice(course.price)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={purchased || savingCourseId === course.id}
                        onClick={() => handlePurchase(course)}
                        className={`inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition ${
                          purchased
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-[#1f3b8f] text-white hover:bg-[#162e76] disabled:opacity-70'
                        }`}
                      >
                        <CartIcon />
                        {purchased ? 'Сонгосон' : savingCourseId === course.id ? 'Хадгалж байна' : 'Сонгох'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="app-panel px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Сонголтын тойм</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Дээд хязгаар {MAX_CREDITS} кредит. Үлдсэн боломж: {remainingCredits} кредит.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreatePayment}
                disabled={!selectedCourses.length || creatingPayment}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#1f3b8f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#162e76] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                <PaymentMethodIcon method={paymentMethod} />
                {creatingPayment ? 'Үүсгэж байна' : 'Төлбөр төлөх'}
              </button>
            </div>

            {selectedCourses.length === 0 ? (
              <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Сонгосон хичээл байхгүй.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-100">
                <div className="hidden grid-cols-[minmax(0,1fr)_90px_130px_90px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:grid">
                  <span>Хичээл</span>
                  <span>Кредит</span>
                  <span>Төлбөр</span>
                  <span className="text-right">Үйлдэл</span>
                </div>
                {selectedCourses.map((course) => (
                  <div key={course.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_90px_130px_90px] sm:items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{course.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{course.id}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{course.credits}</p>
                    <p className="text-sm font-semibold text-slate-900">{formatPrice(course.price)}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(course.id)}
                      className="justify-self-start rounded-[14px] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 sm:justify-self-end"
                    >
                      Хасах
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Төлбөрийн хэлбэр</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {PAYMENT_METHODS.map((method) => {
                  const selected = method.value === paymentMethod;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method.value);
                        setPaymentInvoice(null);
                      }}
                      className={`flex min-h-[86px] items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
                        selected
                          ? 'border-[#1f3b8f] bg-[rgba(31,59,143,0.08)] text-[#1f3b8f]'
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ${
                        selected ? 'bg-[#1f3b8f] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <PaymentMethodIcon method={method.value} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black">{method.label}</span>
                        <span className={`mt-1 block text-xs font-semibold ${selected ? 'text-[#1f3b8f]/70' : 'text-slate-400'}`}>
                          {method.caption}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {paymentMethod !== 'qpay' && (
              <div className="mt-5 rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Дансны мэдээлэл</p>
                <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-700">
                  {bankAccountInfo || 'Дансны мэдээлэл тохируулаагүй байна. Сургуулийн админ төлбөрийн бодлого дээр дансны мэдээлэл нэмнэ.'}
                </p>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-slate-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Нийт кредит</p>
                <p className="mt-2 text-xl font-black text-slate-900">{selectedCredits}/{MAX_CREDITS}</p>
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Хичээлийн тоо</p>
                <p className="mt-2 text-xl font-black text-slate-900">{selectedCourses.length}</p>
              </div>
              <div className="rounded-[18px] border border-slate-100 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Нийт төлбөр</p>
                <p className="mt-2 text-xl font-black text-slate-900">{formatPrice(totalPrice)}</p>
              </div>
            </div>

            {paymentInvoice && (
              <div className="mt-5 grid gap-4 rounded-[22px] border border-slate-200 bg-white px-5 py-5 lg:grid-cols-[150px_minmax(0,1fr)]">
                <div className="flex aspect-square items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[#1f3b8f]">
                  {paymentInvoice.method === 'qpay' ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={index} className={`h-8 w-8 rounded-md ${index % 2 === 0 ? 'bg-[#1f3b8f]' : 'bg-white'}`} />
                      ))}
                    </div>
                  ) : (
                    <PaymentMethodIcon method={paymentInvoice.method} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{paymentInvoice.methodLabel}</p>
                  <h3 className="mt-2 text-lg font-black text-slate-900">Нэхэмжлэх #{paymentInvoice.id}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {paymentInvoice.courseCount} хичээл, {paymentInvoice.credits} кредитийн нийт төлбөр {formatPrice(paymentInvoice.amount)}.
                  </p>
                  {paymentInvoice.method !== 'qpay' && bankAccountInfo && (
                    <p className="mt-3 whitespace-pre-line rounded-[16px] bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
                      {bankAccountInfo}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="app-chip bg-emerald-50 text-emerald-700">Төлбөр хүлээгдэж байна</span>
                    <span className="app-chip bg-slate-100 text-slate-600">{paymentInvoice.methodLabel}</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
