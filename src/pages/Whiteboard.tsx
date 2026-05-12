/**
 * 화이트보드 — 4번째 노트 페이지.
 *
 * Phase 1 작업 진행 중. 현재 스켈레톤:
 * - 사이드바 (메모 톤, 보드 목록 자리잡이)
 * - 캔버스 풀블리드 + dot grid
 * - 플로팅 UI: BoardHeader · ToolPalette · PageSwitcher · ZoomControls · MiniMap · HelpHint
 *
 * 다음 단계: zustand store + 실제 캔버스 렌더 + 도구 동작
 */
import { useState } from 'react';
import {
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  Minus,
  Pencil,
  Eraser,
  ArrowRight,
  Plus,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
  Save,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSwitcher } from '@/components/PageSwitcher';

type ToolKey = 'select' | 'pan' | 'text' | 'sticky' | 'shape' | 'line' | 'pen' | 'eraser';

interface ToolDef {
  key: ToolKey;
  label: string;
  shortcut: string;
  icon: LucideIcon;
  hasFlyout?: boolean;
}

const TOOLS: ToolDef[] = [
  { key: 'select',  label: '선택',     shortcut: 'V', icon: MousePointer2 },
  { key: 'pan',     label: '손/팬',    shortcut: 'H', icon: Hand },
  { key: 'text',    label: '텍스트',   shortcut: 'T', icon: Type },
  { key: 'sticky',  label: '스티키',   shortcut: 'S', icon: StickyNote,  hasFlyout: true },
  { key: 'shape',   label: '도형',     shortcut: 'R', icon: Square,      hasFlyout: true },
  { key: 'line',    label: '선·화살표', shortcut: 'L', icon: Minus,       hasFlyout: true },
  { key: 'pen',     label: '펜',       shortcut: 'P', icon: Pencil,      hasFlyout: true },
  { key: 'eraser',  label: '지우개',   shortcut: 'E', icon: Eraser },
];

/** 도구 그룹 구분 (사이 hairline). */
const TOOL_GROUPS: Array<ToolKey[]> = [
  ['select', 'pan'],
  ['text', 'sticky', 'shape', 'line', 'pen'],
  ['eraser'],
];

export default function Whiteboard() {
  const [activeTool, setActiveTool] = useState<ToolKey>('select');
  const [boardName, setBoardName] = useState('새 보드');

  return (
    <div className="wiki-warm-theme min-h-screen flex bg-background">
      {/* ── 사이드바 (메모 톤 미러) ───────────────────────── */}
      <aside className="shrink-0 w-[268px] border-r border-foreground/25 bg-background flex flex-col">
        {/* 상단 — 제목 + 새 폴더·새 보드 */}
        <div className="shrink-0 px-2.5 py-2 border-b border-foreground/22 flex items-center gap-1">
          <h1 className="text-[19px] font-semibold text-foreground tracking-tight flex-1 flex items-baseline gap-2">
            <span>화이트보드</span>
            <span className="text-[12px] font-normal text-muted-foreground tabular-nums">0</span>
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="새 폴더"
          >
            <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
            폴더
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[12px] font-medium text-primary hover:bg-primary/10 transition-colors"
            title="새 보드"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            보드
          </button>
        </div>

        {/* 보드 목록 자리잡이 */}
        <div className="flex-1 overflow-y-auto px-4 py-10 text-center">
          <p className="text-[13px] text-foreground mb-1">비어있음</p>
          <p className="text-[12px] text-muted-foreground">+ 버튼으로 새 보드 시작</p>
        </div>

        {/* 휴지통 자리잡이 */}
        <div className="shrink-0 border-t border-foreground/22">
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <span className="flex-1 text-left">휴지통</span>
            <span className="text-[10.5px] tabular-nums">0</span>
            <ChevronRight className="w-3 h-3 opacity-60" strokeWidth={2} />
          </button>
        </div>
      </aside>

      {/* ── 본문 (풀블리드 캔버스 + 플로팅 UI) ───────────────────── */}
      <main className="flex-1 min-w-0 relative overflow-hidden bg-background">
        {/* 빈 캔버스 + dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.10) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* 좌상 — 보드 헤더 */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <FloatingCard className="flex items-center gap-2 px-3 h-9">
            <button
              type="button"
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="보드 메뉴"
              title="보드 메뉴"
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="bg-transparent text-[13.5px] font-medium text-foreground outline-none focus:bg-accent/40 rounded px-1.5 py-0.5 min-w-[140px]"
            />
            <span
              className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/80"
              title="저장됨"
            >
              <Save className="w-3 h-3" strokeWidth={1.75} />
              저장됨
            </span>
          </FloatingCard>
        </div>

        {/* 우상 — PageSwitcher */}
        <div className="absolute right-4 top-4">
          <PageSwitcher current="whiteboard" />
        </div>

        {/* 좌측 세로 — 도구 팔레트 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <FloatingCard className="flex flex-col p-1 gap-0.5">
            {TOOL_GROUPS.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-0.5">
                {group.map((key) => {
                  const tool = TOOLS.find((t) => t.key === key)!;
                  const Icon = tool.icon;
                  const active = activeTool === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTool(key)}
                      title={`${tool.label} (${tool.shortcut})`}
                      aria-label={tool.label}
                      aria-pressed={active}
                      className={cn(
                        'relative w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                        active
                          ? 'bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                      {tool.hasFlyout && (
                        <span
                          aria-hidden
                          className="absolute right-1 bottom-1 w-1 h-1 rounded-full bg-current opacity-60"
                        />
                      )}
                    </button>
                  );
                })}
                {gi < TOOL_GROUPS.length - 1 && (
                  <div className="my-0.5 mx-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
                )}
              </div>
            ))}
          </FloatingCard>
        </div>

        {/* 좌하 — 줌 컨트롤 */}
        <div className="absolute left-4 bottom-4">
          <FloatingCard className="flex items-center gap-0.5 px-1 h-9">
            <ZoomBtn icon={ZoomOut} label="축소" />
            <span className="px-2 text-[11.5px] font-medium tabular-nums text-foreground/80 min-w-[44px] text-center">100%</span>
            <ZoomBtn icon={ZoomIn} label="확대" />
            <div className="w-px h-4 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
            <ZoomBtn icon={Maximize2} label="전체 보기" />
          </FloatingCard>
        </div>

        {/* 우하 — 도움말 */}
        <div className="absolute right-4 bottom-4 flex items-center gap-2">
          <FloatingCard className="w-9 h-9 flex items-center justify-center">
            <button
              type="button"
              className="w-full h-full rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="단축키 도움말"
              title="단축키 (?)"
            >
              <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>
          </FloatingCard>
        </div>

        {/* 중앙 — 빈 캔버스 안내 (placeholder, 데이터 모델 연결 전까지) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-card/80 backdrop-blur-sm border border-[hsl(var(--hairline))] shadow-sm mb-3">
              <ArrowRight className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-foreground mb-1">캔버스 준비 중</p>
            <p className="text-[12px] text-muted-foreground max-w-[280px]">
              데이터 모델·도구 동작은 다음 단계에서 연결돼요. <br />
              지금은 페이지 골격만 보여요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────
function FloatingCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[hsl(var(--hairline))] bg-card/95 backdrop-blur-sm',
        'shadow-[0_4px_14px_-8px_hsl(30_30%_8%/0.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function ZoomBtn({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label={label}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    </button>
  );
}
