/**
 * 마이위키 영속 store — LocalStorage 기반 (careerStore 패턴).
 * - vanilla 모듈 싱글턴, 변경 시 MYWIKI_CHANGED broadcast → 훅 re-render
 * - 본문 HTML 은 저장 직전 sanitizeWikiHtml 로 정화
 * - 첫 진입 시 예시 책 시드: 완성형 3권(커피·홍차·위스키) + 빈 책 2권(주식 공부·여행)
 */
import { MYWIKI_CHANGED, SPINE_TINTS, type WikiDoc, type WikiFootnote, type WikiInfoRow, type WikiTopic } from '@/types/mywiki';
import { sanitizeWikiHtml } from '@/lib/mywiki/html';
import { newId } from '@/lib/idGenerator';
import { notify } from '@/lib/notify';

const TOPICS_KEY = 'mywiki.topics.v1';
const DOCS_KEY = 'mywiki.docs.v1';
const SEED_KEY = 'mywiki.seeded.v2';

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
    tint: typeof v.tint === 'string' && v.tint ? v.tint : SPINE_TINTS[i % SPINE_TINTS.length],
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

  /* ── 책 (주제) ── */
  addTopic(name: string): WikiTopic {
    const trimmed = name.trim();
    const topics = readTopics();
    const existing = topics.find((t) => t.name === trimmed);
    if (existing) return existing;
    const topic: WikiTopic = {
      id: newId('wkt'),
      name: trimmed || '새 책',
      tint: SPINE_TINTS[topics.length % SPINE_TINTS.length],
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
  /** 책 삭제 — 안의 문서까지 함께 (호출부에서 2단 확인). */
  removeTopic(id: string): void {
    safeWrite(
      readTopics().filter((t) => t.id !== id),
      readDocs().filter((d) => d.topicId !== id),
    );
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

  /* ── 예시 책 시드 — 완성형 3권 + 빈 책 2권 ── */
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
    const mkTopic = (name: string, tint: string, order: number): WikiTopic => ({ id: newId('wkt'), name, tint, order, createdAt: now });
    const coffee = mkTopic('커피', '#8c4a2f', 0);
    const tea = mkTopic('홍차', '#8a2f2f', 1);
    const whisky = mkTopic('위스키', '#7a5230', 2);
    const stock = mkTopic('주식 공부', '#3a5a7c', 3);
    const travel = mkTopic('여행', '#5f6b34', 4);

    const docs: WikiDoc[] = [];
    const mk = (topicId: string, parentId: string | null, title: string, order: number, body: string, infobox: WikiInfoRow[] = [], tags: string[] = [], footnotes: WikiFootnote[] = []): string => {
      const id = newId('wkd');
      docs.push({ id, topicId, parentId, title, body, infobox, tags, footnotes, order, createdAt: now, updatedAt: now });
      return id;
    };

    /* 커피 — 트리·링크·주석·인포박스가 다 있는 완성 예시 */
    const beans = newId('wkd');
    const espresso = newId('wkd');
    const pour = newId('wkd');
    const brew = mk(coffee.id, null, '추출', 0,
      `<p>볶아 간 <a data-link="${beans}">원두</a>에 물을 접촉시켜 향미 성분을 녹여내는 과정이다. 물의 온도·시간·압력·분쇄도가 맛을 좌우한다.</p><h2>방식</h2><p>압력을 쓰는 <a data-link="${espresso}">에스프레소</a>, 중력으로 물을 내리는 <a data-link="${pour}">핸드드립</a>, 찬물로 오래 우리는 <a data-stub-title="콜드브루">콜드브루</a> 등이 있다.</p>`,
      [{ k: '분류', v: '가공 공정' }, { k: '주요 변수', v: '온도·시간·압력' }], ['추출']);
    docs.push({
      id: pour, topicId: coffee.id, parentId: brew, title: '핸드드립',
      body: `<p>핸드드립은 뜨거운 물을 손으로 부어 <a data-link="${beans}">원두</a>의 성분을 천천히 우려내는 방식이다. 도구가 단순하고 변수를 하나씩 조절하며 배우기 좋다.<sup data-fn="1">1</sup></p><h2>준비물</h2><ul><li>드리퍼와 서버</li><li>잘 볶인 <a data-link="${beans}">원두</a> 15g, 물 250g</li><li>가는 물줄기가 나오는 주전자</li></ul><h2>추출 단계</h2><p>원두 두 배의 물로 30초간 뜸을 들인 뒤, 두세 번에 나눠 부으며 2분 30초 안에 끝낸다. 진하게 마시고 싶다면 <a data-link="${espresso}">에스프레소</a> 쪽이 알맞다.</p><h2>흔한 실수</h2><p>물이 너무 뜨거우면 쓴맛이 강해진다. 90도 안팎이 무난하다.</p>`,
      infobox: [{ k: '분류', v: '추출법' }, { k: '난이도', v: '★★☆' }, { k: '도구', v: '드리퍼·주전자' }],
      tags: ['추출', '입문'], footnotes: [{ n: 1, text: '물줄기를 가늘게 유지하면 과다추출을 피할 수 있다.' }],
      order: 0, createdAt: now, updatedAt: now,
    });
    docs.push({
      id: espresso, topicId: coffee.id, parentId: brew, title: '에스프레소',
      body: `<p>곱게 간 <a data-link="${beans}">원두</a>에 약 9바의 압력으로 뜨거운 물을 짧게 통과시켜 뽑아내는 추출 방식이다. 표면에 황금빛 거품인 <a data-stub-title="크레마">크레마</a>가 형성된다.</p><h2>추출 변수</h2><p>분쇄도, 도징량, 탬핑, 압력, 추출 시간이 촘촘히 맞물린다. 보통 18~20g 의 원두로 25~30초 사이에 두 배가량의 액체를 뽑는다.</p>`,
      infobox: [{ k: '분류', v: '추출법' }, { k: '압력', v: '약 9 bar' }, { k: '시간', v: '25~30초' }],
      tags: ['추출', '기계'], footnotes: [],
      order: 1, createdAt: now, updatedAt: now,
    });
    const material = mk(coffee.id, null, '재료', 1,
      `<p>커피 맛을 결정하는 재료들. 핵심은 <a data-link="${beans}">원두</a>와 물이다.</p>`,
      [{ k: '분류', v: '묶음' }], ['재료']);
    docs.push({
      id: beans, topicId: coffee.id, parentId: material, title: '원두',
      body: `<p>원두는 커피나무 열매 속의 씨앗으로, 커피 맛의 8할을 결정한다. <a data-link="${pour}">핸드드립</a>이든 <a data-link="${espresso}">에스프레소</a>든 신선한 원두가 먼저다.</p><h2>품종</h2><p>크게 <a data-stub-title="아라비카">아라비카</a>와 <a data-stub-title="로부스타">로부스타</a>로 나뉜다. 재배 고도와 기후에 따라 맛이 크게 달라진다.</p><h2>보관</h2><p>개봉 후에는 밀폐용기에 담아 빛과 습기를 피한다. 냉동 보관은 꺼낼 때 결로에 주의.</p>`,
      infobox: [{ k: '분류', v: '재료' }, { k: '보관', v: '밀폐·냉암소' }, { k: '권장', v: '로스팅 2주 내' }],
      tags: ['재료', '보관'], footnotes: [],
      order: 0, createdAt: now, updatedAt: now,
    });

    /* 홍차 — 소형 완성 예시 */
    const oxid = newId('wkd');
    mk(tea.id, null, '홍차란', 0,
      `<p>홍차는 찻잎을 완전히 <a data-link="${oxid}">산화</a>시켜 만든 차다. 붉은 수색과 깊은 향이 특징이며, 커피와 마찬가지로 카페인을 함유한다.</p><h2>우리기</h2><p>물 95도 안팎, 3분 내외가 기본. 찻잎 양과 시간을 바꿔가며 취향을 찾는다.</p>`,
      [{ k: '분류', v: '기호 음료' }, { k: '가공', v: '완전 산화' }], ['차']);
    docs.push({
      id: oxid, topicId: tea.id, parentId: null, title: '산화',
      body: `<p>찻잎을 시들리고 비벼 세포를 터뜨린 뒤 산화시키면 홍차 특유의 색과 향이 난다. 산화 정도에 따라 녹차→우롱차→홍차로 나뉜다.</p>`,
      infobox: [{ k: '분류', v: '가공 공정' }], tags: ['공정'], footnotes: [],
      order: 1, createdAt: now, updatedAt: now,
    });

    /* 위스키 — 소형 완성 예시 */
    const ferment = newId('wkd');
    mk(whisky.id, null, '위스키란', 0,
      `<p>위스키는 곡물을 <a data-link="${ferment}">발효</a>·증류한 뒤 오크통에서 숙성시킨 증류주다. 원료와 숙성에 따라 향이 크게 달라진다.</p><h2>제조</h2><p>당화 → 발효 → 증류 → 숙성의 단계를 거친다. 숙성 통의 종류가 색과 향의 상당 부분을 만든다.</p>`,
      [{ k: '분류', v: '증류주' }, { k: '숙성', v: '오크통' }], ['술']);
    docs.push({
      id: ferment, topicId: whisky.id, parentId: null, title: '발효',
      body: `<p>효모가 당을 분해해 알코올과 향미 성분을 만드는 과정. 위스키의 바탕 술(워시)을 만드는 단계다.</p>`,
      infobox: [{ k: '분류', v: '생화학 과정' }], tags: ['공정'], footnotes: [],
      order: 1, createdAt: now, updatedAt: now,
    });

    /* 빈 책 2권 — 바로 채우기 시작할 수 있게 */
    // (주식 공부 · 여행 — 문서 없음)

    safeWrite([coffee, tea, whisky, stock, travel], docs);
    try { window.localStorage.setItem(SEED_KEY, '1'); } catch { /* noop */ }
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(SEED_KEY); } catch { /* noop */ }
    }
    safeWrite([], []);
  },
};
