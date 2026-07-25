/**
 * 아카이브 영속 store — LocalStorage 기반 (careerStore 패턴 동일).
 *
 * - vanilla 모듈 싱글턴 (React 밖에서도 호출 가능)
 * - 변경 시 ARCHIVE_CHANGED 커스텀 이벤트 broadcast → 훅 자동 re-render
 * - 파일 원본은 여기 두지 않는다 (archiveBlobStore/IndexedDB). 여기엔 메타만.
 *
 * 컬렉션은 기본 시드 + 사용자 커스텀. 저장 시 컬렉션(=양식)을 골라 항목을 연결.
 */
import {
  ARCHIVE_CHANGED,
  DEFAULT_COLLECTION_SEEDS,
  FALLBACK_COLLECTION_KEY,
  FALLBACK_COLLECTION_NAME,
  type ArchiveCollection,
  type ArchiveFieldValue,
  type ArchiveItem,
  type ArchiveKind,
} from '@/types/archive';
import { newId } from '@/lib/idGenerator';
import { deleteArchiveBlob } from '@/lib/archiveBlobStore';
import { notify } from '@/lib/notify';

const ITEMS_KEY = 'archive.items.v1';
const COLLECTIONS_KEY = 'archive.collections.v1';
const SEED_FLAG_KEY = 'archive.seeded.v1';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const nowIso = () => new Date().toISOString();

const normalizeIso = (v: unknown, fallback: string): string => {
  if (typeof v !== 'string') return fallback;
  const t = Date.parse(v);
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
};

const optText = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : undefined;

const normalizeFields = (v: unknown): ArchiveFieldValue[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((f): ArchiveFieldValue | null => {
      if (!isRecord(f)) return null;
      const key = typeof f.key === 'string' ? f.key : '';
      const label = typeof f.label === 'string' ? f.label : '';
      const value = typeof f.value === 'string' ? f.value : '';
      if (!key || !value.trim()) return null;
      return { key, label, value };
    })
    .filter((f): f is ArchiveFieldValue => f !== null);
  return out.length ? out : undefined;
};

const VALID_KINDS: ArchiveKind[] = ['note', 'image', 'file', 'link'];

const normalizeItem = (value: unknown, index: number): ArchiveItem | null => {
  if (!isRecord(value)) return null;
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const kind = VALID_KINDS.includes(value.kind as ArchiveKind) ? (value.kind as ArchiveKind) : 'note';
  const createdAt = normalizeIso(value.createdAt, nowIso());
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `arc_recovered_${index}`,
    collectionId: typeof value.collectionId === 'string' ? value.collectionId : '',
    formKey: optText(value.formKey),
    kind,
    title: title || '(제목 없음)',
    note: optText(value.note),
    url: optText(value.url),
    domain: optText(value.domain),
    tags,
    fields: normalizeFields(value.fields),
    blobRef: optText(value.blobRef),
    fileName: optText(value.fileName),
    mimeType: optText(value.mimeType),
    size: typeof value.size === 'number' && Number.isFinite(value.size) ? value.size : undefined,
    starred: value.starred === true ? true : undefined,
    createdAt,
    updatedAt: normalizeIso(value.updatedAt, createdAt),
  };
};

const normalizeCollection = (value: unknown, index: number): ArchiveCollection | null => {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof value.id === 'string' && value.id ? value.id : `arcc_recovered_${index}`,
    name,
    emoji: optText(value.emoji),
    order: typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : index,
    builtinKey: optText(value.builtinKey),
    createdAt: normalizeIso(value.createdAt, nowIso()),
  };
};

const safeRead = <T>(key: string, normalize: (v: unknown, i: number) => T | null): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalize).filter((e): e is T => e !== null)
      : [];
  } catch {
    return [];
  }
};

const readItems = (): ArchiveItem[] => safeRead(ITEMS_KEY, normalizeItem);
const readCollections = (): ArchiveCollection[] => safeRead(COLLECTIONS_KEY, normalizeCollection);

let quotaNotified = false;

const safeWrite = (items: ArchiveItem[] | null, collections: ArchiveCollection[] | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (items) window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    if (collections) window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent(ARCHIVE_CHANGED));
  } catch (err) {
    const isQuota =
      err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota && !quotaNotified) {
      quotaNotified = true;
      notify.error('저장 공간이 가득 찼어요', {
        description: '큰 파일은 자동으로 별도 저장되지만, 항목이 너무 많으면 일부를 정리해 주세요.',
      });
    } else if (!isQuota) {
      console.error('아카이브 저장 실패', err);
    }
  }
};

export interface AddArchiveItemInput {
  collectionId: string;
  formKey?: string;
  kind: ArchiveKind;
  title: string;
  note?: string;
  url?: string;
  domain?: string;
  tags?: string[];
  fields?: ArchiveFieldValue[];
  blobRef?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export const archiveStore = {
  /** 최초 1회 기본 컬렉션 시드 (비어 있을 때만). */
  ensureSeeded(): void {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(SEED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const existing = readCollections();
    const haveKeys = new Set(existing.map((c) => c.builtinKey).filter(Boolean));
    const seeds: ArchiveCollection[] = DEFAULT_COLLECTION_SEEDS
      .filter((s) => !haveKeys.has(s.builtinKey))
      .map((s, i) => ({
        id: newId('arcc'),
        name: s.name,
        emoji: s.emoji,
        order: existing.length + i,
        builtinKey: s.builtinKey,
        createdAt: nowIso(),
      }));
    if (seeds.length) safeWrite(null, [...existing, ...seeds]);
    try {
      window.localStorage.setItem(SEED_FLAG_KEY, '1');
    } catch {
      /* noop */
    }
  },

  /** 모든 항목 (최신 먼저). */
  listItems(): ArchiveItem[] {
    return [...readItems()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** 모든 컬렉션 (order 오름차순). */
  listCollections(): ArchiveCollection[] {
    return [...readCollections()].sort((a, b) => a.order - b.order);
  },

  /** 폴백 '기타' 컬렉션 id — 없으면 만들어서 반환. */
  fallbackCollectionId(): string {
    const cols = readCollections();
    const found = cols.find((c) => c.builtinKey === FALLBACK_COLLECTION_KEY)
      ?? cols.find((c) => c.name === FALLBACK_COLLECTION_NAME);
    if (found) return found.id;
    const col: ArchiveCollection = {
      id: newId('arcc'),
      name: FALLBACK_COLLECTION_NAME,
      emoji: '📦',
      order: cols.length,
      builtinKey: FALLBACK_COLLECTION_KEY,
      createdAt: nowIso(),
    };
    safeWrite(null, [...cols, col]);
    return col.id;
  },

  /** 이름으로 컬렉션 찾고 없으면 생성. */
  ensureCollection(name: string, emoji?: string): ArchiveCollection {
    const trimmed = name.trim() || FALLBACK_COLLECTION_NAME;
    const cols = readCollections();
    const existing = cols.find((c) => c.name === trimmed);
    if (existing) return existing;
    const col: ArchiveCollection = {
      id: newId('arcc'),
      name: trimmed,
      emoji,
      order: cols.length ? Math.max(...cols.map((c) => c.order)) + 1 : 0,
      createdAt: nowIso(),
    };
    safeWrite(null, [...cols, col]);
    return col;
  },

  addItem(input: AddArchiveItemInput): ArchiveItem {
    const now = nowIso();
    const collectionId = readCollections().some((c) => c.id === input.collectionId)
      ? input.collectionId
      : this.fallbackCollectionId();
    const item: ArchiveItem = {
      id: newId('arc'),
      collectionId,
      formKey: input.formKey,
      kind: input.kind,
      title: input.title.trim() || '(제목 없음)',
      note: input.note?.trim() || undefined,
      url: input.url?.trim() || undefined,
      domain: input.domain,
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
      fields: input.fields && input.fields.length ? input.fields : undefined,
      blobRef: input.blobRef,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
      createdAt: now,
      updatedAt: now,
    };
    safeWrite([...readItems(), item], null);
    return item;
  },

  updateItem(id: string, patch: Partial<Omit<ArchiveItem, 'id' | 'createdAt'>>): void {
    const all = readItems();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch, updatedAt: nowIso() };
    safeWrite(all, null);
  },

  toggleStar(id: string): void {
    const all = readItems();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], starred: !all[idx].starred, updatedAt: nowIso() };
    safeWrite(all, null);
  },

  /** 다른 컬렉션으로 이동. */
  moveItem(id: string, collectionId: string): void {
    if (!readCollections().some((c) => c.id === collectionId)) return;
    this.updateItem(id, { collectionId });
  },

  /** 항목 삭제 — 첨부 blob 도 함께 정리 (고아 방지). */
  removeItem(id: string): void {
    const all = readItems();
    const target = all.find((e) => e.id === id);
    if (target?.blobRef) void deleteArchiveBlob(target.blobRef);
    safeWrite(all.filter((e) => e.id !== id), null);
  },

  addCollection(name: string, emoji?: string): ArchiveCollection {
    return this.ensureCollection(name, emoji);
  },

  /** 이름·이모지 수정. */
  updateCollection(id: string, patch: { name?: string; emoji?: string }): void {
    const cols = readCollections();
    const idx = cols.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const name = patch.name?.trim();
    cols[idx] = {
      ...cols[idx],
      ...(name ? { name } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji || undefined } : {}),
    };
    safeWrite(null, cols);
  },

  /** 빈 컬렉션만 삭제 (항목 있으면 무시). */
  removeCollection(id: string): void {
    if (readItems().some((e) => e.collectionId === id)) return;
    safeWrite(null, readCollections().filter((c) => c.id !== id));
  },

  /** 순서 변경 — orderedIds 순서대로 order 재부여. */
  reorderCollections(orderedIds: string[]): void {
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    const next = readCollections().map((c) => ({
      ...c,
      order: pos.has(c.id) ? pos.get(c.id)! : c.order,
    }));
    safeWrite(null, next);
  },

  /** 컬렉션 삭제 — 안의 항목은 '기타'로 옮기고 제거. ('기타' 자체는 못 지움) */
  removeCollectionReassign(id: string): void {
    const target = readCollections().find((c) => c.id === id);
    if (!target || target.builtinKey === FALLBACK_COLLECTION_KEY) return;
    const fallbackId = this.fallbackCollectionId(); // '기타' 없으면 생성
    if (fallbackId === id) return;
    const items = readItems().map((it) =>
      it.collectionId === id ? { ...it, collectionId: fallbackId, updatedAt: nowIso() } : it,
    );
    const cols = readCollections().filter((c) => c.id !== id);
    safeWrite(items, cols);
  },

  /** 전체 삭제 (리셋용) — IndexedDB 첨부 원본까지 함께 비운다. */
  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(SEED_FLAG_KEY);
      } catch {
        /* noop */
      }
    }
    // 메타를 지우기 전에 blobRef 를 모아둬야 원본을 찾을 수 있다.
    for (const ref of readItems().map((e) => e.blobRef).filter(Boolean)) {
      void deleteArchiveBlob(ref as string);
    }
    safeWrite([], []);
  },
};
