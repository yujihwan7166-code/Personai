/**
 * 새 항목 저장 — 단일 폼 (모든 항목이 같은 양식).
 *  제목 · 내용 · 링크 · 파일 을 자유롭게 채우고, 컬렉션 하나를 고른다.
 *  형태(글/사진/파일/링크)는 넣은 것으로 자동 판정 — 사용자가 안 고름.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Link2, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { extractDomain, deriveKind, ATTACH_LIMITS, type ArchiveAttachment, type ArchiveCollection } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { putArchiveBlob, dataUrlToBlob } from '@/lib/archiveBlobStore';
import { compressImage } from '@/lib/journalImage';
import { formatFileSize } from '@/lib/fileSize';

/** 파일 드롭·URL 붙여넣기로 열 때 미리 채워둘 내용. */
export interface ArchiveDraft {
  /** 드롭·붙여넣기로 들어온 파일들 (예전엔 하나였다). */
  files?: File[];
  url?: string;
  note?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  collections: ArchiveCollection[];
  /** 열 때 미리 고를 컬렉션 (사이드바에서 특정 컬렉션 보고 있을 때). */
  defaultCollectionId?: string;
  /** 기존 태그 — 자동완성 소스 (중복·유사 태그 방지). */
  allTags?: string[];
  /** 드롭·붙여넣기로 연 경우의 초안. */
  draft?: ArchiveDraft;
}

interface Attached { file: File; isImage: boolean; previewUrl?: string }

function toAttached(file: File): Attached {
  const isImage = file.type.startsWith('image/');
  return { file, isImage, previewUrl: isImage ? URL.createObjectURL(file) : undefined };
}

export function ArchiveNewItemDialog({ open, onClose, collections, defaultCollectionId, allTags, draft }: Props) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  /* 첨부는 여럿. 하나만 받던 시절엔 두 번째 파일을 고르면 첫 파일이 조용히
     사라졌다 — 영수증 앞뒤, 사진 몇 장처럼 원래 여럿인 것을 담을 수 없었다. */
  const [attachedList, setAttachedList] = useState<Attached[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setNote(''); setUrl('');
    setAttachedList((list) => { list.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl)); return []; });
    setTags([]); setTagInput('');
    setAddingCollection(false); setNewCollectionName('');
    setSaving(false);
  };
  const close = () => { reset(); onClose(); };

  // 열릴 때 기본 컬렉션 선택 + 드롭·붙여넣기 초안 반영
  useEffect(() => {
    if (!open) return;
    setCollectionId(defaultCollectionId ?? collections[0]?.id ?? '');
    if (draft?.url) setUrl(draft.url);
    if (draft?.note) setNote(draft.note);
    if (draft?.files?.length) {
      setAttachedList((prev) => {
        prev.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
        return (draft.files ?? []).slice(0, ATTACH_LIMITS.COUNT).map(toAttached);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCollectionId, draft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  /** 고른 파일들을 목록에 더한다. 개수·합계 용량에서 걸리면 그만큼만 받고 알린다. */
  const onFilesPick = (files: FileList | File[] | null) => {
    const picked = Array.from(files ?? []);
    if (!picked.length) return;
    setAttachedList((prev) => {
      const next = [...prev];
      let total = prev.reduce((s, a) => s + a.file.size, 0);
      let overCount = 0;
      let overSize = 0;
      for (const f of picked) {
        if (next.length >= ATTACH_LIMITS.COUNT) { overCount += 1; continue; }
        if (total + f.size > ATTACH_LIMITS.TOTAL_BYTES) { overSize += 1; continue; }
        next.push(toAttached(f));
        total += f.size;
      }
      if (overCount) notify.info(`첨부는 ${ATTACH_LIMITS.COUNT}개까지예요`, { description: `${overCount}개는 빼고 담았어요` });
      else if (overSize) notify.info(`한 항목에 ${ATTACH_LIMITS.TOTAL_BYTES / 1024 / 1024}MB 까지예요`, { description: `${overSize}개는 빼고 담았어요` });
      return next;
    });
  };
  const removeAttached = (idx: number) => {
    setAttachedList((prev) => {
      const a = prev[idx];
      if (a?.previewUrl) URL.revokeObjectURL(a.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const attachedTotal = attachedList.reduce((s, a) => s + a.file.size, 0);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t) return;
    setTags((p) => (p.includes(t) ? p : [...p, t]));
    setTagInput('');
  };

  // 기존 태그 자동완성 — 이미 고른 건 빼고, 입력 중이면 매칭, 아니면 상위 몇 개.
  const tagSuggestions = (() => {
    const q = tagInput.trim().replace(/^#/, '').toLowerCase();
    const chosen = new Set(tags);
    return (allTags ?? [])
      .filter((t) => !chosen.has(t) && (q ? t.toLowerCase().includes(q) : true))
      .slice(0, 8);
  })();

  const addCollection = () => {
    const name = newCollectionName.trim();
    if (!name) { setAddingCollection(false); return; }
    const c = archiveStore.addCollection(name);
    setCollectionId(c.id);
    setNewCollectionName('');
    setAddingCollection(false);
  };

  const save = async () => {
    if (!title.trim() && !note.trim() && !url.trim() && !attachedList.length) {
      notify.info('저장할 내용이 없어요');
      return;
    }
    setSaving(true);
    try {
      const attachments: ArchiveAttachment[] = [];
      for (const a of attachedList) {
        if (a.isImage) {
          const { src } = await compressImage(a.file);
          const blob = dataUrlToBlob(src);
          attachments.push({ ref: await putArchiveBlob(blob, 'image/jpeg'), name: a.file.name, mimeType: 'image/jpeg', size: blob.size });
        } else {
          attachments.push({
            ref: await putArchiveBlob(a.file),
            name: a.file.name,
            mimeType: a.file.type || 'application/octet-stream',
            size: a.file.size,
          });
        }
      }
      /* 첫 첨부는 옛 단일 필드에도 함께 적는다 — 카드 썸네일·검색이 이 필드를 본다.
         한쪽만 쓰게 바꾸면 이미 저장된 항목이 안 보이게 된다. */
      const first = attachments[0];
      const blobRef = first?.ref;
      const fileName = first?.name;
      const mimeType = first?.mimeType;
      const size = first?.size;

      const u = url.trim() || undefined;
      const domain = u ? extractDomain(u) : undefined;
      const finalTitle =
        title.trim() ||
        note.trim().split('\n')[0]?.slice(0, 60) ||
        fileName ||
        domain ||
        '무제';
      const kind = deriveKind({ mimeType, url: u, hasFile: !!blobRef });

      archiveStore.addItem({
        collectionId,
        kind,
        title: finalTitle,
        note: note.trim() || undefined,
        url: u,
        domain,
        tags,
        attachments: attachments.length ? attachments : undefined,
        blobRef,
        fileName,
        mimeType,
        size,
      });
      notify.saved(finalTitle);
      close();
    } catch (err) {
      notify.error('저장에 실패했어요', { description: err instanceof Error ? err.message : undefined });
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))]';

  const body = (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center" onMouseDown={close}>
      <div
        className="archive-theme my-8 w-full max-w-2xl rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-foreground">새 항목 저장</h2>
          <button type="button" onClick={close} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto p-5">
          {/* 제목 — 명확한 라벨 + 테두리 필드 */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-foreground">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2.5 text-[15px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-[hsl(var(--archive-sepia))]"
            />
          </div>

          {/* 컬렉션 — 위쪽으로 (어디에 넣을지 먼저 고름) */}
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-foreground">
              컬렉션 <span className="font-normal text-muted-foreground">— 어디에 넣을까요</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCollectionId(c.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                    collectionId === c.id
                      ? 'bg-[hsl(var(--archive-sepia))] text-white'
                      : 'bg-[hsl(var(--surface-2))] text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {c.emoji && <span>{c.emoji}</span>}{c.name}
                </button>
              ))}
              {addingCollection ? (
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addCollection(); }
                    else if (e.key === 'Escape') { setAddingCollection(false); setNewCollectionName(''); }
                  }}
                  onBlur={() => { if (!newCollectionName.trim()) setAddingCollection(false); }}
                  placeholder="이름 + Enter"
                  className="w-32 rounded-lg border border-[hsl(var(--archive-sepia)/0.5)] bg-[hsl(var(--surface-2))] px-2.5 py-1.5 text-[12.5px] text-foreground outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCollection(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[hsl(var(--hairline))] px-2.5 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-[hsl(var(--archive-sepia)/0.5)] hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> 새 컬렉션
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-[hsl(var(--hairline))]" />

          {/* 내용 */}
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-foreground">
              내용 <span className="font-normal text-muted-foreground">(선택)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="내용·메모를 적어요"
              className={cn(inputCls, 'resize-y leading-relaxed')}
            />
          </div>

          {/* 링크 */}
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-foreground">
              링크 <span className="font-normal text-muted-foreground">— 유튜브·기사·사이트 주소 (선택)</span>
            </span>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https:// 주소 붙여넣기"
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </div>

          {/* 파일·사진 */}
          <div>
            <span className="mb-1.5 flex items-baseline gap-2 text-[12px] font-semibold text-foreground">
              파일·사진 <span className="font-normal text-muted-foreground">(선택)</span>
              {/* 남은 자리는 다 채우기 전엔 말하지 않는다 — 처음부터 '10개까지'라고
                  적어두면 한 장 넣으려던 사람에게도 한계부터 읽힌다. */}
              {attachedList.length > 0 && (
                <span className="ml-auto font-normal tabular-nums text-muted-foreground">
                  {attachedList.length}/{ATTACH_LIMITS.COUNT} · {formatFileSize(attachedTotal)}
                </span>
              )}
            </span>
            {attachedList.length > 0 && (
              <ul className="mb-1.5 space-y-1.5">
                {attachedList.map((a, i) => (
                  <li key={`${a.file.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-2.5">
                    {a.isImage && a.previewUrl ? (
                      <img src={a.previewUrl} alt="" className="h-11 w-11 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--archive-sepia)/0.12)] text-[hsl(var(--archive-sepia))]"><Upload className="h-5 w-5" /></span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-foreground">{a.file.name}</span>
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(a.file.size)}</span>
                    </span>
                    <button type="button" onClick={() => removeAttached(i)} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label={`${a.file.name} 빼기`}><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            {attachedList.length < ATTACH_LIMITS.COUNT && (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-3 text-[12.5px] text-muted-foreground transition-colors hover:border-[hsl(var(--archive-sepia)/0.5)] hover:text-foreground">
                <Upload className="h-4 w-4" /> {attachedList.length ? '더 붙이기' : '파일·사진 첨부'}
                <input type="file" multiple className="hidden" onChange={(e) => { onFilesPick(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>

          {/* 태그 */}
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-foreground">태그</span>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-2 py-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md bg-[hsl(var(--foreground)/0.06)] px-2 py-0.5 text-[12px] text-foreground">
                  #{t}
                  <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground" aria-label={`${t} 제거`}><X className="h-3 w-3" /></button>
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
            {tagSuggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tagSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="rounded-md bg-[hsl(var(--foreground)/0.04)] px-2 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-[hsl(var(--archive-sepia)/0.15)] hover:text-[hsl(var(--archive-sepia))]"
                    title="기존 태그 추가"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 — 저장 */}
        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--hairline))] px-5 py-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--archive-sepia))] px-6 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
