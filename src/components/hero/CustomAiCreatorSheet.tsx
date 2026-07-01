/**
 * 나만의 AI 생성/편집 시트.
 *
 * 필드: 이름 · 설명 · 이모지 · 색 · 베이스 브랜드 · 시스템 프롬프트
 * (선택: 헤드라인, placeholder — 없으면 description/기본값 사용)
 *
 * 저장 시 useCustomAis.createCustomAi (or updateCustomAi) 호출 → localStorage.
 */
import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRANDS, BRAND_BY_ID } from '@/lib/aiBrands';
import {
  CUSTOM_AI_COLOR_OPTIONS,
  CUSTOM_AI_EMOJI_OPTIONS,
  newCustomAiDraft,
  type CustomAi,
} from '@/lib/customAi';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 편집 모드일 때 기존 데이터 전달. undefined 이면 신규 생성. */
  editing?: CustomAi;
  onCreate: (input: Omit<CustomAi, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate?: (id: string, patch: Partial<CustomAi>) => void;
}

export function CustomAiCreatorSheet({
  open,
  onClose,
  editing,
  onCreate,
  onUpdate,
}: Props) {
  const [draft, setDraft] = useState<Omit<CustomAi, 'id' | 'createdAt' | 'updatedAt'>>(
    () => editing ?? newCustomAiDraft(),
  );

  if (!open) return null;

  const isEditing = !!editing;
  const canSave = draft.name.trim().length > 0 && draft.systemPrompt.trim().length > 0;

  const handleBaseBrandChange = (brandId: string) => {
    const brand = BRAND_BY_ID[brandId as keyof typeof BRAND_BY_ID];
    if (!brand) return;
    // 기본 모델의 expertId 자동 세팅.
    const defaultModel = brand.models.find((m) => m.isDefault) ?? brand.models[0];
    setDraft((d) => ({
      ...d,
      baseBrandId: brand.id,
      baseExpertId: defaultModel.id,
    }));
  };

  const handleSave = () => {
    if (!canSave) return;
    if (isEditing && onUpdate && editing) {
      onUpdate(editing.id, draft);
    } else {
      onCreate(draft);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? '나만의 AI 편집' : '나만의 AI 만들기'}
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-[min(560px,94vw)] max-h-[92vh] overflow-hidden rounded-2xl',
          'border border-white/10 bg-[#111114] shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <h2 className="text-[15px] font-semibold text-white">
              {isEditing ? '나만의 AI 편집' : '나만의 AI 만들기'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* 미리보기 칩 */}
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: draft.colorHex }}
          >
            <span className="text-[22px] leading-none select-none">{draft.emoji}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-white truncate">
              {draft.name || '이름 없음'}
            </div>
            <div className="text-[11.5px] text-white/50 truncate">
              {draft.description || '설명 없음'} · {BRAND_BY_ID[draft.baseBrandId]?.name ?? '?'}
            </div>
          </div>
        </div>

        {/* 폼 */}
        <div className="px-5 pb-4 space-y-4 max-h-[62vh] overflow-y-auto">
          {/* 이름 */}
          <Field label="이름" hint="칩·헤드라인에 표시" required>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="예: 김비서, 코드리뷰어, 여행 플래너"
              maxLength={20}
              className={inputCls}
            />
          </Field>

          {/* 설명 */}
          <Field label="설명" hint="한 줄로 뭘 하는 AI 인지">
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="예: 일정·이메일 정리 · 회의록 요약"
              maxLength={50}
              className={inputCls}
            />
          </Field>

          {/* 이모지 */}
          <Field label="이모지">
            <div className="grid grid-cols-8 gap-1.5">
              {CUSTOM_AI_EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, emoji: e }))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-[18px]',
                    'transition-all',
                    draft.emoji === e
                      ? 'bg-white/[0.10] ring-1 ring-white/40 scale-105'
                      : 'hover:bg-white/[0.05]',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

          {/* 색 */}
          <Field label="색">
            <div className="flex flex-wrap gap-2">
              {CUSTOM_AI_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, colorHex: c }))}
                  aria-label={`색 ${c}`}
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    draft.colorHex === c
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111114] scale-110'
                      : 'ring-1 ring-white/20 hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          {/* 베이스 브랜드 */}
          <Field label="베이스 모델" hint="어떤 AI 위에서 돌릴지">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {BRANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBaseBrandChange(b.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-2 rounded-lg text-left',
                    'transition-all text-[11.5px] font-medium',
                    draft.baseBrandId === b.id
                      ? 'bg-white/[0.10] ring-1 ring-white/30 text-white'
                      : 'bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full shrink-0"
                    style={{ backgroundColor: `#${b.icon.hex}` }}
                  />
                  <span className="truncate">{b.name}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* 시스템 프롬프트 */}
          <Field label="시스템 프롬프트" hint="이 AI 가 어떻게 답해야 하는지" required>
            <textarea
              value={draft.systemPrompt}
              onChange={(e) => setDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
              placeholder="예: 당신은 김대리의 유능한 비서입니다. 답변은 항상 3줄 이내로, 정중하고 명확하게…"
              rows={4}
              className={cn(inputCls, 'resize-none min-h-[92px]')}
            />
          </Field>

          {/* 선택 필드 — 접혀있는 고급 옵션. */}
          <details className="group">
            <summary className="cursor-pointer text-[12px] font-medium text-white/60 hover:text-white/80 transition-colors select-none">
              고급 옵션 (선택)
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="커스텀 헤드라인" hint="히어로 상단 큰 글씨. 없으면 설명 사용.">
                <input
                  type="text"
                  value={draft.greeting || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, greeting: e.target.value }))}
                  placeholder="예: 오늘 뭘 정리할까요?"
                  maxLength={30}
                  className={inputCls}
                />
              </Field>
              <Field label="입력창 placeholder" hint="빈 입력창에 표시될 힌트.">
                <input
                  type="text"
                  value={draft.placeholder || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
                  placeholder="예: 일정·이메일 물어보세요"
                  maxLength={40}
                  className={inputCls}
                />
              </Field>
            </div>
          </details>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'h-9 px-4 rounded-lg text-[12.5px] font-semibold text-white transition-colors',
              canSave
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-white/[0.06] text-white/40 cursor-not-allowed',
            )}
          >
            {isEditing ? '저장' : '만들기'}
          </button>
        </footer>
      </div>
    </div>
  );
}

const inputCls = cn(
  'w-full h-9 px-3 rounded-lg text-[13px]',
  'bg-white/[0.04] border border-white/10',
  'text-white placeholder:text-white/30',
  'focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.06]',
  'transition-colors',
);

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-[11.5px] font-semibold text-white/80">
          {label}
          {required && <span className="text-purple-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10.5px] text-white/40">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
