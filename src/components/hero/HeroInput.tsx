/**
 * Genspark-스타일 히어로 입력창.
 *
 * 레이아웃:
 *   ┌─ [칩 스트립: 상단 border 관통] ─┐
 *   │  플레이스홀더 텍스트             │
 *   │                                 │
 *   │  📎 🖼️ 🎙️ 🌐 🧠 ⋯      [↑ send] │
 *   └─────────────────────────────────┘
 *
 * 부가기능:
 *   - 🌐 웹 검색 / 🧠 심층 사고 토글 — 부모(HeroSection)가 상태 관리,
 *     전송 시 지시문으로 변환되어 메시지에 첨부.
 *   - ⋯ 더보기 — 프롬프트 템플릿(입력창 자동 채움) · 대화 설정(길이·톤, 영속).
 *
 * 브랜드 테마 (--hero-*) 는 상위 `.hero-brand-canvas` 스코프에서 상속.
 */
import {
  ArrowUp,
  Brain,
  Check,
  ChevronLeft,
  Globe,
  Image as ImageIcon,
  Lightbulb,
  Mic,
  LayoutGrid,
  MoreHorizontal,
  Paperclip,
  Settings2,
} from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  CHAT_LENGTH_OPTIONS,
  CHAT_TONE_OPTIONS,
  DEFAULT_CHAT_PREFS,
  useChatPrefs,
} from '@/lib/chatPrefs';

/** 프롬프트 템플릿 — 클릭 시 입력창에 채워짐. */
const PROMPT_TEMPLATES: { emoji: string; label: string; template: string }[] = [
  { emoji: '📄', label: '요약',      template: '다음 내용을 핵심 5줄로 요약해줘:\n\n' },
  { emoji: '✍️', label: '글 다듬기', template: '다음 글을 자연스럽고 명확하게 다듬어줘:\n\n' },
  { emoji: '🌐', label: '영어 번역', template: '다음을 자연스러운 영어로 번역해줘:\n\n' },
  { emoji: '📧', label: '이메일 초안', template: '다음 내용으로 정중한 비즈니스 이메일 초안을 써줘:\n\n' },
  { emoji: '💡', label: '아이디어 10개', template: '이 주제에 대한 아이디어 10개를 브레인스토밍해줘: ' },
  { emoji: '🧒', label: '쉽게 설명', template: '처음 배우는 사람도 이해할 수 있게 쉽게 설명해줘: ' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  onImage?: () => void;
  onVoice?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** 상단 border 관통 칩 스트립 (BrandChipStrip). */
  chipStrip: ReactNode;
  /** 하단 툴바 우측 슬롯 — send 버튼 옆에 모델 셀렉트 등. */
  toolbarRight?: ReactNode;
  /** 웹 검색 토글 — 부모가 상태 관리 (전송 시 지시문 반영). */
  webSearchOn?: boolean;
  onToggleWebSearch?: () => void;
  /** 심층 사고 토글. */
  deepThinkOn?: boolean;
  onToggleDeepThink?: () => void;
  /** 모드 메뉴 열기 — 툴바 제2 진입점 (발견성). */
  onOpenModeMenu?: () => void;
  autoFocus?: boolean;
}

export function HeroInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  onImage,
  onVoice,
  placeholder = '무엇이든 물어보세요',
  disabled,
  chipStrip,
  toolbarRight,
  webSearchOn = false,
  onToggleWebSearch,
  deepThinkOn = false,
  onToggleDeepThink,
  onOpenModeMenu,
  autoFocus,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const { prefs } = useChatPrefs();
  // 기본값에서 벗어난 설정이 있으면 더보기 버튼에 dot 표시.
  const prefsCustomized =
    prefs.length !== DEFAULT_CHAT_PREFS.length || prefs.tone !== DEFAULT_CHAT_PREFS.tone;

  // auto-grow (max ~6 rows)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter → submit, Shift+Enter → 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  const canSubmit = value.trim().length > 0 && !disabled;

  return (
    <div className="relative w-full">
      {/* 칩 스트립 — top border 관통.
       * 각 칩의 box-shadow 가 hero-bg 색 halo 를 만들어 border 를 자연스럽게 가림. */}
      <div className="absolute left-2 right-2 top-0 z-10 -translate-y-1/2 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">{chipStrip}</div>
      </div>

      {/* 입력 컨테이너 — glass elevation · 브랜드 색조 shadow.
       * focus-within 시 브랜드 색으로 border 변경. */}
      <div
        className={cn(
          // hero-input-shell — 브랜드 CSS 가 입력창 내부만 변수 오버라이드할 수 있는 스코프
          // (Grok: 다크 캔버스 + 화이트 입력창 반전).
          'hero-input-shell group relative rounded-[var(--hero-radius-input,14px)] border',
          'transition-all duration-200',
          'focus-within:border-[color:var(--hero-ring,#10a37f)]',
        )}
        style={{
          backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
          borderColor: 'var(--hero-input-border, rgba(255,255,255,0.10))',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: `
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 8px 28px -14px var(--hero-accent-soft, rgba(0,0,0,0.12)),
            0 2px 10px -4px rgba(0, 0, 0, 0.10)
          `,
        }}
      >
        {/* Textarea */}
        <div className="pt-9 px-5 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              'w-full resize-none bg-transparent border-0',
              'outline-none focus:outline-none focus-visible:outline-none',
              'ring-0 focus:ring-0 focus-visible:ring-0',
              'text-[16px] leading-[1.55]',
              'placeholder:text-[color:var(--hero-fg-muted,#8e8ea0)]',
              'disabled:opacity-60',
            )}
            style={{
              color: 'var(--hero-fg, #ececec)',
              fontFamily: 'var(--hero-font-body, inherit)',
              minHeight: '64px',
              maxHeight: '220px',
            }}
          />
        </div>

        {/* 하단 툴바 — 첨부 · 이미지 · 음성 · 웹 · 심층 · 더보기 */}
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5 pt-0.5">
          <div className="flex items-center gap-0">
            {onOpenModeMenu && (
              <ToolbarButton onClick={onOpenModeMenu} label="모드 전환 — 토론·리서치·스튜디오·라이프">
                <LayoutGrid size={17} />
              </ToolbarButton>
            )}
            <ToolbarButton onClick={onAttach} label="파일 첨부">
              <Paperclip size={17} />
            </ToolbarButton>
            <ToolbarButton onClick={onImage} label="이미지">
              <ImageIcon size={17} />
            </ToolbarButton>
            <ToolbarButton onClick={onVoice} label="음성">
              <Mic size={17} />
            </ToolbarButton>
            {onToggleWebSearch && (
              <ToolbarToggle
                active={webSearchOn}
                onClick={onToggleWebSearch}
                label={webSearchOn ? '웹 검색 켜짐 — 답변에 최신 정보·출처 요청' : '웹 검색 — 최신 정보·출처 요청'}
              >
                <Globe size={17} />
              </ToolbarToggle>
            )}
            {onToggleDeepThink && (
              <ToolbarToggle
                active={deepThinkOn}
                onClick={onToggleDeepThink}
                label={deepThinkOn ? '심층 사고 켜짐 — 단계별 추론 요청' : '심층 사고 — 단계별 추론 요청'}
              >
                <Brain size={17} />
              </ToolbarToggle>
            )}
            <div className="relative">
              <ToolbarButton onClick={() => setMoreOpen((v) => !v)} label="더보기 — 템플릿·대화 설정">
                <span className="relative">
                  <MoreHorizontal size={17} />
                  {prefsCustomized && (
                    <span
                      className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--hero-accent, #10a37f)' }}
                      aria-hidden
                    />
                  )}
                </span>
              </ToolbarButton>
              {moreOpen && (
                <MorePopover
                  onClose={() => setMoreOpen(false)}
                  onInsertTemplate={(t) => {
                    onChange(value ? `${value}\n${t}` : t);
                    setMoreOpen(false);
                    textareaRef.current?.focus();
                  }}
                />
              )}
            </div>
          </div>

          {/* 우측: (옵션 슬롯) + Send */}
          <div className="flex items-center gap-1.5">
            {toolbarRight}
            <button
              type="button"
              onClick={() => canSubmit && onSubmit()}
              disabled={!canSubmit}
              aria-label="전송"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'transition-all duration-200 ease-out',
                canSubmit
                  ? 'hover:scale-105 active:scale-95'
                  : 'opacity-40 cursor-not-allowed',
              )}
              style={{
                backgroundColor: canSubmit
                  ? 'var(--hero-accent, #10a37f)'
                  : 'var(--hero-accent-soft, rgba(16,163,127,0.16))',
                color: canSubmit ? '#ffffff' : 'var(--hero-fg-muted, #8e8ea0)',
                ...(canSubmit && {
                  boxShadow: '0 4px 14px -4px var(--hero-accent, #10a37f)',
                }),
              }}
            >
              <ArrowUp size={20} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
}) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md',
        'transition-colors duration-150',
        'hover:bg-[color:var(--hero-accent-soft,rgba(255,255,255,0.06))]',
      )}
      style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
    >
      {children}
    </button>
  );
}

/** 활성/비활성 상태를 시각적으로 보여주는 토글 버튼. */
function ToolbarToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-md',
        'transition-all duration-150',
        !active && 'hover:bg-[color:var(--hero-accent-soft,rgba(255,255,255,0.06))]',
      )}
      style={{
        color: active ? 'var(--hero-accent)' : 'var(--hero-fg-muted, #8e8ea0)',
        backgroundColor: active ? 'var(--hero-accent-soft)' : 'transparent',
        boxShadow: active
          ? 'inset 0 0 0 1px var(--hero-ring, var(--hero-accent))'
          : 'none',
      }}
    >
      {children}
    </button>
  );
}

type MoreView = 'main' | 'templates' | 'settings';

/**
 * 더보기 팝오버 — 3-view 구조.
 *   main      → 프롬프트 템플릿 / 대화 설정 진입
 *   templates → 6개 템플릿 (클릭 시 입력창에 채움)
 *   settings  → 답변 길이·말투 (localStorage 영속)
 */
function MorePopover({
  onClose,
  onInsertTemplate,
}: {
  onClose: () => void;
  onInsertTemplate: (template: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MoreView>('main');
  const { prefs, setPrefs } = useChatPrefs();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      role="menu"
      className={cn(
        'absolute bottom-full left-0 mb-2 w-[280px]',
        'rounded-xl border p-1.5 z-50',
        'shadow-[0_16px_40px_-14px_rgba(0,0,0,0.35)]',
        'animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-150',
      )}
      style={{
        backgroundColor: 'var(--hero-input-bg, #1a1a1a)',
        borderColor: 'var(--hero-hairline, rgba(255,255,255,0.10))',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {view === 'main' && (
        <>
          <MoreItem
            icon={<Lightbulb size={16} />}
            label="프롬프트 템플릿"
            hint="요약·다듬기·번역·이메일…"
            onClick={() => setView('templates')}
          />
          <MoreItem
            icon={<Settings2 size={16} />}
            label="대화 설정"
            hint={`답변 ${CHAT_LENGTH_OPTIONS.find((o) => o.id === prefs.length)?.label} · ${CHAT_TONE_OPTIONS.find((o) => o.id === prefs.tone)?.label} 말투`}
            onClick={() => setView('settings')}
          />
        </>
      )}

      {view === 'templates' && (
        <>
          <BackHeader label="프롬프트 템플릿" onBack={() => setView('main')} />
          {PROMPT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              role="menuitem"
              onClick={() => onInsertTemplate(t.template)}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-100"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="text-[16px] leading-none shrink-0">{t.emoji}</span>
              <span
                className="text-[13px] font-medium"
                style={{ color: 'var(--hero-fg, #ececec)' }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </>
      )}

      {view === 'settings' && (
        <>
          <BackHeader label="대화 설정" onBack={() => setView('main')} />
          <SettingsGroup label="답변 길이">
            {CHAT_LENGTH_OPTIONS.map((o) => (
              <SettingsChip
                key={o.id}
                label={o.label}
                hint={o.hint}
                active={prefs.length === o.id}
                onClick={() => setPrefs({ length: o.id })}
              />
            ))}
          </SettingsGroup>
          <SettingsGroup label="말투">
            {CHAT_TONE_OPTIONS.map((o) => (
              <SettingsChip
                key={o.id}
                label={o.label}
                hint={o.hint}
                active={prefs.tone === o.id}
                onClick={() => setPrefs({ tone: o.id })}
              />
            ))}
          </SettingsGroup>
          <p
            className="px-2.5 pt-1 pb-1.5 text-[10.5px] leading-snug"
            style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
          >
            설정은 저장되어 모든 대화에 적용돼요.
          </p>
        </>
      )}
    </div>
  );
}

function MoreItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-100"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{
          color: 'var(--hero-accent)',
          backgroundColor: 'var(--hero-accent-soft)',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[13px] font-medium leading-tight"
          style={{ color: 'var(--hero-fg, #ececec)' }}
        >
          {label}
        </span>
        {hint && (
          <span
            className="block text-[11px] mt-0.5"
            style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function BackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors duration-100"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--hero-accent-soft)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <ChevronLeft size={14} style={{ color: 'var(--hero-fg-muted)' }} />
      <span
        className="text-[11.5px] font-semibold tracking-tight"
        style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
      >
        {label}
      </span>
    </button>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-2.5 py-1.5">
      <div
        className="text-[10.5px] font-semibold tracking-[0.08em] uppercase mb-1.5"
        style={{ color: 'var(--hero-fg-muted, #8e8ea0)' }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function SettingsChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-medium',
        'border transition-all duration-150',
      )}
      style={
        active
          ? {
              color: '#FFFFFF',
              backgroundColor: 'var(--hero-accent)',
              borderColor: 'var(--hero-accent)',
            }
          : {
              color: 'var(--hero-fg-muted)',
              backgroundColor: 'transparent',
              borderColor: 'var(--hero-hairline)',
            }
      }
    >
      {active && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  );
}
