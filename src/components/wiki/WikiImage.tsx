import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getImageUrl } from '@/lib/wikiImageStore';

interface Props {
  /** wiki-image:<id> 또는 일반 외부 URL 둘 다 처리 */
  src: string;
  alt?: string;
}

/**
 * `![](wiki-image:abc)` 형태를 IDB blob URL 로 비동기 해석.
 * 외부 URL 은 그대로 패스.
 */
export function WikiImage({ src, alt }: Props) {
  const isInternal = src.startsWith('wiki-image:');
  const [resolved, setResolved] = useState<string | null>(isInternal ? null : src);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!isInternal) {
      setResolved(src);
      setMissing(false);
      return;
    }
    let cancelled = false;
    const id = src.slice('wiki-image:'.length);
    void getImageUrl(id).then((url) => {
      if (cancelled) return;
      if (!url) setMissing(true);
      else setResolved(url);
    });
    return () => { cancelled = true; };
  }, [src, isInternal]);

  if (missing) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300">
        <ImageOff className="w-3 h-3" />
        이미지 없음
        {alt && <span className="opacity-70">· {alt}</span>}
      </span>
    );
  }

  if (!resolved) {
    return (
      <span className="inline-block w-32 h-20 rounded-md bg-accent/40 animate-pulse" aria-label="이미지 불러오는 중" />
    );
  }

  return <img src={resolved} alt={alt ?? ''} className="rounded-lg max-w-full h-auto" loading="lazy" />;
}
