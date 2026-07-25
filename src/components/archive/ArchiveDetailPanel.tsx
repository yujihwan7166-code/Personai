/**
 * 아카이브 상세 패널 — 우측 슬라이드오버.
 * 항목 열람 + 인라인 편집(제목·메모·태그·컬렉션) + 다운로드·삭제·별표.
 */
import { useEffect, useRef, useState } from 'react';
import { X, Star, Download, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { KIND_LABEL, localYmd, type ArchiveCollection, type ArchiveItem } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { getArchiveBlob } from '@/lib/archiveBlobStore';
import { downloadBlob } from '@/lib/blob';
import { BlobImage } from './ArchiveCard';

interface Props {
  item: ArchiveItem;
  collections: ArchiveCollection[];
  /** true면 퇴장 애니메이션 재생 중 (부모가 애니메이션 후 언마운트). */
  closing?: boolean;
  onClose: () => void;
}

function fmtDate(iso: string): string {
  return localYmd(iso).replace(/-/g, '. ');
}

export function ArchiveDetailPanel({ item, collections, closing, onClose }: Props) {
  const [title, setTitle] = useState(item.title);
  const [note, setNote] = useState(item.note ?? '');
  const [tagInput, setTagInput] = useState('');

  // 다른 항목으로 바뀌면 로컬 편집 상태 동기화
  useEffect(() => {
    setTitle(item.title);
    setNote(item.note ?? '');
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitTitle = () => {
    const t = title.trim() || '무제';
    if (t !== item.title) archiveStore.updateItem(item.id, { title: t });
  };
  const commitNote = () => {
    if (note !== (item.note ?? '')) archiveStore.updateItem(item.id, { note: note.trim() || undefined });
  };

  /* 제목·메모는 onBlur 커밋이다. 그런데 Esc 는 포커스를 옮기지 않고 패널을 걷어내고,
   * React 는 언마운트 때 blur 를 쏘지 않는다 → 편집이 조용히 사라진다.
   * 최신 커밋 함수를 ref 에 담아 Esc·언마운트 직전에 직접 흘려보낸다. */
  const commitRef = useRef<() => void>(() => {});
  useEffect(() => { commitRef.current = () => { commitTitle(); commitNote(); }; });
  useEffect(() => () => commitRef.current(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      commitRef.current();
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
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

  /* 항목 삭제는 첨부 원본까지 함께 지우고 되돌릴 수 없다 — 반드시 한 번 묻는다.
   * (컬렉션 관리 삭제와 같은 confirm 패턴) */
  const remove = () => {
    const attached = item.blobRef ? `\n첨부한 ${item.fileName ?? '파일'}도 함께 지워져요.` : '';
    if (!confirm(`'${item.title}'을(를) 삭제할까요?${attached}\n\n되돌릴 수 없어요.`)) return;
    archiveStore.removeItem(item.id);
    notify.success('삭제했어요');
    onClose();
  };

  return (
    <aside className={cn('archive-theme sticky top-0 flex h-dvh w-full shrink-0 flex-col self-start overflow-hidden border-l border-[hsl(var(--hairline))] bg-card lg:w-[400px]', closing ? 'arch-detail-out' : 'arch-detail-in')}>
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

          {/* 레거시 추가 필드 — 컬렉션별 양식이 있던 시절 저장된 항목만 (읽기 전용) */}
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
