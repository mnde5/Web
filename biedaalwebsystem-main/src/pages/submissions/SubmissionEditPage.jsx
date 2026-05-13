import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { submissionAPI, extractItem, isSubmissionGraded } from '../../services/api';
import { getErrorMessage } from '../../utils/role';
import { buildSubmissionContent, getYoutubeId, parseSubmissionContent } from '../../utils/submissionContent';

export default function SubmissionEditPage() {
  const { course_id, lesson_id, submission_id } = useParams();
  const navigate = useNavigate();
  const [content, setContent]   = useState('');
  const [ytUrl, setYtUrl]       = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fileUrl, setFileUrl]   = useState('');
  const [fileLabel, setFileLabel] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    submissionAPI.getOne(submission_id)
      .then(res => {
        const s = extractItem(res);
        if (isSubmissionGraded(s)) {
          setError('Дүн тавигдсан тул засах боломжгүй.');
          setLoading(false);
          return;
        }
        const parsed = parseSubmissionContent(s?.content);
        setYtUrl(parsed.youtubeUrl);
        setImageUrl(parsed.imageUrl);
        setFileUrl(parsed.fileUrl);
        setFileLabel(parsed.fileLabel);
        setContent(parsed.text);
      })
      .catch(() => setError('Илгээлт олдсонгүй.'))
      .finally(() => setLoading(false));
  }, [submission_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !ytUrl.trim() && !imageUrl.trim() && !fileUrl.trim()) {
      setError('Текст, зураг, файл эсвэл YouTube видеоноос дор хаяж нэгийг оруулна уу.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await submissionAPI.update(submission_id, {
        content: buildSubmissionContent({
          text: content,
          youtubeUrl: ytUrl,
          imageUrl,
          fileUrl,
          fileLabel,
        }),
      });
      navigate(course_id && lesson_id ? `/courses/${course_id}/lessons/${lesson_id}/submissions` : `/submissions/${submission_id}`);
    } catch (e) {
      setError(getErrorMessage(e, 'Хадгалахад алдаа гарлаа.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-24 text-center text-gray-400">Ачааллаж байна...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={course_id ? `/courses/${course_id}/submissions` : '/'} className="hover:text-blue-600">Илгээлтүүд</Link>
        <span>›</span>
        <Link to={`/submissions/${submission_id}`} className="hover:text-blue-600">Дэлгэрэнгүй</Link>
        <span>›</span>
        <span className="text-slate-700">Засах</span>
      </div>

      <h1 className="text-4xl font-bold text-slate-800">Илгээлт засах</h1>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-red-600 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Агуулга *</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">YouTube холбоос</label>
          <input type="url" value={ytUrl} onChange={e => setYtUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          {ytUrl && getYoutubeId(ytUrl) && (
            <div className="mt-3 rounded-xl overflow-hidden aspect-video">
              <iframe src={`https://www.youtube.com/embed/${getYoutubeId(ytUrl)}`} className="w-full h-full" allowFullScreen />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Зургийн холбоос</label>
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          {imageUrl && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={imageUrl} alt="Preview" className="max-h-[320px] w-full object-contain" />
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Файлын гарчиг</label>
            <input type="text" value={fileLabel} onChange={e => setFileLabel(e.target.value)}
              placeholder="Жишээ: Final PPT"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">PPT / Файлын холбоос</label>
            <input type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)}
              placeholder="https://example.com/presentation.pptx"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Хадгалах
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition">
            Буцах
          </button>
        </div>
      </form>
    </div>
  );
}
