/**
 * Whiteboard starter templates.
 *
 * The goal is closer to Miro/FigJam: each template should create a usable
 * working board, not just a few empty boxes.
 */
import type { WBArrow, WBColor, WBElement, WBFrame, WBShapeKind, WBSticky, WBTable, WBText } from '@/types/whiteboard';

export const TEMPLATE_KINDS = [
  'brainstorm',
  'kpt',
  'kanban',
  'mindmap',
  'flowchart',
  'comparison',
  'retrospective',
  'debate',
  'weeklyPlan',
  'roadmap',
  'userJourney',
  'empathyMap',
  'swot',
  'priorityMatrix',
  'okr',
  'meetingAgenda',
  'workshopAgenda',
  'storyMap',
  'sprintPlanning',
  'bugTriage',
  'decisionMatrix',
  'serviceBlueprint',
  'researchSynthesis',
  'contentCalendar',
] as const;

export type WBTemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TEMPLATE_META: Record<WBTemplateKind, { label: string; emoji: string; description: string; category: string }> = {
  brainstorm: { label: '브레인스토밍', emoji: '💡', category: '아이디어', description: '중앙 주제에서 8개 방향으로 아이디어를 확장' },
  kpt: { label: 'KPT 회고', emoji: 'KPT', category: '회고', description: 'Keep, Problem, Try를 바로 적는 회고 보드' },
  kanban: { label: '칸반', emoji: '▦', category: '실행', description: 'Backlog부터 Done까지 흐름을 정리' },
  mindmap: { label: '마인드맵', emoji: '◎', category: '아이디어', description: '핵심 주제와 하위 가지를 연결' },
  flowchart: { label: '플로우차트', emoji: '→', category: '다이어그램', description: '시작, 판단, 결과가 있는 프로세스 흐름' },
  comparison: { label: 'A/B 비교', emoji: 'A/B', category: '의사결정', description: '두 선택지를 기준별로 비교' },
  retrospective: { label: 'Start Stop Continue', emoji: 'SSC', category: '회고', description: '시작, 중단, 유지할 일을 나누는 회고' },
  debate: { label: '토론 구조', emoji: '⚖', category: '사고정리', description: '주장, 찬성, 반대, 근거를 한눈에 배치' },
  weeklyPlan: { label: '주간 계획', emoji: 'W', category: '실행', description: '이번 주 목표, 요일별 할 일, 리스크 정리' },
  roadmap: { label: '로드맵', emoji: 'R', category: '기획', description: 'Now, Next, Later와 마일스톤을 시각화' },
  userJourney: { label: '유저 여정맵', emoji: 'UX', category: 'UX', description: '단계별 행동, 감정, 기회를 정리' },
  empathyMap: { label: '공감 지도', emoji: '♥', category: 'UX', description: '사용자가 말하고 생각하고 느끼는 것을 분해' },
  swot: { label: 'SWOT', emoji: 'S', category: '전략', description: '강점, 약점, 기회, 위협을 2x2로 정리' },
  priorityMatrix: { label: '우선순위 매트릭스', emoji: '2x2', category: '의사결정', description: '임팩트와 노력 기준으로 일을 분류' },
  okr: { label: 'OKR', emoji: 'OKR', category: '전략', description: '목표와 핵심 결과를 연결하는 계획 보드' },
  meetingAgenda: { label: '회의 아젠다', emoji: 'M', category: '회의', description: '안건, 결정, 액션아이템, 보류 사항 정리' },
  workshopAgenda: { label: '워크숍 진행표', emoji: 'WS', category: '회의', description: '시간대별 활동과 산출물을 설계' },
  storyMap: { label: '스토리맵', emoji: 'SM', category: '기획', description: '사용자 활동, 태스크, 릴리스를 층으로 정리' },
  sprintPlanning: { label: '스프린트 계획', emoji: 'SP', category: '실행', description: '스프린트 목표, 백로그, 리스크, 커밋 범위' },
  bugTriage: { label: '버그 트리아지', emoji: 'BUG', category: '실행', description: '심각도와 상태별로 버그를 빠르게 분류' },
  decisionMatrix: { label: '결정 매트릭스', emoji: 'DM', category: '의사결정', description: '선택지와 기준을 점수로 비교' },
  serviceBlueprint: { label: '서비스 블루프린트', emoji: 'SB', category: 'UX', description: '고객 행동부터 시스템까지 서비스 흐름 분해' },
  researchSynthesis: { label: '리서치 종합', emoji: 'RS', category: 'UX', description: '관찰, 인사이트, 기회, 질문을 클러스터링' },
  contentCalendar: { label: '콘텐츠 캘린더', emoji: 'CAL', category: '기획', description: '주간 콘텐츠 계획과 채널별 상태 관리' },
};

function newId(): string {
  return `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function makeBase(x: number, y: number, w: number, h: number, zIndex = 0) {
  const now = Date.now();
  return {
    id: newId(),
    x,
    y,
    w,
    h,
    angle: 0,
    zIndex,
    opacity: 1,
    locked: false,
    groupIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeSticky(
  x: number,
  y: number,
  content = '',
  color: WBSticky['color'] = 'amber',
  size = 150,
  fontSize: WBSticky['fontSize'] = 16,
): WBSticky {
  return {
    ...makeBase(x, y, size, size, 10),
    type: 'sticky',
    content,
    color,
    fontSize,
    textAlign: 'left',
  };
}

function makeFrame(x: number, y: number, w: number, h: number, name: string, color: WBFrame['bgColor'] = 'transparent'): WBFrame {
  return {
    ...makeBase(x, y, w, h, -1000),
    type: 'frame',
    name,
    bgColor: color,
    childIds: [],
    clipChildren: false,
  };
}

function makeText(
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  fontSize: WBText['fontSize'] = 20,
  textAlign: WBText['textAlign'] = 'center',
  textColor: WBColor = 'ink',
): WBText {
  return {
    ...makeBase(x, y, w, h, 20),
    type: 'text',
    content,
    fontSize,
    fontFamily: 'sans',
    textColor,
    textAlign,
  };
}

function makeShape(
  type: Exclude<WBShapeKind, 'database' | 'document'>,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  fillColor: WBColor | 'none' = 'none',
  strokeColor: WBColor = 'slate',
): WBElement {
  return {
    ...makeBase(x, y, w, h, 5),
    type,
    cornerRadius: type === 'rect' ? 10 : undefined,
    tailDirection: type === 'speech' ? 'bl' : undefined,
    strokeColor,
    strokeWidth: 'normal',
    strokeStyle: 'solid',
    roughness: 0,
    fillColor,
    fillStyle: fillColor === 'none' ? 'none' : 'solid',
    text,
    textAlign: 'center',
    fontSize: 16,
  } as WBElement;
}

function makeRect(x: number, y: number, w: number, h: number, text: string, fillColor: WBColor | 'none' = 'none', strokeColor: WBColor = 'slate'): WBElement {
  return makeShape('rect', x, y, w, h, text, fillColor, strokeColor);
}

function makeDiamond(x: number, y: number, w: number, h: number, text: string, fillColor: WBColor | 'none' = 'none'): WBElement {
  return makeShape('diamond', x, y, w, h, text, fillColor, fillColor === 'none' ? 'slate' : fillColor);
}

function makeEllipse(x: number, y: number, w: number, h: number, text: string, fillColor: WBColor | 'none' = 'none'): WBElement {
  return makeShape('ellipse', x, y, w, h, text, fillColor, fillColor === 'none' ? 'slate' : fillColor);
}

function makeArrow(start: [number, number], end: [number, number], label?: string, color: WBColor = 'slate', curve: WBArrow['curve'] = 'straight'): WBArrow {
  const x = Math.min(start[0], end[0]);
  const y = Math.min(start[1], end[1]);
  const w = Math.abs(end[0] - start[0]) || 1;
  const h = Math.abs(end[1] - start[1]) || 1;
  return {
    ...makeBase(x, y, w, h, 2),
    type: 'arrow',
    strokeColor: color,
    strokeWidth: 'normal',
    strokeStyle: 'solid',
    roughness: 0,
    points: [start, end],
    startArrow: 'none',
    endArrow: 'arrow',
    curve,
    label,
  };
}

function titleBlock(elements: WBElement[], x: number, y: number, title: string, subtitle: string) {
  elements.push(makeText(x, y, 520, 38, title, 28, 'left'));
  elements.push(makeText(x, y + 42, 640, 28, subtitle, 14, 'left', 'slate'));
}

function framedColumns(originX: number, originY: number, title: string, subtitle: string, columns: Array<{ name: string; color: WBSticky['color']; notes: string[] }>): WBElement[] {
  const colW = 280;
  const colH = 520;
  const gap = 22;
  const totalW = columns.length * colW + (columns.length - 1) * gap;
  const x0 = originX - totalW / 2;
  const y0 = originY - colH / 2;
  const elements: WBElement[] = [];
  titleBlock(elements, x0, y0 - 92, title, subtitle);
  columns.forEach((column, i) => {
    const x = x0 + i * (colW + gap);
    elements.push(makeFrame(x, y0, colW, colH, column.name));
    column.notes.forEach((note, noteIndex) => {
      elements.push(makeSticky(x + 22, y0 + 64 + noteIndex * 132, note, column.color, 116, 14));
    });
  });
  return elements;
}

function quadrantTemplate(
  originX: number,
  originY: number,
  title: string,
  subtitle: string,
  quadrants: Array<{ name: string; color: WBSticky['color']; note: string }>,
): WBElement[] {
  const w = 360;
  const h = 250;
  const x0 = originX - w;
  const y0 = originY - h;
  const elements: WBElement[] = [];
  titleBlock(elements, x0, y0 - 88, title, subtitle);
  quadrants.forEach((q, i) => {
    const x = x0 + (i % 2) * w;
    const y = y0 + Math.floor(i / 2) * h;
    elements.push(makeFrame(x, y, w, h, q.name));
    elements.push(makeSticky(x + 28, y + 72, q.note, q.color, 132, 14));
    elements.push(makeSticky(x + 178, y + 72, '', q.color, 132, 14));
  });
  return elements;
}

function tableTemplate(originX: number, originY: number, title: string, subtitle: string, columns: string[], rows: string[]): WBElement[] {
  const cellW = 180;
  const cellH = 74;
  const cols = columns.length + 1;
  const rowCount = rows.length + 1;
  const x0 = originX - (cellW * cols) / 2;
  const y0 = originY - (cellH * rowCount) / 2;
  const elements: WBElement[] = [];
  titleBlock(elements, x0, y0 - 88, title, subtitle);
  const cells = Array.from({ length: rowCount * cols }, (_, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    if (r === 0 && c === 0) return '';
    if (r === 0) return columns[c - 1] ?? '';
    if (c === 0) return rows[r - 1] ?? '';
    return '';
  });
  const table: WBTable = {
    ...makeBase(x0, y0, cellW * cols, cellH * rowCount, 8),
    type: 'table',
    rows: rowCount,
    cols,
    cells,
    cellStyles: [],
    headerRow: true,
    borderColor: 'slate',
    headerFill: 'blue',
    textColor: 'ink',
    fontSize: 14,
  };
  elements.push(table);
  return elements;
}

export function buildTemplate(kind: WBTemplateKind, originX = 0, originY = 0): WBElement[] {
  switch (kind) {
    case 'brainstorm': {
      const elements: WBElement[] = [];
      const cx = originX;
      const cy = originY;
      titleBlock(elements, cx - 420, cy - 430, '브레인스토밍', '중앙 주제를 적고, 주변 스티커에 가능한 아이디어를 빠르게 펼쳐보세요.');
      elements.push(makeSticky(cx - 100, cy - 100, '주제\n무엇을 해결할까?', 'amber', 200, 18));
      const dist = 310;
      const ideas = ['사용자 문제', '빠른 실험', '차별점', '리스크', '필요 데이터', '성공 기준', '제약 조건', '다음 액션'];
      const colors: WBSticky['color'][] = ['pink', 'sky', 'mint', 'lavender', 'pink', 'sky', 'mint', 'slate'];
      ideas.forEach((idea, i) => {
        const angle = (i * Math.PI * 2) / ideas.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        elements.push(makeSticky(x - 80, y - 80, idea, colors[i], 160, 14));
        elements.push(makeArrow([cx, cy], [x - Math.cos(angle) * 88, y - Math.sin(angle) * 88], undefined, 'slate'));
      });
      return elements;
    }
    case 'kpt':
      return framedColumns(originX, originY, 'KPT 회고', '잘 된 것, 문제였던 것, 다음에 시도할 것을 분리해서 적으세요.', [
        { name: 'Keep - 계속할 것', color: 'mint', notes: ['효과가 있었던 행동', '팀에 남기고 싶은 습관', '다음에도 반복할 방식'] },
        { name: 'Problem - 문제', color: 'pink', notes: ['막힌 지점', '낭비된 시간', '반복되는 불편함'] },
        { name: 'Try - 시도', color: 'sky', notes: ['작게 실험할 개선안', '다음 회의 전 할 일', '측정할 지표'] },
      ]);
    case 'kanban':
      return framedColumns(originX, originY, '칸반 보드', '일의 흐름을 왼쪽에서 오른쪽으로 옮기며 상태를 관리하세요.', [
        { name: 'Backlog', color: 'slate', notes: ['아직 정리 전인 일', '나중에 할 후보'] },
        { name: 'To Do', color: 'amber', notes: ['이번에 착수할 일', '우선순위 높은 일'] },
        { name: 'Doing', color: 'sky', notes: ['진행 중', '막힘 있음'] },
        { name: 'Done', color: 'mint', notes: ['완료', '검증 필요'] },
      ]);
    case 'mindmap': {
      const elements: WBElement[] = [];
      const cx = originX;
      const cy = originY;
      titleBlock(elements, cx - 440, cy - 420, '마인드맵', '중앙 개념에서 핵심 가지와 하위 아이디어를 연결해보세요.');
      elements.push(makeEllipse(cx - 145, cy - 55, 290, 110, '중앙 주제', 'amber'));
      const branches = ['정의', '사용자', '문제', '해결책', '근거', '다음 질문'];
      const colors: WBSticky['color'][] = ['amber', 'pink', 'mint', 'sky', 'lavender', 'slate'];
      branches.forEach((branch, i) => {
        const angle = (i * Math.PI * 2) / branches.length - Math.PI / 2;
        const x = cx + Math.cos(angle) * 330;
        const y = cy + Math.sin(angle) * 250;
        elements.push(makeSticky(x - 78, y - 78, branch, colors[i], 156, 15));
        elements.push(makeSticky(x + 96, y - 48, '', colors[i], 104, 14));
        elements.push(makeArrow([cx + Math.cos(angle) * 150, cy + Math.sin(angle) * 62], [x - Math.cos(angle) * 84, y - Math.sin(angle) * 84], undefined, 'slate', 'curved'));
      });
      return elements;
    }
    case 'flowchart': {
      const x0 = originX - 520;
      const y0 = originY - 40;
      const elements: WBElement[] = [];
      titleBlock(elements, x0, y0 - 160, '플로우차트', '작업 흐름, 분기, 예외 처리를 단계별로 그려보세요.');
      elements.push(makeEllipse(x0, y0, 160, 78, 'Start', 'green'));
      elements.push(makeRect(x0 + 230, y0, 180, 78, '작업 단계', 'blue', 'blue'));
      elements.push(makeDiamond(x0 + 500, y0 - 20, 150, 120, '조건?', 'amber'));
      elements.push(makeRect(x0 + 760, y0 - 90, 180, 78, '성공 경로', 'mint', 'green'));
      elements.push(makeRect(x0 + 760, y0 + 90, 180, 78, '예외 처리', 'pink', 'pink'));
      elements.push(makeArrow([x0 + 160, y0 + 39], [x0 + 230, y0 + 39]));
      elements.push(makeArrow([x0 + 410, y0 + 39], [x0 + 500, y0 + 39]));
      elements.push(makeArrow([x0 + 650, y0 + 20], [x0 + 760, y0 - 51], 'Yes', 'green'));
      elements.push(makeArrow([x0 + 650, y0 + 58], [x0 + 760, y0 + 129], 'No', 'red'));
      return elements;
    }
    case 'comparison': {
      return tableTemplate(originX, originY, 'A/B 비교', '선택지를 감이 아니라 기준으로 비교하세요.', ['Option A', 'Option B'], ['장점', '리스크', '비용', '속도', '확신도']);
    }
    case 'retrospective':
      return framedColumns(originX, originY, 'Start Stop Continue', '팀이 시작할 것, 멈출 것, 계속할 것을 합의합니다.', [
        { name: 'Start', color: 'mint', notes: ['새로 시도할 습관', '작은 실험'] },
        { name: 'Stop', color: 'pink', notes: ['효과 없는 활동', '반복되는 방해'] },
        { name: 'Continue', color: 'sky', notes: ['계속 유지할 방식', '좋았던 협업'] },
      ]);
    case 'debate': {
      const cx = originX;
      const cy = originY;
      const elements: WBElement[] = [];
      titleBlock(elements, cx - 480, cy - 360, '토론 구조', '주장과 근거를 분리해서 논리를 더 선명하게 만드세요.');
      const claim = makeSticky(cx - 120, cy - 92, '핵심 주장', 'amber', 210, 18);
      const pro = makeSticky(cx - 470, cy - 140, '찬성 근거', 'mint', 170, 15);
      const con = makeSticky(cx + 300, cy - 140, '반대 근거', 'pink', 170, 15);
      const evidence = makeSticky(cx - 260, cy + 210, '데이터 / 사례', 'sky', 170, 15);
      const rebuttal = makeSticky(cx + 90, cy + 210, '반박 / 보완', 'lavender', 170, 15);
      elements.push(claim, pro, con, evidence, rebuttal);
      elements.push(makeArrow([pro.x + pro.w, pro.y + 82], [claim.x, claim.y + 70], 'supports', 'green'));
      elements.push(makeArrow([con.x, con.y + 82], [claim.x + claim.w, claim.y + 70], 'challenges', 'red'));
      elements.push(makeArrow([evidence.x + 85, evidence.y], [claim.x + 50, claim.y + claim.h], 'evidence', 'blue'));
      elements.push(makeArrow([rebuttal.x + 85, rebuttal.y], [claim.x + 158, claim.y + claim.h], 'refine', 'violet'));
      return elements;
    }
    case 'weeklyPlan':
      return framedColumns(originX, originY, '주간 계획', '이번 주 목표를 세우고 요일별 실행을 나눠보세요.', [
        { name: '목표', color: 'amber', notes: ['이번 주 가장 중요한 결과', '성공 기준'] },
        { name: '월-화', color: 'sky', notes: ['착수할 일', '확인할 사람'] },
        { name: '수-목', color: 'mint', notes: ['집중 작업', '중간 점검'] },
        { name: '금 / 리스크', color: 'pink', notes: ['마감 / 공유', '막힐 수 있는 것'] },
      ]);
    case 'roadmap':
      return framedColumns(originX, originY, '로드맵', '현재, 다음, 이후를 나누고 중요한 마일스톤을 표시하세요.', [
        { name: 'Now', color: 'mint', notes: ['이번 사이클 핵심', '출시 전 필수'] },
        { name: 'Next', color: 'sky', notes: ['다음 후보', '검증 필요'] },
        { name: 'Later', color: 'lavender', notes: ['중장기 아이디어', '의존성 있음'] },
        { name: 'Milestone', color: 'amber', notes: ['릴리스 날짜', '결정 포인트'] },
      ]);
    case 'userJourney': {
      const stages = ['인지', '가입', '첫 사용', '문제 발생', '재방문'];
      const rows = ['사용자 행동', '감정', '불편함', '기회'];
      return tableTemplate(originX, originY, '유저 여정맵', '단계별 사용자 경험을 행동, 감정, 기회로 나누어 봅니다.', stages, rows);
    }
    case 'empathyMap':
      return quadrantTemplate(originX, originY, '공감 지도', '한 명의 사용자를 떠올리고 말, 생각, 행동, 감정을 채워보세요.', [
        { name: 'Says - 말하는 것', color: 'sky', note: '"시간이 없어요"' },
        { name: 'Thinks - 생각하는 것', color: 'lavender', note: '실패하면 어쩌지?' },
        { name: 'Does - 행동', color: 'mint', note: '비교 검색을 반복' },
        { name: 'Feels - 감정', color: 'pink', note: '불안 / 기대' },
      ]);
    case 'swot':
      return quadrantTemplate(originX, originY, 'SWOT 분석', '내부 요인과 외부 요인을 나눠 전략 판단을 선명하게 합니다.', [
        { name: 'Strengths', color: 'mint', note: '이미 잘하는 것' },
        { name: 'Weaknesses', color: 'pink', note: '취약하거나 부족한 것' },
        { name: 'Opportunities', color: 'sky', note: '활용 가능한 변화' },
        { name: 'Threats', color: 'amber', note: '대응해야 할 위험' },
      ]);
    case 'priorityMatrix':
      return quadrantTemplate(originX, originY, '우선순위 매트릭스', '임팩트와 노력 기준으로 지금 할 일을 고릅니다.', [
        { name: '높은 임팩트 / 낮은 노력', color: 'mint', note: '바로 실행' },
        { name: '높은 임팩트 / 높은 노력', color: 'amber', note: '계획 후 추진' },
        { name: '낮은 임팩트 / 낮은 노력', color: 'sky', note: '여유 있을 때' },
        { name: '낮은 임팩트 / 높은 노력', color: 'pink', note: '보류 / 제거' },
      ]);
    case 'okr':
      return framedColumns(originX, originY, 'OKR 보드', '목표(Objective)와 측정 가능한 핵심 결과(Key Result)를 연결하세요.', [
        { name: 'Objective', color: 'amber', notes: ['무엇을 달성할까?', '왜 중요한가?'] },
        { name: 'KR 1', color: 'mint', notes: ['측정 지표', '현재값 → 목표값'] },
        { name: 'KR 2', color: 'sky', notes: ['측정 지표', '리스크'] },
        { name: 'Initiatives', color: 'lavender', notes: ['실행 과제', '담당자 / 마감'] },
      ]);
    case 'meetingAgenda':
      return framedColumns(originX, originY, '회의 아젠다', '회의 전에 안건을 정하고, 회의 중 결정과 액션을 분리하세요.', [
        { name: 'Agenda', color: 'amber', notes: ['오늘 논의할 주제', '시간 제한'] },
        { name: 'Decisions', color: 'mint', notes: ['결정된 내용', '근거'] },
        { name: 'Action Items', color: 'sky', notes: ['담당자 / 마감', '다음 확인'] },
        { name: 'Parking Lot', color: 'slate', notes: ['나중에 볼 주제', '범위 밖 이슈'] },
      ]);
    case 'workshopAgenda': {
      const elements: WBElement[] = [];
      const x0 = originX - 520;
      const y0 = originY - 280;
      titleBlock(elements, x0, y0 - 88, '워크숍 진행표', '시간, 활동, 산출물을 한 줄로 맞추면 진행이 훨씬 안정적입니다.');
      const blocks = [
        ['00:00', '목표 공유', '오늘의 산출물 합의'],
        ['00:15', '개별 작성', '아이디어 스티커'],
        ['00:35', '클러스터링', '주제 묶음'],
        ['01:00', '투표 / 결정', '우선순위'],
        ['01:20', '액션 정리', '담당자와 마감'],
      ];
      blocks.forEach(([time, activity, output], i) => {
        const x = x0 + i * 210;
        elements.push(makeRect(x, y0, 180, 86, `${time}\n${activity}`, i % 2 ? 'sky' : 'amber', i % 2 ? 'blue' : 'amber'));
        elements.push(makeSticky(x + 10, y0 + 122, output, i % 2 ? 'sky' : 'mint', 140, 14));
        if (i < blocks.length - 1) elements.push(makeArrow([x + 180, y0 + 43], [x + 210, y0 + 43]));
      });
      return elements;
    }
    case 'storyMap': {
      const activities = ['발견', '선택', '사용', '공유', '관리'];
      return tableTemplate(originX, originY, '스토리맵', '사용자 활동을 위에 두고, 아래에 태스크와 릴리스 범위를 쌓아보세요.', activities, ['Activity', 'Task', 'MVP', 'Later']);
    }
    case 'sprintPlanning':
      return framedColumns(originX, originY, '스프린트 계획', '이번 스프린트의 목표, 할 일, 리스크, 커밋 범위를 정리하세요.', [
        { name: 'Sprint Goal', color: 'amber', notes: ['이번 스프린트 한 문장 목표', '완료의 정의'] },
        { name: 'Candidate Backlog', color: 'sky', notes: ['후보 작업', '예상 난이도'] },
        { name: 'Risks / Capacity', color: 'pink', notes: ['휴가 / 의존성', '불확실한 작업'] },
        { name: 'Commit', color: 'mint', notes: ['팀이 약속한 범위', '검증 방법'] },
      ]);
    case 'bugTriage':
      return framedColumns(originX, originY, '버그 트리아지', '버그를 심각도와 처리 상태에 따라 빠르게 정렬하세요.', [
        { name: 'Critical', color: 'pink', notes: ['사용 불가', '데이터 손실'] },
        { name: 'High', color: 'amber', notes: ['주요 흐름 차단', '우회 어려움'] },
        { name: 'Normal', color: 'sky', notes: ['불편하지만 우회 가능', '검증 필요'] },
        { name: 'Fixed / Won’t fix', color: 'mint', notes: ['수정 완료', '처리하지 않을 이유'] },
      ]);
    case 'decisionMatrix':
      return tableTemplate(originX, originY, '결정 매트릭스', '선택지를 기준별로 점수화해서 감정적인 논쟁을 줄입니다.', ['Option A', 'Option B', 'Option C'], ['효과', '비용', '속도', '리스크', '총점']);
    case 'serviceBlueprint':
      return tableTemplate(originX, originY, '서비스 블루프린트', '고객이 보는 경험과 뒤에서 움직이는 운영을 함께 설계하세요.', ['인지', '요청', '처리', '완료', '사후관리'], ['고객 행동', '프론트스테이지', '백스테이지', '시스템', '정책/리스크']);
    case 'researchSynthesis':
      return framedColumns(originX, originY, '리서치 종합', '관찰 사실을 인사이트와 기회로 연결하는 보드입니다.', [
        { name: 'Raw Notes', color: 'slate', notes: ['인터뷰 원문', '관찰 사실'] },
        { name: 'Patterns', color: 'sky', notes: ['반복되는 패턴', '사용자 그룹'] },
        { name: 'Insights', color: 'amber', notes: ['왜 중요한가?', '숨은 니즈'] },
        { name: 'Opportunities', color: 'mint', notes: ['제품 기회', '다음 실험'] },
      ]);
    case 'contentCalendar':
      return tableTemplate(originX, originY, '콘텐츠 캘린더', '요일별 콘텐츠 주제와 채널, 상태를 함께 관리하세요.', ['월', '화', '수', '목', '금'], ['주제', '채널', '초안', '검수', '발행']);
  }
}
