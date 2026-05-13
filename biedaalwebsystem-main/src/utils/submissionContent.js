const PREFIX = 'TEAM2_SUBMISSION_JSON:';

export function getYoutubeId(url) {
  const match = String(url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?/]+)/);
  return match ? match[1] : null;
}

export function classifyAttachmentLink(url) {
  const value = String(url || '').trim();
  if (!value) return { youtubeUrl: '', imageUrl: '', fileUrl: '' };

  if (getYoutubeId(value)) {
    return { youtubeUrl: value, imageUrl: '', fileUrl: '' };
  }

  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(value)) {
    return { youtubeUrl: '', imageUrl: value, fileUrl: '' };
  }

  return { youtubeUrl: '', imageUrl: '', fileUrl: value };
}

export function buildSubmissionContent({
  text = '',
  attachmentUrl = '',
  youtubeUrl = '',
  imageUrl = '',
  fileUrl = '',
  fileLabel = '',
  groupId = '',
  groupName = '',
  isTeamAssignment = false,
}) {
  const resolvedAttachment = classifyAttachmentLink(attachmentUrl);

  return `${PREFIX}${JSON.stringify({
    version: 1,
    text: String(text || '').trim(),
    youtubeUrl: String(youtubeUrl || resolvedAttachment.youtubeUrl || '').trim(),
    imageUrl: String(imageUrl || resolvedAttachment.imageUrl || '').trim(),
    fileUrl: String(fileUrl || resolvedAttachment.fileUrl || '').trim(),
    fileLabel: String(fileLabel || '').trim(),
    groupId: String(groupId || '').trim(),
    groupName: String(groupName || '').trim(),
    isTeamAssignment: Boolean(isTeamAssignment),
  })}`;
}

export function parseSubmissionContent(raw) {
  const value = String(raw || '');

  if (value.startsWith(PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(PREFIX.length));
      return {
        text: String(parsed.text || '').trim(),
        youtubeUrl: String(parsed.youtubeUrl || '').trim(),
        imageUrl: String(parsed.imageUrl || '').trim(),
        fileUrl: String(parsed.fileUrl || '').trim(),
        fileLabel: String(parsed.fileLabel || '').trim(),
        groupId: String(parsed.groupId || parsed.group_id || '').trim(),
        groupName: String(parsed.groupName || parsed.group_name || '').trim(),
        isTeamAssignment: Boolean(parsed.isTeamAssignment || parsed.is_team_assignment),
      };
    } catch {
      // Fall through to legacy parser.
    }
  }

  const youtubeMatch = value.match(/YouTube:\s*(https?:\/\/\S+)/i);
  return {
    text: value.replace(/\n?YouTube:\s*https?:\/\/\S+/i, '').trim(),
    youtubeUrl: youtubeMatch ? youtubeMatch[1] : '',
    imageUrl: '',
    fileUrl: '',
    fileLabel: '',
    groupId: '',
    groupName: '',
    isTeamAssignment: false,
  };
}

export function hasSubmissionContent(content) {
  return Boolean(content.text || content.youtubeUrl || content.imageUrl || content.fileUrl);
}
