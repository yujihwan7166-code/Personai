import type { DiscussionMessage, DiscussionMode } from '@/types/expert';

export interface DiscussionRecord {
  id: string;
  question: string;
  mode: DiscussionMode;
  messages: DiscussionMessage[];
  expertIds: string[];
  timestamp: number;
  proconStances?: Record<string, 'pro' | 'con'>;
}

const HISTORY_KEY = 'ai-debate-history-v1';
const MAX_HISTORY = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeMessage(message: unknown): DiscussionMessage | null {
  if (!isRecord(message)) {
    return null;
  }

  if (typeof message.id !== 'string' || typeof message.expertId !== 'string' || typeof message.content !== 'string') {
    return null;
  }

  return {
    id: message.id,
    expertId: message.expertId,
    content: message.content,
    isStreaming: typeof message.isStreaming === 'boolean' ? message.isStreaming : undefined,
    isSummary: typeof message.isSummary === 'boolean' ? message.isSummary : undefined,
    round: typeof message.round === 'string' ? message.round : undefined,
    likes: typeof message.likes === 'number' ? message.likes : undefined,
    dislikes: typeof message.dislikes === 'number' ? message.dislikes : undefined,
    timestamp: typeof message.timestamp === 'number' ? message.timestamp : undefined,
    attachedFiles: Array.isArray(message.attachedFiles)
      ? message.attachedFiles.filter((file): file is { name: string; mimeType: string; preview?: string } =>
          isRecord(file) &&
          typeof file.name === 'string' &&
          typeof file.mimeType === 'string' &&
          (file.preview === undefined || typeof file.preview === 'string'))
      : undefined,
    simRoleName: typeof message.simRoleName === 'string' ? message.simRoleName : undefined,
    simRoleIcon: typeof message.simRoleIcon === 'string' ? message.simRoleIcon : undefined,
  };
}

function normalizeRecord(record: unknown): DiscussionRecord | null {
  if (!isRecord(record)) {
    return null;
  }

  const messages = Array.isArray(record.messages)
    ? record.messages.map(normalizeMessage).filter((message): message is DiscussionMessage => Boolean(message))
    : null;

  if (
    typeof record.id !== 'string' ||
    typeof record.question !== 'string' ||
    typeof record.mode !== 'string' ||
    !messages ||
    !Array.isArray(record.expertIds) ||
    !record.expertIds.every((expertId): expertId is string => typeof expertId === 'string') ||
    typeof record.timestamp !== 'number'
  ) {
    return null;
  }

  const proconStances = isRecord(record.proconStances)
    ? Object.fromEntries(
        Object.entries(record.proconStances).filter(([, stance]) => stance === 'pro' || stance === 'con'),
      ) as Record<string, 'pro' | 'con'>
    : undefined;

  return {
    id: record.id,
    question: record.question,
    mode: record.mode as DiscussionMode,
    messages,
    expertIds: record.expertIds,
    timestamp: record.timestamp,
    proconStances,
  };
}

function normalizeHistory(raw: unknown): DiscussionRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map(normalizeRecord)
    .filter((record): record is DiscussionRecord => Boolean(record))
    .slice(0, MAX_HISTORY);
}

function persistHistory(records: DiscussionRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

function persistHistoryWithTrimFallback(records: DiscussionRecord[]) {
  try {
    persistHistory(records);
  } catch {
    const trimmed = records.slice(0, Math.max(1, records.length - 5));

    try {
      persistHistory(trimmed);
    } catch {
      // Ignore history persistence failures after trimming.
    }
  }
}

export function saveDiscussionToHistory(record: Omit<DiscussionRecord, 'id' | 'timestamp'>) {
  try {
    const existing = getDiscussionHistory();
    const newRecord: DiscussionRecord = {
      ...record,
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
    };
    const updated = [newRecord, ...existing].slice(0, MAX_HISTORY);
    persistHistoryWithTrimFallback(updated);
  } catch {
    // Ignore history save failures.
  }
}

export function getDiscussionHistory(): DiscussionRecord[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? normalizeHistory(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

export function upsertDiscussionHistory(id: string, record: Omit<DiscussionRecord, 'id' | 'timestamp'>) {
  try {
    const existing = getDiscussionHistory();
    const idx = existing.findIndex((historyRecord) => historyRecord.id === id);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...record, messages: record.messages };
      persistHistory(existing);
    } else {
      const newRecord: DiscussionRecord = { ...record, id, timestamp: Date.now() };
      const updated = [newRecord, ...existing].slice(0, MAX_HISTORY);
      persistHistoryWithTrimFallback(updated);
    }
  } catch {
    // Ignore history upsert failures.
  }
}

export function deleteDiscussionFromHistory(id: string) {
  try {
    const existing = getDiscussionHistory();
    persistHistory(existing.filter((historyRecord) => historyRecord.id !== id));
  } catch {
    // Ignore history delete failures.
  }
}
