/**
 * 끝낸 일 서랍 — 어제까지 끝낸 할 일을 끝낸 날짜별로 모아 보여준다.
 *
 * 왜 있나: 대기함은 '무엇을 해야 하나'에 답하는 자리다. 끝낸 일이 계속 쌓이면
 * 매번 눈으로 걸러내야 하고, 몇 달 뒤엔 목록이 무덤이 된다. 그렇다고 체크하는
 * 순간 지워버리면 무엇을 했는지 볼 수 없다. 그래서 오늘 끝낸 것은 대기함에 남기고,
 * 날이 바뀌면 여기로 넘긴다 — **지우는 게 아니라 옮기는 것**이다.
 *
 * 여기서 할 수 있는 일은 둘: 다시 열기(완료 취소 → 대기함으로 돌아감), 버리기(휴지통).
 */
import { useMemo } from 'react';
import { CheckSquare, RotateCcw, Trash2, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { taskStore } from '@/services/planner/taskStore';
import { useDoneArchive } from '@/hooks/planner/useInbox';
import { fmtDateWithWeekday } from '@/lib/dateFormat';
import { notify } from '@/lib/notify';
import type { PlannerTask } from '@/types/planner';

/** 끝낸 날의 키(YYYY-MM-DD, 로컬 기준). doneAt 이 없는 옛 항목은 따로 모은다. */
const dayKeyOf = (t: PlannerTask): string => {
  if (!t.doneAt) return '';
  const d = new Date(t.doneAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const PlannerDoneDialog = ({ onClose }: { onClose: () => void }) => {
  const rows = useDoneArchive();

  /** 끝낸 날짜별 묶음 — 최근 날이 위. 날짜를 모르는 것은 맨 아래 한 묶음. */
  const groups = useMemo(() => {
    const m = new Map<string, PlannerTask[]>();
    for (const t of rows) {
      const k = dayKeyOf(t);
      const arr = m.get(k);
      if (arr) arr.push(t);
      else m.set(k, [t]);
    }
    return [...m.entries()].sort((a, b) => {
      if (!a[0]) return 1;
      if (!b[0]) return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [rows]);

  const reopen = (t: PlannerTask) => {
    taskStore.toggleDone(t.id);
    notify.success(`'${t.title}'을(를) 다시 열었어요`, {
      description: '대기함으로 돌아갔어요.',
      action: { label: '되돌리기', onClick: () => taskStore.toggleDone(t.id) },
    });
  };

  const drop = (t: PlannerTask) => {
    taskStore.remove(t.id);
    notify.success('휴지통으로 옮겼어요', {
      action: { label: '되돌리기', onClick: () => taskStore.restore(t.id) },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[640px] overflow-hidden rounded-2xl border-foreground/15 bg-card p-0 shadow-[0_22px_70px_hsl(var(--foreground)/0.20)]"
        hideClose
      >
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-[18px] font-bold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                  <CheckSquare className="h-4 w-4" strokeWidth={2.1} />
                </span>
                끝낸 일
                <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{rows.length}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12px] text-muted-foreground">
                어제까지 끝낸 것들이에요. 오늘 끝낸 건 대기함에 그대로 있어요.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="끝낸 일 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto px-3 py-3">
          {rows.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center text-center" role="status">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-muted-foreground">
                <CheckSquare className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-foreground">아직 넘어온 것이 없어요.</p>
            </div>
          ) : (
            groups.map(([day, items]) => (
              <section key={day || 'unknown'} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 px-2 pb-1">
                  <h3 className="text-[11.5px] font-bold text-muted-foreground">
                    {day ? fmtDateWithWeekday(`${day}T00:00:00`) : '언제인지 모르는 것'}
                  </h3>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">{items.length}</span>
                  <span className="h-px flex-1 bg-foreground/8" />
                </div>
                <div className="space-y-0.5" role="list">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      role="listitem"
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent/65"
                    >
                      <p className="truncate text-[13.5px] font-medium text-muted-foreground line-through decoration-foreground/25">
                        {t.title || '제목 없음'}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => reopen(t)}
                          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-foreground/15 bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          aria-label={`${t.title} 다시 열기`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          다시 열기
                        </button>
                        <button
                          type="button"
                          onClick={() => drop(t)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${t.title} 버리기`}
                          title="휴지통으로"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
