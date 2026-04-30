/**
 * 우연의 발견 — 단축키 도움말 모달.
 * `?` 또는 위젯의 (?) 버튼으로 진입.
 */
import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

const SHORTCUTS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'R',     label: '새로고침',       desc: '다른 카드를 무작위로 가져와요' },
  { key: 'L',     label: '좋아요',         desc: '컬렉션에 모아둬요' },
  { key: 'S',     label: '메모로 저장',    desc: '/메모 페이지에 한 글로 저장해요' },
  { key: 'C',     label: '복사',           desc: '클립보드에 카드 텍스트를 복사해요' },
  { key: 'H',     label: '다시 안 보기',   desc: '이 카드를 영구적으로 숨겨요' },
  { key: 'Enter', label: '상세 보기',      desc: '본문 전체와 태그·링크를 확대해 봐요' },
  { key: '?',     label: '도움말',         desc: '이 화면을 다시 열어요' },
  { key: 'Esc',   label: '닫기',           desc: '열린 모달을 닫아요' },
];

export function SerendipityShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="우연의 발견 단축키"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative w-full max-w-[400px] max-h-[85vh] overflow-y-auto',
          'rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
          'shadow-[0_24px_80px_hsl(220_20%_5%_/_0.4)]',
          'p-5',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[14px] font-semibold">단축키</h2>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="h-6 w-6 rounded-full bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] flex items-center justify-center transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <p className="text-[11.5px] text-muted-foreground mb-4 leading-relaxed">
          위젯에 포커스가 있을 때 또는 페이지에서 사용할 수 있어요.
        </p>

        <ul className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li
              key={s.key}
              className="flex items-start gap-3 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--accent))]/40 transition-colors"
            >
              <kbd className="shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md font-mono text-[11px] font-semibold bg-[hsl(var(--muted))] border border-[hsl(var(--hairline))] text-foreground">
                {s.key}
              </kbd>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-foreground/90 leading-tight">
                  {s.label}
                </div>
                <div className="text-[10.5px] text-muted-foreground leading-relaxed mt-0.5">
                  {s.desc}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
