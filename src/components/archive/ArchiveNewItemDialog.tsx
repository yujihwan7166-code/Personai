/**
 * 새 항목 저장 — 2단계.
 *  1) 양식 고르기 (컬렉션 = 양식)
 *  2) 그 양식의 필드 채우기 + 컬렉션·태그 직접 설정 (+ 선택적 "AI로 채우기")
 *
 * 파일/이미지는 IndexedDB(archiveBlobStore)로, 나머지 메타는 archiveStore로.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Loader2, Upload, ArrowLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  DEFAULT_FORMS,
  extractDomain,
  deriveKind,
  type ArchiveCollection,
  type ArchiveFieldValue,
  type ArchiveForm,
  type ArchiveFormField,
} from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { putArchiveBlob, dataUrlToBlob } from '@/lib/archiveBlobStore';
import { compressImage } from '@/lib/journalImage';
import { aiClassifyArchiveItem } from '@/lib/archive/ai';

const SPECIAL_KEYS = new Set(['title', 'note', 'url', 'file', 'image']);

/** 커스텀 카테고리(사용자 생성 컬렉션)용 일반 필드 — 전용 양식이 없을 때. */
const GENERIC_FIELDS: ArchiveFormField[] = [
  { key: 'title', label: '제목', type: 'text', placeholder: '무엇을 저장하나요?', optional: false },
  { key: 'note', label: '내용', type: 'textarea' },
  { key: 'file', label: '파일', type: 'file' },
];

/** 커스텀 컬렉션을 저장 폼(양식)으로 감싼다. */
function collectionForm(c: { id: string; name: string; emoji?: string }): ArchiveForm {
  return { key: `custom:${c.id}`, name: c.name, emoji: c.emoji ?? '📁', desc: '', fields: GENERIC_FIELDS };
}

interface Props {
  open: boolean;
  onClose: () => void;
  collections: ArchiveCollection[];
  /** 열 때 미리 고를 컬렉션 (사이드바에서 특정 컬렉션 보고 있을 때). */
  defaultCollectionId?: string;
}

export function ArchiveNewItemDialog({ open, onClose, collections, defaultCollectionId }: Props) {
  const [form, setForm] = useState<ArchiveForm | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [attached, setAttached] = useState<{ file: File; fieldKey: string; isImage: boolean; previewUrl?: string } | null>(null);
  const [collectionId, setCollectionId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const collectionNames = useMemo(() => collections.map((c) => c.name), [collections]);

  const reset = () => {
    setForm(null);
    setValues({});
    setAttached((a) => { if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl); return null; });
    setTags([]);
    setTagInput('');
    setAiLoading(false);
    setSaving(false);
    setCreatingCategory(false);
    setNewCategoryName('');
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const pickForm = (f: ArchiveForm, explicitCollectionId?: string) => {
    setForm(f);
    setValues({});
    setTags([]);
    // 양식에 대응하는 컬렉션(builtinKey 일치) 선택, 커스텀은 명시 id, 없으면 폴백.
    const matched = explicitCollectionId
      ?? collections.find((c) => c.builtinKey === f.key)?.id
      ?? defaultCollectionId
      ?? collections[0]?.id
      ?? '';
    setCollectionId(matched);
  };

  // 사용자가 직접 만든 카테고리(기본 시드가 아닌 것) — 픽커에 함께 노출.
  const customCollections = collections.filter((c) => !c.builtinKey);

  const createCategory = () => {
    const name = newCategoryName.trim();
    if (!name) { setCreatingCategory(false); return; }
    const c = archiveStore.addCollection(name);
    setNewCategoryName('');
    setCreatingCategory(false);
    pickForm(collectionForm(c), c.id); // 만든 즉시 그 카테고리 입력 폼으로
  };

  const setValue = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }));

  const onFilePick = (field: ArchiveFormField, file: File | undefined) => {
    if (!file) return;
    if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);
    const isImage = field.type === 'image' || file.type.startsWith('image/');
    setAttached({
      file,
      fieldKey: field.key,
      isImage,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput('');
  };

  const runAiFill = async () => {
    const content = [values.title, values.note, values.url, attached?.file.name]
      .filter(Boolean).join('\n').trim();
    if (!content) {
      notify.info('먼저 제목이나 내용을 조금 적어주세요');
      return;
    }
    setAiLoading(true);
    try {
      const s = await aiClassifyArchiveItem(content, collectionNames);
      if (s.title && !values.title?.trim()) setValue('title', s.title);
      if (s.tags.length) setTags((prev) => [...new Set([...prev, ...s.tags])]);
      if (s.collectionName) {
        const c = collections.find((x) => x.name === s.collectionName);
        if (c) setCollectionId(c.id);
      }
      notify.success('AI가 제안을 채웠어요', { description: '마음에 안 들면 수정하세요' });
    } catch {
      notify.error('AI 제안을 못 받았어요', { description: '직접 채워서 저장하면 돼요' });
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    if (!form) return;
    // 필수 필드 검사
    for (const f of form.fields) {
      if (f.optional === false) {
        if (f.type === 'file' || f.type === 'image') {
          if (!attached) { notify.info(`${f.label}을(를) 첨부해주세요`); return; }
        } else if (!values[f.key]?.trim()) {
          notify.info(`${f.label}을(를) 입력해주세요`); return;
        }
      }
    }
    const hasAnything = attached || Object.values(values).some((v) => v.trim());
    if (!hasAnything) { notify.info('저장할 내용이 없어요'); return; }

    setSaving(true);
    try {
      let blobRef: string | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;
      let size: number | undefined;

      if (attached) {
        if (attached.isImage) {
          const { src } = await compressImage(attached.file);
          const blob = dataUrlToBlob(src);
          blobRef = await putArchiveBlob(blob, 'image/jpeg');
          mimeType = 'image/jpeg';
          fileName = attached.file.name;
          size = blob.size;
        } else {
          blobRef = await putArchiveBlob(attached.file);
          mimeType = attached.file.type || 'application/octet-stream';
          fileName = attached.file.name;
          size = attached.file.size;
        }
      }

      const url = values.url?.trim() || undefined;
      const domain = url ? extractDomain(url) : undefined;

      // 제목 폴백: 제목 → 본문 첫 줄 → 파일명 → 도메인 → 무제
      const title =
        values.title?.trim() ||
        values.note?.trim().split('\n')[0]?.slice(0, 60) ||
        fileName ||
        domain ||
        '무제';

      // 양식별 추가 필드 (특수 키 제외)
      const fields: ArchiveFieldValue[] = form.fields
        .filter((f) => !SPECIAL_KEYS.has(f.key) && values[f.key]?.trim())
        .map((f) => ({ key: f.key, label: f.label, value: values[f.key].trim() }));

      const kind = deriveKind({ mimeType, url, hasFile: !!blobRef });

      archiveStore.addItem({
        collectionId,
        formKey: form.key,
        kind,
        title,
        note: values.note?.trim() || undefined,
        url,
        domain,
        tags,
        fields,
        blobRef,
        fileName,
        mimeType,
        size,
      });
      notify.saved(title);
      close();
    } catch (err) {
      notify.error('저장에 실패했어요', { description: err instanceof Error ? err.message : undefined });
      setSaving(false);
    }
  };

  const body = (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center" onMouseDown={close}>
      <div
        className="archive-theme my-8 w-full max-w-lg rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          {form && (
            <button type="button" onClick={() => setForm(null)} className="-ml-1 rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="양식 다시 고르기">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="text-[15px] font-bold text-foreground">
            {form ? `${form.emoji} ${form.name}` : '무엇을 저장할까요?'}
          </h2>
          <button type="button" onClick={close} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 1단계 — 카테고리(=양식) 고르기 */}
        {!form && (
          <div className="max-h-[68vh] overflow-y-auto p-4">
            <p className="mb-3 px-0.5 text-[12px] text-muted-foreground">저장할 카테고리를 골라주세요</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEFAULT_FORMS.map((f) => (
                <CategoryTile key={f.key} emoji={f.emoji} name={f.name} desc={f.desc} onClick={() => pickForm(f)} />
              ))}
              {customCollections.map((c) => (
                <CategoryTile
                  key={c.id}
                  emoji={c.emoji ?? '📁'}
                  name={c.name}
                  desc="내가 만든 카테고리"
                  onClick={() => pickForm(collectionForm(c), c.id)}
                />
              ))}

              {/* 새 카테고리 — 인라인 이름 입력 */}
              {creatingCategory ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--archive-sepia)/0.55)] bg-[hsl(var(--surface-1))] p-2.5 ring-2 ring-[hsl(var(--archive-sepia)/0.15)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--archive-sepia)/0.12)] text-[16px]">📁</span>
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); createCategory(); }
                      else if (e.key === 'Escape') { setCreatingCategory(false); setNewCategoryName(''); }
                    }}
                    onBlur={() => { if (!newCategoryName.trim()) setCreatingCategory(false); }}
                    placeholder="이름 입력 후 Enter"
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingCategory(true)}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-[hsl(var(--hairline))] p-2.5 text-left text-muted-foreground transition-colors hover:border-[hsl(var(--archive-sepia)/0.5)] hover:bg-accent hover:text-foreground"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--foreground)/0.05)]">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="text-[13px] font-bold">새 카테고리</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2단계 — 폼 */}
        {form && (
          <div className="max-h-[70vh] space-y-3.5 overflow-y-auto p-5">
            {form.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={values[f.key] ?? ''}
                onChange={(v) => setValue(f.key, v)}
                attached={attached?.fieldKey === f.key ? attached : null}
                onPickFile={(file) => onFilePick(f, file)}
                fileInputRef={f.type === 'file' || f.type === 'image' ? fileInputRef : undefined}
              />
            ))}

            {/* 컬렉션 */}
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-foreground">컬렉션</span>
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] text-foreground outline-none focus:border-[hsl(var(--archive-sepia))]"
              >
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                ))}
              </select>
            </label>

            {/* 태그 */}
            <div>
              <span className="mb-1 block text-[12px] font-semibold text-foreground">태그</span>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-2 py-1.5">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 rounded-md bg-[hsl(var(--foreground)/0.06)] px-2 py-0.5 text-[12px] text-foreground">
                    #{t}
                    <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground" aria-label={`${t} 제거`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
                    else if (e.key === 'Backspace' && !tagInput && tags.length) setTags((p) => p.slice(0, -1));
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length ? '' : '태그 입력 후 Enter'}
                  className="min-w-[100px] flex-1 bg-transparent py-0.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* 액션 */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={runAiFill}
                disabled={aiLoading || saving}
                className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--archive-sepia)/0.4)] px-3 py-2 text-[12.5px] font-semibold text-[hsl(var(--archive-sepia))] transition-colors hover:bg-[hsl(var(--archive-sepia)/0.08)] disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI로 채우기
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-[hsl(var(--archive-sepia))] px-5 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

/* ── 카테고리 타일 (1단계 픽커) ── */
function CategoryTile({ emoji, name, desc, onClick }: { emoji: string; name: string; desc?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-2.5 text-left transition-all hover:-translate-y-px hover:border-[hsl(var(--archive-sepia)/0.5)] hover:shadow-[0_3px_10px_-4px_hsl(var(--foreground)/0.15)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--archive-sepia)/0.10)] text-[17px] transition-transform group-hover:scale-105">{emoji}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-foreground">{name}</span>
        {desc && <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>}
      </span>
    </button>
  );
}

/* ── 필드 하나 ── */
function FieldInput({
  field, value, onChange, attached, onPickFile, fileInputRef,
}: {
  field: ArchiveFormField;
  value: string;
  onChange: (v: string) => void;
  attached: { file: File; isImage: boolean; previewUrl?: string } | null;
  onPickFile: (file: File | undefined) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}) {
  const label = (
    <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-foreground">
      {field.label}
      {field.optional === false && <span className="text-[hsl(var(--archive-sepia))]">*</span>}
    </span>
  );
  const inputCls = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))]';

  if (field.type === 'file' || field.type === 'image') {
    return (
      <div>
        {label}
        {attached ? (
          <div className="flex items-center gap-3 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-2.5">
            {attached.isImage && attached.previewUrl ? (
              <img src={attached.previewUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[hsl(var(--archive-sepia)/0.12)] text-[hsl(var(--archive-sepia))]"><Upload className="h-5 w-5" /></span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-foreground">{attached.file.name}</span>
              <span className="text-[11px] text-muted-foreground">{Math.round(attached.file.size / 1024)} KB</span>
            </span>
            <button type="button" onClick={() => onPickFile(undefined)} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="첨부 제거"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-4 text-[12.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--archive-sepia)/0.5)] hover:text-foreground">
            <Upload className="h-4 w-4" />
            {field.type === 'image' ? '이미지 선택' : '파일 선택'}
            <input
              ref={fileInputRef}
              type="file"
              accept={field.type === 'image' ? 'image/*' : undefined}
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="block">
        {label}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={cn(inputCls, 'resize-y leading-relaxed')}
        />
      </label>
    );
  }

  const htmlType = field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'password' ? 'password' : 'text';
  return (
    <label className="block">
      {label}
      <input
        type={htmlType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={inputCls}
      />
    </label>
  );
}
