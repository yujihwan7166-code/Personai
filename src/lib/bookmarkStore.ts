/**
 * 북마크 그리드 저장소 — 9슬롯(3x3) 고정.
 *
 * 각 슬롯은 비어있거나, 외부 URL 또는 내부 기능(라이프 툴·어시스턴트 카드·채팅 모드 등) 바로가기.
 * localStorage 단일 키 'personai.bookmarks' 에 JSON 배열로 저장.
 */

export type BookmarkSlot =
  | { kind: 'empty' }
  | { kind: 'url'; label: string; url: string; favicon?: string }
  | { kind: 'internal'; label: string; emoji: string; target: InternalTarget };

/** 내부 기능 바로가기 대상 — 라이트웨이트 타입. 호출자가 target 으로 라우팅 결정. */
export type InternalTarget =
  | { type: 'mode'; mode: string }                    // 메인 모드 (general/assistant/debate 등)
  | { type: 'life'; toolId: string }                  // 라이프 툴
  | { type: 'assistant'; cardId: string }             // 어시스턴트 카드
  | { type: 'player'; toolId: string };               // 플레이어 툴 (캐릭터챗·AI 게임)

export const BOOKMARK_SLOT_COUNT = 6;
const STORAGE_KEY = 'personai.bookmarks';

export const emptySlots = (): BookmarkSlot[] =>
  Array.from({ length: BOOKMARK_SLOT_COUNT }, () => ({ kind: 'empty' as const }));

export function loadBookmarks(): BookmarkSlot[] {
  if (typeof window === 'undefined') return emptySlots();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySlots();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return emptySlots();
    const slots: BookmarkSlot[] = parsed
      .slice(0, BOOKMARK_SLOT_COUNT)
      .map((s) => (s && typeof s === 'object' && 'kind' in s ? s : { kind: 'empty' }));
    while (slots.length < BOOKMARK_SLOT_COUNT) slots.push({ kind: 'empty' });
    return slots;
  } catch {
    return emptySlots();
  }
}

/** 스토어 변경 브로드캐스트용 이벤트 — 즐겨찾기 뷰가 수신해 재로드. */
export const BOOKMARKS_CHANGED_EVENT = 'personai:bookmarks-changed';

export function saveBookmarks(slots: BookmarkSlot[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED_EVENT));
  } catch { /* noop */ }
}

/** 내부 기능 바로가기 프리셋 — 모달 추가 뷰에서 사용자가 고를 수 있는 목록. */
export const INTERNAL_FEATURE_PRESETS: Array<{
  id: string;
  label: string;
  emoji: string;
  desc: string;
  target: InternalTarget;
}> = [
  { id: 'general',       label: '일반 채팅',     emoji: '💬', desc: 'AI 한 명과 1:1',         target: { type: 'mode', mode: 'general' } },
  { id: 'multi-chat',    label: '멀티 채팅',     emoji: '🔀', desc: '여러 AI 답변 비교',      target: { type: 'mode', mode: 'multi-chat' } },
  { id: 'deep-research', label: '심층 리서치',   emoji: '🧪', desc: 'AI 교차 검증 리포트',    target: { type: 'mode', mode: 'deep-research' } },
  { id: 'debate',        label: 'AI 토론',       emoji: '⚔️', desc: '찬반·자유·심층·브레인',   target: { type: 'mode', mode: 'debate' } },
  { id: 'study',         label: 'AI 스터디룸',   emoji: '📚', desc: '노트북·퀴즈·팟캐스트',    target: { type: 'mode', mode: 'study' } },
  { id: 'assistant',     label: 'AI 어시스턴트', emoji: '✨', desc: '실무 도구 전체',           target: { type: 'mode', mode: 'assistant' } },
  { id: 'character',     label: '캐릭터 챗',     emoji: '🎭', desc: '가상 캐릭터와 대화',     target: { type: 'player', toolId: 'character-chat' } },
  { id: 'ai-game',       label: 'AI 게임',       emoji: '🎮', desc: '끝말잇기·스무고개',       target: { type: 'player', toolId: 'ai-game' } },
  { id: 'fortune',       label: 'AI 사주',       emoji: '🔮', desc: '생년월일 + MBTI 풀이',    target: { type: 'life', toolId: 'saju' } },
  { id: 'tarot',         label: '타로 카드',     emoji: '🃏', desc: '카드 뽑기·메시지 해석',  target: { type: 'life', toolId: 'tarot' } },
  { id: 'dream',         label: '꿈 해몽',       emoji: '🌙', desc: '꿈 내용 → 상징 해석',    target: { type: 'life', toolId: 'dream' } },
  { id: 'dating',        label: '연애 코치',     emoji: '💌', desc: '썸·데이트·이별',         target: { type: 'life', toolId: 'dating' } },
  { id: 'image',         label: '이미지·영상',   emoji: '🎨', desc: '멀티모달 미디어 생성',    target: { type: 'assistant', cardId: 'image' } },
  { id: 'voice',         label: '음성',          emoji: '🎙️', desc: '음성 분석·전사',         target: { type: 'assistant', cardId: 'voice' } },
  { id: 'ppt',           label: 'PPT',           emoji: '📊', desc: '슬라이드 자동 생성',      target: { type: 'assistant', cardId: 'ppt' } },
  { id: 'translate',     label: '번역',          emoji: '🌐', desc: '다국어 번역 + 용어',     target: { type: 'assistant', cardId: 'translate' } },
];

/** URL 을 주면 favicon 추정 URL 리턴 — 저장 시 함께 기록하여 grid 에서 렌더. */
export function guessFavicon(url: string): string | undefined {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return undefined;
  }
}
