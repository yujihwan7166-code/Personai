/**
 * 아카이브 상세 패널 — 우측 슬라이드오버.
 * 항목 열람 + 인라인 편집(제목·메모·태그·컬렉션) + 다운로드·삭제·별표.
 */
import { useEffect, useState } from 'react';
import { X, Star, Download, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { KIND_LABEL, type ArchiveCollection, type ArchiveItem } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { getArchiveBlob } from '@/lib/archiveBlobStore';
import { downloadBlob } from '@/lib/blob';
import { BlobImage } from './ArchiveCard';

interface Props {
  item: ArchiveItem;
  collections: ArchiveCollection[];
  onClose: () => void;
}

function fmtDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '. ');
}

export function ArchiveDetailPanel({ item, collections, onClose }: Props) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? '');
  const [tagInput, setTagInput] = useState('');

  // 다른 항목으로 바뀌면 로컬 편집 상태 동기화
  useEffect(() => {
    setTitle(item.title);
    setNote(item.note ?? '');
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commitTitle = () => {
    const t = title.trim() || '무제';
    if (t !== item.title) archiveStore.updateItem(item.id, { title: t });
  };
  const commitNote = () => {
    if (note !== (item.note ?? '')) archiveStore.updateItem(item.id, { note: note.trim() || undefined });
  };
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || item.tags.includes(t)) { setTagInput(''); return; }
    archiveStore.updateItem(item.id, { tags: [...item.tags, t] });
    setTagInput('');
  };
  const removeTag = (t: string) => archiveStore.updateItem(item.id, { tags: item.tags.filter((x) => x !== t) });

  const download = async () => {
    if (!item.blobRef) return;
    const blob = await getArchiveBlob(item.blobRef);
    if (blob) downloadBlob(blob, item.fileName ?? item.title);
    else notify.error('파일을 찾을 수 없어요');
  };

  const remove = () => {
    archiveStore.removeItem(item.id);
    notify.success('삭제했어요');
    onClose();
  };

  return (
    <aside className="archive-theme sticky top-0 flex h-dvh w-full shrink-0 flex-col self-start border-l border-[hsl(var(--hairline))] bg-card duration-300 animate-in fade-in slide-in-from-right-6 lg:w-[400px]">
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-4 py-3">
          <span className="rounded-md bg-[hsl(var(--foreground)/0.06)] px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
            {KIND_LABEL[item.kind]}
          </span>
          <span className="text-[12px] text-muted-foreground">{fmtDate(item.createdAt)}</span>
          <button
            type="button"
            onClick={() => archiveStore.toggleStar(item.id)}
            className="ml-auto -m-1 p-1"
            aria-label={item.starred ? '별표 해제' : '별표'}
          >
            <Star
              className={cn('h-[17px] w-[17px]', item.starred ? 'text-[hsl(var(--archive-star))]' : 'text-muted-foreground/50')}
              fill={item.starred ? 'hsl(var(--archive-star))' : 'none'}
            />
          </button>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* 이미지 — 시각 미리보기(맨 위) */}
          {item.kind === 'image' && item.blobRef && (
            <BlobImage blobRef={item.blobRef} alt={item.title} className="max-h-80 w-full rounded-xl" />
          )}

          {/* ① 제목 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            className="w-full bg-transparent text-[18px] font-bold tracking-[-0.01em] text-foreground outline-none"
          />

          {/* ② 컬렉션 (저장 창과 동일 위계 — 어디에 넣을지 먼저) */}
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">컬렉션</span>
            <select
              value={item.collectionId}
              onChange={(e) => archiveStore.moveItem(item.id, e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] text-foreground outline-none focus:border-[hsl(var(--archive-sepia))]"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
              ))}
            </select>
          </label>

          {/* ③ 내용(메모) */}
          <div>
            <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">내용</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={commitNote}
              rows={4}
              placeholder="내용·메모를 남겨보세요"
              className="w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-[hsl(var(--archive-sepia))]"
            />
          </div>

          {/* ④ 링크 */}
          {item.kind === 'link' && item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 py-2 text-[13px] text-[hsl(var(--archive-sepia))] transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.domain ?? item.url}</span>
              <span className="shrink-0 text-[12px] font-semibold">열기</span>
            </a>
          )}

          {/* ⑤ 파일 */}
          {item.kind === 'file' && item.blobRef && (
            <button
              type="button"
              onClick={download}
              className="flex w-full items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-3 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4 shrink-0 text-[hsl(var(--archive-sepia))]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{item.fileName ?? item.title}</span>
                {item.size ? <span className="text-[11px] text-muted-foreground">{Math.round(item.size / 1024)} KB · 내려받기</span> : null}
              </span>
            </button>
          )}

          {/* 양식 필드 */}
          {item.fields && item.fields.length > 0 && (
            <dl className="space-y-1.5 rounded-lg bg-[hsl(var(--surface-2))] p-3">
              {item.fields.map((f) => (
                <div key={f.key} className="flex gap-3 text-[13px]">
                  <dt className="w-20 shrink-0 text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 flex-1 text-foreground">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* ⑥ 태그 */}
          <div>
            <span className="mb-1 block text-[12px] font-semibold text-muted-foreground">태그</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-md bg-[hsl(var(--foreground)/0.06)] px-2 py-0.5 text-[12px] text-foreground">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} aria-label={`${t} 제거`} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                onBlur={() => tagInput && addTag(tagInput)}
                placeholder="+ 태그"
                className="w-20 bg-transparent py-0.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        </div>

        {/* 푸터 — 삭제 */}
        <div className="border-t border-[hsl(var(--hairline))] px-4 py-3">
          <button
            type="button"
            onClick={remove}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-rose-500 transition-colors hover:text-rose-600"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        </div>
    </aside>
  );
}
