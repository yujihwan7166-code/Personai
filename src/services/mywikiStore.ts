/**
 * 마이위키 영속 store — LocalStorage 기반 (careerStore 패턴).
 * - vanilla 모듈 싱글턴, 변경 시 MYWIKI_CHANGED broadcast → 훅 re-render
 * - 본문 HTML 은 저장 직전 sanitizeWikiHtml 로 정화
 * - 첫 진입 시 시안(Wiki.dc.html)의 '커피' 샘플 주제 1권 시드 (구조 학습용, 삭제 자유)
 */
import { MYWIKI_CHANGED, type WikiDoc, type WikiFootnote, type WikiInfoRow, type WikiTopic } from '@/types/mywiki';
import { sanitizeWikiHtml } from '@/lib/mywiki/html';
import { newId } from '@/lib/idGenerator';
import { notify } from '@/lib/notify';

const TOPICS_KEY = 'mywiki.topics.v1';
const DOCS_KEY = 'mywiki.docs.v1';
const SEED_KEY = 'mywiki.seeded.v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nowIso = () => new Date().toISOString();

const normalizeIso = (v: unknown, fallback: string): string => {
  if (typeof v !== 'string') return fallback;
  const t = Date.parse(v);
  return Number.isNaN(t) ? fallback : new Date(t).toISOString();
};

const normalizeTopic = (v: unknown, i: number): WikiTopic | null => {
  if (!isRecord(v)) return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `wkt_recovered_${i}`,
    name,
    order: typeof v.order === 'number' && Number.isFinite(v.order) ? v.order : i,
    createdAt: normalizeIso(v.createdAt, nowIso()),
  };
};

const normalizeInfobox = (v: unknown): WikiInfoRow[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((r): WikiInfoRow | null => {
      if (!isRecord(r)) return null;
      const k = typeof r.k === 'string' ? r.k.trim() : '';
      const val = typeof r.v === 'string' ? r.v.trim() : '';
      if (!k || !val) return null;
      return { k, v: val };
    })
    .filter((r): r is WikiInfoRow => r !== null);
};

const normalizeFootnotes = (v: unknown): WikiFootnote[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((f): WikiFootnote | null => {
      if (!isRecord(f)) return null;
      const n = typeof f.n === 'number' ? f.n : NaN;
      const text = typeof f.text === 'string' ? f.text.trim() : '';
      if (!Number.isFinite(n) || !text) return null;
      return { n, text };
    })
    .filter((f): f is WikiFootnote => f !== null);
};

const normalizeDoc = (v: unknown, i: number): WikiDoc | null => {
  if (!isRecord(v)) return null;
  const title = typeof v.title === 'string' ? v.title.trim() : '';
  if (!title) return null;
  const createdAt = normalizeIso(v.createdAt, nowIso());
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `wkd_recovered_${i}`,
    topicId: typeof v.topicId === 'string' ? v.topicId : '',
    parentId: typeof v.parentId === 'string' && v.parentId ? v.parentId : null,
    title,
    body: typeof v.body === 'string' ? v.body : '',
    infobox: normalizeInfobox(v.infobox),
    tags: Array.isArray(v.tags) ? v.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [],
    footnotes: normalizeFootnotes(v.footnotes),
    order: typeof v.order === 'number' && Number.isFinite(v.order) ? v.order : i,
    createdAt,
    updatedAt: normalizeIso(v.updatedAt, createdAt),
  };
};

const safeRead = <T>(key: string, normalize: (v: unknown, i: number) => T | null): T[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize).filter((e): e is T => e !== null) : [];
  } catch {
    return [];
  }
};

const readTopics = (): WikiTopic[] => safeRead(TOPICS_KEY, normalizeTopic);
const readDocs = (): WikiDoc[] => safeRead(DOCS_KEY, normalizeDoc);

let quotaNotified = false;

const safeWrite = (topics: WikiTopic[] | null, docs: WikiDoc[] | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (topics) window.localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
    if (docs) window.localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent(MYWIKI_CHANGED));
  } catch (err) {
    const isQuota = err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22);
    if (isQuota && !quotaNotified) {
      quotaNotified = true;
      notify.error('저장 공간이 가득 찼어요', { description: '문서 일부를 정리한 뒤 다시 시도해 주세요.' });
    } else if (!isQuota) {
      console.error('마이위키 저장 실패', err);
    }
  }
};

export const mywikiStore = {
  /* ── 읽기 ── */
  listTopics(): WikiTopic[] {
    return [...readTopics()].sort((a, b) => a.order - b.order);
  },
  listDocs(): WikiDoc[] {
    return [...readDocs()].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  },

  /* ── 주제 ── */
  addTopic(name: string): WikiTopic {
    const trimmed = name.trim();
    const topics = readTopics();
    const existing = topics.find((t) => t.name === trimmed);
    if (existing) return existing;
    const topic: WikiTopic = {
      id: newId('wkt'),
      name: trimmed || '새 주제',
      order: topics.length ? Math.max(...topics.map((t) => t.order)) + 1 : 0,
      createdAt: nowIso(),
    };
    safeWrite([...topics, topic], null);
    return topic;
  },
  renameTopic(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const topics = readTopics();
    const idx = topics.findIndex((t) => t.id === id);
    if (idx === -1) return;
    topics[idx] = { ...topics[idx], name: trimmed };
    safeWrite(topics, null);
  },
  /** 빈 주제만 삭제 (문서 있으면 무시). */
  removeTopic(id: string): void {
    if (readDocs().some((d) => d.topicId === id)) return;
    safeWrite(readTopics().filter((t) => t.id !== id), null);
  },

  /* ── 문서 ── */
  addDoc(input: { topicId: string; parentId?: string | null; title: string; body?: string }): WikiDoc {
    const now = nowIso();
    const docs = readDocs();
    const siblings = docs.filter((d) => d.topicId === input.topicId && (d.parentId ?? null) === (input.parentId ?? null));
    const doc: WikiDoc = {
      id: newId('wkd'),
      topicId: input.topicId,
      parentId: input.parentId ?? null,
      title: input.title.trim() || '새 문서',
      body: input.body ? sanitizeWikiHtml(input.body) : '',
      infobox: [],
      tags: [],
      footnotes: [],
      order: siblings.length ? Math.max(...siblings.map((s) => s.order)) + 1 : 0,
      createdAt: now,
      updatedAt: now,
    };
    safeWrite(null, [...docs, doc]);
    return doc;
  },

  updateDoc(id: string, patch: Partial<Omit<WikiDoc, 'id' | 'createdAt'>>): void {
    const docs = readDocs();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const next = { ...docs[idx], ...patch, updatedAt: nowIso() };
    if (patch.body !== undefined) next.body = sanitizeWikiHtml(patch.body);
    if (patch.title !== undefined) next.title = patch.title.trim() || docs[idx].title;
    docs[idx] = next;
    safeWrite(null, docs);
  },

  /** 문서 삭제 — 하위 문서는 한 단계 승격. */
  removeDoc(id: string): void {
    const docs = readDocs();
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    const next = docs
      .filter((d) => d.id !== id)
      .map((d) => (d.parentId === id ? { ...d, parentId: target.parentId } : d));
    safeWrite(null, next);
  },

  /** 형제 내 위/아래 이동. */
  moveDoc(id: string, dir: -1 | 1): void {
    const docs = readDocs();
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    const siblings = docs
      .filter((d) => d.topicId === target.topicId && (d.parentId ?? null) === (target.parentId ?? null))
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    const i = siblings.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= siblings.length) return;
    const a = siblings[i];
    const b = siblings[j];
    const next = docs.map((d) => (d.id === a.id ? { ...d, order: b.order } : d.id === b.id ? { ...d, order: a.order } : d));
    safeWrite(null, next);
  },

  /* ── 시드 (시안 샘플 — 구조 학습용 '커피' 1권) ── */
  ensureSeeded(): void {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(SEED_KEY)) return;
    } catch {
      return;
    }
    if (readTopics().length > 0 || readDocs().length > 0) {
      try { window.localStorage.setItem(SEED_KEY, '1'); } catch { /* noop */ }
      return;
    }

    const now = nowIso();
    const tId = newId('wkt');
    const topic: WikiTopic = { id: tId, name: '커피', order: 0, createdAt: now };

    const mk = (id: string, parentId: string | null, title: string, order: number, body: string, infobox: WikiInfoRow[], tags: string[], footnotes: WikiFootnote[] = []): WikiDoc => ({
      id, topicId: tId, parentId, title, body, infobox, tags, footnotes, order, createdAt: now, updatedAt: now,
    });

    const brew = newId('wkd');
    const material = newId('wkd');
    const tool = newId('wkd');
    const pour = newId('wkd');
    const espresso = newId('wkd');
    const beans = newId('wkd');
    const grinder = newId('wkd');

    const docs: WikiDoc[] = [
      mk(brew, null, '추출', 0,
        `<h2>개요</h2><p>볶아 간 <a data-link="${beans}">원두</a>에 물을 접촉시켜 향미를 녹여내는 과정. 대표적으로 <a data-link="${pour}">핸드드립</a>과 <a data-link="${espresso}">에스프레소</a>가 있다.</p>`,
        [{ k: '분류', v: '공정' }], ['추출']),
      mk(pour, brew, '핸드드립', 0,
        `<h2>개요</h2><p>핸드드립은 뜨거운 물을 손으로 부어 <a data-link="${beans}">원두</a>의 성분을 천천히 우려내는 방식이다. 도구가 단순하고 변수를 하나씩 조절하며 배우기 좋다.<sup data-fn="1">1</sup></p><h2>준비물</h2><ul><li>드리퍼 — 아직 정리 중인 <a data-link="${grinder}">그라인더</a> 문서 참고</li><li>잘 볶인 <a data-link="${beans}">원두</a> 15g, 물 250g</li><li>가는 물줄기가 나오는 주전자</li></ul><h2>추출 단계</h2><p>먼저 원두 두 배의 물로 30초간 뜸을 들인다. 이후 두세 번에 나눠 부으며 2분 30초 안에 끝낸다. 진하게 마시고 싶다면 <a data-link="${espresso}">에스프레소</a> 쪽이 더 알맞다.</p><h2>흔한 실수</h2><p>물이 너무 뜨거우면 쓴맛이 강해진다. 90도 안팎이 무난하다.</p>`,
        [{ k: '분류', v: '추출법' }, { k: '난이도', v: '★★☆' }, { k: '도구', v: '드리퍼·주전자' }],
        ['추출', '입문'],
        [{ n: 1, text: '물줄기를 가늘게 유지하면 과다추출을 피할 수 있다.' }]),
      mk(espresso, brew, '에스프레소', 1,
        `<h2>개요</h2><p>고압으로 짧게 추출해 진한 크레마를 얻는 방식. 곱게 간 <a data-link="${beans}">원두</a>와 안정적인 압력이 핵심이다. 입문은 <a data-link="${pour}">핸드드립</a>이 더 쉽다.</p>`,
        [{ k: '분류', v: '추출법' }, { k: '난이도', v: '★★★' }, { k: '압력', v: '9 bar' }], ['추출', '기계']),
      mk(material, null, '재료', 1,
        `<h2>개요</h2><p>커피 맛을 결정하는 재료들. 핵심은 <a data-link="${beans}">원두</a>와 물.</p>`,
        [{ k: '분류', v: '묶음' }], ['재료']),
      mk(beans, material, '원두', 0,
        `<h2>개요</h2><p>원두는 커피 맛의 8할을 결정한다. <a data-link="${pour}">핸드드립</a>이든 <a data-link="${espresso}">에스프레소</a>든 신선한 원두가 먼저다.</p><h2>보관</h2><p>개봉 후에는 밀폐용기에 담아 빛과 습기를 피한다. 냉동 보관은 꺼낼 때 결로에 주의.</p>`,
        [{ k: '분류', v: '재료' }, { k: '보관', v: '밀폐·냉암소' }, { k: '권장', v: '로스팅 2주 내' }], ['재료', '보관']),
      mk(tool, null, '도구', 2,
        `<h2>개요</h2><p>추출에 쓰는 도구 문서 묶음.</p>`,
        [{ k: '분류', v: '묶음' }], ['도구']),
      mk(grinder, tool, '그라인더', 0,
        '',
        [{ k: '분류', v: '도구' }], ['도구']),
    ];

    safeWrite([topic], docs);
    try { window.localStorage.setItem(SEED_KEY, '1'); } catch { /* noop */ }
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(SEED_KEY); } catch { /* noop */ }
    }
    safeWrite([], []);
  },
};
