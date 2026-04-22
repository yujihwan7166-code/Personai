import { useEffect, useState } from 'react';
import {
  PanelRightClose, PanelRightOpen, Image as ImageIcon, Film, X as XIcon, Link as LinkIcon,
  ChevronDown, Zap, Gem, Crown, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IMAGE_STYLE_LABELS,
  IMAGE_MAX_COUNT,
  VIDEO_CLIP_LENGTH_SEC,
  type MediaKind,
  type MediaAspectRatio,
  type ImageStylePreset,
} from '@/types/mediaGen';
import { VIDEO_MOTION_PRESETS } from '@/lib/videoMotionPresets';

interface Props {
  kind: MediaKind;
  setKind: (k: MediaKind) => void;
  style: ImageStylePreset;
  setStyle: (s: ImageStylePreset) => void;
  aspectRatio: MediaAspectRatio;
  setAspectRatio: (a: MediaAspectRatio) => void;
  count: number;
  setCount: (n: number) => void;
  motionPresetId: string;
  setMotionPresetId: (id: string) => void;

  startFrame: { url: string; label?: string } | null;
  endFrame: { url: string; label?: string } | null;
  onClearStartFrame: () => void;
  onClearEndFrame: () => void;

  imagesRemaining: number;
  videoRemaining: number;

  collapsed: boolean;
  onToggleCollapsed: () => void;
}

type SectionId = 'model' | 'mode' | 'style' | 'size' | 'motion' | 'frames';

const ASPECT_OPTIONS: Array<{ value: MediaAspectRatio; label: string; hint: string; ratioStyle: string }> = [
  { value: '1:1', label: '1:1', hint: '정사각', ratioStyle: 'w-6 h-6' },
  { value: '16:9', label: '16:9', hint: '가로', ratioStyle: 'w-8 h-5' },
  { value: '9:16', label: '9:16', hint: '세로', ratioStyle: 'w-4 h-7' },
];

const COUNT_OPTIONS = [1, 2, 4] as const;

const STYLE_ORDER: ImageStylePreset[] = [
  'none', 'photo', 'cinematic', 'illustration', 'anime', 'ghibli',
  '3d', 'watercolor', 'oil', 'pixel', 'cyberpunk', 'logo',
  'sketch', 'blueprint', 'collage', 'miniature',
];

/** 모델 메타데이터 — env 변수로 활성/비활성 */
interface ModelOption {
  id: string;
  kind: MediaKind;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  speed: '빠름' | '보통' | '느림';
  quality: '균형' | '프리미엄' | '최고급';
  /** 환경변수 없으면 "준비중" 배지 */
  ready: boolean;
}

const IMAGE_MODELS: ModelOption[] = [
  { id: 'gemini', kind: 'image', label: 'Gemini Flash', description: '기본 · 빠르고 안정적', icon: Zap, speed: '빠름', quality: '균형', ready: true },
  { id: 'gpt-image-2', kind: 'image', label: 'GPT Image 2', description: '한글 텍스트 최강', icon: Gem, speed: '보통', quality: '프리미엄', ready: false },
  { id: 'flux', kind: 'image', label: 'Flux 2 Pro', description: '포토리얼 · 디테일', icon: Crown, speed: '느림', quality: '최고급', ready: false },
];

const VIDEO_MODELS: ModelOption[] = [
  { id: 'veo-fast', kind: 'video', label: 'Veo 3.1 Fast', description: '기본 · 모션 품질 균형', icon: Zap, speed: '빠름', quality: '균형', ready: true },
  { id: 'seedance', kind: 'video', label: 'Seedance Fast', description: '저렴 · 빠른 결과', icon: Gem, speed: '빠름', quality: '균형', ready: false },
  { id: 'sora', kind: 'video', label: 'Sora 2 Pro', description: '최고급 · 물리 정확성', icon: Crown, speed: '느림', quality: '최고급', ready: false },
];

export function MediaOptionsSidebar(props: Props) {
  if (props.collapsed) {
    return (
      <aside className="shrink-0 w-[48px] border-l border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col">
        <button
          onClick={props.onToggleCollapsed}
          className="h-10 flex items-center justify-center border-b border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="옵션 펼치기"
          title="옵션 펼치기"
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
      </aside>
    );
  }

  return (
    <aside className="shrink-0 w-[280px] border-l border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          옵션
        </span>
        <button
          onClick={props.onToggleCollapsed}
          className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="옵션 접기"
          title="접기"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        {/* 1) 모드 — 항상 펼침 */}
        <Section id="mode" title="생성 모드" summary={props.kind === 'image' ? '🖼 이미지' : '🎬 동영상'} alwaysOpen>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => props.setKind('image')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition-colors border',
                props.kind === 'image'
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900',
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" /> 이미지
            </button>
            <button
              onClick={() => props.setKind('video')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11.5px] font-medium transition-colors border',
                props.kind === 'video'
                  ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900',
              )}
            >
              <Film className="h-3.5 w-3.5" /> 동영상
            </button>
          </div>
        </Section>

        {/* 2) 모델 선택 */}
        <Section
          id="model"
          title="모델"
          summary={props.kind === 'image' ? IMAGE_MODELS[0].label : VIDEO_MODELS[0].label}
          defaultOpen={false}
        >
          <ModelSelector models={props.kind === 'image' ? IMAGE_MODELS : VIDEO_MODELS} />
        </Section>

        {/* 3) 스타일 (이미지만) */}
        {props.kind === 'image' && (
          <Section
            id="style"
            title="스타일"
            summary={IMAGE_STYLE_LABELS[props.style].label}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_ORDER.map((s) => {
                const meta = IMAGE_STYLE_LABELS[s];
                const active = props.style === s;
                return (
                  <button
                    key={s}
                    onClick={() => props.setStyle(s)}
                    className={cn(
                      'group relative aspect-[4/3] overflow-hidden rounded-lg border transition-all text-left',
                      active
                        ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:-translate-y-0.5',
                    )}
                    title={meta.description}
                    aria-label={`${meta.label} — ${meta.description}`}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-br', meta.gradient)} />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-70 group-hover:scale-110 transition-transform">
                      {meta.emoji}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="text-[10px] font-semibold truncate text-white/95">
                        {meta.label}
                      </p>
                    </div>
                    {active && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* 4) 카메라 움직임 (동영상만) */}
        {props.kind === 'video' && (
          <Section
            id="motion"
            title="카메라 움직임"
            summary={VIDEO_MOTION_PRESETS.find((p) => p.id === props.motionPresetId)?.label ?? '고정'}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-1.5">
              {VIDEO_MOTION_PRESETS.map((preset) => {
                const active = props.motionPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => props.setMotionPresetId(preset.id)}
                    className={cn(
                      'group relative aspect-[4/3] overflow-hidden rounded-lg border transition-all text-left',
                      active
                        ? 'border-pink-500 ring-2 ring-pink-200 dark:ring-pink-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:-translate-y-0.5',
                    )}
                    title={preset.description}
                    aria-label={`${preset.label} — ${preset.description}`}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-br', preset.gradient)} />
                    <div className="absolute inset-0 flex items-center justify-center text-xl opacity-70 group-hover:scale-110 transition-transform">
                      {preset.emoji}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="text-[10px] font-semibold text-white/95 truncate">{preset.label}</p>
                    </div>
                    {active && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-pink-500 text-white flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* 5) 크기 · 개수 */}
        <Section
          id="size"
          title="크기·개수"
          summary={props.kind === 'image' ? `${props.aspectRatio} · ${props.count}장` : `${props.aspectRatio} · ${VIDEO_CLIP_LENGTH_SEC}초`}
          defaultOpen
        >
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5 font-semibold">비율</p>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {ASPECT_OPTIONS.map((opt) => {
              const active = props.aspectRatio === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => props.setAspectRatio(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors',
                    active
                      ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500',
                  )}
                  aria-label={`${opt.label} ${opt.hint}`}
                >
                  <div
                    className={cn(
                      'rounded-sm border',
                      opt.ratioStyle,
                      active
                        ? 'border-white dark:border-slate-900 bg-white/30 dark:bg-slate-900/30'
                        : 'border-slate-400 dark:border-slate-500',
                    )}
                  />
                  <div className="text-center">
                    <p className="text-[10.5px] tabular-nums font-semibold">{opt.label}</p>
                    <p className={cn(
                      'text-[9px]',
                      active ? 'text-white/75 dark:text-slate-600' : 'text-slate-400',
                    )}>
                      {opt.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {props.kind === 'image' && (
            <>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5 font-semibold">
                개수 <span className="text-slate-400 font-normal">(각각 한도 차감)</span>
              </p>
              <div className="grid grid-cols-3 gap-1">
                {COUNT_OPTIONS.map((c) => {
                  const disabled = c > IMAGE_MAX_COUNT || c > props.imagesRemaining;
                  const active = props.count === c;
                  return (
                    <button
                      key={c}
                      onClick={() => props.setCount(c)}
                      disabled={disabled}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-[11.5px] font-semibold transition-colors',
                        active
                          ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                      )}
                    >
                      {c}장
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {props.kind === 'video' && (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              동영상 길이는 {VIDEO_CLIP_LENGTH_SEC}초로 고정돼 있어요.
            </p>
          )}
        </Section>

        {/* 6) 소스 이미지 (동영상만) */}
        {props.kind === 'video' && (
          <Section
            id="frames"
            title="소스 이미지"
            summary={[props.startFrame ? '첫' : '', props.endFrame ? '끝' : '', !props.startFrame && !props.endFrame ? '없음' : '']
              .filter(Boolean)
              .join(' · ')}
            defaultOpen={false}
          >
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
              갤러리 이미지에서 호버 시 [첫]/[끝]을 눌러 넣어요. (선택)
            </p>
            <div className="space-y-1.5">
              <FrameSlot label="첫 프레임" item={props.startFrame} onClear={props.onClearStartFrame} />
              <FrameSlot label="끝 프레임" item={props.endFrame} onClear={props.onClearEndFrame} />
            </div>
          </Section>
        )}
      </div>
    </aside>
  );
}

/* ── 아코디언 섹션 ── */
function Section({
  id, title, summary, defaultOpen = false, alwaysOpen = false, children,
}: {
  id: SectionId;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `mediaGen_section_${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (alwaysOpen) return true;
    if (typeof window === 'undefined') return defaultOpen;
    const saved = localStorage.getItem(storageKey);
    return saved === null ? defaultOpen : saved === '1';
  });

  useEffect(() => {
    if (alwaysOpen) return;
    localStorage.setItem(storageKey, open ? '1' : '0');
  }, [open, storageKey, alwaysOpen]);

  return (
    <div className="border-b border-slate-100 dark:border-slate-800/70">
      <button
        type="button"
        onClick={() => { if (!alwaysOpen) setOpen((v) => !v); }}
        disabled={alwaysOpen}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
          !alwaysOpen && 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40',
          alwaysOpen && 'cursor-default',
        )}
      >
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {title}
        </span>
        {summary && !open && (
          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex-1 text-right">
            {summary}
          </span>
        )}
        {!alwaysOpen && (
          <ChevronDown
            className={cn(
              'h-3 w-3 text-slate-400 transition-transform shrink-0',
              open ? 'rotate-180' : '',
              !summary || open ? 'ml-auto' : '',
            )}
          />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/* ── 모델 선택기 (카드 리스트) ── */
function ModelSelector({ models }: { models: ModelOption[] }) {
  const [selectedId, setSelectedId] = useState(models[0].id);
  return (
    <div className="space-y-1.5">
      {models.map((m) => {
        const active = m.id === selectedId;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            onClick={() => {
              if (!m.ready) return;
              setSelectedId(m.id);
            }}
            disabled={!m.ready}
            className={cn(
              'w-full flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
              active
                ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 bg-white dark:bg-slate-900'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
              !m.ready && 'opacity-60 cursor-not-allowed',
            )}
            aria-label={`${m.label} — ${m.description}`}
            title={!m.ready ? '준비중 — 환경변수 설정 필요' : m.description}
          >
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', active ? 'text-indigo-500' : 'text-slate-400')} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {m.label}
                </p>
                {!m.ready && (
                  <span className="text-[9px] px-1 py-px rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                    준비중
                  </span>
                )}
                {active && m.ready && (
                  <Check className="h-3 w-3 text-indigo-500 shrink-0" strokeWidth={3} />
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug truncate">
                {m.description}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Pill>속도: {m.speed}</Pill>
                <Pill>품질: {m.quality}</Pill>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[9.5px] px-1.5 py-px rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
      {children}
    </span>
  );
}

/* ── 프레임 슬롯 ── */
function FrameSlot({
  label, item, onClear,
}: { label: string; item: { url: string; label?: string } | null; onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-1.5 flex items-center gap-2">
      {item ? (
        <>
          <img src={item.url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 uppercase tracking-wide">{label}</p>
            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate">{item.label || '설정됨'}</p>
          </div>
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
            aria-label={`${label} 제거`}
          >
            <XIcon className="h-3 w-3" />
          </button>
        </>
      ) : (
        <>
          <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <LinkIcon className="h-3 w-3 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-[9.5px] text-slate-400">비어있음</p>
          </div>
        </>
      )}
    </div>
  );
}
