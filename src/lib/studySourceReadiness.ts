import type { StudySource } from '@/types/study';

const PENDING_TEXT_PATTERNS = [
  /OCR\s*로\s*텍스트를\s*추출하는\s*중/i,
  /텍스트를\s*추출하는\s*중입니다/i,
  /원본에서\s*OCR/i,
  /스캔본\s*PDF/i,
];

export function isStudySourceTextPending(source: StudySource): boolean {
  if (source.status === 'processing') return true;
  const text = source.content.trim();
  return PENDING_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

export function isStudySourceUsable(source: StudySource): boolean {
  return source.enabled && source.status === 'ready' && source.content.trim().length > 0 && !isStudySourceTextPending(source);
}

export function getUsableStudySources(sources: StudySource[]): StudySource[] {
  return sources.filter(isStudySourceUsable);
}

export function getStudySourceReadiness(sources: StudySource[]) {
  const enabled = sources.filter((source) => source.enabled);
  const usable = enabled.filter(isStudySourceUsable);
  const pending = enabled.filter((source) => isStudySourceTextPending(source));
  const errored = enabled.filter((source) => source.status === 'error');

  return {
    enabledCount: enabled.length,
    usableCount: usable.length,
    pendingCount: pending.length,
    erroredCount: errored.length,
    hasEnabledSources: enabled.length > 0,
    hasUsableSources: usable.length > 0,
    hasOnlyPendingSources: enabled.length > 0 && usable.length === 0 && pending.length > 0,
  };
}
