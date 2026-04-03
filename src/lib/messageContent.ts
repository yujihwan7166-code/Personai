function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripSpeakerPrefix(content: string, speakerName?: string) {
  if (!content || !speakerName) return content;

  const escapedName = escapeRegExp(speakerName.trim());
  if (!escapedName) return content;

  return content
    .replace(new RegExp(`^\\s*\\[\\s*${escapedName}\\s*\\]\\s*[:：-]?\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*${escapedName}\\s*[:：-]\\s*`, 'i'), '');
}
