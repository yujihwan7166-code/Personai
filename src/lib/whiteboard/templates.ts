/**
 * 화이트보드 — 보드 시작 템플릿.
 *
 * Miro/FigJam 스타일: 빈 캔버스 공포 해소.
 * 4종: 브레인스토밍 / 회고 KPT / 칸반 / 마인드맵
 */
import type { WBElement, WBSticky, WBFrame, WBText, WBArrow } from '@/types/whiteboard';

export type WBTemplateKind = 'brainstorm' | 'kpt' | 'kanban' | 'mindmap';

export const TEMPLATE_META: Record<WBTemplateKind, { label: string; emoji: string; description: string }> = {
  brainstorm: { label: '브레인스토밍', emoji: '💡', description: '중심 주제 + 8방향 빈 스티키' },
  kpt:        { label: '회고 (KPT)',   emoji: '🔍', description: 'Keep · Problem · Try 3 프레임' },
  kanban:     { label: '칸반',         emoji: '📋', description: 'To Do · Doing · Done 3 프레임' },
  mindmap:    { label: '마인드맵',     emoji: '🌳', description: '중심 + 6 분기' },
};

function newId(): string {
  return `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function makeBase(x: number, y: number, w: number, h: number, zIndex = 0) {
  const now = Date.now();
  return {
    id: newId(),
    x, y, w, h,
    angle: 0,
    zIndex,
    opacity: 1,
    locked: false,
    groupIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

function makeSticky(x: number, y: number, content: string, color: WBSticky['color'] = 'amber', size = 180): WBSticky {
  return {
    ...makeBase(x, y, size, size, 0),
    type: 'sticky',
    content,
    color,
    fontSize: 16,
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

function makeText(x: number, y: number, w: number, h: number, content: string, fontSize: WBText['fontSize'] = 20): WBText {
  return {
    ...makeBase(x, y, w, h, 1),
    type: 'text',
    content,
    fontSize,
    fontFamily: 'sans',
    textColor: 'ink',
    textAlign: 'center',
  };
}

function makeArrow(start: [number, number], end: [number, number]): WBArrow {
  const x = Math.min(start[0], end[0]);
  const y = Math.min(start[1], end[1]);
  const w = Math.abs(end[0] - start[0]) || 1;
  const h = Math.abs(end[1] - start[1]) || 1;
  return {
    ...makeBase(x, y, w, h, 0),
    type: 'arrow',
    strokeColor: 'slate',
    strokeWidth: 'normal',
    strokeStyle: 'solid',
    roughness: 1,
    points: [start, end],
    startArrow: 'none',
    endArrow: 'arrow',
    curve: 'straight',
  };
}

// ──────────────────────────────────────────
export function buildTemplate(kind: WBTemplateKind, originX = 0, originY = 0): WBElement[] {
  switch (kind) {
    case 'brainstorm': {
      const cx = originX;
      const cy = originY;
      const elements: WBElement[] = [];
      // 중앙 스티키 (주제)
      elements.push(makeSticky(cx - 110, cy - 110, '🎯 주제', 'amber', 220));
      // 8방향 빈 스티키 (180px, 280px 거리)
      const dist = 320;
      const dirs: Array<[number, number, WBSticky['color']]> = [
        [0, -1, 'pink'], [1, -1, 'sky'], [1, 0, 'mint'], [1, 1, 'lavender'],
        [0, 1, 'pink'], [-1, 1, 'sky'], [-1, 0, 'mint'], [-1, -1, 'lavender'],
      ];
      for (const [dx, dy, col] of dirs) {
        const ang = Math.atan2(dy, dx);
        elements.push(makeSticky(cx + Math.cos(ang) * dist - 90, cy + Math.sin(ang) * dist - 90, '', col));
      }
      return elements;
    }
    case 'kpt': {
      const FW = 360;
      const FH = 480;
      const GAP = 24;
      const x0 = originX - (FW * 3 + GAP * 2) / 2;
      const y0 = originY - FH / 2;
      const elements: WBElement[] = [];
      const keep = makeFrame(x0, y0, FW, FH, '🟢 Keep — 잘된 것');
      const problem = makeFrame(x0 + FW + GAP, y0, FW, FH, '🟡 Problem — 문제');
      const tryF = makeFrame(x0 + (FW + GAP) * 2, y0, FW, FH, '🔵 Try — 시도할 것');
      elements.push(keep, problem, tryF);
      // 각 프레임에 빈 스티키 2개씩
      const stickyOffset = 20;
      const stickySize = 160;
      for (const [frame, color] of [
        [keep, 'mint' as const],
        [problem, 'pink' as const],
        [tryF, 'sky' as const],
      ] as const) {
        elements.push(makeSticky(frame.x + stickyOffset, frame.y + 50, '', color, stickySize));
        elements.push(makeSticky(frame.x + stickyOffset, frame.y + 50 + stickySize + 16, '', color, stickySize));
      }
      return elements;
    }
    case 'kanban': {
      const FW = 320;
      const FH = 600;
      const GAP = 24;
      const x0 = originX - (FW * 3 + GAP * 2) / 2;
      const y0 = originY - FH / 2;
      const elements: WBElement[] = [];
      const todo = makeFrame(x0, y0, FW, FH, '📥 To Do');
      const doing = makeFrame(x0 + FW + GAP, y0, FW, FH, '🚧 Doing');
      const done = makeFrame(x0 + (FW + GAP) * 2, y0, FW, FH, '✅ Done');
      elements.push(todo, doing, done);
      // 각 프레임 첫 스티키
      const stickySize = 160;
      elements.push(makeSticky(todo.x + 20, todo.y + 50, '할일 1', 'amber', stickySize));
      elements.push(makeSticky(todo.x + 20, todo.y + 50 + stickySize + 16, '할일 2', 'amber', stickySize));
      return elements;
    }
    case 'mindmap': {
      const cx = originX;
      const cy = originY;
      const elements: WBElement[] = [];
      // 중심 노드 (큰 텍스트)
      const center = makeText(cx - 150, cy - 30, 300, 60, '🌳 중심 주제', 28);
      elements.push(center);
      // 6 분기 — 둘레 스티키
      const dist = 280;
      const colors: WBSticky['color'][] = ['amber', 'pink', 'mint', 'sky', 'lavender', 'slate'];
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        elements.push(makeSticky(px - 80, py - 80, `가지 ${i + 1}`, colors[i], 160));
        // 화살표 중심 → 가지
        elements.push(makeArrow([cx, cy], [px - Math.cos(ang) * 80, py - Math.sin(ang) * 80]));
      }
      return elements;
    }
  }
}
