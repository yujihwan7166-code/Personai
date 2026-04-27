/**
 * 메인 문서 본문 ↔ 구조 폼 양방향 변환.
 *
 * 정형 섹션 5개 (개요 / 핵심 페이지 / 하위 주제 / 같이 보기 / 출처·참고) 를
 * markdown ## 헤딩 + 리스트 형태와 폼 객체 사이에서 라운드트립.
 *
 * 알려지지 않은 섹션 / 자유 본문은 `extra` 에 그대로 보존 (손실 방지).
 */

import { extractWikiLinks } from '@/types/wiki';

export interface MainDocForm {
  overview: string;
  coreLinks: string[];
  subTopics: string[];
  seeAlso: string[];
  sources: string[];
  /** 알려진 5 섹션 외의 본문 — 폼 모드에서도 유지하기 위해 보존. */
  extra: string;
}

/** 정형 섹션 라벨 → 매핑 키 */
const SECTION_MAP: Record<string, keyof MainDocForm> = {
  '개요': 'overview',
  'overview': 'overview',
  '핵심 페이지': 'coreLinks',
  '핵심페이지': 'coreLinks',
  '핵심': 'coreLinks',
  '하위 주제': 'subTopics',
  '하위주제': 'subTopics',
  '하위': 'subTopics',
  '같이 보기': 'seeAlso',
  '같이보기': 'seeAlso',
  '관련': 'seeAlso',
  '출처/참고': 'sources',
  '출처': 'sources',
  '참고': 'sources',
  '출처 / 참고': 'sources',
};

function normalizeHeading(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findSectionKey(heading: string): keyof MainDocForm | null {
  const k = normalizeHeading(heading);
  for (const [label, key] of Object.entries(SECTION_MAP)) {
    if (normalizeHeading(label) === k) return key;
  }
  return null;
}

/** 한 라인에서 [[링크]] 의 *타깃 제목* 만 추출 (표시명 분리 무시). */
function extractFirstLink(line: string): string | null {
  const m = line.match(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/);
  return m ? m[1].trim() : null;
}

/** 본문 → 폼. 라운드트립 안전. */
export function parseMainDocBody(body: string): MainDocForm {
  const form: MainDocForm = {
    overview: '',
    coreLinks: [],
    subTopics: [],
    seeAlso: [],
    sources: [],
    extra: '',
  };
  const lines = body.split('\n');
  let currentKey: keyof MainDocForm | null = null;
  let bufferOverview: string[] = [];
  const extraBuffer: string[] = [];

  for (const raw of lines) {
    const line = raw;
    const headingMatch = /^(#{2,3})\s+(.+?)\s*$/.exec(line.trim());
    if (headingMatch) {
      // 이전 섹션이 overview 였다면 합침
      if (currentKey === 'overview') {
        form.overview = bufferOverview.join('\n').trim();
        bufferOverview = [];
      }
      const key = findSectionKey(headingMatch[2]);
      currentKey = key;
      if (!key) {
        // 알려지지 않은 섹션 → extra 로
        extraBuffer.push(raw);
      }
      continue;
    }
    if (currentKey === 'overview') {
      bufferOverview.push(line);
      continue;
    }
    if (currentKey === 'coreLinks' || currentKey === 'subTopics' || currentKey === 'seeAlso' || currentKey === 'sources') {
      const target = extractFirstLink(line);
      if (target) {
        form[currentKey].push(target);
      } else if (line.trim().length > 0) {
        // 리스트 형태가 아닌 줄 — extra 로 흘림
        extraBuffer.push(raw);
      }
      continue;
    }
    if (currentKey === null) {
      // 첫 ## 헤딩 전 — extra
      if (line.trim().length > 0) extraBuffer.push(raw);
    }
  }
  if (currentKey === 'overview') {
    form.overview = bufferOverview.join('\n').trim();
  }

  // extra 정리 — 빈 줄 trim
  form.extra = extraBuffer.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return form;
}

/** 폼 → 본문. 빈 섹션도 골격 유지 (사용자가 칸 추가하기 쉽게). */
export function serializeMainDocBody(form: MainDocForm, opts?: { keepEmptySections?: boolean }): string {
  const keepEmpty = opts?.keepEmptySections ?? true;
  const out: string[] = [];

  // 개요
  if (form.overview.trim() || keepEmpty) {
    out.push('## 개요');
    out.push('');
    out.push(form.overview.trim() || '');
    out.push('');
  }

  // 링크 섹션 헬퍼
  const linkSection = (label: string, items: string[]) => {
    if (items.length === 0 && !keepEmpty) return;
    out.push(`## ${label}`);
    out.push('');
    if (items.length === 0) {
      out.push('- [[ ]]');
    } else {
      for (const t of items) out.push(`- [[${t}]]`);
    }
    out.push('');
  };

  linkSection('핵심 페이지', form.coreLinks);
  linkSection('하위 주제', form.subTopics);
  linkSection('같이 보기', form.seeAlso);
  linkSection('출처/참고', form.sources);

  if (form.extra.trim()) {
    out.push(form.extra.trim());
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** 폼이 비어있는지 (모든 섹션 + extra 모두 비었는지). */
export function isEmptyMainDocForm(form: MainDocForm): boolean {
  return !form.overview.trim()
    && form.coreLinks.length === 0
    && form.subTopics.length === 0
    && form.seeAlso.length === 0
    && form.sources.length === 0
    && !form.extra.trim();
}

/** 본문이 *폼 모드로 안전하게 변환 가능한지* — extra 가 너무 크지 않으면 OK. */
export function canEditAsForm(body: string): boolean {
  const form = parseMainDocBody(body);
  // extra 가 본문의 절반 이상을 차지하면 폼 변환 시 위계가 흐트러질 수 있음
  return form.extra.length < Math.max(200, body.length * 0.5);
}

export { extractWikiLinks };
