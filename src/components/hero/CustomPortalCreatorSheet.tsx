/**
 * 나만의 포탈 생성/편집 시트.
 *
 * 필드: 이름 · 이모지 · 색 · URL 템플릿 (`{Q}` 자리에 검색어 치환)
 *
 * 저장 시 useCustomPortals.createCustomPortal (or update) → localStorage.
 */
import { useState } from 'react';
import { ExternalLink, Globe, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CUSTOM_AI_COLOR_OPTIONS,
} from '@/lib/customAi';
import {
  CUSTOM_PORTAL_EMOJI_OPTIONS,
  isValidUrlTemplate,
  newCustomPortalDraft,
  type CustomPortal,
} from '@/lib/customPortal';

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: CustomPortal;
  onCreate: (input: Omit<CustomPortal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate?: (id: string, patch: Partial<CustomPortal>) => void;
}

const EXAMPLES = [
  { name: 'Notion', url: 'https://www.notion.so/search?q={Q}' },
  { name: 'DevDocs', url: 'https://devdocs.io/#q={Q}' },
  { name: 'MDN', url: 'https://developer.mozilla.org/ko/search?q={Q}' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/search?q={Q}' },
];

export function CustomPortalCreatorSheet({
  open,
  onClose,
  editing,
  onCreate,
  onUpdate,
}: Props) {
  const [draft, setDraft] = useState<Omit<CustomPortal, 'id' | 'createdAt' | 'updatedAt'>>(
    () => editing ?? newCustomPortalDraft(),
  );

  if (!open) return null;

  const isEditing = !!editing;
  const urlValid = isValidUrlTemplate(draft.urlTemplate);
  const canSave = draft.name.trim().length > 0 && urlValid;

  const previewUrl = urlValid
    ? draft.urlTemplate.replace('{Q}', encodeURIComponent('테스트 검색어'))
    : null;

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
      aria-label={isEditing ? '포탈 편집' : '나만의 포탈 만들기'}
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
            <Globe size={16} className="text-blue-400" />
            <h2 className="text-[15px] font-semibold text-white">
              {isEditing ? '포탈 편집' : '나만의 포탈 만들기'}
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
              {draft.urlTemplate || 'URL 미입력'}
            </div>
          </div>
        </div>

        {/* 폼 */}
        <div className="px-5 pb-4 space-y-4 max-h-[62vh] overflow-y-auto">
          <Field label="이름" hint="칩·헤드라인에 표시" required>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="예: Notion, DevDocs, 사내위키"
              maxLength={20}
              className={inputCls}
            />
          </Field>

          <Field label="URL 템플릿" hint="검색어 자리에 {Q} 를 넣어주세요" required>
            <textarea
              value={draft.urlTemplate}
              onChange={(e) => setDraft((d) => ({ ...d, urlTemplate: e.target.value }))}
              placeholder="https://example.com/search?q={Q}"
              rows={2}
              className={cn(inputCls, 'resize-none min-h-[60px] font-mono text-[12px]')}
            />
            {!urlValid && draft.urlTemplate.length > 0 && (
              <p className="text-[10.5px] text-red-400 mt-1">
                http(s):// 로 시작하고 {'{Q}'} 를 반드시 포함해야 합니다.
              </p>
            )}
            {previewUrl && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-1.5">
                <ExternalLink size={11} className="text-white/40 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-white/40">검색어 "테스트 검색어" 시 이동할 URL:</div>
                  <div className="text-[11px] font-mono text-white/70 truncate mt-0.5">
                    {previewUrl}
                  </div>
                </div>
              </div>
            )}

            {/* 예시 템플릿 — 클릭 시 자동 채움 */}
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[10.5px] text-white/40 mr-1">예시:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, urlTemplate: ex.url }))}
                  className="text-[10.5px] px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="이모지">
            <div className="grid grid-cols-8 gap-1.5">
              {CUSTOM_PORTAL_EMOJI_OPTIONS.map((e) => (
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
                ? 'bg-blue-600 hover:bg-blue-500'
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
  'focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.06]',
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
          {required && <span className="text-blue-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10.5px] text-white/40">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
