/**
 * 일기 사진 첨부 — 드롭존 + 파일 선택 + 미리보기 그리드 + 삭제.
 *
 * 최대 3장. 각 이미지 클라이언트 압축 (compressImage).
 */
import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage, newImageId } from '@/lib/journalImage';
import { notify } from '@/lib/notify';
import type { JournalImage } from '@/types/journal';

const MAX_IMAGES = 3;

interface JournalImagePickerProps {
  value: JournalImage[];
  onChange: (next: JournalImage[]) => void;
}

export const JournalImagePicker = ({ value, onChange }: JournalImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - value.length;
    if (remaining <= 0) {
      notify.warning(`사진은 최대 ${MAX_IMAGES}장까지`, { duration: 1500 });
      return;
    }

    setBusy(true);
    try {
      const incoming: JournalImage[] = [];
      const slice = Array.from(files).slice(0, remaining);
      for (const file of slice) {
        if (!file.type.startsWith('image/')) {
          notify.warning(`'${file.name}' 은 이미지가 아니에요`, { duration: 1500 });
          continue;
        }
        const { src, size } = await compressImage(file);
        incoming.push({
          id: newImageId(),
          src,
          size,
          createdAt: new Date().toISOString(),
        });
      }
      if (incoming.length > 0) {
        onChange([...value, ...incoming]);
      }
    } catch (err) {
      console.error(err);
      notify.error('사진 압축 실패', { duration: 2000 });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (id: string) => {
    onChange(value.filter((img) => img.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        {value.map((img) => (
          <div
            key={img.id}
            className="relative group h-20 w-20 rounded-md overflow-hidden border border-[hsl(var(--hairline))] bg-card"
          >
            <img src={img.src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(img.id)}
              aria-label="사진 삭제"
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        ))}
        {value.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              'flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[hsl(var(--hairline))] bg-card text-muted-foreground',
              'hover:border-foreground/30 hover:text-foreground hover:bg-accent transition-colors',
              busy && 'opacity-60 cursor-wait',
            )}
            title={`사진 추가 (최대 ${MAX_IMAGES}장)`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                <span className="text-[9.5px] font-mono uppercase tracking-wide">사진</span>
              </>
            )}
          </button>
        )}
      </div>
      {value.length > 0 && (
        <p className="text-[10.5px] text-muted-foreground">
          {value.length}/{MAX_IMAGES} · 클라이언트 압축됨 ({Math.round((value.reduce((s, i) => s + (i.size ?? 0), 0)) / 1024)}KB)
        </p>
      )}
    </div>
  );
};
