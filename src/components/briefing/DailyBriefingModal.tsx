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
  dailyBriefingStore, sizeToSpan, useBriefingSettings, canPlace,
  type PlacedWidget, type WidgetKind, type WidgetSize,
} from '@/lib/dailyBriefingStore';
import { renderWidget } from './widgets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const settings = useBriefingSettings();
  // 종료 애니메이션 — open=false 가 되어도 잠시 mount 유지
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const data = useMemo(() => (visible ? buildBriefingData() : null), [visible]);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
          'relative w-full max-w-[1120px] flex flex-col bg-card border border-foreground/10 rounded-3xl shadow-[0_20px_60px_-15px_hsl(30_30%_8%/0.25),_0_8px_25px_-8px_hsl(30_30%_8%/0.15)] overflow-hidden',
          closing ? 'wb-modal-out' : 'wb-modal-in',
        )}
        style={{
          height: 'min(700px, 92vh)',
          // 모달 자체에 옅은 따뜻한 그라디언트 — 위쪽 살짝 밝게
          backgroundImage: 'linear-gradient(180deg, hsl(40 35% 99%) 0%, hsl(var(--card)) 240px)',
        }}
      >
        {/* 헤더 — hero 인사말 + 진행률 ring + 메타 */}
        <div className="shrink-0 px-7 pt-5 pb-4 flex items-start gap-3">
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
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? '편집 종료' : '편집'}
            title={editMode ? '편집 종료' : '위젯 편집'}
            className={cn(
              'shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-xl transition-all',
              editMode
                ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            )}
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* 본문 — 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-7 pb-7 pt-1">
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
          <div className="shrink-0 px-7 py-3 border-t border-foreground/8 flex items-center gap-3 bg-primary/4 backdrop-blur-sm">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              위젯 드래그·삭제·크기 조정. Esc 로 종료
            </span>
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
      className="wb-briefing-grid relative w-full h-full grid gap-3"
      onDragOver={editMode ? handleDragOver : undefined}
      onDrop={editMode ? handleDrop : undefined}
      onDragEnd={() => { setDragId(null); setHoverCell(null); }}
    >
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
      {/* + 추가 버튼 — 편집 모드에서만 */}
      {editMode && (
        <button
          type="button"
          onClick={onAdd}
          className="col-span-1 row-span-1 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-foreground/20 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/4 transition-colors"
          style={{ gridColumn: 'span 1', gridRow: 'span 1' }}
        >
          <Plus className="h-5 w-5" />
          <span className="text-[10.5px] font-medium">추가</span>
        </button>
      )}
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
      className={cn(
        'wb-widget-card relative rounded-2xl overflow-hidden transition-all',
        'shadow-[0_1px_2px_hsl(30_15%_8%/0.03),_0_2px_8px_-4px_hsl(30_15%_8%/0.05)]',
        !editMode && 'hover:-translate-y-0.5',
        editMode && 'wb-jiggle ring-2 ring-primary/30 cursor-grab',
        editMode && isDragging && 'opacity-30 cursor-grabbing',
      )}
      style={{
        ...style,
        gridColumn: `${widget.col + 1} / span ${span.w}`,
        gridRow: `${widget.row + 1} / span ${span.h}`,
        background: isHero
          ? `linear-gradient(135deg, ${meta.tint.hue.replace(')', ' / 0.22)').replace('hsl(', 'hsla(')}, ${meta.tint.hue.replace(')', ' / 0.08)').replace('hsl(', 'hsla(')})`
          : `linear-gradient(180deg, ${meta.tint.bg}, ${meta.tint.hue.replace(')', ' / 0.03)').replace('hsl(', 'hsla(')} 100%)`,
        borderTop: `3px solid ${meta.tint.border}`,
        // hover 시 tint 글로우 — CSS var 로 동적
        ['--card-tint-hue' as string]: meta.tint.hue,
        boxShadow: isHero
          ? `0 6px 20px -8px ${meta.tint.hue}55, 0 2px 6px -2px hsl(30 15% 8% / 0.08)`
          : (hover ? `0 8px 22px -8px ${meta.tint.hue}40, 0 2px 6px -2px hsl(30 15% 8% / 0.08)` : undefined),
        outline: `1px solid hsl(var(--foreground) / 0.05)`,
        outlineOffset: '-1px',
      }}
    >
      {renderWidget({ widget, data, onClose })}

      {/* 편집 모드 — 좌상단 X 버튼 */}
      {editMode && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dailyBriefingStore.removeWidget(widget.id); }}
          className="absolute top-1.5 left-1.5 z-10 h-5 w-5 inline-flex items-center justify-center rounded-full bg-foreground/85 text-background hover:bg-rose-500 transition-colors"
          aria-label="삭제"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* hover ⋯ 메뉴 — 평소·편집 모드 둘 다 */}
      {(hover || menuOpen) && (
        <div className="absolute top-1.5 right-1.5 z-10">
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
        <div className="absolute right-0 top-6 z-20 min-w-[140px] bg-card border border-foreground/15 rounded-md shadow-lg py-1 text-[11.5px]">
          {meta.allowedSizes.length > 1 && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">크기</div>
          )}
          {meta.allowedSizes.length > 1 && meta.allowedSizes.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={(e) => { e.stopPropagation(); dailyBriefingStore.resizeWidget(widget.id, sz); onToggle(false); }}
              className={cn(
                'w-full text-left px-2 py-1 hover:bg-accent flex items-center gap-1.5',
                widget.size === sz && 'text-primary font-medium',
              )}
            >
              <span className="text-[10px] w-5 inline-block">{sizeLabel(sz)}</span>
              {sz === widget.size && <span className="text-[9px]">✓</span>}
            </button>
          ))}
          {meta.allowedSizes.length > 1 && <div className="my-1 border-t border-foreground/8" />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); dailyBriefingStore.removeWidget(widget.id); }}
            className="w-full text-left px-2 py-1 hover:bg-rose-500/10 hover:text-rose-500 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
        </div>
      )}
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
      className="wb-backdrop-in absolute inset-0 z-30 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="wb-picker-in w-full max-w-[760px] max-h-[88%] bg-card border border-foreground/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 py-3 border-b border-foreground/12 flex items-center gap-3">
          <h3 className="text-[14px] font-semibold text-foreground shrink-0">위젯 추가</h3>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="검색..."
            className="flex-1 h-7 px-2.5 text-[12px] rounded-md bg-foreground/5 border border-transparent focus:outline-none focus:border-primary/30 focus:bg-card transition-colors"
          />
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
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
                        onClose();
                      }}
                      disabled={disabled}
                      className={cn(
                        'relative p-3.5 rounded-xl text-left transition-all',
                        disabled
                          ? 'border border-foreground/8 bg-card/40 text-foreground/40 cursor-not-allowed'
                          : 'hover:-translate-y-0.5 hover:shadow-md',
                      )}
                      style={!disabled ? {
                        background: `linear-gradient(180deg, ${meta.tint.bg}, hsl(var(--card)) 70%)`,
                        borderTop: `2px solid ${meta.tint.border}`,
                        outline: '1px solid hsl(var(--foreground) / 0.06)',
                        outlineOffset: '-1px',
                      } : undefined}
                    >
                      <div className="text-2xl mb-1.5">{meta.emoji}</div>
                      <div className="text-[12.5px] font-semibold text-foreground/90 truncate">{meta.label}</div>
                      <div className="text-[10px] text-muted-foreground/75 mt-0.5 font-medium tabular-nums">
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

// 작은 진행률 ring — 헤더용
function ProgressRing({ size, ratio }: { size: number; ratio: number }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const offset = c * (1 - clamped);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
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
        stroke="hsl(var(--primary))"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 3.2}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="hsl(var(--foreground))"
      >{Math.round(clamped * 100)}</text>
    </svg>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
      <div className="text-4xl">🎨</div>
      <p className="text-[14px] font-medium text-foreground">위젯이 없어요</p>
      <p className="text-[12px] text-muted-foreground max-w-[280px]">
        ⚙ 편집 모드에서 위젯을 추가해 나만의 데일리 브리핑을 만들어보세요.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-4 h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        위젯 추가
      </button>
    </div>
  );
}
