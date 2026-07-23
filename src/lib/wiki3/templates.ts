/**
 * 마이위키 문서 템플릿 — 편집 화면 [템플릿] 버튼에서 고른다.
 *
 * 기본 10종은 코드로 고정(수정 불가), 내가 만든 템플릿은 localStorage 'mywiki.templates'.
 * 템플릿의 알맹이는 Plate 본문(Value) 그대로라, 넣은 뒤에는 평범한 문서처럼 고치면 된다.
 */
import type { Value } from 'platejs';

export interface WikiTemplate {
  id: string;
  name: string;
  hint: string;      // 한 줄 설명 — 고를 때 무엇에 쓰는 틀인지
  body: Value;
  custom?: boolean;  // 내가 저장한 템플릿
}

const TEMPLATES_KEY = 'mywiki.templates';

/* 블록 헬퍼 — store.ts 의 시드와 같은 모양 */
const p = (text = ''): Value[number] => ({ type: 'p', children: [{ text }] });
const h2 = (text: string): Value[number] => ({ type: 'h2', children: [{ text }] });
const h3 = (text: string): Value[number] => ({ type: 'h3', children: [{ text }] });
const li = (text: string): Value[number] => ({ type: 'p', indent: 1, listStyleType: 'disc', children: [{ text }] });
const no = (text: string): Value[number] => ({ type: 'p', indent: 1, listStyleType: 'decimal', children: [{ text }] });
const todo = (text: string): Value[number] => ({ type: 'p', indent: 1, listStyleType: 'todo', checked: false, children: [{ text }] });
const quote = (text: string): Value[number] => ({ type: 'blockquote', children: [{ text }] });

/** 기본 템플릿 10종 — 개인 위키에서 자주 반복되는 문서 틀. */
export const BUILTIN_TEMPLATES: WikiTemplate[] = [
  {
    id: 'tpl_concept', name: '개념 정리', hint: '한 가지를 정의·핵심·예시로 눌러 담기',
    body: [
      quote('한 문장으로 말하면?'),
      h2('핵심'), li('왜 필요한가'), li('무엇이 다른가'), li('언제 쓰는가'),
      h2('예시'), p(),
      h2('헷갈리는 것'), p(),
      h2('더 볼 것'), li(''),
    ] as Value,
  },
  {
    id: 'tpl_study', name: '학습 노트', hint: '오늘 배운 것 · 막힌 것 · 복습할 것',
    body: [
      h2('오늘 배운 것'), li(''),
      h2('막힌 곳'), p('무엇이 왜 안 됐는지, 어디까지 확인했는지'),
      h2('알아낸 것'), p(),
      h2('다시 볼 것'), todo(''),
    ] as Value,
  },
  {
    id: 'tpl_book', name: '독서 메모', hint: '책 정보 · 인상 깊은 구절 · 내 생각',
    body: [
      p('지은이 · 옮긴이 · 출판사 · 읽은 날'),
      h2('한 줄 요약'), quote(''),
      h2('기억할 구절'), quote(''),
      h2('내 생각'), p(),
      h2('실천할 것'), todo(''),
    ] as Value,
  },
  {
    id: 'tpl_meeting', name: '회의록', hint: '일시·참석 · 논의 · 결정 · 할 일',
    body: [
      p('일시 · 장소 · 참석'),
      h2('안건'), no(''),
      h2('논의'), p(),
      h2('결정'), li(''),
      h2('할 일'), todo('누가 · 언제까지'),
    ] as Value,
  },
  {
    id: 'tpl_project', name: '프로젝트', hint: '목표 · 범위 · 일정 · 위험',
    body: [
      h2('목표'), p('무엇이 되면 끝인가'),
      h2('범위'), h3('한다'), li(''), h3('안 한다'), li(''),
      h2('일정'), no(''),
      h2('걱정되는 것'), li(''),
      h2('메모'), p(),
    ] as Value,
  },
  {
    id: 'tpl_trouble', name: '문제 해결', hint: '증상 · 짐작 · 시도 · 결론',
    body: [
      h2('증상'), p('언제, 어떤 조건에서, 무엇이 잘못되는가'),
      h2('짐작한 원인'), li(''),
      h2('해본 것'), no('시도 → 결과'),
      h2('결론'), quote('원인과 해결'),
      h2('다음에 같은 일이 생기면'), li(''),
    ] as Value,
  },
  {
    id: 'tpl_recipe', name: '레시피', hint: '재료 · 순서 · 다음엔 이렇게',
    body: [
      p('몇 인분 · 걸리는 시간'),
      h2('재료'), li(''),
      h2('순서'), no(''),
      h2('요령'), li(''),
      h2('다음엔'), p(),
    ] as Value,
  },
  {
    id: 'tpl_trip', name: '여행 기록', hint: '일정 · 다닌 곳 · 먹은 것 · 기억',
    body: [
      p('언제 · 며칠 · 누구와'),
      h2('일정'), no(''),
      h2('좋았던 곳'), li(''),
      h2('먹은 것'), li(''),
      h2('기억할 것'), quote(''),
    ] as Value,
  },
  {
    id: 'tpl_compare', name: '비교하기', hint: '후보를 나란히 놓고 고르기',
    body: [
      h2('고르는 기준'), li(''),
      h2('후보 A'), h3('좋은 점'), li(''), h3('아쉬운 점'), li(''),
      h2('후보 B'), h3('좋은 점'), li(''), h3('아쉬운 점'), li(''),
      h2('결론'), quote('무엇을, 왜'),
    ] as Value,
  },
  {
    id: 'tpl_checklist', name: '체크리스트', hint: '빠뜨리면 안 되는 것들',
    body: [
      p('언제 쓰는 목록인가'),
      h2('시작 전'), todo(''),
      h2('하는 중'), todo(''),
      h2('끝나고'), todo(''),
    ] as Value,
  },
];

/* ── 내가 만든 템플릿 ── */

function normalize(raw: unknown): WikiTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  if (!Array.isArray(r.body) || r.body.length === 0) return null;
  return {
    id: r.id,
    name: r.name,
    hint: typeof r.hint === 'string' ? r.hint : '내가 만든 템플릿',
    body: r.body as Value,
    custom: true,
  };
}

export function loadTemplates(): WikiTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(normalize).filter((t): t is WikiTemplate => !!t) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(list: WikiTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list.filter((t) => t.custom)));
  } catch {
    /* 저장 실패는 조용히 — 템플릿은 부가 기능 */
  }
}
