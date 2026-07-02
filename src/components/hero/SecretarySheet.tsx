/**
 * 비서 시트 — 사이트 내부 자료 (메모·위키·일정·최근 대화·클라우드) 조회 · 참조.
 *
 * 각 탭에서 항목 클릭 시 → onInsertReference 콜백으로 입력창에 참조 삽입.
 * (예: "[메모: 프로젝트 아이디어] ...")
 *
 * 프론트엔드 v1 — 실제 데이터 스토어 연동 (메모·할일) + 나머지는 placeholder.
 */
import { useMemo, useState } from 'react';
import {
  Bot,
  Calendar,
  Cloud,
  Globe,
  MessageSquare,
  StickyNote,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMemos, type Memo } from '@/lib/memoStore';
import { taskStore } from '@/services/planner/taskStore';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 항목 클릭 시 입력창에 참조 문자열 삽입. */
  onInsertReference: (text: string) => void;
}

type SecTab = 'memo' | 'wiki' | 'schedule' | 'chat' | 'cloud';

const TABS: { id: SecTab; label: string; icon: typeof StickyNote }[] = [
  { id: 'memo',     label: '메모',      icon: StickyNote },
  { id: 'wiki',     label: '위키',      icon: Globe },
  { id: 'schedule', label: '일정',      icon: Calendar },
  { id: 'chat',     label: '최근 대화', icon: MessageSquare },
  { id: 'cloud',    label: '클라우드',  icon: Cloud },
];

export function SecretarySheet({ open, onClose, onInsertReference }: Props) {
  const [tab, setTab] = useState<SecTab>('memo');
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="비서 · 사이트 자료"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-[min(680px,92vw)] max-h-[80vh] overflow-hidden rounded-2xl',
          'border border-white/10 bg-[#111114] shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <header className="px-5 pt-4 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #8B5CF6 100%)',
                }}
              >
                <Bot size={16} strokeWidth={2.2} className="text-white" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-white">비서</h2>
                <p className="text-[11.5px] text-white/50 leading-tight">
                  사이트 자료를 대화에 참조하세요
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* 탭 스위처 */}
          <div className="mt-3 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium shrink-0',
                    'transition-colors duration-150',
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white/90',
                  )}
                >
                  <Icon size={12} strokeWidth={2.2} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* 본문 — 탭에 따라 스위칭. */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {tab === 'memo' && (
            <MemoTab onInsert={(text) => { onInsertReference(text); onClose(); }} />
          )}
          {tab === 'schedule' && (
            <ScheduleTab onInsert={(text) => { onInsertReference(text); onClose(); }} />
          )}
          {(tab === 'wiki' || tab === 'chat' || tab === 'cloud') && (
            <ComingSoon label={TABS.find((t) => t.id === tab)?.label ?? ''} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

function MemoTab({ onInsert }: { onInsert: (text: string) => void }) {
  const memos = useMemo(() => {
    try {
      return getMemos().slice(0, 20);
    } catch {
      return [];
    }
  }, []);

  if (memos.length === 0) {
    return <Empty icon={<StickyNote size={22} />} label="메모가 아직 없어요" />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {memos.map((m) => (
        <ItemRow
          key={m.id}
          title={memoTitle(m)}
          hint={memoPreview(m)}
          onClick={() =>
            onInsert(`[메모: ${memoTitle(m)}]\n${memoPreview(m, 200)}`)
          }
        />
      ))}
    </div>
  );
}

function memoTitle(m: Memo): string {
  const first = (m.content || '').split('\n').find((l) => l.trim());
  return (first || '(빈 메모)').replace(/^#+\s*/, '').slice(0, 60);
}

function memoPreview(m: Memo, max = 90): string {
  return (m.content || '')
    .split('\n')
    .slice(1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function ScheduleTab({ onInsert }: { onInsert: (text: string) => void }) {
  const tasks = useMemo(() => {
    try {
      return taskStore.list().slice(0, 20);
    } catch {
      return [];
    }
  }, []);

  if (tasks.length === 0) {
    return <Empty icon={<Calendar size={22} />} label="할일·일정이 아직 없어요" />;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tasks.map((t) => (
        <ItemRow
          key={t.id}
          title={t.title}
          hint={t.startAt ? new Date(t.startAt).toLocaleString() : '시간 미배정'}
          onClick={() =>
            onInsert(
              `[일정: ${t.title}${t.startAt ? ` · ${new Date(t.startAt).toLocaleString()}` : ''}]`,
            )
          }
        />
      ))}
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
        <Bot size={22} className="text-white/40" />
      </div>
      <div className="text-center">
        <div className="text-[13.5px] font-semibold text-white">{label} 준비 중</div>
        <div className="text-[11.5px] text-white/50 mt-1">
          곧 이 탭에서도 자료를 참조할 수 있어요
        </div>
      </div>
    </div>
  );
}

function Empty({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/40">
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[13.5px] font-semibold text-white">{label}</div>
      </div>
    </div>
  );
}

function ItemRow({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-white/10 p-3 text-left',
        'transition-colors duration-100',
        'hover:bg-white/[0.04] hover:border-white/20',
      )}
    >
      <span
        className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-white/80"
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)' }}
      >
        <Bot size={12} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-white truncate">{title}</span>
        {hint && (
          <span className="block text-[11px] text-white/50 mt-0.5 truncate">{hint}</span>
        )}
      </span>
    </button>
  );
}
