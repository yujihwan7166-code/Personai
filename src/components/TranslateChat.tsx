import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, ChevronDown, ChevronRight, Copy, Globe, RotateCcw, Save, Search, Sparkles, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  BUILTIN_PRESETS,
  DEFAULT_TRANSLATE_OPTIONS,
  DOC_TYPE_LABELS,
  DOMAIN_LABELS,
  FAITHFULNESS_LABELS,
  HONORIFIC_LABELS,
  LENGTH_LABELS,
  POST_ACTION_LABELS,
  READING_LEVEL_LABELS,
  TONE_LABELS,
  applyPreset,
  buildPostProcessPrompt,
  buildTranslatePrompt,
  deleteUserPreset,
  getCurrentPresetLabel,
  isPresetMatched,
  loadUserPresets,
  presetStateToText,
  saveUserPreset,
  type PostAction,
  type PresetState,
  type TranslateDocType,
  type TranslateDomain,
  type TranslateFaithfulness,
  type TranslateHonorific,
  type TranslateLength,
  type TranslateOptions,
  type TranslateReadingLevel,
  type TranslateTone,
  type UserPreset,
} from '@/lib/translate/options';

// ───────── 지원 언어 ─────────
interface Language { code: string; label: string; flag: string; }
const LANGUAGES: Language[] = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: '영어', flag: '🇺🇸' },
  { code: 'ja', label: '일본어', flag: '🇯🇵' },
  { code: 'zh', label: '중국어', flag: '🇨🇳' },
  { code: 'es', label: '스페인어', flag: '🇪🇸' },
  { code: 'fr', label: '프랑스어', flag: '🇫🇷' },
];
const langByCode = (code: string) => LANGUAGES.find((l) => l.code === code);
const labelOf = (code: string) => langByCode(code)?.label ?? code;

const SAMPLE_TEXT = '내일 회의 자료 공유 부탁드립니다.';
const MAX_LENGTH = 5000;

function detectLanguage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/[\u3131-\uD79D]/u.test(trimmed)) return 'ko';
  if (/[\u3040-\u309F\u30A0-\u30FF]/u.test(trimmed)) return 'ja';
  if (/[\u4E00-\u9FFF]/u.test(trimmed) && !/[\u3040-\u309F\u30A0-\u30FF]/u.test(trimmed)) return 'zh';
  if (/[áéíóúñü¿¡]/i.test(trimmed)) return 'es';
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(trimmed)) return 'fr';
  if (/[a-zA-Z]/.test(trimmed)) return 'en';
  return null;
}

// ───────── 프리셋 버튼 (중앙 스트립) ─────────
interface PresetStripButtonProps {
  state: PresetState;
  onClick: () => void;
  drawerOpen: boolean;
}

function PresetStripButton({ state, onClick, drawerOpen }: PresetStripButtonProps) {
  const meta = presetStateToText(state);
  const isBuiltin = state.kind === 'builtin-exact' || state.kind === 'builtin-modified';
  const isUser = state.kind === 'user-exact' || state.kind === 'user-modified';
  const isCustom = state.kind === 'custom';
  const isModified = state.kind === 'builtin-modified' || state.kind === 'user-modified';
  const isActive = state.kind !== 'default';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={drawerOpen}
      title={`번역 옵션 — ${meta.label}${meta.sub ? ` · ${meta.sub}` : ''}. 클릭해서 변경`}
      className={cn(
        'group inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-all border',
        'focus:outline-none focus:ring-2 focus:ring-violet-400',
        !isActive && 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300',
        isBuiltin && 'bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100',
        isUser && 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800',
        isCustom && 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200',
      )}
    >
      <span className="text-[14px] leading-none" aria-hidden>{meta.icon}</span>
      <span className="max-w-[160px] truncate">{meta.label}</span>
      {meta.sub && (
        <span className={cn('text-[10.5px] font-medium', isUser ? 'text-white/70' : 'text-slate-500')}>
          · {meta.sub}
        </span>
      )}
      <ChevronDown className="w-3 h-3 opacity-70 shrink-0" aria-hidden />
      {isModified && <span className="sr-only">(현재 프리셋에서 {(state as { modifiedCount: number }).modifiedCount}개 필드 수정됨)</span>}
    </button>
  );
}

// ───────── 언어 팝오버 ─────────
interface LanguagePopoverProps { value: string; onChange: (code: string) => void; onClose: () => void; align?: 'left' | 'right'; }
function LanguagePopover({ value, onChange, onClose, align = 'left' }: LanguagePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler); };
  }, [onClose]);
  return (
    <div ref={ref} role="listbox" className={cn('absolute top-full mt-1.5 z-40 w-[240px] rounded-xl bg-white border border-slate-200 shadow-lg ring-1 ring-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150', align === 'right' ? 'right-0' : 'left-0')}>
      <div className="p-1.5 grid grid-cols-2 gap-1">
        {LANGUAGES.map((lang) => {
          const isSelected = value === lang.code;
          return (
            <button key={lang.code} type="button" role="option" aria-selected={isSelected} onClick={() => { onChange(lang.code); onClose(); }} className={cn('flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-left transition-colors', isSelected ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'text-slate-700 hover:bg-slate-100')}>
              <span className="text-[14px]">{lang.flag}</span>
              <span className="flex-1 truncate">{lang.label}</span>
              {isSelected && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────── 좌측 감지 배지 ─────────
interface DetectedLanguageBadgeProps { detectedLang: string | null; overrideLang: string | null; hasInput: boolean; onOverride: (code: string | null) => void; }
function DetectedLanguageBadge({ detectedLang, overrideLang, hasInput, onOverride }: DetectedLanguageBadgeProps) {
  const [open, setOpen] = useState(false);
  const effective = overrideLang ?? detectedLang;
  const currentLabel = effective ? labelOf(effective) : null;
  const currentFlag = effective ? langByCode(effective)?.flag : null;
  let content: React.ReactNode; let tone: 'idle' | 'active' | 'unknown';
  if (!hasInput) { content = (<><Search className="w-3 h-3" /><span>언어 자동 감지</span></>); tone = 'idle'; }
  else if (effective) { content = (<><span className="text-[13px]" aria-hidden>{currentFlag}</span><span>{currentLabel}{overrideLang ? '' : '로 감지됨'}</span><ChevronDown className="w-3 h-3 opacity-70" aria-hidden /></>); tone = 'active'; }
  else { content = (<><span>❓</span><span>언어를 감지하지 못했어요</span><ChevronDown className="w-3 h-3 opacity-70" aria-hidden /></>); tone = 'unknown'; }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} className={cn('inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-semibold transition-colors', tone === 'idle' && 'bg-slate-100 text-slate-500 hover:bg-slate-200', tone === 'active' && 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100', tone === 'unknown' && 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100', 'focus:outline-none focus:ring-2 focus:ring-violet-400')}>
        {content}
      </button>
      {open && <LanguagePopover value={effective ?? 'ko'} onChange={(code) => onOverride(code === detectedLang ? null : code)} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ───────── 우측 언어 pill ─────────
function LanguagePillButton({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const lang = langByCode(value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} className={cn('inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-semibold transition-all', open ? 'bg-violet-50 text-violet-800 border border-violet-300 ring-2 ring-violet-400/30' : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400', 'focus:outline-none focus:ring-2 focus:ring-violet-400')}>
        <span className="text-[15px]" aria-hidden>{lang?.flag}</span>
        <span>{lang?.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 opacity-70 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <LanguagePopover value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ───────── Segmented 컨트롤 ─────────
function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 w-[68px] text-[11.5px] font-semibold text-slate-500">{label}</span>
      <div className="flex-1 inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button key={opt.value} type="button" onClick={() => onChange(opt.value)} aria-pressed={isActive} className={cn('flex-1 px-2.5 py-1.5 rounded-md text-[11.5px] font-semibold transition-all', isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/70')}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────── Drawer ─────────
interface OptionsDrawerProps {
  open: boolean;
  onClose: () => void;
  options: TranslateOptions;
  onApply: (next: TranslateOptions) => void;
  showHonorific: boolean;
}

function OptionsDrawer({ open, onClose, options: applied, onApply, showHonorific }: OptionsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Draft: drawer 내부는 별도 상태, 적용 버튼 눌러야 외부 반영
  const [draft, setDraft] = useState<TranslateOptions>(applied);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [deepOpen, setDeepOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (open) { setDraft(applied); setUserPresets(loadUserPresets()); setDeepOpen(false); } }, [open, applied]);
  useEffect(() => {
    if (!open) return;
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', keyHandler);
    const first = panelRef.current?.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    return () => document.removeEventListener('keydown', keyHandler);
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<TranslateOptions>) => setDraft((d) => ({ ...d, ...patch }));
  const matchedBuiltin = BUILTIN_PRESETS.find((p) => isPresetMatched(p, draft));
  const matchedUser = userPresets.find((p) => JSON.stringify(p.options) === JSON.stringify(draft));
  // 헤더 배지: 툴바 버튼과 동일한 라벨링을 공유 (단일 진실원)
  const draftPresetState = getCurrentPresetLabel(draft, userPresets);
  const draftMeta = presetStateToText(draftPresetState);

  const handleSavePreset = () => {
    const name = saveName.trim();
    if (!name) return;
    const next = saveUserPreset({ id: `user-${Date.now()}`, label: name, createdAt: Date.now(), options: draft });
    setUserPresets(next);
    setSaveModalOpen(false);
    setSaveName('');
    setToast(`✓ "${name}" 프리셋 저장됨`);
    setTimeout(() => setToast(null), 2000);
  };

  const handleDeleteUserPreset = (id: string) => {
    setUserPresets(deleteUserPreset(id));
  };

  const honorificKeys = ['casual', 'neutral', 'formal', 'ultra-formal'] as const;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="번역 옵션">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} />
      <div ref={panelRef} className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white shadow-2xl animate-in slide-in-from-right duration-250 flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900">번역 옵션</h2>
            <span className={cn(
              'text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1',
              draftPresetState.kind === 'default' && 'bg-slate-100 text-slate-600',
              (draftPresetState.kind === 'builtin-exact' || draftPresetState.kind === 'builtin-modified') && 'bg-violet-100 text-violet-700',
              (draftPresetState.kind === 'user-exact' || draftPresetState.kind === 'user-modified' || draftPresetState.kind === 'custom') && 'bg-slate-900 text-white',
            )}>
              <span>{draftMeta.icon}</span>
              <span>{draftMeta.label}</span>
              {draftMeta.sub && <span className="opacity-70">· {draftMeta.sub}</span>}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Layer 1 — 프리셋 */}
          <section className="px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[11.5px] uppercase tracking-wider font-bold text-slate-500">프리셋</h3>
              <button type="button" onClick={() => setSaveModalOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700">
                <Save className="w-3 h-3" /> 현재 설정 저장
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5" role="radiogroup">
              {/* 기본 — 모든 옵션을 기본값으로 리셋 */}
              {(() => {
                const isDefault = draftPresetState.kind === 'default';
                return (
                  <button type="button" role="radio" aria-checked={isDefault} onClick={() => setDraft({ ...DEFAULT_TRANSLATE_OPTIONS })} className={cn('text-left rounded-lg px-3 py-2.5 border transition-all', isDefault ? 'bg-slate-900 border-slate-900 ring-2 ring-slate-400/30' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[14px]">⚙️</span>
                      <span className={cn('text-[12.5px] font-semibold', isDefault ? 'text-white' : 'text-slate-800')}>기본</span>
                    </div>
                    <div className={cn('text-[10.5px] leading-snug', isDefault ? 'text-white/70' : 'text-slate-500')}>AI가 알아서 자연스럽게</div>
                  </button>
                );
              })()}
              {BUILTIN_PRESETS.map((preset) => {
                const isActive = matchedBuiltin?.id === preset.id;
                return (
                  <button key={preset.id} type="button" role="radio" aria-checked={isActive} onClick={() => setDraft(applyPreset(preset, draft))} className={cn('text-left rounded-lg px-3 py-2.5 border transition-all', isActive ? 'bg-violet-50 border-violet-300 ring-2 ring-violet-400/30' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[14px]">{preset.icon}</span>
                      <span className="text-[12.5px] font-semibold text-slate-800">{preset.label}</span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 leading-snug">{preset.description}</div>
                  </button>
                );
              })}
            </div>
            {userPresets.length > 0 && (
              <>
                <h4 className="text-[10.5px] uppercase tracking-wider font-bold text-slate-400 mt-3 mb-1.5">내 프리셋</h4>
                <div className="flex flex-col gap-1">
                  {userPresets.map((preset) => {
                    const isActive = matchedUser?.id === preset.id;
                    return (
                      <div key={preset.id} className={cn('group flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all', isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                        <button type="button" onClick={() => setDraft(preset.options)} className="flex-1 text-left text-[12.5px] font-semibold truncate">
                          💾 {preset.label}
                        </button>
                        <button type="button" onClick={() => handleDeleteUserPreset(preset.id)} aria-label={`${preset.label} 삭제`} className={cn('p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity', isActive ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* Layer 2 — 핵심 축 */}
          <section className="px-5 py-4 border-b border-slate-100 space-y-2.5">
            <h3 className="text-[11.5px] uppercase tracking-wider font-bold text-slate-500 mb-2">핵심 조정</h3>
            {showHonorific && (
              <Segmented<Exclude<TranslateHonorific, null>>
                label="격식도"
                value={(draft.honorific ?? 'neutral') as Exclude<TranslateHonorific, null>}
                options={honorificKeys.map((k) => ({ value: k, label: HONORIFIC_LABELS[k] }))}
                onChange={(v) => update({ honorific: v })}
              />
            )}
            <Segmented<TranslateLength>
              label="길이"
              value={draft.length}
              options={(Object.keys(LENGTH_LABELS) as TranslateLength[]).map((k) => ({ value: k, label: LENGTH_LABELS[k] }))}
              onChange={(v) => update({ length: v })}
            />
            <Segmented<TranslateReadingLevel>
              label="어휘"
              value={draft.readingLevel}
              options={(Object.keys(READING_LEVEL_LABELS) as TranslateReadingLevel[]).map((k) => ({ value: k, label: READING_LEVEL_LABELS[k] }))}
              onChange={(v) => update({ readingLevel: v })}
            />
            <Segmented<TranslateFaithfulness>
              label="번역 성향"
              value={draft.faithfulness}
              options={(Object.keys(FAITHFULNESS_LABELS) as TranslateFaithfulness[]).map((k) => ({ value: k, label: FAITHFULNESS_LABELS[k] }))}
              onChange={(v) => update({ faithfulness: v })}
            />
            <Segmented<TranslateTone>
              label="톤"
              value={draft.tone}
              options={(Object.keys(TONE_LABELS) as TranslateTone[]).map((k) => ({ value: k, label: TONE_LABELS[k].label }))}
              onChange={(v) => update({ tone: v })}
            />
          </section>

          {/* Layer 3 — 세부 옵션 (접힘) */}
          <section className="px-5 py-3">
            <button type="button" onClick={() => setDeepOpen((v) => !v)} className="w-full flex items-center justify-between text-[11.5px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-700 py-1">
              <span>세부 옵션</span>
              <ChevronRight className={cn('w-4 h-4 transition-transform', deepOpen && 'rotate-90')} />
            </button>
            {deepOpen && (
              <div className="space-y-4 mt-3">
                {/* 문서 유형 */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">어떤 글인가요?</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(DOC_TYPE_LABELS) as TranslateDocType[]).map((dt) => {
                      const isActive = draft.docType === dt;
                      const meta = DOC_TYPE_LABELS[dt];
                      return (
                        <button key={dt} type="button" onClick={() => update({ docType: dt })} aria-pressed={isActive} className={cn('flex flex-col items-center gap-1 rounded-lg px-2 py-2 border transition-all', isActive ? 'bg-violet-50 border-violet-300 text-violet-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}>
                          <span className="text-[16px]" aria-hidden>{meta.icon}</span>
                          <span className="text-[11px] font-semibold">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 분야 */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">전문 분야</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(DOMAIN_LABELS) as TranslateDomain[]).map((d) => {
                      const isActive = draft.domain === d;
                      return (
                        <button key={d} type="button" onClick={() => update({ domain: d })} aria-pressed={isActive} className={cn('h-7 px-2.5 rounded-full text-[11.5px] font-semibold transition-colors border', isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')}>
                          {DOMAIN_LABELS[d]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 고급 */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">고급</div>
                  {([
                    ['preserveFormat', '원본 포맷(줄바꿈·불릿) 유지'],
                    ['preserveEmoji', '이모지·이모티콘 보존'],
                    ['parenthesizeTechTerms', '전문용어 원문 괄호 병기'],
                  ] as Array<[keyof TranslateOptions, string]>).map(([key, label]) => {
                    const checked = Boolean(draft[key]);
                    return (
                      <label key={String(key)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={(e) => update({ [key]: e.target.checked } as Partial<TranslateOptions>)} className="w-4 h-4 accent-violet-600" />
                        <span className="text-[12px] text-slate-700">{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 저장 모달 (inline) */}
        {saveModalOpen && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-[11.5px] font-semibold text-slate-700 mb-2">이 프리셋의 이름을 지어주세요</div>
            <div className="flex gap-2">
              <input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setSaveModalOpen(false); }} placeholder="예: 내 업무 스타일" className="flex-1 h-8 px-3 rounded-md text-[12px] bg-white border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30" />
              <button type="button" onClick={handleSavePreset} disabled={!saveName.trim()} className="h-8 px-3 rounded-md text-[12px] font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">저장</button>
              <button type="button" onClick={() => { setSaveModalOpen(false); setSaveName(''); }} className="h-8 px-3 rounded-md text-[12px] font-semibold text-slate-600 hover:bg-slate-200">취소</button>
            </div>
            {userPresets.length >= 5 && <div className="text-[10.5px] text-amber-600 mt-1.5">⚠️ 프리셋은 5개까지 저장 가능. 저장하면 가장 오래된 게 밀립니다.</div>}
          </div>
        )}

        {toast && <div className="flex-shrink-0 px-5 py-2 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border-t border-emerald-100">{toast}</div>}

        {/* 하단 버튼 */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border-t border-slate-200">
          <button type="button" onClick={() => setDraft({ ...DEFAULT_TRANSLATE_OPTIONS, honorific: draft.honorific })} className="h-9 px-3 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            기본값
          </button>
          <button type="button" onClick={() => { onApply(draft); onClose(); }} className="flex-1 h-9 rounded-lg text-[12.5px] font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
            적용하고 닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── 스켈레톤 ─────────
function TranslationSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="h-3.5 bg-slate-200/80 rounded w-full" />
      <div className="h-3.5 bg-slate-200/80 rounded w-11/12" />
      <div className="h-3.5 bg-slate-200/80 rounded w-2/3" />
    </div>
  );
}

// ───────── 메인 ─────────
interface TranslateChatProps { onBack?: () => void; }

export function TranslateChat({ onBack }: TranslateChatProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState('en');

  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [overrideLang, setOverrideLang] = useState<string | null>(null);
  const effectiveSourceLang = overrideLang ?? detectedLang;

  const [options, setOptions] = useState<TranslateOptions>(DEFAULT_TRANSLATE_OPTIONS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [retranslateBanner, setRetranslateBanner] = useState<string | null>(null);

  const [phase, setPhase] = useState<'idle' | 'translating' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [alternatives, setAlternatives] = useState<string[] | null>(null);
  const [postActionPending, setPostActionPending] = useState<PostAction | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sourceTextRef = useRef(sourceText); sourceTextRef.current = sourceText;
  const sourceLangRef = useRef(effectiveSourceLang); sourceLangRef.current = effectiveSourceLang;
  const targetLangRef = useRef(targetLang); targetLangRef.current = targetLang;
  const optionsRef = useRef(options); optionsRef.current = options;
  const translatedTextRef = useRef(translatedText); translatedTextRef.current = translatedText;

  // 언어 감지
  useEffect(() => {
    const text = sourceText.trim();
    if (!text) { setDetectedLang(null); setOverrideLang(null); return; }
    const detected = detectLanguage(text);
    setDetectedLang(detected);
    if (detected && !overrideLang) {
      if (detected === 'ko' && targetLang === 'ko') setTargetLang('en');
      else if (detected !== 'ko' && targetLang !== 'ko') setTargetLang('ko');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText]);

  // 번역 수행 (일반)
  const runTranslate = useCallback(async (overrideSystemPrompt?: string, isAlternatives?: boolean) => {
    const text = sourceTextRef.current.trim();
    const srcLang = sourceLangRef.current;
    const tgtLang = targetLangRef.current;
    if (!text || !srcLang) return;
    if (text.length > MAX_LENGTH) { setPhase('error'); setErrorMessage(`한 번에 번역 가능한 길이(${MAX_LENGTH}자)를 넘었어요. 문장을 나눠서 번역해 주세요.`); return; }
    if (srcLang === tgtLang) { setPhase('error'); setErrorMessage('원문과 대상 언어가 같아요. 다른 언어를 선택해 주세요.'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('translating');
    if (!isAlternatives) { setTranslatedText(''); setAlternatives(null); }
    setErrorMessage('');

    try {
      const systemPrompt = overrideSystemPrompt ?? buildTranslatePrompt(labelOf(srcLang), labelOf(tgtLang), tgtLang, optionsRef.current);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, question: text, openrouterModel: 'google/gemini-2.5-flash-lite', searchPolicy: 'never', maxTokens: 2000 }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        if (response.status === 429) throw new Error('오늘 번역 한도를 모두 썼어요. 내일 다시 이용해 주세요.');
        if (response.status >= 500) throw new Error('번역 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.');
        throw new Error('번역에 실패했어요. 다시 시도해 주세요.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (delta) {
              accumulated += delta;
              if (!isAlternatives) setTranslatedText(accumulated);
            }
          } catch { /* skip */ }
        }
      }
      if (isAlternatives) {
        const parts = accumulated.split(/\n+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
        setAlternatives(parts);
      }
      setPhase('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase('error');
      setErrorMessage((err as Error).message || '번역 중 문제가 생겼어요.');
    } finally {
      setPostActionPending(null);
    }
  }, []);

  // 자동 번역 트리거
  useEffect(() => {
    const text = sourceText.trim();
    if (!text || !effectiveSourceLang) { setTranslatedText(''); setAlternatives(null); setPhase('idle'); return; }
    const lastChar = text[text.length - 1];
    const isBoundary = /[.!?。！？]/.test(lastChar);
    const delay = isBoundary ? 150 : 1500;
    const timer = setTimeout(() => { void runTranslate(); }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, effectiveSourceLang, targetLang, options]);

  // 후처리
  const handlePostAction = useCallback((action: PostAction) => {
    const src = sourceTextRef.current.trim();
    const cur = translatedTextRef.current.trim();
    const srcLang = sourceLangRef.current;
    const tgtLang = targetLangRef.current;
    if (!src || !cur || !srcLang) return;
    setPostActionPending(action);
    const prompt = buildPostProcessPrompt(action, labelOf(srcLang), labelOf(tgtLang), src, cur);
    void runTranslate(prompt, action === 'alternatives');
  }, [runTranslate]);

  const handleSwap = useCallback(() => {
    if (!effectiveSourceLang) return;
    const newSource = targetLang; const newTarget = effectiveSourceLang;
    setTargetLang(newTarget); setOverrideLang(newSource); setSourceText(translatedText); setTranslatedText(sourceText); setAlternatives(null);
  }, [effectiveSourceLang, targetLang, sourceText, translatedText]);

  const handleCopy = useCallback(() => {
    if (!translatedText) return;
    void navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [translatedText]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'Enter') { e.preventDefault(); void runTranslate(); }
      else if (isMod && e.shiftKey && e.key.toLowerCase() === 'c' && translatedText) { e.preventDefault(); handleCopy(); }
      else if (isMod && e.key === '/') { e.preventDefault(); handleSwap(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runTranslate, handleCopy, handleSwap, translatedText]);

  const hasKorean = effectiveSourceLang === 'ko' || targetLang === 'ko';
  const showHonorific = hasKorean && targetLang === 'ko';
  const charCount = sourceText.length;
  const isOverLimit = charCount > MAX_LENGTH;

  // 프리셋 상태 (툴바·drawer 양쪽이 공유)
  const [userPresetsCache, setUserPresetsCache] = useState<UserPreset[]>(() => loadUserPresets());
  const presetState = getCurrentPresetLabel(options, userPresetsCache);
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/50 to-white">
      {/* 헤더 */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 md:px-8 py-4 border-b border-slate-200 bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 via-sky-500/10 to-violet-500/10 border border-border/60 flex items-center justify-center shadow-sm shrink-0">
            <Globe className="w-5 h-5 text-blue-600/80" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-semibold text-[20px] tracking-tight leading-none truncate">다국어 번역</h1>
            <p className="text-[12px] text-muted-foreground mt-1 truncate hidden sm:block">맥락과 뉘앙스까지 읽는 AI 번역</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" role="toolbar" aria-label="번역 설정">
          <PresetStripButton
            state={presetState}
            drawerOpen={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          />
          {onBack && (
            <button type="button" onClick={onBack} aria-label="닫기" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">
          {/* 재번역 피드백 배너 */}
          {retranslateBanner && (
            <div
              role="status"
              aria-live="polite"
              className="mb-3 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-50 border border-violet-200 text-[12px] font-medium text-violet-800 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <span>{retranslateBanner}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 relative">
            {/* 원문 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <DetectedLanguageBadge detectedLang={detectedLang} overrideLang={overrideLang} hasInput={!!sourceText.trim()} onOverride={setOverrideLang} />
                <span className={cn('text-[11px] tabular-nums', isOverLimit ? 'text-rose-500 font-semibold' : 'text-slate-400')}>
                  {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
                </span>
              </div>
              <textarea aria-label="원문 입력" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={`번역할 문장을 입력하세요 · 예: ${SAMPLE_TEXT}`} autoFocus className="flex-1 resize-none px-4 py-3 text-[14.5px] leading-[1.7] text-slate-800 focus:outline-none bg-transparent min-h-[220px]" />
              {!sourceText && (
                <div className="px-4 pb-3 -mt-1">
                  <button type="button" onClick={() => setSourceText(SAMPLE_TEXT)} className="text-[11.5px] text-slate-400 hover:text-violet-600 transition-colors">💡 예시 문장으로 시작해보기</button>
                </div>
              )}
            </div>

            <button type="button" onClick={handleSwap} aria-label="언어 바꾸기 (Cmd+/)" title="언어 바꾸기 (Cmd+/)" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:scale-110 transition-all flex items-center justify-center group">
              <ArrowLeftRight className="w-4 h-4 text-slate-600 group-hover:text-violet-600 transition-colors" strokeWidth={2} />
            </button>

            {/* 번역 결과 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[280px]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                <LanguagePillButton value={targetLang} onChange={setTargetLang} />
                <div className="flex items-center gap-1">
                  {phase === 'done' && translatedText && (
                    <>
                      <button type="button" onClick={() => void runTranslate()} aria-label="다시 번역" title="다시 번역" className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"><RotateCcw className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={handleCopy} aria-label="복사 (Cmd+Shift+C)" title="복사 (Cmd+Shift+C)" className={cn('p-1.5 rounded-md transition-colors', copied ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100')}>
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div aria-live="polite" className="flex-1 px-4 py-3 text-[14.5px] leading-[1.7] text-slate-800 min-h-[220px] overflow-auto">
                {phase === 'idle' && !translatedText && <div className="text-slate-300 select-none">여기에 번역 결과가 표시돼요</div>}
                {phase === 'translating' && !translatedText && <TranslationSkeleton />}
                {phase === 'error' && (
                  <div className="flex flex-col items-start gap-3">
                    <div className="text-[13.5px] text-rose-600 leading-relaxed">⚠️ {errorMessage}</div>
                    <button type="button" onClick={() => void runTranslate()} className="text-[12px] font-semibold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg">다시 시도</button>
                  </div>
                )}
                {translatedText && (
                  <div className="whitespace-pre-wrap">
                    {translatedText}
                    {phase === 'translating' && <span className="inline-block w-0.5 h-[1em] bg-violet-500 align-middle ml-0.5 animate-pulse" />}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 후처리 버튼 — 결과 완료 후 노출 */}
          {phase === 'done' && translatedText && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['shorter', 'longer', 'more-formal', 'more-casual', 'alternatives'] as PostAction[]).map((action) => {
                const meta = POST_ACTION_LABELS[action];
                const isLoading = postActionPending === action;
                return (
                  <button key={action} type="button" onClick={() => handlePostAction(action)} disabled={postActionPending !== null} title={meta.description} className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold transition-all border', isLoading ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50')}>
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    {isLoading && <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* 대안 번역 결과 */}
          {alternatives && alternatives.length > 0 && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3.5">
              <div className="text-[11.5px] font-bold text-violet-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 다른 번역 대안
              </div>
              <div className="space-y-1.5">
                {alternatives.map((alt, i) => (
                  <button key={i} type="button" onClick={() => { setTranslatedText(alt); setAlternatives(null); }} className="w-full text-left px-3 py-2 rounded-lg bg-white border border-violet-200 hover:border-violet-400 hover:bg-violet-50 transition-colors">
                    <div className="text-[10.5px] text-violet-500 font-bold mb-0.5">대안 {i + 1}</div>
                    <div className="text-[13px] text-slate-800 leading-relaxed">{alt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 하단 단축키 힌트 */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-[11px] text-slate-400 hidden md:flex">
            <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px]">⌘ Enter</kbd> 번역</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px]">⌘ /</kbd> 언어 바꾸기</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px]">⌘⇧ C</kbd> 복사</span>
          </div>
        </div>
      </div>

      <OptionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        options={options}
        onApply={(next) => {
          const changed = JSON.stringify(next) !== JSON.stringify(options);
          setOptions(next);
          setUserPresetsCache(loadUserPresets());
          if (changed && sourceText.trim()) {
            const nextState = getCurrentPresetLabel(next, loadUserPresets());
            const nextMeta = presetStateToText(nextState);
            setRetranslateBanner(`✨ "${nextMeta.label}${nextMeta.sub ? ` · ${nextMeta.sub}` : ''}"로 다시 번역 중...`);
            setTimeout(() => setRetranslateBanner(null), 3000);
          }
        }}
        showHonorific={showHonorific}
      />
    </div>
  );
}
