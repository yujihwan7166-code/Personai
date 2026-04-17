import type { DiscussionMessage } from '@/types/expert';
import { cn } from '@/lib/utils';

export function GeneratedImageGallery({ message }: { message: DiscussionMessage }) {
  const generatedImages = message.generatedImages ?? [];
  if (generatedImages.length === 0) {
    return null;
  }

  const visibleImages = generatedImages.filter((image) =>
    (typeof image.dataUrl === 'string' && image.dataUrl.length > 0) ||
    (typeof image.thumbnailDataUrl === 'string' && image.thumbnailDataUrl.length > 0),
  );
  const missingImageCount = generatedImages.length - visibleImages.length;

  return (
    <div className="mb-3 space-y-2.5">
      {visibleImages.length > 0 && (
        <div className={cn('grid gap-2', visibleImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
          {visibleImages.map((image, index) => (
            <div key={`${message.id}-image-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={image.dataUrl || image.thumbnailDataUrl}
                alt={image.prompt || 'Generated image'}
                className="block h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {missingImageCount > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          세션에서 만든 이미지를 새로 불러온 기록이라 원본 데이터가 남아 있지 않아요.
        </div>
      )}
    </div>
  );
}
