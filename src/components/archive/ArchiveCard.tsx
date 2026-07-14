/**
 * 아카이브 카드 — 형태(kind)별 렌더. masonry 그리드 한 칸.
 *  - 글: 텍스트 3줄 미리보기
 *  - 이미지: 지연 로드 썸네일(IndexedDB objectURL)
 *  - 파일: 아이콘 + 파일명 + 용량 박스
 *  - 링크: 도메인 줄(유튜브는 썸네일)
 */
import { useEffect, useRef, useState } from 'react';
import { Star, FileText, FileSpreadsheet, File as FileIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  KIND_LABEL,
  youtubeId,
  type ArchiveItem,
} from '@/types/archive';
import { getArchiveUrl } from '@/lib/archiveBlobStore';

const KIND_BADGE: Record<ArchiveItem['kind'], string> = {
  note: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  image: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  file: 'bg-[hsl(var(--archive-sepia)/0.12)] text-[hsl(var(--archive-sepia))]',
  link: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
};

function fmtDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '. ');
}

function fmtSize(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 도메인 첫 글자 색 아바타 (외부 파비콘 의존 없이). */
function faviconColor(domain: string): string {
  let h = 0;
  for (let i = 0; i < domain.length; i += 1) h = (h * 31 + domain.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 48%)`;
}

/** IndexedDB blob → objectURL 지연 로드 이미지. */
export function BlobImage({ blobRef, alt, className }: { blobRef: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    getArchiveUrl(blobRef)
      .then((u) => { if (alive) { if (u) setUrl(u); else setFailed(true); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [blobRef]);
  if (failed) {
    return <div className={cn('flex items-center justify-center bg-[hsl(var(--surface-3))] text-muted-foreground text-[11px]', className)}>이미지를 불러올 수 없어요</div>;
  }
  if (!url) {
    return <div className={cn('animate-pulse bg-[hsl(var(--surface-3))]', className)} />;
  }
  return <img src={url} alt={alt} loading="lazy" className={cn('object-cover', className)} />;
}

function FileGlyph({ mime }: { mime?: string }) {
  if (mime?.includes('sheet') || mime?.includes('excel')) return <FileSpreadsheet className="h-[18px] w-[18px]" />;
  if (mime?.includes('pdf') || mime?.includes('word') || mime?.includes('document')) return <FileText className="h-[18px] w-[18px]" />;
  return <FileIcon className="h-[18px] w-[18px]" />;
}

interface Props {
  item: ArchiveItem;
  onOpen: (item: ArchiveItem) => void;
  onToggleStar: (id: string) => void;
}

export function ArchiveCard({ item, onOpen, onToggleStar }: Props) {
  const ytId = item.kind === 'link' && item.url ? youtubeId(item.url) : undefined;
  const ytFailedRef = useRef(false);
  const [ytFailed, setYtFailed] = useState(false);

  const Meta = (
    <div className="mb-1.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
      <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-bold', KIND_BADGE[item.kind])}>
        {KIND_LABEL[item.kind]}
      </span>
      <span>{fmtDate(item.createdAt)}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleStar(item.id); }}
        aria-label={item.starred ? '별표 해제' : '별표'}
        className="ml-auto -m-1 p-1"
      >
        <Star
          className={cn('h-[15px] w-[15px] transition-colors', item.starred ? 'text-[hsl(var(--archive-star))]' : 'text-muted-foreground/40 hover:text-muted-foreground')}
          fill={item.starred ? 'hsl(var(--archive-star))' : 'none'}
        />
      </button>
    </div>
  );

  const Tags = item.tags.length > 0 && (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {item.tags.map((t) => (
        <span key={t} className="rounded-md bg-[hsl(var(--foreground)/0.05)] px-2 py-0.5 text-[11px] text-muted-foreground">
          #{t}
        </span>
      ))}
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-card text-left transition-shadow hover:shadow-[0_4px_16px_-6px_hsl(var(--foreground)/0.12)]"
    >
      {/* 이미지 카드 — 상단 썸네일 */}
      {item.kind === 'image' && item.blobRef && (
        <BlobImage blobRef={item.blobRef} alt={item.title} className="h-44 w-full" />
      )}

      {/* 유튜브 링크 — 썸네일(실패 시 폴백) */}
      {ytId && !ytFailed && (
        <div className="relative h-40 w-full overflow-hidden bg-black/5">
          <img
            src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => { if (!ytFailedRef.current) { ytFailedRef.current = true; setYtFailed(true); } }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
            </span>
          </span>
        </div>
      )}

      <div className="p-4">
        {Meta}
        <h4 className="text-[14.5px] font-bold leading-snug tracking-[-0.01em] text-foreground">
          {item.title}
        </h4>

        {/* 글 — 본문 3줄 */}
        {item.kind === 'note' && item.note && (
          <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">
            {item.note}
          </p>
        )}

        {/* 파일 — 파일 박스 */}
        {item.kind === 'file' && (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--archive-sepia)/0.12)] text-[hsl(var(--archive-sepia))]">
              <FileGlyph mime={item.mimeType} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-foreground">{item.fileName ?? item.title}</span>
              <span className="text-[11px] text-muted-foreground">{fmtSize(item.size)}</span>
            </span>
          </div>
        )}

        {/* 링크 — 도메인 줄 */}
        {item.kind === 'link' && item.domain && (
          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white"
              style={{ backgroundColor: faviconColor(item.domain) }}
            >
              {item.domain.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{item.domain}</span>
          </div>
        )}

        {/* 링크·글에 메모가 있으면 (본문 카드가 아닌 경우) 짧게 */}
        {item.kind === 'link' && item.note && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{item.note}</p>
        )}

        {Tags}
      </div>
    </button>
  );
}
