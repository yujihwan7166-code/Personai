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
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Plus, ChevronUp, ChevronDown, Trash2, Move, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildBriefingData } from '@/lib/buildBriefingData';
import {
  GRID_COLS, GRID_ROWS, WIDGET_META, ALL_WIDGET_KINDS,
  dailyBriefingStore, sizeToSpan, useBriefingSettings,
  type PlacedWidget, type WidgetKind, type WidgetSize,
} from '@/lib/dailyBriefingStore';
import { renderWidget } from './widgets';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DailyBriefingModal = ({ open, onClose }: Props) => {
  const settings = useBriefingSettings();
  const data = useMemo(() => (open ? buildBriefingData() : null), [open]);
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ESC 닫기 (편집·picker 우선)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerOpen) { setPickerOpen(false); return; }
        if (editMode) { setEditMode(false); return; }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editMode, pickerOpen, onClose]);

  // 열림 시 lastShownDate 기록 (autoShow 다음 표시 방지)
  useEffect(() => {
    if (open) dailyBriefingStore.markShownToday();
  }, [open]);

  if (!open || !data || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="데일리 브리핑"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[1100px] flex flex-col bg-card border border-foreground/15 rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: 'min(680px, 92vh)' }}
      >
        {/* 헤더 */}
        <div className="shrink-0 px-6 py-3.5 border-b border-foreground/12 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15.5px] font-semibold tracking-tight text-foreground leading-tight">
              {data.greeting}
            </h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{data.date}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? '편집 종료' : '편집'}
            title={editMode ? '편집 종료' : '위젯 편집'}
            className={cn(
              'shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
              editMode ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 — 그리드 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6">
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
          <div className="shrink-0 px-6 py-2.5 border-t border-foreground/12 flex items-center gap-3 bg-accent/30">
            <span className="text-[11px] text-muted-foreground">
              위젯 드래그·삭제·크기 조정. Esc 로 종료
            </span>
            <button
              type="button"
              onClick={() => { if (window.confirm('default 위젯 구성으로 되돌릴까요?')) dailyBriefingStore.resetWidgets(); }}
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title="기본값"
            >
              <RotateCcw className="h-3 w-3" />
              초기화
            </button>
            <label className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-foreground/85 cursor-pointer select-none">
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
  // 셀 사이즈 — 황금비율 1100×680 컨테이너 - 본문 패딩 → 약 1050×580 / 6×4
  // = cell ~ 170×140 (with gap 10)
  return (
    <div
      className="relative w-full h-full grid gap-2.5"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
      }}
    >
      {widgets.map((w) => (
        <WidgetCard
          key={w.id}
          widget={w}
          data={data}
          editMode={editMode}
          onClose={onClose}
        />
      ))}
      {/* + 추가 버튼 — 편집 모드에서만 또는 빈 칸 있을 때 */}
      {editMode && (
        <button
          type="button"
          onClick={onAdd}
          className="col-span-1 row-span-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-foreground/25 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          style={{ gridColumn: 'span 1', gridRow: 'span 1' }}
        >
          <Plus className="h-5 w-5" />
          <span className="text-[10.5px]">추가</span>
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// 위젯 카드 — wrapper (jiggle, hover ⋯, position)

function WidgetCard({
  widget, data, editMode, onClose,
}: {
  widget: PlacedWidget;
  data: ReturnType<typeof buildBriefingData>;
  editMode: boolean;
  onClose: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const span = sizeToSpan(widget.size);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenuOpen(false); }}
      className={cn(
        'relative rounded-xl bg-card border border-foreground/12 overflow-hidden transition-shadow',
        'shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]',
        'hover:shadow-[0_4px_14px_-8px_hsl(30_15%_8%/0.12)]',
        editMode && 'wb-jiggle ring-1 ring-primary/25',
      )}
      style={{
        gridColumn: `${widget.col + 1} / span ${span.w}`,
        gridRow: `${widget.row + 1} / span ${span.h}`,
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
  const usedKinds = new Set(settings.widgets.map((w) => w.kind));
  const grouped: Record<string, WidgetKind[]> = {
    '내 데이터': [],
    '외부 정보': [],
  };
  for (const kind of ALL_WIDGET_KINDS) {
    grouped[WIDGET_META[kind].group].push(kind);
  }
  return (
    <div
      className="absolute inset-0 z-30 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[760px] max-h-[88%] bg-card border border-foreground/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 py-3 border-b border-foreground/12 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">위젯 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {(['내 데이터', '외부 정보'] as const).map((group) => (
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
                        'relative p-3 rounded-lg border text-left transition-all',
                        disabled
                          ? 'border-foreground/8 bg-card/40 text-foreground/40 cursor-not-allowed'
                          : 'border-foreground/12 hover:border-primary hover:bg-primary/5',
                      )}
                    >
                      <div className="text-2xl mb-1">{meta.emoji}</div>
                      <div className="text-[12px] font-medium text-foreground/90 truncate">{meta.label}</div>
                      <div className="text-[10px] text-muted-foreground/75 mt-0.5">
                        {sizeLabel(meta.defaultSize)}
                      </div>
                      {already && (
                        <span className="absolute top-2 right-2 text-[10px] text-primary">✓</span>
                      )}
                      {meta.soon && !already && (
                        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wide text-muted-foreground/70">곧</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 빈 상태

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
