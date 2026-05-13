import { courseUserAPI, extractItems, gradeSubmission, parseJsonFields, parseUser, submissionAPI } from '../services/api';
import { buildSubmissionContent, parseSubmissionContent } from './submissionContent';

function getEnrollmentGroupId(item) {
  const parsed = parseJsonFields(item) || {};
  let group = null;
  if (parsed.group && typeof parsed.group === 'object') group = parsed.group;
  else {
    try { group = JSON.parse(parsed['{}group'] ?? 'null'); } catch {}
  }
  return String(parsed.group_id ?? group?.id ?? '');
}

function getGroupName(item, groupId) {
  const parsed = parseJsonFields(item) || {};
  if (parsed.group && typeof parsed.group === 'object') return parsed.group.name || `Бүлэг #${groupId}`;
  try {
    const group = JSON.parse(parsed['{}group'] ?? 'null');
    return group?.name || `Бүлэг #${groupId}`;
  } catch {
    return `Бүлэг #${groupId}`;
  }
}

export function getSubmissionGroupMeta(submission) {
  const meta = parseSubmissionContent(submission?.content);
  return {
    isTeamAssignment: Boolean(meta.isTeamAssignment || meta.groupId || submission?.group_id),
    groupId: String(meta.groupId || submission?.group_id || ''),
    groupName: meta.groupName || (meta.groupId ? `Бүлэг #${meta.groupId}` : ''),
  };
}

export async function gradeTeamSubmissionFromOne(submissionId, score, submission, currentUserId = '') {
  const lessonId = submission?.lesson_id ?? submission?.lesson?.id;
  const courseId = submission?.lesson?.course?.id ?? submission?.lesson?.course_id ?? submission?.course_id;
  const meta = getSubmissionGroupMeta(submission);

  if (!meta.isTeamAssignment || !meta.groupId || !lessonId || !courseId) {
    return gradeSubmission(submissionId, score, submission);
  }

  const [courseUserPayload, submissionPayload] = await Promise.all([
    courseUserAPI.getByCourse(courseId),
    submissionAPI.getByLesson(lessonId),
  ]);

  const members = extractItems(courseUserPayload)
    .map((item) => ({ ...parseJsonFields(item), user: parseUser(item) || parseJsonFields(item)?.user }))
    .filter((item) => getEnrollmentGroupId(item) === String(meta.groupId));
  const submissions = extractItems(submissionPayload).map((item) => ({
    ...item,
    user: parseUser(item),
    _meta: parseSubmissionContent(item.content),
  }));

  const gradeResults = await Promise.all(members.map(async (member) => {
    const userId = member.user_id ?? member.user?.id;
    if (!userId) return { ok: true };
    const existing = submissions.find((item) => (
      String(item.user_id ?? item.user?.id ?? '') === String(userId) ||
      String(item._meta?.groupId ?? '') === String(meta.groupId)
    ));

    if (existing?.id) return gradeSubmission(existing.id, score, existing);

    await submissionAPI.create(lessonId, {
      current_user: String(currentUserId || ''),
      user_id: String(userId),
      grade_point: String(score),
      content: buildSubmissionContent({
        text: 'Багийн ажлын үнэлгээ',
        groupId: meta.groupId,
        groupName: meta.groupName || getGroupName(member, meta.groupId),
        isTeamAssignment: true,
      }),
    });
    return { ok: true };
  }));

  const failed = gradeResults.find((result) => result && result.ok === false);
  return failed || { ok: true, teamGraded: true, count: members.length };
}
