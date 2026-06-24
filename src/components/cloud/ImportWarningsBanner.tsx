import { AlertTriangle } from 'lucide-react';

interface ImportWarningsBannerProps {
  warnings: unknown;
}

function normalizeWarnings(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)));
}

export function ImportWarningsBanner({ warnings }: ImportWarningsBannerProps) {
  const items = normalizeWarnings(warnings);
  if (items.length === 0) return null;

  return (
    <details className="border-b border-amber-200 bg-amber-50/90 text-amber-950">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-xs font-medium hover:bg-amber-100/70">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span>이 Office 파일에서 {items.length}개의 호환성 제한을 감지했습니다.</span>
        <span className="ml-auto text-[11px] text-amber-800">자세히 보기</span>
      </summary>
      <div className="px-10 pb-2 text-xs leading-5 text-amber-900">
        {items.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
    </details>
  );
}
