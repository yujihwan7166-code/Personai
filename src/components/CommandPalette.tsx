/**
 * 글로벌 명령 팔레트 (Cmd+K / Ctrl+K)
 *
 * Phase B — 리모델링의 핵심 UX 컴포넌트.
 *  - 모드 전환 · 최근 대화 · 검색 을 한 곳에서.
 *  - cmdk 라이브러리 사용 (이미 설치됨).
 *
 * 사용처: Index.tsx 상단에 마운트. 전역 키 리스너 내장.
 */
import { Command } from 'cmdk';
import { useEffect, useMemo, useState } from 'react';
import {
  MessageCircle, GitMerge, Users, Shield, Sparkles, Swords, Wrench, Gamepad2,
  FlaskConical, Globe, FileBox, BookOpen,
  History, ArrowRight, Search,
} from 'lucide-react';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import { getDiscussionHistory, type DiscussionRecord } from '@/lib/discussionHistoryStore';
import { cn } from '@/lib/utils';

const MODE_ICONS: Record<MainMode, React.ComponentType<{ className?: string }>> = {
  general:         MessageCircle,
  multi:           GitMerge,
  brainstorm_main: Sparkles,
  stakeholder_main: Users,
  premium_main:    Shield,
  debate:          Swords,
  assistant:       Wrench,
  player:          Gamepad2,
  research_main:   FlaskConical,
  translate_main:  Globe,
  convert_main:    FileBox,
  study_main:      BookOpen,
};

/** 모드별 시그니처 컬러 (Phase A 에서 정의된 CSS var 이름 매핑). */
const MODE_TINT: Record<MainMode, string> = {
  general:         'text-[hsl(var(--mode-general))]',
  multi:           'text-[hsl(var(--mode-multi))]',
  brainstorm_main: 'text-[hsl(var(--mode-debate-a))]',
  stakeholder_main:'text-[hsl(var(--mode-simulation))]',
  premium_main:    'text-[hsl(var(--mode-premium))]',
  debate:          'text-[hsl(var(--mode-debate-a))]',
  assistant:       'text-[hsl(var(--mode-assistant))]',
  player:          'text-[hsl(var(--mode-multi))]',
  research_main:   'text-[hsl(var(--mode-research))]',
  translate_main:  'text-[hsl(var(--mode-assistant))]',
  convert_main:    'text-[hsl(var(--mode-general))]',
  study_main:      'text-[hsl(var(--mode-study))]',
};

export interface CommandPaletteProps {
  /** 현재 모드. 표시용. */
  currentMode?: MainMode;
  /** 모드 전환 콜백. */
  onSelectMode?: (mode: MainMode) => void;
  /** 대화 레코드 선택 콜백 (최근 대화 재개). */
  onSelectHistory?: (record: DiscussionRecord) => void;
  /** 새 대화 시작 콜백. */
  onNewChat?: () => void;
}

export function CommandPalette({
  currentMode,
  onSelectMode,
  onSelectHistory,
  onNewChat,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<DiscussionRecord[]>([]);

  // 전역 Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // 팔레트 열릴 때만 히스토리 로드 (매번 파일 파싱 비용 회피)
  useEffect(() => {
    if (!open) return;
    try {
      const items = getDiscussionHistory().slice(0, 8);
      setHistory(items);
    } catch { /* noop */ }
  }, [open]);

  const modes = useMemo(
    () => (Object.keys(MAIN_MODE_LABELS) as MainMode[]),
    [],
  );

  if (!open) return null;

  const run = (fn?: () => void) => {
    setOpen(false);
    if (fn) setTimeout(fn, 20);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[18vh] px-4 bg-black/35 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <Command
        label="명령 팔레트"
        className={cn(
          'w-full max-w-[560px] rounded-2xl overflow-hidden',
          'bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]',
          'border border-[hsl(var(--hairline))] shadow-[0_18px_60px_hsl(220_20%_5%_/_0.35)]',
        )}
        onClick={(e) => e.stopPropagation()}
        shouldFilter
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
          <Command.Input
            autoFocus
            placeholder="모드로 이동 · 최근 대화 찾기 · 뭐든 입력해보세요"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[hsl(var(--muted-foreground))]"
          />
          <kbd className="shrink-0 rounded-md border border-[hsl(var(--hairline))] px-1.5 py-0.5 font-mono text-[10px] text-[hsl(var(--muted-foreground))]">ESC</kbd>
        </div>

        <Command.List className="max-h-[52vh] overflow-y-auto p-2">
          <Command.Empty className="p-8 text-center text-[12.5px] text-[hsl(var(--muted-foreground))]">
            결과가 없어요. 다른 검색어를 시도해보세요.
          </Command.Empty>

          {/* ── 빠른 액션 ── */}
          <Command.Group heading="빠른 액션" className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))] px-2 pt-1 pb-1">
            <Command.Item
              value="새 대화 시작 새로운 채팅 new chat"
              onSelect={() => run(onNewChat)}
              className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer aria-selected:bg-[hsl(var(--accent))] text-[13px]"
            >
              <div className="h-7 w-7 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <span className="flex-1">새 대화 시작</span>
              <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-aria-selected:opacity-100" />
            </Command.Item>
          </Command.Group>

          {/* ── 모드 ── */}
          <Command.Group heading="모드 전환" className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))] px-2 pt-3 pb-1">
            {modes.map((m) => {
              const info = MAIN_MODE_LABELS[m];
              const Icon = MODE_ICONS[m];
              const active = currentMode === m;
              return (
                <Command.Item
                  key={m}
                  value={`${info.label} ${info.description} ${m}`}
                  onSelect={() => run(() => onSelectMode?.(m))}
                  className={cn(
                    'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer',
                    'aria-selected:bg-[hsl(var(--accent))]',
                  )}
                >
                  <div className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                    'bg-[hsl(var(--secondary))]',
                    MODE_TINT[m],
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-[hsl(var(--foreground))] truncate flex items-center gap-1.5">
                      {info.label}
                      {active && (
                        <span className="text-[9px] font-semibold tracking-wide uppercase text-[hsl(var(--primary))] rounded-full bg-[hsl(var(--primary)/0.1)] px-1.5 py-0.5">
                          지금
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                      {info.description}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-aria-selected:opacity-100" />
                </Command.Item>
              );
            })}
          </Command.Group>

          {/* ── 최근 대화 ── */}
          {history.length > 0 && (
            <Command.Group heading="최근 대화" className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))] px-2 pt-3 pb-1">
              {history.map((rec) => (
                <Command.Item
                  key={rec.id}
                  value={`${rec.question ?? ''} ${rec.mode ?? ''}`}
                  onSelect={() => run(() => onSelectHistory?.(rec))}
                  className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer aria-selected:bg-[hsl(var(--accent))]"
                >
                  <div className="h-7 w-7 rounded-md bg-[hsl(var(--secondary))] flex items-center justify-center shrink-0 text-[hsl(var(--muted-foreground))]">
                    <History className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[hsl(var(--foreground))] truncate">
                      {rec.question || '제목 없음'}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                      {new Date(rec.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      {rec.mode && ` · ${rec.mode}`}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-aria-selected:opacity-100" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-[hsl(var(--hairline))] px-3 py-2 flex items-center gap-3 text-[10.5px] text-[hsl(var(--muted-foreground))]">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">↑↓</kbd> 이동
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">↵</kbd> 선택
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-[hsl(var(--hairline))] px-1 py-0.5 font-mono text-[9.5px]">⌘K</kbd> 토글
          </span>
          <span className="ml-auto font-mono">커맨드 팔레트</span>
        </div>
      </Command>
    </div>
  );
}
