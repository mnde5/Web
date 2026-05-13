import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AccessDenied from '../../components/AccessDenied';
import useTeam2Role from '../../hooks/useTeam2Role';
import useTeam2User from '../../hooks/useTeam2User';
import { courseAPI, extractItem, extractItems, lessonAPI, lessonTypeAPI, parseCourseName } from '../../services/api';
import { canAccessLesson, getErrorMessage } from '../../utils/role';

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

export default function LessonCreatePage() {
  const navigate = useNavigate();
  const role = useTeam2Role();
  const user = useTeam2User();
  const { course_id: paramCourseId, lesson_id } = useParams();
  const isEdit = !!lesson_id;

  const [courses, setCourses] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    courseId: paramCourseId ?? '',
    typeId: '',
    name: '',
    content: '',
    point: '',
    priority: '',
    openOn: '',
    closeOn: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      setAccessDenied(false);

      try {
        const [coursePayload, typePayload] = await Promise.all([
          courseAPI.getVisible(role, user),
          lessonTypeAPI.getAll(),
        ]);

        const visibleCourses = extractItems(coursePayload).map((course) => ({
          id: course.course_id ?? course.id,
          name: parseCourseName(course),
        }));
        const accessibleCourseIds = visibleCourses.map((course) => String(course.id));
        const lessonTypes = extractItems(typePayload);

        if (!mounted) return;

        setCourses(visibleCourses);
        setTypes(lessonTypes);

        if (isEdit) {
          const lessonPayload = await lessonAPI.getOne(lesson_id);
          const lesson = extractItem(lessonPayload);

          if (!canAccessLesson(role, lesson, accessibleCourseIds)) {
            if (mounted) setAccessDenied(true);
            return;
          }

          if (!mounted) return;

          setForm({
            courseId: String(lesson?.course_id ?? ''),
            typeId: String(lesson?.type_id ?? lessonTypes[0]?.id ?? ''),
            name: lesson?.name ?? '',
            content: lesson?.content ?? '',
            point: lesson?.point != null ? String(lesson.point) : '',
            priority: lesson?.priority != null ? String(lesson.priority) : '',
            openOn: toDateTimeLocal(lesson?.open_on),
            closeOn: toDateTimeLocal(lesson?.close_on),
          });
          return;
        }

        const nextCourseId = paramCourseId && accessibleCourseIds.some((id) => String(id) === String(paramCourseId))
          ? String(paramCourseId)
          : '';

        if (paramCourseId && !nextCourseId) {
          setAccessDenied(true);
          return;
        }

        setForm((current) => ({
          ...current,
          courseId: current.courseId && accessibleCourseIds.some((id) => String(id) === String(current.courseId))
            ? current.courseId
            : nextCourseId,
          typeId: current.typeId || String(lessonTypes[0]?.id || ''),
          priority: current.priority || '',
        }));
      } catch (err) {
        if (mounted) setError(getErrorMessage(err, 'Мэдээлэл ачааллахад алдаа гарлаа.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [isEdit, lesson_id, paramCourseId, role, user]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.courseId) {
      setError('Хичээл сонгоно уу.');
      return;
    }
    if (!form.name.trim()) {
      setError('Даалгаврын нэр оруулна уу.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        content: form.content.trim(),
        has_submission: 1,
        ...(form.typeId ? { type_id: Number(form.typeId) } : {}),
        ...(form.point !== '' ? { point: Number(form.point) } : {}),
        ...(form.priority !== '' ? { priority: Number(form.priority) } : {}),
        ...(form.openOn ? { open_on: form.openOn } : {}),
        ...(form.closeOn ? { close_on: form.closeOn } : {}),
      };

      if (isEdit) {
        await lessonAPI.update(lesson_id, {
          course_id: Number(form.courseId),
          ...body,
        });
        navigate(`/courses/${form.courseId}/lessons/${lesson_id}`);
      } else {
        await lessonAPI.create(form.courseId, body);
        navigate(`/courses/${form.courseId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, isEdit ? 'Даалгавар засахад алдаа гарлаа.' : 'Даалгавар нэмэхэд алдаа гарлаа.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Ачааллаж байна...</div>;
  if (accessDenied) {
    return (
      <AccessDenied
        title={isEdit ? 'Энэ даалгаврыг засах эрхгүй байна' : 'Энэ хичээлд даалгавар нэмэх эрхгүй байна'}
        message="Та зөвхөн өөрийн хандах боломжтой хичээл дээр даалгавар үүсгэж, засна."
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to={form.courseId ? `/courses/${form.courseId}/lessons` : '/lessons'} className="hover:text-indigo-900">Сэдвүүд</Link>
        <span>›</span><span className="text-gray-700 font-medium">{isEdit ? 'Даалгавар засах' : 'Даалгавар нэмэх'}</span>
      </div>

      <h1 className="text-xl font-bold text-gray-900 mb-1">{isEdit ? 'Даалгавар / Req засах' : 'Даалгавар / Req нэмэх'}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {isEdit
          ? 'Даалгаврын мэдээллийг шинэчилж хадгална.'
          : 'Багш тухайн хичээлдээ шинэ даалгавар үүсгэнэ. Сурагч үүний дараа илгээлтээ илгээнэ.'}
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Үндсэн мэдээлэл</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Хичээл *</label>
              <select
                value={form.courseId}
                onChange={(event) => setField('courseId', event.target.value)}
                disabled={isEdit}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition disabled:opacity-60"
              >
                <option value="">Хичээл сонгоно уу</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Төрөл</label>
              <select
                value={form.typeId}
                onChange={(event) => setField('typeId', event.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
              >
                <option value="">Төрөл сонгоно уу</option>
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Оноо</label>
              <input
                type="number"
                min="0"
                value={form.point}
                onChange={(event) => setField('point', event.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
                placeholder="100"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Даалгаврын нэр *</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
                placeholder="Жишээ: 2-р лабораторийн тайлан"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Тайлбар</h3>
          <textarea
            value={form.content}
            onChange={(event) => setField('content', event.target.value)}
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-900 resize-none transition"
            placeholder="Сурагчид хийх шаардлага, заавар, материалын холбоос..."
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Хугацаа</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Нээх хугацаа</label>
              <input
                type="datetime-local"
                value={form.openOn}
                onChange={(event) => setField('openOn', event.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Хаах хугацаа</label>
              <input
                type="datetime-local"
                value={form.closeOn}
                onChange={(event) => setField('closeOn', event.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-900 transition"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-indigo-900 hover:bg-indigo-950 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm disabled:opacity-60"
          >
            {saving ? 'Хадгалж байна...' : isEdit ? 'Өөрчлөлт хадгалах' : 'Даалгавар нэмэх'}
          </button>
          <Link to={isEdit ? `/courses/${form.courseId}/lessons/${lesson_id}` : (form.courseId ? `/courses/${form.courseId}/lessons` : '/lessons')} className="px-6 py-2.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 font-medium rounded-xl transition text-sm">Болих</Link>
        </div>
      </div>
    </div>
  );
}
