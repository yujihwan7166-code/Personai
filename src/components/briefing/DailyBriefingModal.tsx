/**
 * 데일리 브리핑 v3 모달.
 *
 * - 황금비율 ~1100×680, 6×4 그리드
 * - iOS 위젯 스타일 (S/M/L)
 * - 편집 모드 (jiggle) + hover ⋯
 * - 위젯 picker (4×3 카드)
 * - 헤더: 인사말 + 날짜
 * - 푸터 X
 *
 * 사이트 톤: cream 카드 + hairline.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Plus, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildBriefingData } from '@/lib/buildBriefingData';
import {
  GRID_COLS, GRID_ROWS, WIDGET_META, ALL_WIDGET_KINDS,
  buildGrid, dailyBriefingStore, sizeToSpan, useBriefingSettings, canPlace,
  type PlacedWidget, type WidgetKind, type WidgetSize,
} from '@/lib/dailyBriefingStore';
import { renderWidget } from './widgets';

interface Props {
  open: boolean;
  onClose: () => void;
}

const HINT_SEEN_KEY = 'personai.daily-briefing.hint-seen';

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const settings = useBriefingSettings();
  // 종료 애니메이션 — open=false 가 되어도 잠시 mount 유지
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const data = useMemo(() => (visible ? buildBriefingData() : null), [visible]);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hintShown, setHintShown] = useState(false);

  // 첫 사용자 hint — 모달 처음 열 때 ⚙ 안내 (5초 후 자동 사라짐)
  useEffect(() => {
    if (!visible || typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(HINT_SEEN_KEY)) return;
    } catch { /* silent */ }
    const t1 = window.setTimeout(() => setHintShown(true), 400);
    const t2 = window.setTimeout(() => {
      setHintShown(false);
      try { window.localStorage.setItem(HINT_SEEN_KEY, '1'); } catch { /* silent */ }
    }, 5400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [visible]);

  const dismissHint = () => {
    setHintShown(false);
    try { window.localStorage.setItem(HINT_SEEN_KEY, '1'); } catch { /* silent */ }
  };

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setVisible(false);
        setClosing(false);
        setEditMode(false);
        setPickerOpen(false);
      }, 170);
      return () => window.clearTimeout(t);
    }
  }, [open, visible]);

  // ESC 닫기 (편집·picker 우선)
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerOpen) { setPickerOpen(false); return; }
        if (editMode) { setEditMode(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, editMode, pickerOpen, onClose]);

  // 열림 시 lastShownDate 기록 (autoShow 다음 표시 방지)
  useEffect(() => {
    if (open) dailyBriefingStore.markShownToday();
  }, [open]);

  if (!visible || !data || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데일리 브리핑"
      className={cn(
        'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm',
        closing ? 'wb-backdrop-out' : 'wb-backdrop-in',
      )}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={cn(
          'relative w-full max-w-[1120px] flex flex-col border border-foreground/10 rounded-3xl shadow-[0_20px_60px_-15px_hsl(30_30%_8%/0.25),_0_8px_25px_-8px_hsl(30_30%_8%/0.15)] overflow-hidden',
          closing ? 'wb-modal-out' : 'wb-modal-in',
        )}
        style={{
          height: 'min(700px, 92vh)',
          // 모달 자체 — 따뜻한 cream 톤 (상단 radial spot 으로 살짝 깊이감, Samsung 톤)
          background: 'radial-gradient(ellipse 65% 45% at 50% -10%, hsl(40 60% 98%) 0%, transparent 70%), linear-gradient(180deg, hsl(40 30% 96%) 0%, hsl(40 22% 93%) 100%)',
        }}
      >
        {/* 상단 hairline — 오늘 시간 진행률 (0-24h) */}
        <DayProgressBar />

        {/* 헤더 — hero 인사말 + 진행률 ring + 메타 */}
        <div className="shrink-0 px-5 sm:px-7 pt-5 pb-4 flex items-start gap-2 sm:gap-3 relative">
          {/* hairline divider — 헤더와 본문 자연 분리 */}
          <span aria-hidden className="absolute left-7 right-7 bottom-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[26px] sm:text-[30px] font-extrabold tracking-tight text-foreground leading-[1.1]">
              {data.greeting}
            </h2>
            <p className="text-[13px] text-foreground/70 mt-1.5 tabular-nums font-medium">
              {data.date}
              {data.timed.length > 0 && (
                <>
                  <span className="mx-1.5 text-foreground/20">·</span>
                  <span>오늘 일정 {data.timed.length}건</span>
                </>
              )}
              {data.inbox.length > 0 && (
                <>
                  <span className="mx-1.5 text-foreground/20">·</span>
                  <span>할일 {data.inbox.length}개</span>
                </>
              )}
            </p>
          </div>
          {/* 오늘 진행률 ring — 할일·습관 중 데이터 있는 것 우선 */}
          {(data.habits.length > 0 || data.inbox.length > 0) && (() => {
            const habitDone = data.habits.filter((h) => h.done).length;
            const habitTotal = data.habits.length;
            const useHabit = habitTotal > 0;
            const value = useHabit ? habitDone : 0;
            const total = useHabit ? habitTotal : data.inbox.length;
            const ratio = total > 0 ? value / total : 0;
            return (
              <div
                className="shrink-0 mr-1 flex flex-col items-center justify-center gap-0.5"
                title={useHabit ? `오늘 습관 ${habitDone}/${habitTotal}` : `오늘 할일 0/${total}`}
              >
                <ProgressRing size={36} ratio={ratio} />
                <span className="text-[9.5px] tabular-nums text-muted-foreground font-semibold uppercase tracking-wider">
                  {useHabit ? '습관' : '할일'}
                </span>
              </div>
            );
          })()}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setEditMode((v) => !v); dismissHint(); }}
              aria-label={editMode ? '편집 종료' : '편집'}
              title={editMode ? '편집 종료' : '위젯 편집'}
              className={cn(
                'shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full transition-all',
                editMode
                  ? 'bg-primary text-primary-foreground shadow-sm scale-[1.04]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                hintShown && !editMode && 'ring-2 ring-primary/40 ring-offset-2 ring-offset-transparent',
              )}
            >
              <Settings className={cn('h-[17px] w-[17px] transition-transform', editMode && 'rotate-90')} />
            </button>
            {/* 첫 사용자 hint tooltip */}
            {hintShown && !editMode && (
              <div className="absolute top-full right-0 mt-2 z-10 pointer-events-none animate-fade-in">
                <div
                  className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-medium whitespace-nowrap shadow-lg"
                  onClick={dismissHint}
                >
                  여기서 위젯 편집 ↑
                </div>
                {/* 화살표 */}
                <div className="absolute -top-1 right-3.5 w-2 h-2 bg-foreground rotate-45" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="h-[17px] w-[17px]" />
          </button>
        </div>

        {/* 본문 — 그리드 */}
        <div className="wb-briefing-scroll flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 pb-5 sm:pb-7 pt-1">
          {settings.widgets.length === 0 ? (
            <EmptyState onAdd={() => setPickerOpen(true)} />
          ) : (
            <BriefingGrid
              widgets={settings.widgets}
              data={data}
              editMode={editMode}
              onAdd={() => setPickerOpen(true)}
              onClose={onClose}
            />
          )}
        </div>

        {/* 편집 모드 안내 + autoShow 토글 */}
        {editMode && (
          <div className="shrink-0 px-5 sm:px-7 py-2.5 border-t border-foreground/8 flex items-center gap-3 sm:gap-4 bg-foreground/[0.02] backdrop-blur-sm">
            <div className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/85 font-semibold tracking-tight">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              편집 모드
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              드래그 · ⋯ 메뉴
              <kbd className="px-1.5 py-0.5 rounded bg-foreground/8 text-[9.5px] font-medium text-foreground/70 tracking-wider">Esc</kbd>
              종료
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-primary/10 transition-colors"
              title="위젯 추가"
            >
              <Plus className="h-3 w-3" />
              위젯 추가
            </button>
            <button
              type="button"
              onClick={() => { if (window.confirm('기본 위젯 구성으로 되돌릴까요?')) dailyBriefingStore.resetWidgets(); }}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-foreground/5 transition-colors"
              title="기본값으로 되돌리기"
            >
              <RotateCcw className="h-3 w-3" />
              기본값
            </button>
            <label className="ml-auto inline-flex items-center gap-2 text-[11.5px] text-foreground/85 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.autoShow}
                onChange={(e) => dailyBriefingStore.setAutoShow(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-foreground/30 accent-primary cursor-pointer"
              />
              매일 자동 표시
            </label>
          </div>
        )}

        {/* 위젯 picker overlay */}
        {pickerOpen && (
          <WidgetPicker
            settings={settings}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};

// ──────────────────────────────────────────
// 그리드 본체

function BriefingGrid({
  widgets, data, editMode, onAdd, onClose,
}: {
  widgets: PlacedWidget[];
  data: ReturnType<typeof buildBriefingData>;
  editMode: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number; valid: boolean } | null>(null);

  // 셀 좌표 계산 — 마우스 위치에서 col/row 산출
  const computeCell = (clientX: number, clientY: number): { col: number; row: number } | null => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    const col = Math.floor((x / rect.width) * GRID_COLS);
    const row = Math.floor((y / rect.height) * GRID_ROWS);
    return { col: Math.max(0, Math.min(GRID_COLS - 1, col)), row: Math.max(0, Math.min(GRID_ROWS - 1, row)) };
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const cell = computeCell(e.clientX, e.clientY);
    if (!cell) return;
    const dragWidget = widgets.find((w) => w.id === dragId);
    if (!dragWidget) return;
    const valid = canPlace(widgets, dragWidget.size, cell.col, cell.row, dragId);
    setHoverCell({ ...cell, valid });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || !hoverCell || !hoverCell.valid) { setDragId(null); setHoverCell(null); return; }
    dailyBriefingStore.moveWidget(dragId, hoverCell.col, hoverCell.row);
    setDragId(null);
    setHoverCell(null);
  };

  return (
    <div
      ref={gridRef}
      className="wb-briefing-grid relative w-full h-full grid gap-4"
      onDragOver={editMode ? handleDragOver : undefined}
      onDrop={editMode ? handleDrop : undefined}
      onDragEnd={() => { setDragId(null); setHoverCell(null); }}
    >
      {/* 편집 모드 — 빈 셀 outline (클릭으로 위젯 추가, drop zone 도 겸함) */}
      {editMode && (() => {
        const occupied = buildGrid(widgets);
        const emptyCells: Array<{ col: number; row: number }> = [];
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            if (!occupied[r][c]) emptyCells.push({ col: c, row: r });
          }
        }
        // 첫 빈 셀은 + 버튼 강조, 나머지는 옅은 outline
        return emptyCells.map((cell, i) => (
          <button
            key={`empty-${cell.col}-${cell.row}`}
            type="button"
            onClick={onAdd}
            className={cn(
              'rounded-xl border border-dashed transition-colors flex items-center justify-center group',
              i === 0
                ? 'border-foreground/25 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/4'
                : 'border-foreground/10 text-foreground/30 hover:border-primary/40 hover:text-primary hover:bg-primary/4',
            )}
            style={{
              gridColumn: `${cell.col + 1} / span 1`,
              gridRow: `${cell.row + 1} / span 1`,
            }}
            title="위젯 추가"
            aria-label="위젯 추가"
          >
            <Plus className={cn('transition-all', i === 0 ? 'h-5 w-5' : 'h-3.5 w-3.5 opacity-50 group-hover:opacity-100')} />
          </button>
        ));
      })()}
      {widgets.map((w, idx) => (
        <WidgetCard
          key={w.id}
          widget={w}
          data={data}
          editMode={editMode}
          isDragging={dragId === w.id}
          onDragStart={() => setDragId(w.id)}
          onDragEnd={() => { setDragId(null); setHoverCell(null); }}
          onClose={onClose}
          /* 스태거 entrance — index 기반 살짝 지연 */
          style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
        />
      ))}
      {/* 드래그 hover preview cell */}
      {editMode && dragId && hoverCell && (() => {
        const dragWidget = widgets.find((w) => w.id === dragId);
        if (!dragWidget) return null;
        const span = sizeToSpan(dragWidget.size);
        return (
          <div
            className={cn(
              'pointer-events-none rounded-2xl border-2 border-dashed',
              hoverCell.valid ? 'border-primary bg-primary/8' : 'border-destructive bg-destructive/8',
            )}
            style={{
              gridColumn: `${hoverCell.col + 1} / span ${span.w}`,
              gridRow: `${hoverCell.row + 1} / span ${span.h}`,
            }}
          />
        );
      })()}
    </div>
  );
}

// ──────────────────────────────────────────
// 위젯 카드 — wrapper (jiggle, hover ⋯, position)

function WidgetCard({
  widget, data, editMode, isDragging, onDragStart, onDragEnd, onClose, style,
}: {
  widget: PlacedWidget;
  data: ReturnType<typeof buildBriefingData>;
  editMode: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const span = sizeToSpan(widget.size);
  const meta = WIDGET_META[widget.kind];
  const isHero = widget.kind === 'pickFirst';

  return (
    <div
      data-wb-size={widget.size}
      draggable={editMode}
      onDragStart={(e) => {
        if (!editMode) return;
        e.dataTransfer.effectAllowed = 'move';
        // Firefox 요구 — setData 필수
        e.dataTransfer.setData('text/plain', widget.id);
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenuOpen(false); }}
      /* 편집 모드에서 카드 본문 클릭 → 네비게이션 방지 (X·⋯ 만 동작) */
      onClickCapture={(e) => {
        if (!editMode) return;
        const t = e.target as HTMLElement;
        if (t.closest('[data-wb-edit-control]')) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        'wb-widget-card relative rounded-2xl overflow-hidden transition-all',
        // 평소 — 부드러운 흰 카드 (Samsung 톤)
        !editMode && 'bg-card shadow-[0_1px_2px_hsl(30_15%_8%/0.04),_0_2px_8px_-4px_hsl(30_15%_8%/0.06)]',
        !editMode && 'hover:shadow-[0_8px_28px_-12px_hsl(30_15%_8%/0.18),_0_3px_10px_-4px_hsl(30_15%_8%/0.10)] hover:-translate-y-0.5',
        // 편집 모드 — boundary 명확 + ring (부드러운 톤)
        editMode && 'wb-jiggle ring-1 ring-foreground/15 cursor-grab bg-card shadow-[0_2px_6px_-2px_hsl(30_15%_8%/0.10)]',
        editMode && isDragging && 'opacity-30 cursor-grabbing',
      )}
      style={{
        ...style,
        gridColumn: `${widget.col + 1} / span ${span.w}`,
        gridRow: `${widget.row + 1} / span ${span.h}`,
        // hero (pickFirst) 만 옅은 amber ground — 다른 카드는 plain white
        // hover 시: 위젯 tint 색이 살짝 묻어남
        background: isHero && !editMode
          ? `linear-gradient(135deg, ${meta.tint.hue.replace(')', ' / 0.10)').replace('hsl(', 'hsla(')}, hsl(var(--card)) 70%)`
          : (hover && !editMode
              ? `linear-gradient(180deg, ${meta.tint.hue.replace(')', ' / 0.05)').replace('hsl(', 'hsla(')}, hsl(var(--card)) 100%)`
              : undefined),
      }}
    >
      {renderWidget({ widget, data, onClose })}

      {/* 편집 모드 — 좌상단 X 버튼 */}
      {editMode && (
        <button
          type="button"
          data-wb-edit-control
          onClick={(e) => { e.stopPropagation(); dailyBriefingStore.removeWidget(widget.id); }}
          className="wb-pop-in absolute top-1.5 left-1.5 z-10 h-5 w-5 inline-flex items-center justify-center rounded-full bg-foreground/85 text-background hover:bg-rose-500 hover:scale-110 transition-all"
          aria-label="삭제"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* hover ⋯ 메뉴 — 평소·편집 모드 둘 다 */}
      {(hover || menuOpen) && (
        <div data-wb-edit-control className="absolute top-1.5 right-1.5 z-10">
          <WidgetActionMenu
            widget={widget}
            open={menuOpen}
            onToggle={(v) => setMenuOpen(v)}
          />
        </div>
      )}
    </div>
  );
}

function WidgetActionMenu({
  widget, open, onToggle,
}: { widget: PlacedWidget; open: boolean; onToggle: (v: boolean) => void }) {
  const meta = WIDGET_META[widget.kind];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(!open); }}
        className="h-5 w-5 inline-flex items-center justify-center rounded-md bg-card/95 backdrop-blur-sm border border-foreground/12 text-muted-foreground hover:text-foreground transition-colors text-[14px] leading-none"
        aria-label="위젯 메뉴"
      >
        ⋯
      </button>
      {open && (
        <div className="wb-menu-in absolute right-0 top-6 z-20 min-w-[150px] bg-card border border-foreground/12 rounded-lg shadow-[0_8px_24px_-8px_hsl(30_30%_8%/0.25),_0_2px_6px_-2px_hsl(30_30%_8%/0.12)] py-1.5 text-[11.5px] overflow-hidden">
          {meta.allowedSizes.length > 1 && (
            <div className="px-2.5 py-1 text-[9.5px] uppercase tracking-wider text-muted-foreground/70 font-semibold">크기</div>
          )}
          {meta.allowedSizes.length > 1 && meta.allowedSizes.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={(e) => { e.stopPropagation(); dailyBriefingStore.resizeWidget(widget.id, sz); onToggle(false); }}
              className={cn(
                'w-full text-left px-2.5 py-1 hover:bg-foreground/5 flex items-center gap-2 transition-colors',
                widget.size === sz && 'text-primary font-semibold',
              )}
            >
              <SizeIcon size={sz} active={widget.size === sz} />
              <span className="flex-1">{sizeLabel(sz)}</span>
              {sz === widget.size && <span className="text-[10px]">✓</span>}
            </button>
          ))}
          {meta.allowedSizes.length > 1 && <div className="my-1 border-t border-foreground/8" />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dailyBriefingStore.removeWidget(widget.id); }}
            className="w-full text-left px-2.5 py-1.5 hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

/** 크기 미니 아이콘 — S=1×1, M=2×1, L=2×2 비율로 시각 표현. */
function SizeIcon({ size, active }: { size: WidgetSize; active?: boolean }) {
  const w = size === 'S' ? 4 : 8;
  const h = size === 'L' ? 8 : 4;
  return (
    <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
      <div
        className={cn(
          'rounded-[1.5px] border',
          active ? 'bg-primary/85 border-primary' : 'border-foreground/35 bg-foreground/8',
        )}
        style={{ width: `${w}px`, height: `${h}px` }}
      />
    </div>
  );
}

function sizeLabel(size: WidgetSize): string {
  return size === 'S' ? '1×1' : size === 'M' ? '2×1' : '2×2';
}

// ──────────────────────────────────────────
// 위젯 picker — 4×3 카드 그리드

function WidgetPicker({
  settings, onClose,
}: { settings: ReturnType<typeof useBriefingSettings>; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 145);
  };
  const usedKinds = new Set(settings.widgets.map((w) => w.kind));
  const grouped: Record<string, WidgetKind[]> = {
    '내 데이터': [],
    '외부 정보': [],
  };
  const q = query.trim().toLowerCase();
  for (const kind of ALL_WIDGET_KINDS) {
    const meta = WIDGET_META[kind];
    if (q && !meta.label.toLowerCase().includes(q) && !kind.toLowerCase().includes(q)) continue;
    grouped[meta.group].push(kind);
  }
  return (
    <div
      className={cn(
        'absolute inset-0 z-30 bg-foreground/20 backdrop-blur-md flex items-center justify-center p-6',
        closing ? 'wb-backdrop-out' : 'wb-backdrop-in',
      )}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className={cn(
          'w-full max-w-[760px] max-h-[88%] border border-foreground/10 rounded-2xl shadow-[0_20px_60px_-15px_hsl(30_30%_8%/0.35),_0_8px_25px_-8px_hsl(30_30%_8%/0.18)] flex flex-col overflow-hidden',
          closing ? 'wb-picker-out' : 'wb-picker-in',
        )}
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, hsl(40 60% 98%) 0%, transparent 70%), linear-gradient(180deg, hsl(40 30% 96%), hsl(40 22% 93%))' }}
      >
        <div className="shrink-0 px-5 py-3 border-b border-foreground/12 flex items-center gap-3">
          <h3 className="text-[14px] font-semibold text-foreground shrink-0">위젯 추가</h3>
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="검색..."
              className="w-full h-7 pl-2.5 pr-7 text-[12px] rounded-md bg-foreground/5 border border-transparent focus:outline-none focus:border-primary/30 focus:bg-card transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 inline-flex items-center justify-center rounded-full text-muted-foreground/65 hover:text-foreground hover:bg-foreground/10 transition-colors"
                aria-label="검색어 지우기"
                title="지우기"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 shrink-0 transition-colors"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="wb-briefing-scroll flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {(['내 데이터', '외부 정보'] as const).map((group) => {
            if (grouped[group].length === 0) return null;
            return (
            <div key={group}>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/75 font-semibold mb-2">
                {group}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {grouped[group].map((kind) => {
                  const meta = WIDGET_META[kind];
                  const already = usedKinds.has(kind);
                  const disabled = already || meta.soon;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        dailyBriefingStore.addWidget(kind);
                        close();
                      }}
                      disabled={disabled}
                      className={cn(
                        'group relative p-3.5 rounded-xl text-left transition-all bg-card overflow-hidden',
                        'shadow-[0_1px_2px_hsl(30_15%_8%/0.04),_0_2px_8px_-4px_hsl(30_15%_8%/0.06)]',
                        disabled
                          ? 'text-foreground/40 cursor-not-allowed opacity-60'
                          : 'hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-8px_hsl(30_15%_8%/0.18)]',
                      )}
                    >
                      {/* hover 시 위젯 tint 색이 살짝 묻어남 */}
                      {!disabled && (
                        <span
                          aria-hidden
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                          style={{
                            background: `radial-gradient(circle at 30% 0%, ${meta.tint.hue.replace(')', ' / 0.10)')}, transparent 65%)`,
                          }}
                        />
                      )}
                      <div
                        className="text-2xl mb-1.5 relative"
                        style={!disabled ? { color: meta.tint.hue } : undefined}
                      >{meta.emoji}</div>
                      <div className="text-[12.5px] font-semibold text-foreground/90 truncate relative">{meta.label}</div>
                      <div className="text-[10px] text-muted-foreground/75 mt-0.5 font-medium tabular-nums relative">
                        {sizeLabel(meta.defaultSize)}
                      </div>
                      {already && (
                        <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">✓</span>
                      )}
                      {meta.soon && !already && (
                        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wide text-muted-foreground/70 font-semibold">곧</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}
          {grouped['내 데이터'].length === 0 && grouped['외부 정보'].length === 0 && (
            <div className="text-center py-10 text-[12.5px] text-muted-foreground">
              "{query}" 와 일치하는 위젯이 없어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 빈 상태

// 작은 진행률 ring — 헤더용 (그라디언트 stroke 으로 살짝 입체감)
function ProgressRing({ size, ratio }: { size: number; ratio: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const offset = c * (1 - clamped);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <linearGradient id="wb-ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(28 88% 58%)" />
          <stop offset="100%" stopColor="hsl(28 88% 48%)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--foreground) / 0.10)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#wb-ring-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 3.4}
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="800"
        fill="hsl(var(--foreground))"
        className="font-display tabular-nums"
      >{Math.round(clamped * 100)}</text>
    </svg>
  );
}

/** 오늘 하루 시간 진행률 — 모달 상단 hairline (1분마다 업데이트). */
function DayProgressBar() {
  const [ratio, setRatio] = useState(() => {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
  });
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setRatio((now.getHours() * 60 + now.getMinutes()) / (24 * 60));
    }, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="shrink-0 h-[2px] bg-foreground/[0.04] overflow-hidden">
      <div
        className="h-full transition-all duration-1000"
        style={{
          width: `${ratio * 100}%`,
          background: 'linear-gradient(90deg, hsl(28 88% 58%), hsl(28 88% 48%))',
        }}
        title={`오늘 ${Math.round(ratio * 100)}% 지남`}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
      <div
        className="text-[56px] leading-none"
        style={{ filter: 'drop-shadow(0 6px 14px hsl(28 88% 52% / 0.18))' }}
      >🎨</div>
      <div className="space-y-1">
        <p className="font-display text-[18px] font-bold text-foreground">위젯이 없어요</p>
        <p className="text-[12.5px] text-muted-foreground max-w-[300px] leading-relaxed">
          날씨, 일정, 환율, 뉴스 등 13가지 위젯으로<br />
          나만의 아침을 시작해보세요
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-5 h-9 rounded-full bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-[0_4px_12px_-4px_hsl(28_88%_52%/0.4)]"
      >
        <Plus className="h-3.5 w-3.5" />
        위젯 추가하기
      </button>
    </div>
  );
}
